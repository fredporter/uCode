"""Runtime capability manifest for hosts and user-facing clients."""

from __future__ import annotations

from pathlib import Path

from aiohttp import web


RUNTIME_CONTRACT = "ucode-runtime/1"
RUNTIME_REVISION = "2026-08-30.1"


def runtime_info() -> dict[str, object]:
    """Describe the loaded runtime contract without exposing host internals."""
    return {
        "format": RUNTIME_CONTRACT,
        "revision": RUNTIME_REVISION,
        "protocols": ["ucode-session/1"],
        "capabilities": [
            "terminal.shell",
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


async def handle_runtime_info(request: web.Request) -> web.Response:
    return web.json_response(runtime_info())


def register_runtime_info_routes(app: web.Application) -> None:
    app.router.add_get("/api/ucode/info", handle_runtime_info)

