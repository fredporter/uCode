"""Runtime-backed terminal WebSocket for uCode surfaces."""

from __future__ import annotations

import asyncio
import fcntl
import json
import os
import pty
import shlex
import shutil
import signal
import struct
import subprocess
import tempfile
import termios
from pathlib import Path
from typing import Any, Mapping, Sequence

from aiohttp import WSMsgType, web

DEFAULT_COLS = 40
DEFAULT_ROWS = 25
DEFAULT_SHELL = os.environ.get("SHELL", "/bin/zsh")
REPO_ROOT = Path(__file__).resolve().parents[1]


def resolve_terminal_basic_command(env: dict[str, str] | None = None) -> Path | None:
    """Find the BBC BASIC Console executable exposed as `basic` in the PTY."""
    resolved_env = os.environ if env is None else env
    configured = resolved_env.get("UCODE_BBC_BASIC_CONSOLE_PATH", "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
        return None
    for candidate in (
        REPO_ROOT / "runtimes/basic/console/bbcbasic",
        REPO_ROOT / "runtimes/basic/console/bbcbasic.exe",
    ):
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    located = shutil.which("bbcbasic")
    return Path(located).resolve() if located else None


def _minimal_prompt_env() -> dict[str, str]:
    """Environment overrides that render a single-character prompt (no path).

    zsh reads PROMPT from its startup file, so point ZDOTDIR at a minimal
    .zshrc. PS1 covers bash and other Bourne-style shells.
    """
    zsh_dir = Path(tempfile.gettempdir()) / "ucode-shell"
    zsh_dir.mkdir(parents=True, exist_ok=True)
    rc_file = zsh_dir / ".zshrc"
    basic_command = resolve_terminal_basic_command()
    if basic_command:
        quoted_command = shlex.quote(str(basic_command))
        basic_function = (
            f"basic() {{ command {quoted_command} \"$@\" }}\n"
            'bbcbasic() { basic "$@" }\n'
        )
    else:
        basic_function = (
            "basic() { print -u2 'BBC BASIC Console is not installed; "
            "set UCODE_BBC_BASIC_CONSOLE_PATH'; return 127 }\n"
            'bbcbasic() { basic "$@" }\n'
        )
    rc_file.write_text(
        'PROMPT="> " RPROMPT=""\n' + basic_function,
        encoding="utf-8",
    )
    return {"ZDOTDIR": str(zsh_dir), "PS1": "> "}


class LocalPtySession:
    def __init__(
        self,
        output_queue: asyncio.Queue[str],
        command: Sequence[str] | None = None,
        cwd: Path | None = None,
        env_overrides: Mapping[str, str] | None = None,
    ) -> None:
        self.output_queue = output_queue
        self.command = list(command) if command else None
        self.cwd = cwd or REPO_ROOT
        self.env_overrides = dict(env_overrides or {})
        self.master_fd: int | None = None
        self.process: subprocess.Popen[bytes] | None = None

    async def start(self, cols: int = DEFAULT_COLS, rows: int = DEFAULT_ROWS) -> None:
        if self.process is not None:
            return

        master_fd, slave_fd = pty.openpty()
        self.master_fd = master_fd
        self._set_window_size(cols, rows)

        shell_parts = self.command or shlex.split(DEFAULT_SHELL) or ["/bin/zsh"]
        inherited_term = os.environ.get("TERM", "xterm-256color")
        if inherited_term in {"", "dumb", "unknown"}:
            inherited_term = "xterm-256color"
        env = {
            **os.environ,
            "TERM": inherited_term,
            "COLORTERM": os.environ.get("COLORTERM", "truecolor"),
            **_minimal_prompt_env(),
            **self.env_overrides,
        }
        self.process = subprocess.Popen(
            shell_parts,
            cwd=self.cwd,
            env=env,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            start_new_session=True,
            close_fds=True,
        )
        os.close(slave_fd)
        os.set_blocking(master_fd, False)
        asyncio.get_running_loop().add_reader(master_fd, self._read_ready)

    def write(self, data: str) -> None:
        if self.master_fd is None:
            return
        os.write(self.master_fd, data.encode("utf-8", errors="replace"))

    def resize(self, cols: int, rows: int) -> None:
        self._set_window_size(cols, rows)

    async def stop(self) -> None:
        if self.master_fd is not None:
            try:
                asyncio.get_running_loop().remove_reader(self.master_fd)
            except Exception:
                pass

        if self.process is not None and self.process.poll() is None:
            try:
                os.killpg(self.process.pid, signal.SIGTERM)
                await asyncio.to_thread(self.process.wait, 1)
            except Exception:
                try:
                    os.killpg(self.process.pid, signal.SIGKILL)
                except Exception:
                    pass

        if self.master_fd is not None:
            try:
                os.close(self.master_fd)
            except OSError:
                pass

        self.master_fd = None
        self.process = None

    def _read_ready(self) -> None:
        if self.master_fd is None:
            return
        while True:
            try:
                data = os.read(self.master_fd, 4096)
            except BlockingIOError:
                return
            except OSError:
                return
            if not data:
                return
            self.output_queue.put_nowait(data.decode("utf-8", errors="replace"))

    def _set_window_size(self, cols: int, rows: int) -> None:
        if self.master_fd is None:
            return
        packed_size = struct.pack("HHHH", max(1, rows), max(1, cols), 0, 0)
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, packed_size)


async def _send_terminal_output(
    ws: web.WebSocketResponse,
    output_queue: asyncio.Queue[str],
) -> None:
    """Forward PTY output until a browser closes or loses its transport."""
    while not ws.closed:
        data = await output_queue.get()
        if ws.closed:
            return
        try:
            await ws.send_json({"type": "output", "data": data})
        except (ConnectionResetError, RuntimeError):
            return


async def handle_terminal_runtime_ws(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(request)

    output_queue: asyncio.Queue[str] = asyncio.Queue()
    session = LocalPtySession(output_queue)
    await session.start()
    await ws.send_json(
        {
            "type": "ready",
            "runtime": "shell+bbc-basic",
            "cols": DEFAULT_COLS,
            "rows": DEFAULT_ROWS,
        },
    )

    sender = asyncio.create_task(_send_terminal_output(ws, output_queue))
    try:
        async for message in ws:
            if message.type == WSMsgType.TEXT:
                await _handle_runtime_message(message.data, session, ws)
            elif message.type == WSMsgType.ERROR:
                break
    finally:
        sender.cancel()
        await session.stop()
        try:
            await sender
        except asyncio.CancelledError:
            pass

    return ws


async def _handle_runtime_message(
    raw_message: str,
    session: LocalPtySession,
    ws: web.WebSocketResponse,
) -> None:
    try:
        payload: dict[str, Any] = json.loads(raw_message)
    except json.JSONDecodeError:
        await ws.send_json({"type": "error", "message": "Invalid terminal runtime message"})
        return

    event_type = payload.get("type")
    if event_type == "input":
        session.write(str(payload.get("data", "")))
    elif event_type == "resize":
        session.resize(int(payload.get("cols", DEFAULT_COLS)), int(payload.get("rows", DEFAULT_ROWS)))
    elif event_type == "stop":
        await ws.close(code=1000, message=b"Terminal runtime stopped")
    else:
        await ws.send_json({"type": "error", "message": f"Unsupported terminal event: {event_type}"})
