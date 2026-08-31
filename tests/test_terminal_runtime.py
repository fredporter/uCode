"""Acceptance coverage for the unified shell and BBC BASIC Terminal PTY."""

from __future__ import annotations

import asyncio
import re
import stat
import fcntl
import struct
import termios
from pathlib import Path

from ucode_runtime.terminal_runtime import (
    LocalPtySession,
    _send_terminal_output,
    _minimal_prompt_env,
    resolve_terminal_basic_command,
)


class ClosingWebSocket:
    closed = False

    async def send_json(self, payload) -> None:
        raise ConnectionResetError("transport closed")


def test_terminal_sender_treats_client_disconnect_as_normal() -> None:
    async def exercise() -> None:
        queue = asyncio.Queue()
        await queue.put("hello")
        await _send_terminal_output(ClosingWebSocket(), queue)  # type: ignore[arg-type]

    asyncio.run(exercise())


def test_terminal_resize_updates_the_real_pty() -> None:
    async def exercise() -> tuple[int, int]:
        queue: asyncio.Queue[str] = asyncio.Queue()
        session = LocalPtySession(queue)
        await session.start(cols=40, rows=25)
        try:
            session.resize(74, 25)
            assert session.master_fd is not None
            packed = fcntl.ioctl(session.master_fd, termios.TIOCGWINSZ, b"\0" * 8)
            rows, cols, _, _ = struct.unpack("HHHH", packed)
            return cols, rows
        finally:
            await session.stop()

    assert asyncio.run(exercise()) == (74, 25)


async def _run_shell_probe() -> str:
    queue: asyncio.Queue[str] = asyncio.Queue()
    session = LocalPtySession(queue)
    await session.start(cols=40, rows=25)
    captured = ""
    try:
        session.write("printf 'UCODE_SHELL_OK\\n'\r")
        for _ in range(40):
            try:
                captured += await asyncio.wait_for(queue.get(), timeout=0.25)
            except TimeoutError:
                continue
            if "UCODE_SHELL_OK" in captured:
                return captured
    finally:
        await session.stop()
    return captured


async def _run_shell_basic_lifecycle_probe() -> str:
    queue: asyncio.Queue[str] = asyncio.Queue()
    session = LocalPtySession(queue)
    await session.start(cols=40, rows=25)
    captured = ""
    try:
        session.write("basic\r")
        for command in ("PRINT 6*7\r", "QUIT\r", "printf 'UCODE_SHELL_RETURNED\\n'\r"):
            deadline = asyncio.get_running_loop().time() + 0.75
            while asyncio.get_running_loop().time() < deadline:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=0.05)
                except TimeoutError:
                    continue
                captured += data
                # BBC BASIC Console asks the terminal for its cursor position.
                # The visible GridCore Terminal answers this query in the same way.
                if "\x1b[6n" in data:
                    session.write("\x1b[1;1R")
            session.write(command)
        deadline = asyncio.get_running_loop().time() + 1
        while asyncio.get_running_loop().time() < deadline:
            try:
                captured += await asyncio.wait_for(queue.get(), timeout=0.05)
            except TimeoutError:
                continue
    finally:
        await session.stop()
    return captured


def test_shell_pty_executes_real_commands() -> None:
    assert "UCODE_SHELL_OK" in asyncio.run(_run_shell_probe())


def test_shell_enters_basic_and_quit_returns_to_shell() -> None:
    output = asyncio.run(_run_shell_basic_lifecycle_probe())
    rendered = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", output)
    compact = re.sub(r"\s+", "", rendered)
    assert "BBCBASIC" in compact
    assert "42" in compact
    assert "UCODE_SHELL_RETURNED" in compact


def test_basic_command_resolves_canonical_engine(
    tmp_path: Path,
    monkeypatch,
) -> None:
    engine = tmp_path / "bbcbasic"
    engine.write_text("#!/bin/sh\n", encoding="utf-8")
    engine.chmod(engine.stat().st_mode | stat.S_IXUSR)
    monkeypatch.setenv("UCODE_BBC_BASIC_CONSOLE_PATH", str(engine))
    assert resolve_terminal_basic_command() == engine.resolve()

    prompt_env = _minimal_prompt_env()
    zshrc = (Path(prompt_env["ZDOTDIR"]) / ".zshrc").read_text(encoding="utf-8")
    assert "basic()" in zshrc
    assert str(engine.resolve()) in zshrc
