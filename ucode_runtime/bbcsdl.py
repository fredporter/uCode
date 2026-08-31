"""BBCSDL runtime bridge provider."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from aiohttp import web

log = logging.getLogger("ucode_runtime.bbcsdl")
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BRIDGE_PATH = REPO_ROOT / "runtimes/basic/bridge/gridcore_adapter.py"

PAGE_COLS = 48
PAGE_ROWS = 36


def _resolve_bridge_path() -> Path:
    configured = os.environ.get("UCORE_BBCSDL_BRIDGE_PATH")
    return Path(configured).expanduser() if configured else DEFAULT_BRIDGE_PATH


def _convert_grid_to_ceefax(
    grid: list[list[Any]], cols: int, rows: int, page_number: int, title: str,
) -> list[list[dict]]:
    buf = [[{"char": " ", "fg": 7, "bg": 0} for _ in range(PAGE_COLS)] for _ in range(PAGE_ROWS)]

    def write_str(row: int, col: int, text: str, fg: int = 7, bg: int = 0, bold: bool = False) -> None:
        for i, ch in enumerate(text):
            c = col + i
            if c < PAGE_COLS:
                buf[row][c] = {"char": ch, "fg": fg, "bg": bg, "bold": bold}

    def fill_row(row: int, ch: str = " ", fg: int = 7, bg: int = 0) -> None:
        for c in range(PAGE_COLS):
            buf[row][c] = {"char": ch, "fg": fg, "bg": bg}

    fill_row(0, " ", 7, 4)
    write_str(0, 2, f"CEETEX {page_number}", 7, 4)
    write_str(0, 28, f"P{page_number}", 7, 4)
    display_title = title[:24] if len(title) > 24 else title
    write_str(2, 4, "\u2554" + "\u2550" * 26 + "\u2557", 3, 0, True)
    write_str(3, 4, "\u2551" + f"  {display_title:24s}" + "\u2551", 3, 0, True)
    write_str(4, 4, "\u255a" + "\u2550" * 26 + "\u255d", 3, 0, True)

    for row_idx, row_data in enumerate(grid[: PAGE_ROWS - 6]):
        target_row = 6 + row_idx
        for col_idx, cell in enumerate(row_data[: PAGE_COLS - 4]):
            target_col = 4 + col_idx
            if isinstance(cell, dict):
                buf[target_row][target_col] = {
                    "char": cell.get("char", " "),
                    "fg": cell.get("fg", 7),
                    "bg": cell.get("bg", 0),
                    "bold": cell.get("bold", False),
                }
            elif isinstance(cell, str):
                buf[target_row][target_col] = {"char": cell, "fg": 7, "bg": 0}

    fill_row(24, " ", 7, 1)
    now_str = datetime.now(UTC).strftime("%a %d %b %Y  %H:%M:%S")
    write_str(24, 2, f"CEETEX {page_number}  {display_title}  {now_str}", 7, 1)
    return buf


def register_bbcsdl_routes(app: web.Application, ceefax_store: Any) -> None:
    async def handle_exec(request: web.Request) -> web.Response:
        try:
            bridge_path = _resolve_bridge_path()
            body = await request.json()
            command = body.get("command", "")
            if not command:
                return web.json_response({"error": "Missing command"})

            if not bridge_path.is_file():
                return web.json_response({"error": f"Bridge not found at {bridge_path}"})

            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                str(bridge_path),
                "exec",
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
                return web.json_response(
                    {
                        "stdout": stdout.decode("utf-8", errors="replace"),
                        "stderr": stderr.decode("utf-8", errors="replace"),
                        "returncode": proc.returncode,
                    },
                )
            except TimeoutError:
                proc.kill()
                return web.json_response({"error": "Command timed out after 30s"})
        except Exception as exc:
            log.exception("bbcsdl.handle_exec failed")
            return web.json_response({"error": str(exc)})

    async def handle_teletext_get(_request: web.Request) -> web.Response:
        try:
            bridge_path = _resolve_bridge_path()
            if not bridge_path.is_file():
                return web.json_response(
                    {
                        "grid": [],
                        "cols": 40,
                        "rows": 25,
                        "title": "BBCSDL (Offline)",
                        "error": "Bridge not found",
                    },
                )

            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                str(bridge_path),
                "teletext",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15.0)
                if proc.returncode == 0 and stdout:
                    try:
                        return web.json_response(json.loads(stdout.decode("utf-8")))
                    except json.JSONDecodeError:
                        pass
                return web.json_response(
                    {
                        "grid": [],
                        "cols": 40,
                        "rows": 25,
                        "title": "BBCSDL (No Output)",
                        "stderr": stderr.decode("utf-8", errors="replace"),
                    },
                )
            except TimeoutError:
                proc.kill()
                return web.json_response(
                    {
                        "grid": [],
                        "cols": 40,
                        "rows": 25,
                        "title": "BBCSDL (Timeout)",
                        "error": "Teletext capture timed out",
                    },
                )
        except Exception as exc:
            log.exception("bbcsdl.handle_teletext_get failed")
            return web.json_response(
                {
                    "grid": [],
                    "cols": 40,
                    "rows": 25,
                    "title": "BBCSDL (Error)",
                    "error": str(exc),
                },
            )

    async def handle_teletext_set(request: web.Request) -> web.Response:
        try:
            body = await request.json()
            grid = body.get("grid", [])
            cols, rows = body.get("cols", 40), body.get("rows", 25)
            title = body.get("title", "BBCSDL Live")
            page_number = body.get("page", 700)

            buffer = _convert_grid_to_ceefax(grid, cols, rows, page_number, title)
            ceefax_store.set(
                page_number,
                {
                    "number": page_number,
                    "title": title,
                    "buffer": buffer,
                    "last_updated": datetime.now(UTC).isoformat(),
                    "source": "bbcsdl",
                },
            )
            return web.json_response({"status": "ok", "page": page_number, "title": title})
        except Exception as exc:
            log.exception("bbcsdl.handle_teletext_set failed")
            return web.json_response({"error": str(exc)})

    app.router.add_post("/api/bbcsdl/exec", handle_exec)
    app.router.add_get("/api/bbcsdl/teletext", handle_teletext_get)
    app.router.add_post("/api/bbcsdl/teletext", handle_teletext_set)
