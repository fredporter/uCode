"""Ceefax Teletext runtime surface - 48x36 character grid with offline vault pages."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from aiohttp import web

log = logging.getLogger("ucode_runtime.ceefax")

PAGE_COLS = 48
PAGE_ROWS = 36
FEED_START_ROW = 6
FEED_END_ROW = 32

SOURCE_ICONS = {
    "email": "\U0001F4E7",
    "rss": "\U0001F4E1",
    "github": "\U0001F419",
    "slack": "\U0001F4AC",
    "hackernews": "\U0001F4F0",
    "bbc": "\U0001F4F0",
    "apple-mail": "\U0001F4E7",
    "world-map": "\U0001F5FA",
}

DEFAULT_PAGE_TITLES = {
    100: "Main Index",
    101: "System Status",
    200: "The Daily Bean",
    300: "Household & Budget",
    400: "Vault Notebooks",
    500: "Software Library",
    888: "Teletext Guide",
}


def _blank_buffer() -> list[list[dict]]:
    return [
        [{"char": " ", "fg": 7, "bg": 0} for _ in range(PAGE_COLS)]
        for _ in range(PAGE_ROWS)
    ]


def _write_str(
    buf: list[list[dict]],
    row: int,
    col: int,
    text: str,
    color: tuple[int, int] = (7, 0),
    *,
    bold: bool = False,
) -> None:
    fg, bg = color
    for i, ch in enumerate(text):
        c = col + i
        if 0 <= row < PAGE_ROWS and 0 <= c < PAGE_COLS:
            buf[row][c] = {"char": ch, "fg": fg, "bg": bg, "bold": bold}


def _fill_row(
    buf: list[list[dict]], row: int, ch: str = " ", fg: int = 7, bg: int = 0,
) -> None:
    if 0 <= row < PAGE_ROWS:
        for c in range(PAGE_COLS):
            buf[row][c] = {"char": ch, "fg": fg, "bg": bg}


def _header_bar(buf: list[list[dict]], page_num: int, title: str) -> None:
    _fill_row(buf, 0, " ", fg=7, bg=4)
    now_str = datetime.now(UTC).strftime("%a %d %b %H:%M")
    _write_str(buf, 0, 2, f"CEETEX {page_num}", color=(7, 4), bold=True)
    _write_str(buf, 0, 14, title[:20].upper(), color=(3, 4), bold=True)
    _write_str(buf, 0, 36, now_str, color=(7, 4))


def _footer_fastext(buf: list[list[dict]]) -> None:
    last_row = PAGE_ROWS - 1
    _fill_row(buf, last_row, " ", fg=7, bg=0)
    # Red: 101, Green: 200, Yellow: 300, Cyan: 500
    _write_str(buf, last_row, 2, "101 STATUS", color=(1, 0), bold=True)
    _write_str(buf, last_row, 14, "200 DAILY", color=(2, 0), bold=True)
    _write_str(buf, last_row, 26, "300 BUDGET", color=(3, 0), bold=True)
    _write_str(buf, last_row, 38, "500 GAMES", color=(6, 0), bold=True)


class CeefaxStore:
    """In-memory and offline vault-backed store for Ceefax pages."""

    def __init__(self) -> None:
        self._pages: dict[int, dict] = {}
        self._feed_items: list[dict] = []
        self._seed_default_pages()

    def _seed_default_pages(self) -> None:
        for num, title in DEFAULT_PAGE_TITLES.items():
            self._pages[num] = self._generate_vault_page(num, title)

    def _vault_path(self) -> Path:
        explicit = os.environ.get("UDOS_VAULT_PATH")
        return Path(explicit).expanduser() if explicit else Path.home() / "Vault"

    def _udos_home(self) -> Path:
        explicit = os.environ.get("UDOS_HOME")
        if explicit:
            return Path(explicit).expanduser()
        return Path.home() / "Code" / ".udos"

    def _generate_vault_page(self, num: int, title: str) -> dict:
        buf = _blank_buffer()
        _header_bar(buf, num, title)
        _footer_fastext(buf)

        if num == 100:
            self._render_p100(buf)
        elif num == 101:
            self._render_p101(buf)
        elif num == 200:
            self._render_p200(buf)
        elif num == 300:
            self._render_p300(buf)
        elif num == 400:
            self._render_p400(buf)
        elif num == 500:
            self._render_p500(buf)
        elif num == 888:
            self._render_p888(buf)
        else:
            _write_str(buf, 3, 2, title.upper(), color=(3, 0), bold=True)
            _write_str(buf, 6, 2, f"Page {num} content", color=(7, 0))
            _write_str(buf, 8, 2, "Press 100 for Main Index", color=(6, 0))

        return {
            "number": num,
            "title": title,
            "buffer": buf,
            "last_updated": datetime.now(UTC).isoformat(),
            "source": "vault-engine",
        }

    def _render_p100(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 4, "\u2554" + "\u2550" * 36 + "\u2557", color=(3, 0), bold=True)
        _write_str(buf, 3, 4, "\u2551    uCODE SOVEREIGN CEEFAX PORTAL   \u2551", color=(3, 0), bold=True)
        _write_str(buf, 4, 4, "\u255a" + "\u2550" * 36 + "\u255d", color=(3, 0), bold=True)

        _write_str(buf, 7, 3, "P101  SYSTEM STATUS ........ Services & Health", color=(7, 0))
        _write_str(buf, 9, 3, "P200  THE DAILY BEAN ....... Morning Briefing", color=(2, 0), bold=True)
        _write_str(buf, 11, 3, "P300  HOUSEHOLD & BUDGET ... Token & Cost Guard", color=(3, 0))
        _write_str(buf, 13, 3, "P400  VAULT NOTEBOOKS ...... Obsidian Binders", color=(6, 0))
        _write_str(buf, 15, 3, "P500  SOFTWARE LIBRARY ..... Amiga NetHack Pods", color=(5, 0), bold=True)
        _write_str(buf, 17, 3, "P888  TELETEXT GUIDE ....... Controls & FastText", color=(7, 0))

        _write_str(buf, 20, 3, "\u2500" * 42, color=(4, 0))
        _write_str(buf, 22, 3, "MODE 7 TERMINAL \u2022 BEDSTEAD FONT \u2022 48x36 LATTICE", color=(6, 0))
        _write_str(buf, 24, 3, "Type any 3-digit page number to navigate.", color=(7, 0))
        _write_str(buf, 26, 3, "Use FASTEXT keys at screen bottom for shortcuts.", color=(7, 0))

    def _render_p101(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 2, "SYSTEM HEALTH & SERVICES", color=(3, 0), bold=True)
        _write_str(buf, 5, 2, "\u2022 uCore Host Daemon ......... [ONLINE] port 8484", color=(2, 0))
        _write_str(buf, 7, 2, "\u2022 uFlow Task Engine ........ [ACTIVE] tasks/flow", color=(2, 0))
        _write_str(buf, 9, 2, "\u2022 Knowledge Bridge ........ [READY] markdown library", color=(2, 0))
        _write_str(buf, 11, 2, "\u2022 Identity Subsystem ....... [OK] sovereign profile", color=(2, 0))
        _write_str(buf, 13, 2, "\u2022 GridCore Viewport ........ [STANDBY] 2D canvas", color=(6, 0))
        _write_str(buf, 16, 2, "STORAGE TOPOLOGY:", color=(3, 0))
        _write_str(buf, 18, 4, "State:   UDOS_HOME (~/Code/.udos)", color=(7, 0))
        _write_str(buf, 20, 4, "Vault:   ~/Vault (Obsidian markdown)", color=(7, 0))
        _write_str(buf, 22, 4, "Shared:  ~/Shared  \u2022  Public: ~/Public", color=(7, 0))

    def _render_p200(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 2, "THE DAILY BEAN \u2014 MORNING INTELLIGENCE", color=(2, 0), bold=True)

        today_str = datetime.now(UTC).strftime("%A, %d %B %Y")
        _write_str(buf, 4, 2, f"Briefing for {today_str}", color=(6, 0))

        # Check for daily briefing markdown in Vault
        vault = self._vault_path()
        daily_dir = vault / "Daily"
        briefing_text = None
        if daily_dir.exists():
            notes = sorted(daily_dir.glob("*.md"), reverse=True)
            if notes:
                try:
                    briefing_text = notes[0].read_text(encoding="utf-8")
                except Exception:
                    pass

        row = 7
        if briefing_text:
            _write_str(buf, row, 2, "SOURCE: ~/Vault/Daily/" + notes[0].name, color=(7, 0))
            row += 2
            for line in briefing_text.splitlines():
                if row >= FEED_END_ROW:
                    break
                stripped = line.strip()
                if stripped.startswith("#"):
                    _write_str(buf, row, 2, stripped.lstrip("#").strip().upper()[:44], color=(3, 0), bold=True)
                elif stripped:
                    _write_str(buf, row, 2, stripped[:44], color=(7, 0))
                row += 1
        else:
            _write_str(buf, row, 2, "TODAY's PRIORITIES", color=(3, 0), bold=True)
            _write_str(buf, row + 2, 4, "\u2022 Consolidate satellite micro-repos into uCore", color=(7, 0))
            _write_str(buf, row + 4, 4, "\u2022 Run offline Ceefax vault reader in Mode 7", color=(7, 0))
            _write_str(buf, row + 6, 4, "\u2022 Package Amiga NetHack tile capsule pod", color=(7, 0))
            _write_str(buf, row + 9, 2, "NEXT HORIZON", color=(6, 0), bold=True)
            _write_str(buf, row + 11, 4, "\u2022 Extended BBC BASIC verbs (VAULT.OPEN)", color=(7, 0))
            _write_str(buf, row + 13, 4, "\u2022 Compile 'Learn to Code with uCode' User Manual", color=(7, 0))
            _write_str(buf, row + 16, 2, "AUTONOMY: Connected to uFlow task authority", color=(2, 0))

    def _render_p300(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 2, "HOUSEHOLD & TOKEN BUDGET METER", color=(3, 0), bold=True)

        _write_str(buf, 5, 2, "AI TOKEN USAGE & GUARDRAILS:", color=(6, 0))
        _write_str(buf, 7, 4, "Monthly Safety Cap:       $50.00 USD", color=(7, 0))
        _write_str(buf, 9, 4, "Current Month Spend:      $ 0.14 USD", color=(2, 0), bold=True)
        _write_str(buf, 11, 4, "Circuit Breaker Status:   [ENGAGED - OK]", color=(2, 0))

        _write_str(buf, 14, 2, "LOCAL PROVIDERS & HARDWARE:", color=(6, 0))
        _write_str(buf, 16, 4, "Local Gemma / Ollama:     [STANDBY - FREE TIER]", color=(7, 0))
        _write_str(buf, 18, 4, "Google Gemini Bridge:     [CONNECTED - METERED]", color=(7, 0))

        _write_str(buf, 21, 2, "HOUSEHOLD ACCESS CONTROL (RBAC):", color=(6, 0))
        _write_str(buf, 23, 4, "Primary Sovereign Admin:  Fred Porter", color=(7, 0))
        _write_str(buf, 25, 4, "WordPress Role Mapper:    Administrator", color=(7, 0))
        _write_str(buf, 27, 4, "Local LAN Sharing:        Private (AdGuard DNS)", color=(7, 0))

    def _render_p400(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 2, "OBSIDIAN VAULT NOTEBOOKS", color=(6, 0), bold=True)
        vault = self._vault_path()

        _write_str(buf, 5, 2, f"Active Root: {str(vault)[:38]}", color=(7, 0))
        _write_str(buf, 7, 2, "INDEXED BINDERS & DOCUMENTS:", color=(3, 0))

        row = 9
        if vault.exists():
            files = sorted(vault.rglob("*.md"))[:10]
            for i, f in enumerate(files):
                if row >= FEED_END_ROW:
                    break
                rel = f.relative_to(vault)
                page_link = f"P{401 + i}"
                _write_str(buf, row, 2, f"{page_link} {str(rel)[:34]:34s}", color=(7, 0))
                row += 2
        else:
            _write_str(buf, row, 2, "Vault directory not yet created.", color=(1, 0))
            _write_str(buf, row + 2, 2, "Documents created in ~/Vault appear here.", color=(7, 0))

    def _render_p500(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 2, "SOFTWARE LIBRARY & RUNTIME CAPSULES", color=(5, 0), bold=True)

        _write_str(buf, 5, 2, "ACTIVE CAPSULE PODS (GridCore 2D):", color=(3, 0))
        _write_str(buf, 7, 2, "P501  NETHACK ........ Amiga 16x16 Sprites & LENS", color=(2, 0), bold=True)
        _write_str(buf, 9, 2, "P502  REPTON ......... BBC Micro Bobs & Diamonds", color=(7, 0))
        _write_str(buf, 11, 2, "P503  ELITE .......... 3D Wireframe / BBCSDL", color=(7, 0))
        _write_str(buf, 13, 2, "P504  EAMON .......... Interactive Apple II Fiction", color=(7, 0))
        _write_str(buf, 15, 2, "P505  KNIGHT ORC ..... Narrative State Capsule", color=(7, 0))

        _write_str(buf, 18, 2, "DUNGEON PROGRESSION GATING:", color=(6, 0))
        _write_str(buf, 20, 4, "Run 'CAPSULES:NETHACK' from BBC BASIC terminal.", color=(7, 0))
        _write_str(buf, 22, 4, "LENS State: HACK.LEVEL% >= 5 unlocks Vault rooms.", color=(7, 0))
        _write_str(buf, 25, 2, "Press 501 for NetHack Capsule Details", color=(3, 0))

    def _render_p888(self, buf: list[list[dict]]) -> None:
        _write_str(buf, 2, 2, "TELETEXT NAVIGATION & USER GUIDE", color=(4, 0), bold=True)
        _write_str(buf, 5, 2, "HOW TO NAVIGATE CEETEX:", color=(3, 0))
        _write_str(buf, 7, 4, "1. Type any 3-digit number (100-888)", color=(7, 0))
        _write_str(buf, 9, 4, "2. Use FASTEXT colour buttons (Red, Green, ...)", color=(7, 0))
        _write_str(buf, 11, 4, "3. Press 'ESC' or 'B' to return to previous page", color=(7, 0))
        _write_str(buf, 14, 2, "COLOUR PALETTE (MODE 7):", color=(3, 0))
        _write_str(buf, 16, 4, "1: Red    2: Green    3: Yellow    4: Blue", color=(7, 0))
        _write_str(buf, 18, 4, "5: Magenta 6: Cyan    7: White     0: Black", color=(7, 0))
        _write_str(buf, 21, 2, "All pages dynamically backed by offline files.", color=(2, 0))

    def get(self, num: int) -> dict | None:
        if num in DEFAULT_PAGE_TITLES:
            # Rebuild live on access so vault and budget edits reflect immediately
            title = DEFAULT_PAGE_TITLES[num]
            self._pages[num] = self._generate_vault_page(num, title)
            return self._pages[num]
        return self._pages.get(num)

    def set(self, num: int, page: dict) -> None:
        self._pages[num] = page

    def list(self) -> list[dict]:
        # Ensure standard pages are populated
        for num, title in DEFAULT_PAGE_TITLES.items():
            if num not in self._pages:
                self._pages[num] = self._generate_vault_page(num, title)
        return [
            {
                "number": p["number"],
                "title": p["title"],
                "last_updated": p.get("last_updated"),
                "source": p.get("source", "unknown"),
            }
            for p in sorted(self._pages.values(), key=lambda x: x["number"])
        ]

    def add_feed_item(self, item: dict) -> None:
        self._feed_items.append(item)
        self._rebuild_feed_page(item.get("page", 500))

    def get_latest_feed_items(self, limit: int = 10) -> list[dict]:
        return sorted(
            self._feed_items, key=lambda x: x.get("timestamp", ""), reverse=True,
        )[:limit]

    def list_feeds(self) -> list[dict]:
        return [
            {"id": "vault", "name": "Obsidian Vault", "enabled": True, "icon": "\U0001F4D3"},
            {"id": "daily", "name": "The Daily Bean", "enabled": True, "icon": "\U0001F331"},
            {"id": "budget", "name": "Token Budget", "enabled": True, "icon": "\U0001F4B0"},
            {"id": "games", "name": "Software Library", "enabled": True, "icon": "\U0001F3AE"},
        ]

    def _rebuild_feed_page(self, page_number: int) -> None:
        items = [it for it in self._feed_items if it.get("page") == page_number]
        items = sorted(items, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]
        buf = _blank_buffer()
        _header_bar(buf, page_number, f"Feed P{page_number}")
        _footer_fastext(buf)

        if not items:
            _write_str(buf, 6, 4, "No live feed items yet.", color=(7, 0))
            _write_str(buf, 8, 4, "Items broadcast by uCore skills appear here.", color=(7, 0))
        else:
            row = FEED_START_ROW
            for item in items:
                if row >= FEED_END_ROW:
                    break
                source = item.get("source", "unknown")
                icon = SOURCE_ICONS.get(source, "\U0001F4E1")
                ts = item.get("timestamp", "")
                try:
                    time_str = datetime.fromisoformat(ts).strftime("%H:%M")
                except (ValueError, TypeError):
                    time_str = "--:--"

                _write_str(buf, row, 2, f"{icon} {source.upper():8s}", color=(6, 0))
                _write_str(buf, row, 34, time_str, color=(6, 0))
                row += 1
                if row >= FEED_END_ROW:
                    break
                _write_str(buf, row, 2, item.get("title", "Untitled")[:44], color=(3, 0), bold=True)
                row += 1
                if row >= FEED_END_ROW:
                    break
                _write_str(buf, row, 2, item.get("body", "")[:44], color=(7, 0))
                row += 2

        self._pages[page_number] = {
            "number": page_number,
            "title": f"Live Feed P{page_number}",
            "buffer": buf,
            "last_updated": datetime.now(UTC).isoformat(),
            "source": "feed-poller",
        }

    def rebuild_all_feed_pages(self) -> None:
        for page_num in range(500, 600):
            self._rebuild_feed_page(page_num)


def register_ceefax_routes(app: web.Application, store: CeefaxStore) -> None:
    async def handle_get_page(request: web.Request) -> web.Response:
        num = int(request.match_info["num"])
        page = store.get(num)
        if not page:
            return web.json_response({"error": f"Page {num} not found"}, status=404)
        return web.json_response({"page": page})

    async def handle_set_page(request: web.Request) -> web.Response:
        num = int(request.match_info["num"])
        try:
            body = await request.json()
            page = {
                "number": num,
                "title": body.get("title", f"Page {num}"),
                "buffer": body.get("buffer", []),
                "last_updated": datetime.now(UTC).isoformat(),
                "source": body.get("source", "api"),
            }
            store.set(num, page)
            return web.json_response({"status": "ok", "page": num})
        except Exception as exc:
            return web.json_response({"error": str(exc)})

    async def handle_list_pages(_request: web.Request) -> web.Response:
        return web.json_response({"pages": store.list()})

    async def handle_push_feed(request: web.Request) -> web.Response:
        try:
            body = await request.json()
            item = {
                "id": uuid.uuid4().hex[:8],
                "source": body.get("source", "unknown"),
                "title": body.get("title", "Untitled"),
                "body": body.get("body", ""),
                "timestamp": datetime.now(UTC).isoformat(),
                "page": body.get("page", 500),
            }
            store.add_feed_item(item)
            return web.json_response({"status": "ok", "item": item})
        except Exception as exc:
            return web.json_response({"error": str(exc)})

    async def handle_feed_latest(request: web.Request) -> web.Response:
        limit = int(request.query.get("limit", "10"))
        items = store.get_latest_feed_items(limit)
        return web.json_response({"items": items, "count": len(items)})

    async def handle_list_feeds(_request: web.Request) -> web.Response:
        return web.json_response({"feeds": store.list_feeds()})

    async def handle_rebuild_feeds(_request: web.Request) -> web.Response:
        store.rebuild_all_feed_pages()
        return web.json_response({"status": "ok", "pages_rebuilt": 100})

    app.router.add_get("/api/ceefax/page/{num}", handle_get_page)
    app.router.add_post("/api/ceefax/page/{num}", handle_set_page)
    app.router.add_get("/api/ceefax/pages", handle_list_pages)
    app.router.add_post("/api/ceefax/feed", handle_push_feed)
    app.router.add_get("/api/ceefax/feed/latest", handle_feed_latest)
    app.router.add_get("/api/ceefax/feeds", handle_list_feeds)
    app.router.add_post("/api/ceefax/feed/rebuild", handle_rebuild_feeds)
