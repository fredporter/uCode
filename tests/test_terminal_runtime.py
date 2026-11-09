"""Native BBC BASIC Terminal acceptance and legacy shell compatibility coverage."""

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


def test_terminal_route_launches_language_not_host_shell(monkeypatch):
    import ucode_runtime.terminal_runtime as runtime
    captured = {}
    class Socket:
        closed = False
        async def prepare(self, request): pass
        async def send_json(self, value): captured.setdefault('messages', []).append(value)
        async def close(self, **kwargs): self.closed = True
        def __aiter__(self): return self
        async def __anext__(self): raise StopAsyncIteration
    class Session:
        def __init__(self, queue, **kwargs): captured.update(kwargs)
        async def start(self): pass
        async def stop(self): pass
    monkeypatch.setattr(runtime.web, 'WebSocketResponse', lambda **kwargs: Socket())
    monkeypatch.setattr(runtime, 'LocalPtySession', Session)
    monkeypatch.setattr(runtime, 'resolve_terminal_basic_command', lambda: Path('/packaged/bbcbasic'))
    asyncio.run(runtime.handle_terminal_runtime_ws(object()))
    assert captured['command'] == ['/packaged/bbcbasic']
    assert captured['messages'][0]['runtime'] == 'ucode-bbc-basic'


def test_terminal_missing_language_does_not_fall_back_to_shell(monkeypatch):
    import ucode_runtime.terminal_runtime as runtime
    messages = []
    class Socket:
        async def prepare(self, request): pass
        async def send_json(self, value): messages.append(value)
        async def close(self, **kwargs): messages.append(kwargs)
    monkeypatch.setattr(runtime.web, 'WebSocketResponse', lambda **kwargs: Socket())
    monkeypatch.setattr(runtime, 'resolve_terminal_basic_command', lambda: None)
    asyncio.run(runtime.handle_terminal_runtime_ws(object()))
    assert messages[0]['type'] == 'error'
    assert messages[1]['code'] == 1008


def test_native_program_list_run_and_fresh_session(tmp_path):
    engine = resolve_terminal_basic_command()
    assert engine is not None, 'Packaged BASIC engine required for native acceptance'

    async def exercise():
        async def collect(queue, session, seconds=0.25):
            output = ''
            deadline = asyncio.get_running_loop().time() + seconds
            while asyncio.get_running_loop().time() < deadline:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=0.03)
                    output += data
                    if '\x1b[6n' in data:
                        session.write('\x1b[1;1R')
                except TimeoutError:
                    continue
            return re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', output)
        for reconnect in (False, True):
            queue = asyncio.Queue()
            session = LocalPtySession(queue, command=[str(engine)], cwd=tmp_path)
            await session.start()
            try:
                await collect(queue, session)
                session.write('PRINT "ANSWER=";83+7\r')
                immediate = await collect(queue, session)
                assert 'ANSWER=90' in re.sub(r'\s+', '', immediate)
                if not reconnect:
                    session.write('10 PRINT "PROGRAM=";6*7\r20 END\r')
                    await collect(queue, session)
                session.write('LIST\r')
                listing = await collect(queue, session)
                compact_listing = re.sub(r'\s+', '', listing)
                if reconnect:
                    assert '10PRINT' not in compact_listing
                else:
                    assert '10PRINT' in compact_listing
                    assert '20END' in compact_listing
                    session.write('RUN\r')
                    result = await collect(queue, session)
                    assert 'PROGRAM=42' in re.sub(r'\s+', '', result)
            finally:
                process = session.process
                await session.stop()
                assert process.poll() is not None
                assert session.master_fd is None
    asyncio.run(exercise())


def test_failed_process_start_releases_pty(tmp_path):
    async def exercise():
        session = LocalPtySession(asyncio.Queue(), command=[str(tmp_path / 'missing-engine')])
        try:
            await session.start()
        except FileNotFoundError:
            pass
        else:
            raise AssertionError('Missing binary started')
        assert session.master_fd is None
        assert session.process is None
    asyncio.run(exercise())


def test_malformed_events_do_not_reach_native_session():
    from unittest.mock import Mock
    from ucode_runtime.terminal_runtime import _handle_runtime_message
    async def exercise():
        messages = []
        class Socket:
            async def send_json(self, payload): messages.append(payload)
        session = Mock()
        for raw in ('[]', 'null', '{"type":"input","data":[]}', '{"type":"resize","cols":true}', '{"type":"resize","cols":0}', '{"type":"resize","rows":"25"}'):
            await _handle_runtime_message(raw, session, Socket())
        assert len(messages) == 6
        assert all(message['type'] == 'error' for message in messages)
        session.write.assert_not_called()
        session.resize.assert_not_called()
    asyncio.run(exercise())


def test_native_process_exit_closes_transport_for_reconnect():
    from unittest.mock import Mock, AsyncMock
    from ucode_runtime.terminal_runtime import _close_on_process_exit
    async def exercise():
        process = Mock()
        process.wait.return_value = 0
        session = Mock(process=process)
        socket = Mock(closed=False)
        socket.close = AsyncMock()
        await _close_on_process_exit(session, socket)
        process.wait.assert_called_once()
        socket.close.assert_awaited_once_with(code=1000, message=b'uCode language session ended')
    asyncio.run(exercise())


def test_disconnect_during_ready_stops_language_session(monkeypatch):
    import ucode_runtime.terminal_runtime as runtime
    from unittest.mock import AsyncMock
    class Socket:
        async def prepare(self, request): pass
        async def send_json(self, value): raise ConnectionResetError('disconnected')
    stopped = AsyncMock()
    class Session:
        def __init__(self, queue, **kwargs): pass
        async def start(self): pass
        stop = stopped
    monkeypatch.setattr(runtime.web, 'WebSocketResponse', lambda **kwargs: Socket())
    monkeypatch.setattr(runtime, 'LocalPtySession', Session)
    monkeypatch.setattr(runtime, 'resolve_terminal_basic_command', lambda: Path('/packaged/bbcbasic'))
    async def exercise():
        try:
            await runtime.handle_terminal_runtime_ws(object())
        except ConnectionResetError:
            pass
        stopped.assert_awaited_once()
    asyncio.run(exercise())
