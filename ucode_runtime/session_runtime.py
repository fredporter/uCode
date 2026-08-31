"""Versioned WebSocket lifecycle for uCode shell, BBCSDL, and capsule sessions."""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
from pathlib import Path
from typing import Any, Mapping, Protocol

from aiohttp import WSMsgType, web

from .terminal_runtime import DEFAULT_COLS, DEFAULT_ROWS, LocalPtySession
from .software_library import launch_plan

PROTOCOL = "ucode-session/1"
VALID_SESSION_KINDS = {"shell", "bbcsdl", "capsule"}
VALID_INPUT_CHANNELS = {"keyboard", "pointer", "touch", "controller", "control"}
BBCSDL_BASRUN_ENV = "UCODE_BBCSDL_BASRUN_PATH"
BBC_BASIC_CONSOLE_ENV = "UCODE_BBC_BASIC_CONSOLE_PATH"


class SourceLoaderUnavailable(RuntimeError):
    """Raised when a valid BASIC source needs an unavailable bootstrap."""


class RuntimeSession(Protocol):
    kind: str

    async def start(self, message: Mapping[str, Any]) -> None: ...
    async def input(self, channel: str, message: Mapping[str, Any]) -> None: ...
    async def resize(self, message: Mapping[str, Any]) -> None: ...
    async def pause(self) -> None: ...
    async def resume(self) -> None: ...
    async def reset(self) -> None: ...
    async def stop(self) -> None: ...
    def status(self) -> Mapping[str, Any]: ...


def _message(message_type: str, **payload: Any) -> dict[str, Any]:
    return {"protocol": PROTOCOL, "type": message_type, **payload}


def error_message(code: str, message: str, *, recoverable: bool = True) -> dict[str, Any]:
    return _message("error", code=code, message=message, recoverable=recoverable)


def resolve_bbcsdl_executable(env: Mapping[str, str] | None = None) -> Path:
    """Resolve BBCSDL for the host route without referring to legacy repositories."""
    resolved_env = os.environ if env is None else env
    for name in ("UCODE_BBCSDL_PATH", "BBCSDL_PATH", "BBCOUT_BBCOUT_PATH"):
        value = resolved_env.get(name, "").strip()
        if not value:
            continue
        candidate = Path(value).expanduser()
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
        raise FileNotFoundError(f"{name} is not an executable BBCSDL engine: {candidate}")

    repo_root = Path(__file__).resolve().parents[1]
    for candidate in (
        repo_root / "runtimes/basic/bbcsdl/bbcsdl",
        repo_root / "runtimes/basic/bbcsdl/BBCBasic.app/Contents/Resources/bbcsdl",
        Path("/Applications/BBCBasic.app/Contents/Resources/bbcsdl"),
        Path.home() / "Applications/BBCBasic.app/Contents/Resources/bbcsdl",
    ):
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()

    for name in ("bbcsdl", "bbcbasic", "BBCBasic"):
        located = shutil.which(name)
        if located:
            return Path(located).resolve()

    raise FileNotFoundError(
        "BBCSDL is unavailable. Set UCODE_BBCSDL_PATH or install/package BBCSDL."
    )


def classify_basic_source(path: Path) -> str:
    """Classify a BASIC program as plain text or internal/tokenised data."""
    if path.suffix.lower() == ".bas":
        return "text"
    sample = path.read_bytes()[:8192]
    try:
        decoded = sample.decode("utf-8")
    except UnicodeDecodeError:
        return "tokenised"
    if any(ord(char) < 32 and char not in "\t\r\n" for char in decoded):
        return "tokenised"
    return "text"


def resolve_basrun_loader(env: Mapping[str, str] | None = None) -> Path:
    """Resolve the tokenised official-style helper used to run text sources."""
    resolved_env = os.environ if env is None else env
    configured = resolved_env.get(BBCSDL_BASRUN_ENV, "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file():
            return candidate.resolve()
        raise SourceLoaderUnavailable(
            f"{BBCSDL_BASRUN_ENV} does not point to a basrun.bbc file: {candidate}"
        )

    repo_root = Path(__file__).resolve().parents[1]
    for candidate in (
        repo_root / "runtimes/basic/bbcsdl/basrun.bbc",
        repo_root / "runtimes/basic/loaders/basrun.bbc",
    ):
        if candidate.is_file():
            return candidate.resolve()
    raise SourceLoaderUnavailable(
        "Plain-text BASIC requires a tokenised basrun.bbc helper. Set "
        f"{BBCSDL_BASRUN_ENV} or package it with the runtime."
    )


def resolve_console_executable(env: Mapping[str, str] | None = None) -> Path:
    """Resolve the official BBC BASIC Console Mode executable."""
    resolved_env = os.environ if env is None else env
    configured = resolved_env.get(BBC_BASIC_CONSOLE_ENV, "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
        raise FileNotFoundError(
            f"{BBC_BASIC_CONSOLE_ENV} is not an executable: {candidate}"
        )
    repo_root = Path(__file__).resolve().parents[1]
    for candidate in (
        repo_root / "runtimes/basic/console/bbcbasic",
        repo_root / "runtimes/basic/console/bbcbasic.exe",
    ):
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    for name in ("bbcbasic-console", "bbcbasic"):
        located = shutil.which(name)
        if located:
            return Path(located).resolve()
    raise FileNotFoundError(
        "BBC BASIC Console is unavailable. Set "
        f"{BBC_BASIC_CONSOLE_ENV} or package the official console runtime."
    )


def build_bbcsdl_launch(
    executable: Path,
    program: Path | None,
    env: Mapping[str, str] | None = None,
) -> tuple[list[str], str | None]:
    """Build a format-correct BBCSDL launch command without executing it."""
    args = [str(executable)]
    if program is None:
        return args, None
    source_format = classify_basic_source(program)
    if source_format == "text":
        args.extend((str(resolve_basrun_loader(env)), str(program)))
    else:
        args.append(str(program))
    return args, source_format


class BBCSDLProcessSession:
    """BBCSDL process lifecycle.

    BBCSDL is an SDL application. Text stdout is reported when an edition emits
    it, but framebuffer/grid capture is a separate adapter capability.
    """

    kind = "bbcsdl"

    def __init__(self, output_queue: asyncio.Queue[dict[str, Any]]) -> None:
        self.output_queue = output_queue
        self.process: asyncio.subprocess.Process | None = None
        self.reader_task: asyncio.Task[None] | None = None
        self.program: str | None = None
        self.source_format: str | None = None
        self.state = "stopped"

    async def start(self, message: Mapping[str, Any]) -> None:
        if self.process and self.process.returncode is None:
            return
        executable = resolve_bbcsdl_executable()
        program = message.get("program")
        program_path: Path | None = None
        if isinstance(program, str) and program:
            candidate = Path(program).expanduser().resolve()
            if not candidate.is_file():
                raise FileNotFoundError(f"BBCSDL program not found: {candidate}")
            self.program = str(candidate)
            program_path = candidate
        args, self.source_format = build_bbcsdl_launch(executable, program_path)

        self.state = "starting"
        self.process = await asyncio.create_subprocess_exec(
            *args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        self.state = "running"
        self.reader_task = asyncio.create_task(self._read_output())

    async def _read_output(self) -> None:
        assert self.process is not None
        assert self.process.stdout is not None
        while True:
            data = await self.process.stdout.read(4096)
            if not data:
                break
            await self.output_queue.put(
                _message(
                    "output",
                    channel="text",
                    data=data.decode("utf-8", errors="replace"),
                )
            )
        return_code = await self.process.wait()
        self.state = "stopped" if return_code == 0 else "error"
        await self.output_queue.put(
            _message("state", state=self.state, session=self.kind, returncode=return_code)
        )

    async def input(self, channel: str, message: Mapping[str, Any]) -> None:
        if channel != "keyboard":
            raise ValueError(f"BBCSDL {channel} input adapter is not implemented")
        if not self.process or not self.process.stdin:
            raise RuntimeError("BBCSDL session is not running")
        self.process.stdin.write(str(message.get("data", "")).encode("utf-8"))
        await self.process.stdin.drain()

    async def resize(self, message: Mapping[str, Any]) -> None:
        del message
        raise ValueError("BBCSDL resize adapter is not implemented")

    async def pause(self) -> None:
        raise ValueError("BBCSDL pause adapter is not implemented")

    async def resume(self) -> None:
        raise ValueError("BBCSDL resume adapter is not implemented")

    async def reset(self) -> None:
        program = self.program
        await self.stop()
        await self.start({"program": program})

    async def stop(self) -> None:
        if not self.process or self.process.returncode is not None:
            self.state = "stopped"
            return
        self.state = "stopping"
        self.process.terminate()
        try:
            await asyncio.wait_for(self.process.wait(), timeout=5)
        except TimeoutError:
            self.process.kill()
            await self.process.wait()
        if self.reader_task and self.reader_task is not asyncio.current_task():
            await self.reader_task
        self.state = "stopped"

    def status(self) -> Mapping[str, Any]:
        return {
            "state": self.state,
            "session": self.kind,
            "program": self.program,
            "source_format": self.source_format,
            "capabilities": {
                "keyboard": True,
                "pointer": False,
                "touch": False,
                "controller": False,
                "resize": False,
                "frame": False,
            },
        }


class BBCConsolePtySession:
    """BBC BASIC Console Mode hosted in the same PTY model as the shell."""

    kind = "bbcsdl"

    def __init__(self, output_queue: asyncio.Queue[dict[str, Any]]) -> None:
        self.output_queue = output_queue
        self.text_queue: asyncio.Queue[str] = asyncio.Queue()
        self.pty: LocalPtySession | None = None
        self.forward_task: asyncio.Task[None] | None = None
        self.ready_event = asyncio.Event()
        self.program: str | None = None
        self.source_format: str | None = None
        self.state = "stopped"
        self.cols = DEFAULT_COLS
        self.rows = DEFAULT_ROWS
        self.cursor_row = 1
        self.cursor_col = 1

    async def start(self, message: Mapping[str, Any]) -> None:
        if self.pty is not None:
            return
        executable = resolve_console_executable()
        cols = max(1, int(message.get("cols", DEFAULT_COLS)))
        rows = max(1, int(message.get("rows", DEFAULT_ROWS)))
        self.cols = cols
        self.rows = rows
        program = message.get("program")
        program_path: Path | None = None
        if isinstance(program, str) and program:
            program_path = Path(program).expanduser().resolve()
            if not program_path.is_file():
                raise FileNotFoundError(f"BBC BASIC program not found: {program_path}")
            if '"' in str(program_path):
                raise ValueError("BBC BASIC program paths cannot contain a quote")
            self.program = str(program_path)
            self.source_format = classify_basic_source(program_path)

        self.state = "starting"
        self.pty = LocalPtySession(
            self.text_queue,
            command=[str(executable)],
            cwd=program_path.parent if program_path else None,
            env_overrides={"TERM": "xterm"},
        )
        await self.pty.start(cols, rows)
        self.forward_task = asyncio.create_task(self._forward_output())
        try:
            await asyncio.wait_for(self.ready_event.wait(), timeout=5)
        except TimeoutError:
            await self.stop()
            raise RuntimeError("BBC BASIC Console did not present its prompt")
        self.state = "running"
        if program_path:
            # Console Mode LOAD accepts internal and plain-text programs. Using
            # immediate mode here avoids pretending text is directly runnable.
            self.pty.write(f'LOAD "{program_path}"\rRUN\r')

    async def _forward_output(self) -> None:
        while self.pty is not None:
            data = await self.text_queue.get()
            data = self._answer_cursor_queries(data)
            if ">" in data:
                self.ready_event.set()
            if data:
                await self.output_queue.put(_message("output", channel="text", data=data))

    def _answer_cursor_queries(self, data: str) -> str:
        """Answer console DSR queries inside the PTY and hide protocol chatter."""
        output: list[str] = []
        index = 0
        while index < len(data):
            if data.startswith("\x1b[6n", index):
                if self.pty is not None:
                    self.pty.write(f"\x1b[{self.cursor_row};{self.cursor_col}R")
                index += 4
                continue
            match = re.match(r"\x1b\[(\d*);?(\d*)H", data[index:])
            if match:
                self.cursor_row = min(self.rows, max(1, int(match.group(1) or 1)))
                self.cursor_col = min(self.cols, max(1, int(match.group(2) or 1)))
                output.append(match.group(0))
                index += len(match.group(0))
                continue
            char = data[index]
            output.append(char)
            if char == "\r":
                self.cursor_col = 1
            elif char == "\n":
                self.cursor_row = min(self.rows, self.cursor_row + 1)
            elif char >= " ":
                self.cursor_col = min(self.cols, self.cursor_col + 1)
            index += 1
        return "".join(output)

    async def input(self, channel: str, message: Mapping[str, Any]) -> None:
        if channel != "keyboard":
            raise ValueError(f"BBC BASIC Console {channel} input is not implemented")
        if self.pty is None:
            raise RuntimeError("BBC BASIC Console session is not running")
        self.pty.write(str(message.get("data", "")))

    async def resize(self, message: Mapping[str, Any]) -> None:
        if self.pty is None:
            raise RuntimeError("BBC BASIC Console session is not running")
        self.pty.resize(int(message.get("cols", DEFAULT_COLS)), int(message.get("rows", DEFAULT_ROWS)))

    async def pause(self) -> None:
        raise ValueError("BBC BASIC Console pause is not implemented")

    async def resume(self) -> None:
        raise ValueError("BBC BASIC Console resume is not implemented")

    async def reset(self) -> None:
        program = self.program
        await self.stop()
        await self.start({"program": program})

    async def stop(self) -> None:
        pty_session = self.pty
        self.pty = None
        if pty_session is not None:
            await pty_session.stop()
        if self.forward_task:
            self.forward_task.cancel()
            try:
                await self.forward_task
            except asyncio.CancelledError:
                pass
        self.forward_task = None
        self.ready_event = asyncio.Event()
        self.state = "stopped"

    def status(self) -> Mapping[str, Any]:
        return {
            "state": self.state,
            "session": self.kind,
            "engine": "console",
            "program": self.program,
            "source_format": self.source_format,
            "capabilities": {
                "keyboard": True,
                "pointer": False,
                "touch": False,
                "controller": False,
                "resize": True,
                "frame": False,
                "vdu_text": True,
            },
        }


class CapsuleConsoleSession(BBCConsolePtySession):
    """Catalogue-resolved capsule hosted by the canonical BBC Console PTY."""

    kind = "capsule"

    def __init__(self, output_queue: asyncio.Queue[dict[str, Any]]) -> None:
        super().__init__(output_queue)
        self.title_id: str | None = None

    async def start(self, message: Mapping[str, Any]) -> None:
        title_id = str(message.get("titleId", ""))
        try:
            plan = launch_plan(title_id)
        except KeyError as exc:
            raise ValueError(f"Unknown capsule: {title_id}") from exc
        if not plan["launchable"]:
            raise ValueError(f"Capsule is not launchable: {plan['reason']}")
        self.title_id = title_id
        await super().start({**message, "program": str(plan["entry"])})

    async def input(self, channel: str, message: Mapping[str, Any]) -> None:
        if channel == "keyboard":
            await super().input(channel, message)
            return
        if channel not in {"pointer", "touch", "controller"}:
            raise ValueError(f"Capsule {channel} input is not implemented")
        event = message.get("event")
        if not isinstance(event, Mapping):
            raise ValueError(f"Capsule {channel} input requires an event object")
        key = str(event.get("key", event.get("data", "")))
        key_map = {
            "Enter": "\r",
            "Backspace": "\x7f",
            "ArrowUp": "\x1b[A",
            "ArrowDown": "\x1b[B",
            "ArrowRight": "\x1b[C",
            "ArrowLeft": "\x1b[D",
        }
        data = key_map.get(key, key if len(key) == 1 else "")
        if not data:
            raise ValueError(f"Capsule {channel} event has no keyboard equivalent")
        await super().input("keyboard", {"data": data})

    def status(self) -> Mapping[str, Any]:
        status = dict(super().status())
        status.update(
            session=self.kind,
            titleId=self.title_id,
            capabilities={
                **dict(status["capabilities"]),
                "pointer": True,
                "touch": True,
                "controller": True,
            },
        )
        return status


async def dispatch_session_message(
    payload: Mapping[str, Any],
    session: RuntimeSession | None,
    output_queue: asyncio.Queue[dict[str, Any]],
) -> tuple[RuntimeSession | None, list[dict[str, Any]]]:
    """Validate and dispatch one protocol message; returns session and replies."""
    if payload.get("protocol") != PROTOCOL:
        return session, [error_message("invalid_protocol", f"Expected {PROTOCOL}")]

    event_type = str(payload.get("type", ""))
    if event_type == "start":
        kind = str(payload.get("session", ""))
        if kind not in VALID_SESSION_KINDS:
            return session, [error_message("invalid_session", f"Unsupported session: {kind}")]
        if kind == "shell":
            return session, [error_message("unsupported_session", f"{kind} uses another route")]
        if session is None:
            engine = str(payload.get("engine", "console" if kind == "capsule" else "sdl"))
            if kind == "capsule":
                session = CapsuleConsoleSession(output_queue)
            elif engine == "console":
                session = BBCConsolePtySession(output_queue)
            elif engine == "sdl":
                session = BBCSDLProcessSession(output_queue)
            else:
                return session, [
                    error_message("invalid_engine", f"Unsupported BBC BASIC engine: {engine}")
                ]
        try:
            await session.start(payload)
        except FileNotFoundError as exc:
            return session, [
                _message("state", state="unavailable", session=kind),
                error_message("engine_unavailable", str(exc)),
            ]
        except SourceLoaderUnavailable as exc:
            return session, [
                _message("state", state="unavailable", session=kind),
                error_message("source_loader_unavailable", str(exc)),
            ]
        except (RuntimeError, ValueError) as exc:
            return session, [error_message("unsupported_operation", str(exc))]
        return session, [_message("state", **dict(session.status()))]

    if event_type == "status":
        if session is None:
            return None, [_message("state", state="stopped", session=None)]
        return session, [_message("state", **dict(session.status()))]

    if session is None:
        return None, [error_message("session_not_started", "Send start before this event")]

    try:
        if event_type == "input":
            channel = str(payload.get("channel", ""))
            if channel not in VALID_INPUT_CHANNELS:
                raise ValueError(f"Unsupported input channel: {channel}")
            await session.input(channel, payload)
        elif event_type == "resize":
            await session.resize(payload)
        elif event_type == "pause":
            await session.pause()
        elif event_type == "resume":
            await session.resume()
        elif event_type == "reset":
            await session.reset()
        elif event_type == "stop":
            await session.stop()
            return session, [_message("state", **dict(session.status()))]
        else:
            return session, [error_message("unsupported_event", f"Unsupported event: {event_type}")]
    except (RuntimeError, ValueError) as exc:
        return session, [error_message("unsupported_operation", str(exc))]
    return session, []


async def _send_session_output(
    ws: web.WebSocketResponse,
    output_queue: asyncio.Queue[dict[str, Any]],
) -> None:
    """Forward runtime output until the client closes its transport."""
    while not ws.closed:
        payload = await output_queue.get()
        if ws.closed:
            return
        try:
            await ws.send_json(payload)
        except (ConnectionResetError, RuntimeError):
            # A browser refresh, network transition, or host shutdown may close
            # the transport between the closed check and the actual write.
            return


async def handle_ucode_session_ws(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(request)
    output_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    session: RuntimeSession | None = None

    sender = asyncio.create_task(_send_session_output(ws, output_queue))
    await ws.send_json(_message("state", state="probing", session=None))
    try:
        async for message in ws:
            if message.type == WSMsgType.TEXT:
                try:
                    payload = json.loads(message.data)
                except json.JSONDecodeError:
                    await ws.send_json(error_message("invalid_message", "Invalid JSON"))
                    continue
                session, replies = await dispatch_session_message(payload, session, output_queue)
                for reply in replies:
                    await ws.send_json(reply)
            elif message.type == WSMsgType.ERROR:
                break
    finally:
        if session is not None:
            await session.stop()
        sender.cancel()
        try:
            await sender
        except asyncio.CancelledError:
            pass
    return ws
