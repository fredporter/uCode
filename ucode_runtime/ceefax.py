"""Ceefax Teletext runtime surface - 48x36 character grid with feed pages."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from aiohttp import web

log = logging.getLogger("ucode_runtime.ceefax")

PAGE_COLS = 48
PAGE_ROWS = 36
FEED_START_ROW = 6
FEED_END_ROW = 22

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
    100: "Welcome",
    101: "System Status",
    200: "News Feed",
    500: "Live Feed",
    888: "Colour Test Card",
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
        if c < PAGE_COLS:
            buf[row][c] = {"char": ch, "fg": fg, "bg": bg, "bold": bold}


def _fill_row(
    buf: list[list[dict]], row: int, ch: str = " ", fg: int = 7, bg: int = 0,
) -> None:
    for c in range(PAGE_COLS):
        buf[row][c] = {"char": ch, "fg": fg, "bg": bg}


class CeefaxStore:
    """In-memory store for Ceefax pages and feed items."""

    def __init__(self) -> None:
        self._pages: dict[int, dict] = {}
        self._feed_items: list[dict] = []
        self._seed_default_pages()

    def _seed_default_pages(self) -> None:
        for num, title in DEFAULT_PAGE_TITLES.items():
            self._pages[num] = {
                "number": num,
                "title": title,
                "buffer": _blank_buffer(),
                "last_updated": datetime.now(UTC).isoformat(),
                "source": "system",
            }

    def get(self, num: int) -> dict | None:
        return self._pages.get(num)

    def set(self, num: int, page: dict) -> None:
        self._pages[num] = page

    def list(self) -> list[dict]:
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
            {"id": "email", "name": "Email", "enabled": True, "icon": "\U0001F4E7"},
            {"id": "rss", "name": "RSS Feeds", "enabled": True, "icon": "\U0001F4E1"},
            {"id": "github", "name": "GitHub", "enabled": True, "icon": "\U0001F419"},
            {"id": "slack", "name": "Slack", "enabled": False, "icon": "\U0001F4AC"},
        ]

    def _rebuild_feed_page(self, page_number: int) -> None:
        items = [it for it in self._feed_items if it.get("page") == page_number]
        items = sorted(items, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]
        buf = _blank_buffer()
        _fill_row(buf, 0, " ", 7, 4)
        _write_str(buf, 0, 2, f"CEETEX {page_number}", color=(7, 4))
        _write_str(buf, 0, 28, f"P{page_number}", color=(7, 4))
        title = f"LIVE FEED P{page_number}"
        _write_str(buf, 2, 4, "\u2554" + "\u2550" * 26 + "\u2557", color=(3, 0), bold=True)
        _write_str(buf, 3, 4, "\u2551" + f"  {title:24s}" + "\u2551", color=(3, 0), bold=True)
        _write_str(buf, 4, 4, "\u255a" + "\u2550" * 26 + "\u255d", color=(3, 0), bold=True)
        if not items:
            _write_str(buf, 6, 4, "No feed items yet.", color=(7, 0))
            _write_str(buf, 7, 4, "Feed items will appear here", color=(7, 0))
            _write_str(buf, 8, 4, "when skills broadcast them.", color=(7, 0))
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
                row += 1

        _fill_row(buf, 24, " ", 7, 1)
        now_str = datetime.now(UTC).strftime("%a %d %b %Y  %H:%M:%S")
        _write_str(buf, 24, 2, f"CEETEX {page_number}  Live Feed  {now_str}", color=(7, 1))
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
