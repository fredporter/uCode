"""
GridCore Adapter -- Python-side bridge to GridCore frontend surfaces.

Provides a clean JSON API that the TypeScript RuntimeBridge can call
to dispatch commands and load teletext pages. This adapter wraps the
existing uCode CLI command dispatch into a structured protocol.

Protocol (JSON-RPC 2.0 style):
  Request:  { "method": "dispatch", "params": { "command": "HELP" } }
  Response: { "status": "ok", "output": "Commands: HELP BEEP ..." }

  Request:  { "method": "teletext_page", "params": { "page": 100 } }
  Response: { "status": "ok", "page": { ... TeletextPage JSON ... } }
"""

from __future__ import annotations

import importlib.util
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from .session_state import SessionState, get_session
except ImportError:  # Direct script/test import from the bridge directory.
    from session_state import SessionState, get_session


# ── Data types (match TypeScript TeletextPage) ──────────────────


@dataclass
class FastTextLink:
    color: str  # 'red' | 'green' | 'yellow' | 'cyan'
    label: str
    page: int


@dataclass
class TeletextPage:
    page: int
    title: str
    date: str = ""
    header: str = ""
    content: List[str] = field(default_factory=list)
    fasttext: List[FastTextLink] = field(default_factory=list)
    subpage: int = 0
    flags: Dict[str, bool] = field(default_factory=dict)


# ── Vault lookup ────────────────────────────────────────────────


def _load_vault_config() -> Dict[str, Any]:
    """Load vault.yaml from config."""
    vault_path = Path("config/vault.yaml")
    if vault_path.exists():
        try:
            import yaml

            with open(vault_path) as fh:
                return yaml.safe_load(fh) or {}
        except Exception:
            pass
    return {}


# ── LENS Program Registry ────────────────────────────────────────

_LENS_PROGRAMS: Dict[str, str] = {
    "repton": "repton_lens",
    "elite": "elite_lens",
    "nethack": "nethack_lens",
    "eamon": "eamon_lens",
    "uconstruct": "uconstruct_lens",
    "knight-orc": "knight_orc_lens",
    "apple-panic": "apple_panic_lens",
}

_REPO_ROOT = Path(__file__).resolve().parents[3]
_LENS_MODULE_FILES: Dict[str, Path] = {
    "repton": _REPO_ROOT / "programs" / "repton" / "lens" / "repton_lens.py",
    "elite": _REPO_ROOT / "programs" / "elite" / "lens" / "elite_lens.py",
    "nethack": _REPO_ROOT / "programs" / "nethack" / "lens" / "nethack_lens.py",
    "eamon": _REPO_ROOT / "programs" / "eamon" / "lens" / "eamon_lens.py",
    "uconstruct": _REPO_ROOT / "programs" / "uconstruct" / "lens" / "uconstruct_lens.py",
    "knight-orc": _REPO_ROOT / "programs" / "knight-orc" / "lens" / "knight_orc_lens.py",
    "apple-panic": _REPO_ROOT / "programs" / "apple-panic" / "lens" / "apple_panic_lens.py",
}


class _NullEmulator:
    """Fallback emulator used for dry capture paths in tests and tooling."""

    def read_byte(self, _addr: int) -> int:
        return 0

    def read_uint16(self, _addr: int) -> int:
        return 0

    def read_uint32(self, _addr: int) -> int:
        return 0


def _resolve_extractor_class(program_name: str):
    module_name = _LENS_PROGRAMS.get(program_name.lower())
    module_file = _LENS_MODULE_FILES.get(program_name.lower())
    if not module_name or not module_file or not module_file.exists():
        return None

    extractor_class_name = f"{module_name.title().replace('_', '')}Extractor"
    spec = importlib.util.spec_from_file_location(module_name, module_file)
    if spec is None or spec.loader is None:
        return None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, extractor_class_name, None)


def list_programs() -> List[str]:
    return sorted(_LENS_PROGRAMS.keys())


def capture_program_state(program_name: str) -> Optional[Dict[str, Any]]:
    extractor_class = _resolve_extractor_class(program_name)
    if not extractor_class:
        return None

    try:
        extractor = extractor_class(emu=_NullEmulator())
        if hasattr(extractor, "capture_all"):
            return extractor.capture_all()
        return {}
    except Exception:
        return None


def vault_lookup(key: str) -> str:
    """Look up a single key from the vault."""
    vault = _load_vault_config()
    if not vault:
        return "Vault config not available."

    # Check top-level keys
    if key in vault:
        val = vault[key]
        if isinstance(val, dict):
            return f"{key} = [object with {len(val)} keys]"
        if isinstance(val, str) and "{{" in val:
            return f"{key} = [TEMPLATE -- not set]"
        return f"{key} = {val}"

    # Check nested vault.variables and vault.secrets
    vault_block = vault.get("vault", {})
    variables = vault_block.get("variables", {})
    if key in variables:
        return f"{key}: {variables[key].get('description', '')}"

    secrets = vault_block.get("secrets", {})
    secret_keys = secrets.get("keys", [])
    if key in secret_keys:
        return f"{key} = [SET]"

    return f"Vault key '{key}' not found."


# ── Command dispatch (real -- backed by SessionState) ────────────

_HELP_TEXT = (
    "Commands: HELP BEEP RENUM GRID LAYER MAP WORLD VAULT CEEFAX "
    "UVOX SKIN LENS QUIT LOAD LIST RUN SAVE NEW CAT DIR"
)


def _dispatch_help() -> Dict[str, Any]:
    return {"output": _HELP_TEXT}


def _dispatch_grid(upper: str, session: SessionState) -> Dict[str, Any]:
    """Handle GRID GET / GRID SET / GRID commands."""
    if upper == "GRID" or upper.startswith("GRID HELP"):
        return {"output": "GRID GET <col> <row> | GRID SET <col> <row> <char>"}

    if upper.startswith("GRID SET "):
        parts = upper[9:].strip().split()
        if len(parts) < 3:
            return {"output": "Usage: GRID SET <col> <row> <char>"}
        try:
            x, y = int(parts[0]), int(parts[1])
            char = parts[2][0]  # first character of 3rd arg
            return {"output": session.grid_set(x, y, char)}
        except (ValueError, IndexError) as e:
            return {"output": f"GRID SET error: {e}"}

    if upper.startswith("GRID GET "):
        parts = upper[9:].strip().split()
        if len(parts) < 2:
            return {"output": "Usage: GRID GET <col> <row>"}
        try:
            x, y = int(parts[0]), int(parts[1])
            return {"output": session.grid_get(x, y)}
        except (ValueError, IndexError) as e:
            return {"output": f"GRID GET error: {e}"}

    if upper == "GRID SHOW":
        return {"output": session.grid_render()}

    return {"output": "Unknown GRID subcommand. Try GRID HELP."}


def _dispatch_world(upper: str, session: SessionState) -> Dict[str, Any]:
    """Handle WORLD commands."""
    if upper == "WORLD" or upper == "WORLD LIST":
        return {"output": session.world_list()}

    if upper.startswith("WORLD NEW "):
        name = upper[10:].strip()
        return {"output": session.world_create(name)}

    if upper.startswith("WORLD SWITCH "):
        name = upper[13:].strip()
        return {"output": session.world_switch(name)}

    if upper.startswith("WORLD CREATE "):
        name = upper[13:].strip()
        return {"output": session.world_create(name)}

    return {"output": session.world_list()}


def _dispatch_program(upper: str, session: SessionState) -> Dict[str, Any]:
    """Handle LOAD, LIST, RUN, SAVE, NEW, CAT, DIR, RENUM."""
    if upper == "LIST":
        return {"output": session.program_list()}

    if upper.startswith("LIST "):
        parts = upper[5:].strip().split("-")
        try:
            if len(parts) == 2:
                start, end = int(parts[0]), int(parts[1])
                return {"output": session.program_list(start, end)}
            else:
                start = int(parts[0])
                return {"output": session.program_list(start)}
        except ValueError:
            return {"output": "Usage: LIST [start[-end]]"}

    if upper.startswith("LOAD "):
        # Support both LOAD "file" and LOAD file
        filename = upper[5:].strip().strip("\"'")
        return {"output": session.program_load(filename)}

    if upper == "NEW":
        session.program_lines.clear()
        session.program_filename = None
        return {"output": "Program cleared."}

    if upper == "SAVE" and session.program_filename:
        # Quick-save to the loaded filename
        return _dispatch_save(session.program_filename, session)
    if upper.startswith("SAVE "):
        filename = upper[5:].strip().strip("\"'")
        return _dispatch_save(filename, session)

    if upper in ("CAT", "DIR"):
        return {"output": session.program_cat()}

    if upper == "RENUM":
        return {"output": session.renum()}

    if upper.startswith("RENUM "):
        parts = upper[6:].strip().split()
        try:
            start = int(parts[0]) if len(parts) >= 1 else 10
            step = int(parts[1]) if len(parts) >= 2 else 10
            return {"output": session.renum(start, step)}
        except ValueError:
            return {"output": "Usage: RENUM [start [step]]"}

    return {"output": f"Unknown command: {upper}. Type HELP."}


def _dispatch_save(filename: str, session: SessionState) -> Dict[str, Any]:
    """Save program memory to a file."""
    if not session.program_lines:
        return {"output": "No program loaded to save."}

    fpath = Path(filename)
    if not fpath.is_absolute():
        fpath = Path(filename).resolve()

    try:
        lines = []
        for lineno in sorted(session.program_lines.keys()):
            lines.append(session.program_lines[lineno])
        fpath.write_text("\n".join(lines) + "\n")
        session.program_filename = fpath.name
        return {"output": f"Saved {len(lines)} lines to '{fpath.name}'."}
    except Exception as exc:
        return {"output": f"Error saving: {exc}"}


def _dispatch_gridsmith(upper: str) -> Dict[str, Any]:
    """Handle GRIDSMITH commands (currently informational stubs)."""
    if upper in ("GRIDSMITH", "GRIDSMITH HELP"):
        return {
            "output": [
                "GridSmith Agent -- world builder tools:",
                "  GRIDSMITH TOOLS LIST             List all tools",
                "  GRIDSMITH CREATE_WORLD <name>    Create a new world",
                "  GRIDSMITH CREATE_GRID [cols rows] Create a named grid",
                "  GRIDSMITH CELL EDIT <g> <x> <y> <c>  Edit a cell",
                "  GRIDSMITH PATHFIND <g> <sx> <sy> <ex> <ey>  Find path",
                "  GRIDSMITH COMPOSE_LAYERS <g>     Compose layers",
                "  GRIDSMITH EXPORT_UVOX <g> <out>  Export UVox artifact",
                "  GRIDSMITH LATLON_TO_UCODE <lat> <lon>  Convert coords",
                "Type GRIDSMITH <command> for details.",
            ]
        }

    if upper == "GRIDSMITH TOOLS LIST":
        return {
            "output": [
                "GridSmith Tools (16 available):",
                "  create_world, import_basic_program, import_amos_program,",
                "  create_grid, edit_cell, compose_layers, export_uvox,",
                "  pathfind, latlon_to_ucode, ucode_to_latlon,",
                "  source_miner, lens_craft, skin_weaver, mcp_scribe,",
                "  inspire_engine, ucode_weaver",
            ]
        }

    if upper.startswith("GRIDSMITH CREATE_WORLD "):
        name = upper.split("CREATE_WORLD ", 1)[1].strip()
        return {
            "output": f"World '{name}' created via GridSmith. use GRIDSMITH WORLD LIST to verify"
        }

    if upper.startswith("GRIDSMITH CREATE_GRID"):
        return {
            "output": "Grid created. Use GRIDSMITH CELL EDIT <grid> <x> <y> <char> to populate."
        }

    if upper.startswith("GRIDSMITH CELL EDIT "):
        return {"output": "Cell edited. Use GRID GET <x> <y> to verify."}

    if upper.startswith("GRIDSMITH PATH"):
        return {"output": "Pathfinding dispatched. Use GRIDSMITH PATH RESULT to check."}

    if upper.startswith("GRIDSMITH COMPOSE"):
        return {"output": "Layers composed. Viewport updated."}

    if upper.startswith("GRIDSMITH EXPORT"):
        return {
            "output": "UVox export initiated. "
            "Check workspaces/gridcore/grids/exports/ for .uvox files."
        }

    if upper == "GRIDSMITH LATLON_TO_UCODE":
        return {"output": "Use: GRIDSMITH LATLON_TO_UCODE <lat> <lon>"}

    if upper.startswith("GRIDSMITH LATLON_TO_UCODE "):
        return {"output": "Coordinate converted. Use GRIDSMITH UCODE_TO_LATLON to reverse."}

    return {"output": f"Unknown GridSmith command: {upper}"}


def dispatch_command(command: str) -> Dict[str, Any]:
    """
    Dispatch a uCode command and return a structured result.

    Returns a dict matching the TypeScript CommandResult shape:
      { output: string | string[] | {text, role}[], teletextPage?: number }
    """
    upper = command.strip().upper()
    if not upper:
        return {"output": ""}

    session = get_session()

    # ── HELP ──
    if upper == "HELP" or upper == "?":
        return _dispatch_help()

    # ── BEEP ──
    if upper == "BEEP":
        return {"output": "\x07"}

    # ── QUIT ──
    if upper == "QUIT":
        return {"output": "Goodbye."}

    # ── CEEFAX ──
    if upper == "CEEFAX":
        return {"output": "Loading Teletext Reader...", "teletextPage": 100}

    if upper.startswith("CEEFAX "):
        try:
            page = int(upper[7:].strip())
            if 100 <= page <= 899:
                return {
                    "output": f"Loading page {page}...",
                    "teletextPage": page,
                }
        except ValueError:
            pass
        return {"output": "Usage: CEEFAX [page number]"}

    # ── VAULT ──
    if upper == "VAULT":
        return {
            "output": "Usage: VAULT <key>. "
            "Keys: user, global, snack, system, "
            "ollama_endpoint, hivemind_api_key, openrouter_api_key"
        }
    if upper.startswith("VAULT "):
        key = upper[6:].strip()
        return {"output": vault_lookup(key)}

    # ── GRID ── (delegated)
    if upper.startswith("GRID"):
        return _dispatch_grid(upper, session)

    # ── WORLD ── (delegated)
    if upper.startswith("WORLD"):
        return _dispatch_world(upper, session)

    # ── LOAD / LIST / RUN / SAVE / NEW / CAT / DIR / RENUM ──
    if (
        upper.startswith("LOAD ")
        or upper.startswith("LIST")
        or upper.startswith("SAVE")
        or upper in ("NEW", "CAT", "DIR")
        or upper.startswith("RENUM")
    ):
        return _dispatch_program(upper, session)

    # ── RUN ── (execute loaded program)
    if upper == "RUN":
        if not session.program_lines:
            return {"output": "No program loaded. Use CAT to list programs."}
        # Attempt to run via BBCSDL bridge
        return _dispatch_run(session)

    # ── LAYER ──
    if upper == "LAYER" or upper == "LAYER LIST":
        return {"output": ["Layers:", "  main (80x24)", "  fx (80x24)"]}

    # ── MAP ──
    if upper == "MAP" or upper == "MAP LIST":
        return {"output": "  (no maps loaded)"}

    # ── UVOX ──
    if upper == "UVOX" or upper.startswith("UVOX "):
        return {"output": "UVox spatial algebra engine is in development."}

    # ── SKIN ──
    if upper == "SKIN":
        return {"output": ["Skins: bbc, teletext, inverse, classic, dark, retro"]}

    # ── LENS ──
    if upper == "LENS" or upper == "LENS HELP":
        programs = list_programs()
        if programs:
            return {
                "output": [
                    "LENS viewport capture/restore for registered programs:",
                    "",
                ]
                + [f"  {p}" for p in programs]
                + [
                    "",
                    "Usage: LENS CAPTURE <program> | LENS RESTORE <program> | LENS LIST",
                ]
            }
        return {
            "output": "LENS: viewport capture/restore. "
            "Usage: LENS CAPTURE | LENS RESTORE | LENS LIST"
        }

    if upper == "LENS LIST":
        programs = list_programs()
        if programs:
            return {"output": ["Registered LENS programs:"] + [f"  - {p}" for p in programs]}
        return {"output": "No LENS programs registered."}

    if upper.startswith("LENS CAPTURE "):
        program_name = upper[13:].strip()
        state = capture_program_state(program_name)
        if state:
            return {
                "output": f"LENS capture: {program_name} state snapshot taken ({len(state)} keys)."
            }
        return {
            "output": f"LENS capture failed: program '{program_name}' "
            "not found. Use LENS LIST to see registered programs."
        }

    if upper.startswith("LENS RESTORE "):
        program_name = upper[13:].strip()
        return {"output": f"LENS restore: {program_name} state restored (simulated)."}

    # ── GRIDSMITH ── (delegated)
    if upper.startswith("GRIDSMITH"):
        return _dispatch_gridsmith(upper)

    # Unknown
    return {"output": f"Unknown command: {command}. Type HELP for available commands."}


def _dispatch_run(session: SessionState) -> Dict[str, Any]:
    """Execute the loaded program via BBCSDL (best-effort)."""
    try:
        from bridge.bbcsdl_bridge import BBCSDLProcess
        from bridge.bbcsdl_json_protocol import BBCSDLJsonClient
    except ImportError:
        return {
            "output": "BBCSDL bridge not available. "
            "Program loaded but cannot be executed in this context. "
            "Use LIST to view the program."
        }

    # Build source string from stored lines
    source_lines = []
    for lineno in sorted(session.program_lines.keys()):
        source_lines.append(session.program_lines[lineno])
    source = "\n".join(source_lines)

    try:
        process = BBCSDLProcess()
        process.start()
    except FileNotFoundError:
        return {
            "output": "BBCSDL binary not found. Install runtimes/basic/bbcsdl/ to run programs."
        }
    except Exception as exc:
        return {"output": f"Failed to start BBCSDL: {exc}"}

    client = BBCSDLJsonClient(process)
    output_lines: List[str] = []

    # Capture output lines
    def on_line(line: str) -> None:
        output_lines.append(line)

    process._on_line = on_line  # intercept the reader callback

    # Load and run
    resp = client.call("PROGRAM_LOAD", {"source": source}, timeout=10.0)
    if not resp.ok:
        process.stop()
        return {"output": f"Failed to load program: {resp.error}"}

    resp = client.call("PROGRAM_RUN", {}, timeout=30.0)
    process.stop()

    if resp.ok:
        if output_lines:
            return {"output": output_lines}
        return {"output": "Program ran successfully."}

    return {"output": f"Program error: {resp.error}"}


# ── Teletext page loading ───────────────────────────────────────


def load_teletext_page(page_number: int) -> Optional[Dict[str, Any]]:
    """
    Load a CEEFAX page from the runtime's page store.

    Looks in runtimes/basic/ceefax/pages/{page}.json.
    Falls back to generated pages for known routes if file doesn't exist.
    """
    # Try loading from disk
    page_path = Path(__file__).resolve().parent.parent / "ceefax" / "pages" / f"{page_number}.json"
    if page_path.exists():
        try:
            with open(page_path) as fh:
                return json.load(fh)
        except Exception:
            pass

    # Fall back to generated pages for known routes
    return _generate_page(page_number)


def _generate_page(page_number: int) -> Optional[Dict[str, Any]]:
    """Generate a teletext page for known routes when no JSON file exists."""
    import datetime

    today = datetime.date.today().isoformat()

    if page_number == 100:
        return asdict(
            TeletextPage(
                page=100,
                title="uCode Main Index",
                date=today,
                header="uCode CEEFAX 100  Main Index",
                content=[
                    "    uCODE TELETEXT READER",
                    "",
                    "  NEWS HEADLINES .......... 101",
                    "  COURSE CATALOGUE ........ 300",
                    "  VAULT CONFIG ............ 400",
                    "  DOCUMENTATION ........... 500",
                    "",
                    "  HELP & ABOUT ............. 888",
                    "  INDEX .................... 199",
                ],
                fasttext=[
                    FastTextLink("red", "News", 101),
                    FastTextLink("green", "Courses", 300),
                    FastTextLink("yellow", "Vault", 400),
                    FastTextLink("cyan", "Docs", 500),
                ],
            )
        )

    if page_number == 400:
        vault = _load_vault_config()
        vault_block = vault.get("vault", {})
        secrets = vault_block.get("secrets", {})
        keys = secrets.get("keys", [])
        content = [
            "    VAULT CONFIGURATION",
            "",
            f"  Path: {vault_block.get('path', '~/.local/share/udos/Vault/')}",
            "",
        ]
        for key in keys:
            content.append(f"  {key}: [SET]")
        content.append("")
        content.append("  Press 100 for Main Index")

        return asdict(
            TeletextPage(
                page=400,
                title="Vault Configuration",
                date=today,
                header="uCode CEEFAX 400  Vault Config",
                content=content,
                fasttext=[
                    FastTextLink("red", "Main", 100),
                    FastTextLink("green", "Courses", 300),
                    FastTextLink("yellow", "Docs", 500),
                    FastTextLink("cyan", "Help", 888),
                ],
            )
        )

    if page_number == 888:
        return asdict(
            TeletextPage(
                page=888,
                title="Help & About",
                date=today,
                header="uCode CEEFAX 888  Help",
                content=[
                    "    HELP & ABOUT uCode",
                    "",
                    "  uCode v2.0 -- Retro Computing",
                    "  Education Platform",
                    "",
                    "  Type OK> HELP for commands",
                    "  Type OK> CEEFAX for this reader",
                    "",
                    "  Main Index ............. 100",
                    "  Course Catalogue ....... 300",
                    "  Vault Config ........... 400",
                    "  Documentation .......... 500",
                ],
                fasttext=[
                    FastTextLink("red", "Main", 100),
                    FastTextLink("green", "Courses", 300),
                    FastTextLink("yellow", "Vault", 400),
                    FastTextLink("cyan", "Docs", 500),
                ],
            )
        )

    return None


# ── JSON-RPC handler ─────────────────────────────────────────────


def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle a single JSON-RPC style request.

    Returns a dict suitable for JSON encoding as response.
    """
    method = request.get("method", "")
    params = request.get("params", {})
    req_id = request.get("id")

    try:
        if method == "dispatch":
            command = params.get("command", "")
            result = dispatch_command(command)
            return {"jsonrpc": "2.0", "id": req_id, "result": result}

        if method == "teletext_page":
            page = params.get("page", 100)
            page_data = load_teletext_page(page)
            if page_data:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"page": page_data},
                }
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"page": None},
            }

        # New methods from SessionState
        if method == "session_reset":
            from .session_state import reset_session

            reset_session()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"output": "Session reset."},
            }

        if method == "grid_state":
            session = get_session()
            cells = []
            for y in range(min(session.grid.height, 25)):
                row = []
                for x in range(min(session.grid.width, 80)):
                    cell = session.grid.get(x, y)
                    row.append(
                        {
                            "char": cell.char or " ",
                            "fg": cell.fg_color or "white",
                            "bg": cell.bg_color or "black",
                        }
                    )
                cells.append(row)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "width": session.grid.width,
                    "height": session.grid.height,
                    "cells": cells,
                },
            }

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}",
            },
        }

    except Exception as exc:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32603, "message": str(exc)},
        }


# ── HTTP/WS server ───────────────────────────────────────────────


def serve_http(port: int = 8671) -> None:
    """
    Start a simple HTTP + WebSocket server for the GridCore adapter.

    Uses Python stdlib http.server for HTTP.  WebSocket upgrade is
    handled via asyncio when available; otherwise HTTP-only.

    Endpoints:
      POST /dispatch    -> dispatch a uCode command
      GET  /page/<n>    -> load teletext page
      WS   /ws          -> WebSocket for live bidirectional commands
    """
    try:
        from http.server import BaseHTTPRequestHandler, HTTPServer
    except ImportError:
        print("http.server not available")
        return

    import json as _json

    class GridcoreRequestHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == "/dispatch":
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length) if content_length > 0 else b"{}"
                try:
                    req = _json.loads(body)
                except _json.JSONDecodeError:
                    self.send_error(400, "Invalid JSON")
                    return

                result = dispatch_command(req.get("command", ""))
                resp = _json.dumps(result).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp)
            else:
                self.send_error(404)

        def do_GET(self):
            if self.path.startswith("/page/"):
                try:
                    page_num = int(self.path.split("/")[-1])
                except ValueError:
                    self.send_error(400)
                    return

                page_data = load_teletext_page(page_num)
                resp = _json.dumps({"page": page_data}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp)
            elif self.path == "/health":
                resp = b'{"status":"ok"}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp)
            else:
                self.send_error(404)

        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def log_message(self, format, *args):
            # Suppress default logging for clean output
            pass

    server = HTTPServer(("127.0.0.1", port), GridcoreRequestHandler)
    print(f"GridcoreAdapter HTTP server listening on 127.0.0.1:{port}")
    print(f'  POST http://127.0.0.1:{port}/dispatch  (body: {{"command":"HELP"}})')
    print(f"  GET  http://127.0.0.1:{port}/page/100  (teletext page)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


# ── CLI entry point for testing ─────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        cmd = " ".join(sys.argv[1:])
        result = dispatch_command(cmd)
        print(json.dumps(result, indent=2))
    else:
        # Read JSON requests from stdin
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
                resp = handle_request(req)
                print(json.dumps(resp))
            except json.JSONDecodeError as e:
                print(
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "error": {
                                "code": -32700,
                                "message": f"Parse error: {e}",
                            },
                        }
                    )
                )
