"""
BBCSDL Bridge — spawn and manage the BBC BASIC runtime process.

Provides a subprocess-based IPC bridge to bbcsdl, supporting:
  - stdin/stdout pipe communication
  - program upload and execution
  - LENS/SKIN hook dispatch
  - variable register snapshots
"""

import os
import shlex
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Callable, Mapping, Optional, Sequence

BBCOUT_CHUNK_SIZE = 4096
BBCSDL_PATH_ENV = "UCODE_BBCSDL_PATH"
BBCSDL_ARGS_ENV = "UCODE_BBCSDL_ARGS"
LEGACY_BBCSDL_PATH_ENVS = ("BBCSDL_PATH", "BBCOUT_BBCOUT_PATH")


def _is_executable_file(path: Path) -> bool:
    return path.is_file() and os.access(path, os.X_OK)


def _configured_bbcsdl_path(env: Mapping[str, str]) -> Path | None:
    for name in (BBCSDL_PATH_ENV, *LEGACY_BBCSDL_PATH_ENVS):
        raw = env.get(name, "").strip()
        if not raw:
            continue
        candidate = Path(raw).expanduser()
        if _is_executable_file(candidate):
            return candidate.resolve()
        raise FileNotFoundError(
            f"{name} points to a missing or non-executable BBCSDL engine: {candidate}"
        )
    return None


def find_bbcsdl(env: Mapping[str, str] | None = None) -> Path:
    """Locate an executable BBCSDL engine without relying on legacy repos."""
    resolved_env = os.environ if env is None else env
    configured = _configured_bbcsdl_path(resolved_env)
    if configured is not None:
        return configured

    # Packaged engine beside the bridge.
    pkg_root = Path(__file__).resolve().parent.parent / "bbcsdl"
    packaged_candidates = (
        pkg_root / "bbcsdl",
        pkg_root / "bbcsdl.exe",
        pkg_root / "BBCBasic.app" / "Contents" / "MacOS" / "BBCBasic",
    )
    for binary in packaged_candidates:
        if _is_executable_file(binary):
            return binary.resolve()

    # Normal system installation.
    for name in ("bbcsdl", "bbcbasic", "BBCBasic"):
        candidate = shutil.which(name)
        if candidate:
            return Path(candidate).resolve()

    # Conventional macOS application locations.
    for binary in (
        Path("/Applications/BBCBasic.app/Contents/MacOS/BBCBasic"),
        Path.home() / "Applications/BBCBasic.app/Contents/MacOS/BBCBasic",
    ):
        if _is_executable_file(binary):
            return binary.resolve()

    raise FileNotFoundError(
        "Cannot locate BBCSDL. Set UCODE_BBCSDL_PATH to an executable engine, "
        "install it on PATH, or package it under runtimes/basic/bbcsdl/."
    )


# Backward-compatible private name for callers outside this module.
_find_bbcsdl = find_bbcsdl


class BBCSDLProcess:
    """
    Manage a single bbcsdl subprocess with line-oriented output dispatch.
    """

    def __init__(
        self,
        binary_path: Optional[Path] = None,
        launch_args: Optional[Sequence[str]] = None,
        cwd: Optional[Path] = None,
        env: Optional[Mapping[str, str]] = None,
    ):
        self._bin = Path(binary_path).resolve() if binary_path else find_bbcsdl(env)
        if not _is_executable_file(self._bin):
            raise FileNotFoundError(f"BBCSDL engine is not executable: {self._bin}")
        configured_args = shlex.split((env or os.environ).get(BBCSDL_ARGS_ENV, ""))
        self._launch_args = list(launch_args) if launch_args is not None else configured_args
        self._cwd = Path(cwd).resolve() if cwd else None
        self._env = dict(env) if env is not None else None
        self._proc: Optional[subprocess.Popen] = None
        self._reader_thread: Optional[threading.Thread] = None
        self._running = False
        self._on_line: Optional[Callable[[str], None]] = None

    @property
    def running(self) -> bool:
        return self._running and self._proc is not None and self._proc.poll() is None

    @property
    def binary_path(self) -> Path:
        return self._bin

    def start(self, on_line: Optional[Callable[[str], None]] = None) -> None:
        """Launch the configured BBCSDL engine and stream its text output."""
        if self.running:
            return

        self._on_line = on_line
        self._proc = subprocess.Popen(
            [str(self._bin), *self._launch_args],
            cwd=str(self._cwd) if self._cwd else None,
            env=self._env,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        self._running = True
        self._reader_thread = threading.Thread(target=self._read_loop, daemon=True)
        self._reader_thread.start()

    def stop(self) -> None:
        """Terminate the bbcsdl process cleanly."""
        self._running = False
        if self._proc:
            try:
                self._proc.terminate()
                self._proc.wait(timeout=5)
            except (subprocess.TimeoutExpired, OSError):
                self._proc.kill()
                self._proc.wait(timeout=5)
            self._proc = None
        if self._reader_thread and self._reader_thread.is_alive():
            self._reader_thread.join(timeout=1)
        self._reader_thread = None

    def send(self, line: str) -> None:
        """Write a line into bbcsdl stdin."""
        if self._proc and self._proc.stdin:
            self._proc.stdin.write(line + "\n")
            self._proc.stdin.flush()

    def send_input(self, data: str) -> None:
        """Write raw session input without adding a newline."""
        if self._proc and self._proc.stdin:
            self._proc.stdin.write(data)
            self._proc.stdin.flush()

    def send_program(self, source: str) -> None:
        """Feed a multi-line BASIC program into the engine."""
        for line in source.splitlines():
            self.send(line)
        self.send("RUN")

    def _read_loop(self) -> None:
        """Drain stdout and dispatch each line."""
        while self._running and self._proc and self._proc.stdout:
            line = self._proc.stdout.readline()
            if not line:
                self._running = False
                break
            stripped = line.rstrip("\n\r")
            if self._on_line:
                self._on_line(stripped)
