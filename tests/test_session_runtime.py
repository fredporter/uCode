"""Unit coverage for ucode-session/1 without binding network ports."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from ucode_runtime.session_runtime import (
    PROTOCOL,
    SourceLoaderUnavailable,
    build_bbcsdl_launch,
    classify_basic_source,
    dispatch_session_message,
    _send_session_output,
    resolve_console_executable,
)


class ClosingWebSocket:
    closed = False

    async def send_json(self, payload) -> None:
        raise ConnectionResetError("transport closed")


def test_output_sender_treats_client_disconnect_as_normal() -> None:
    async def exercise() -> None:
        queue = asyncio.Queue()
        await queue.put({"type": "output", "data": "hello"})
        await _send_session_output(ClosingWebSocket(), queue)  # type: ignore[arg-type]

    asyncio.run(exercise())


def run(message, session=None):
    queue = asyncio.Queue()
    return asyncio.run(dispatch_session_message(message, session, queue))


def test_rejects_wrong_protocol() -> None:
    _, replies = run({"protocol": "old", "type": "status"})
    assert replies[0]["code"] == "invalid_protocol"


def test_status_before_start_is_stopped() -> None:
    _, replies = run({"protocol": PROTOCOL, "type": "status"})
    assert replies == [
        {"protocol": PROTOCOL, "type": "state", "state": "stopped", "session": None}
    ]


def test_rejects_unknown_session_kind() -> None:
    _, replies = run(
        {"protocol": PROTOCOL, "type": "start", "session": "unknown"}
    )
    assert replies[0]["code"] == "invalid_session"


def test_shell_uses_existing_terminal_route() -> None:
    _, replies = run({"protocol": PROTOCOL, "type": "start", "session": "shell"})
    assert replies[0]["code"] == "unsupported_session"


def test_requires_start_before_input() -> None:
    _, replies = run(
        {
            "protocol": PROTOCOL,
            "type": "input",
            "channel": "keyboard",
            "data": "PRINT 42",
        }
    )
    assert replies[0]["code"] == "session_not_started"


def test_classifies_plain_text_even_with_bbc_extension(tmp_path: Path) -> None:
    source = tmp_path / "modern.bbc"
    source.write_text('PRINT "HELLO"\n', encoding="utf-8")
    assert classify_basic_source(source) == "text"


def test_classifies_internal_program_data(tmp_path: Path) -> None:
    source = tmp_path / "legacy.bbc"
    source.write_bytes(b"\r\x00\x0a\x10PRINT\xf1\x00")
    assert classify_basic_source(source) == "tokenised"


def test_tokenised_source_runs_directly(tmp_path: Path) -> None:
    engine = tmp_path / "bbcsdl"
    source = tmp_path / "legacy.bbc"
    source.write_bytes(b"\x00\xffBBC")
    args, source_format = build_bbcsdl_launch(engine, source, {})
    assert args == [str(engine), str(source)]
    assert source_format == "tokenised"


def test_text_source_runs_through_configured_basrun(tmp_path: Path) -> None:
    engine = tmp_path / "bbcsdl"
    loader = tmp_path / "basrun.bbc"
    loader.write_bytes(b"tokenised")
    source = tmp_path / "modern.bas"
    source.write_text("PRINT 42\n", encoding="utf-8")
    args, source_format = build_bbcsdl_launch(
        engine, source, {"UCODE_BBCSDL_BASRUN_PATH": str(loader)}
    )
    assert args == [str(engine), str(loader.resolve()), str(source)]
    assert source_format == "text"


def test_text_source_fails_clearly_without_basrun(tmp_path: Path) -> None:
    source = tmp_path / "modern.bas"
    source.write_text("PRINT 42\n", encoding="utf-8")
    with pytest.raises(SourceLoaderUnavailable, match="basrun.bbc"):
        build_bbcsdl_launch(tmp_path / "bbcsdl", source, {})


def test_console_uses_canonical_environment_variable(tmp_path: Path) -> None:
    engine = tmp_path / "bbcbasic"
    engine.write_text("#!/bin/sh\n", encoding="utf-8")
    engine.chmod(0o755)
    assert resolve_console_executable(
        {"UCODE_BBC_BASIC_CONSOLE_PATH": str(engine)}
    ) == engine.resolve()


def test_rejects_unknown_bbc_basic_engine() -> None:
    _, replies = run(
        {
            "protocol": PROTOCOL,
            "type": "start",
            "session": "bbcsdl",
            "engine": "unknown",
        }
    )
    assert replies[0]["code"] == "invalid_engine"


def test_unknown_capsule_is_rejected_without_accepting_a_host_path() -> None:
    _, replies = run(
        {
            "protocol": PROTOCOL,
            "type": "start",
            "session": "capsule",
            "titleId": "../../private-file",
        }
    )
    assert replies[0]["code"] == "unsupported_operation"
    assert replies[0]["message"] == "Unknown capsule: ../../private-file"


def test_configured_capsule_cannot_bypass_verification() -> None:
    _, replies = run(
        {
            "protocol": PROTOCOL,
            "type": "start",
            "session": "capsule",
            "titleId": "eamon",
        }
    )
    assert replies[0]["code"] == "unsupported_operation"
    assert replies[0]["message"] == (
        "Capsule is not launchable: Compatibility evidence is not recorded"
    )
