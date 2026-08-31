"""Opt-in acceptance test for the official BBC BASIC Console engine."""

from __future__ import annotations

import asyncio
import os
import re

import pytest

from ucode_runtime.session_runtime import BBCConsolePtySession, PROTOCOL


async def _run_console_probe() -> None:
    queue: asyncio.Queue[dict[str, object]] = asyncio.Queue()
    session = BBCConsolePtySession(queue)
    await session.start({"cols": 40, "rows": 25})
    captured = ""
    cursor_x = 0
    cursor_y = 0
    command_sent = False
    try:
        for _ in range(400):
            try:
                message = await asyncio.wait_for(queue.get(), timeout=0.25)
            except TimeoutError:
                continue
            if message.get("type") != "output":
                continue
            data = str(message.get("data", ""))
            index = 0
            while index < len(data):
                match = re.match(r"\x1b\[([0-9;]*)([A-Za-z])", data[index:])
                if match:
                    params, command = match.groups()
                    if command == "H":
                        row, _, col = params.partition(";")
                        cursor_y = max(0, int(row or "1") - 1)
                        cursor_x = max(0, int(col or "1") - 1)
                    elif command == "n" and params == "6":
                        await session.input(
                            "keyboard",
                            {
                                "protocol": PROTOCOL,
                                "type": "input",
                                "data": f"\x1b[{cursor_y + 1};{cursor_x + 1}R",
                            },
                        )
                    index += len(match.group(0))
                    continue
                char = data[index]
                captured += char
                if char == "\r":
                    cursor_x = 0
                elif char == "\n":
                    cursor_y += 1
                elif char >= " ":
                    cursor_x += 1
                index += 1
            if not command_sent and ">" in captured:
                session.pty.write("PRINT 6*7\r")  # type: ignore[union-attr]
                command_sent = True
            if "42" in captured:
                return
    finally:
        await session.stop()
    pytest.fail(f"BBC BASIC Console did not return 42; output was {captured!r}")


@pytest.mark.skipif(
    not os.environ.get("UCODE_BBC_BASIC_CONSOLE_PATH"),
    reason="set UCODE_BBC_BASIC_CONSOLE_PATH for the real-engine acceptance test",
)
def test_real_console_accepts_immediate_command() -> None:
    asyncio.run(_run_console_probe())
