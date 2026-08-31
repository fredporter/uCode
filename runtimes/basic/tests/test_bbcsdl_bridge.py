"""BBCSDL discovery and process lifecycle tests using a local fake engine."""

from __future__ import annotations

import stat
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bridge.bbcsdl_bridge import BBCSDLProcess, find_bbcsdl  # noqa: E402


def _fake_engine(tmp_path: Path) -> Path:
    engine = tmp_path / "fake-bbcsdl"
    engine.write_text(
        "#!/usr/bin/env python3\n"
        "import sys\n"
        "print('READY', flush=True)\n"
        "for line in sys.stdin:\n"
        "    value = line.rstrip('\\r\\n')\n"
        "    print('OUT:' + value, flush=True)\n",
        encoding="utf-8",
    )
    engine.chmod(engine.stat().st_mode | stat.S_IXUSR)
    return engine


def test_find_bbcsdl_uses_canonical_environment_variable(tmp_path: Path) -> None:
    engine = _fake_engine(tmp_path)
    assert find_bbcsdl({"UCODE_BBCSDL_PATH": str(engine)}) == engine.resolve()


def test_find_bbcsdl_rejects_invalid_configured_path(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="UCODE_BBCSDL_PATH"):
        find_bbcsdl({"UCODE_BBCSDL_PATH": str(tmp_path / "missing")})


def test_process_streams_output_and_accepts_line_input(tmp_path: Path) -> None:
    engine = _fake_engine(tmp_path)
    output: list[str] = []
    received = threading.Event()

    def on_line(line: str) -> None:
        output.append(line)
        if line == "OUT:PRINT 42":
            received.set()

    process = BBCSDLProcess(binary_path=engine)
    process.start(on_line=on_line)
    try:
        process.send("PRINT 42")
        assert received.wait(timeout=2), output
        assert process.running
        assert output[0] == "READY"
    finally:
        process.stop()

    assert not process.running


def test_process_does_not_assume_unverified_headless_flag(tmp_path: Path) -> None:
    engine = _fake_engine(tmp_path)
    process = BBCSDLProcess(binary_path=engine)
    assert process._launch_args == []
