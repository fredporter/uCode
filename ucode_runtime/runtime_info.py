"""Runtime capability manifest for hosts and user-facing clients."""

from __future__ import annotations

from pathlib import Path

from aiohttp import web


RUNTIME_CONTRACT = "ucode-runtime/1"
RUNTIME_REVISION = "2026-11-09.1"


def runtime_info() -> dict[str, object]:
    """Describe the loaded runtime contract without exposing host internals."""
    return {
        "format": RUNTIME_CONTRACT,
        "revision": RUNTIME_REVISION,
        "protocols": ["ucode-session/1"],
        "capabilities": [
            "terminal.basic-immediate",
            "terminal.bbcbasic-console",
            "teletext.reader",
            "software-library.catalogue",
            "software-library.title-detail",
            "software-library.probe",
            "software-library.verify",
            "software-library.launch",
        ],
        "provider": "ucode",
        "loadedFrom": str(Path(__file__).resolve().parent),
    }


def language_reference() -> dict[str, object]:
    """Describe the actual language owner and shipped examples, not a shell vocabulary."""
    from .terminal_runtime import REPO_ROOT, resolve_terminal_basic_command
    examples = []
    for path in sorted((REPO_ROOT / "runtimes/basic/examples").glob("[0-9]*.bas"))[:3]:
        examples.append({"name": path.name, "source": path.read_text(encoding="utf-8")[:3000]})
    return {"language": "uCode / BBC BASIC", "authority": "official-bbc-basic-console", "available": resolve_terminal_basic_command() is not None, "examples": examples,
            "boundary": "BASIC syntax runs in the language engine. Vault/workflow capabilities require registered, documented bridges; host shell commands are not uCode statements."}


async def handle_language_reference(request: web.Request) -> web.Response:
    return web.json_response(language_reference())


async def handle_runtime_info(request: web.Request) -> web.Response:
    return web.json_response(runtime_info())


def register_runtime_info_routes(app: web.Application) -> None:
    app.router.add_get("/api/ucode/info", handle_runtime_info)
    app.router.add_get("/api/ucode/language", handle_language_reference)

