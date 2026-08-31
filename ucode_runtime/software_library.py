"""Curated uCode Software Library catalogue and launch-plan API."""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any

from aiohttp import web

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_PATH = REPO_ROOT / "library/catalogue.json"
LAUNCHABLE_STATUSES = {"configured", "verified", "enhanced", "release"}
MAX_TEXT_ASSET_BYTES = 256_000


def load_catalogue(path: Path | None = None) -> dict[str, Any]:
    catalogue_path = path or CATALOGUE_PATH
    payload = json.loads(catalogue_path.read_text(encoding="utf-8"))
    if payload.get("format") != "ucode-library/1" or not isinstance(payload.get("titles"), list):
        raise ValueError("Invalid uCode Software Library catalogue")
    return payload


def catalogue_titles() -> list[dict[str, Any]]:
    titles = load_catalogue()["titles"]
    result: list[dict[str, Any]] = []
    for item in titles:
        entry = REPO_ROOT / str(item.get("entry", ""))
        runtime = str(item.get("runtime", ""))
        launchable = (
            item.get("status") in LAUNCHABLE_STATUSES
            and runtime == "bbc-console"
            and entry.is_file()
            and entry.resolve().is_relative_to(REPO_ROOT)
        )
        result.append({**item, "available": entry.is_file(), "launchable": launchable})
    return result


def catalogue_title(title_id: str) -> dict[str, Any]:
    item = next((title for title in catalogue_titles() if title.get("id") == title_id), None)
    if item is None:
        raise KeyError(title_id)
    return item


def _catalogue_text_asset(relative_path: str) -> dict[str, Any] | None:
    if not relative_path:
        return None
    path = (REPO_ROOT / relative_path).resolve()
    if not path.is_file() or not path.is_relative_to(REPO_ROOT):
        return None
    size = path.stat().st_size
    if size > MAX_TEXT_ASSET_BYTES:
        return {"path": relative_path, "available": False, "reason": "Text asset exceeds the Library preview limit"}
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {"path": relative_path, "available": False, "reason": "Asset is not UTF-8 text"}
    return {"path": relative_path, "available": True, "text": text, "bytes": size}


def title_detail(title_id: str) -> dict[str, Any]:
    item = catalogue_title(title_id)
    source = None
    if item.get("mediaPolicy") != "user-supplied":
        source = _catalogue_text_asset(str(item.get("entry", "")))
    learning = [
        asset
        for asset in (
            _catalogue_text_asset(str(path)) for path in item.get("learning", [])
        )
        if asset is not None
    ]
    evidence = None
    evidence_path = str(item.get("evidence", ""))
    if evidence_path:
        asset = _catalogue_text_asset(evidence_path)
        if asset and asset.get("available"):
            evidence = json.loads(str(asset["text"]))
    media_record = item.get("media") if isinstance(item.get("media"), dict) else {}
    media_state = (
        "ready"
        if item.get("mediaPolicy") == "catalogue-owned" and item.get("available")
        else "edition-required"
        if item.get("mediaPolicy") == "user-supplied" and not media_record.get("checksums")
        else "missing"
        if item.get("mediaPolicy") == "user-supplied"
        else "research"
    )
    return {
        "format": "ucode-library-title/1",
        "title": item,
        "source": source,
        "learning": learning,
        "evidence": evidence,
        "media": {
            "policy": item.get("mediaPolicy"),
            "state": media_state,
            **media_record,
        },
    }


def probe_capsule(title_id: str) -> dict[str, Any]:
    item = catalogue_title(title_id)
    entry = (REPO_ROOT / str(item.get("entry", ""))).resolve()
    evidence_value = str(item.get("evidence", ""))
    evidence_path = (REPO_ROOT / evidence_value).resolve() if evidence_value else None
    return {
        "id": title_id,
        "state": "available" if item["available"] else "unavailable",
        "runtime": item.get("runtime"),
        "entry": entry.is_file() and entry.is_relative_to(REPO_ROOT),
        "evidence": bool(evidence_path and evidence_path.is_file() and evidence_path.is_relative_to(REPO_ROOT)),
        "launchable": item["launchable"],
    }


def verify_capsule(title_id: str) -> dict[str, Any]:
    item = catalogue_title(title_id)
    probe = probe_capsule(title_id)
    evidence_value = str(item.get("evidence", ""))
    if not evidence_value:
        return {**probe, "verified": False, "reason": "Compatibility evidence is not recorded"}
    evidence_path = (REPO_ROOT / evidence_value).resolve()
    if not evidence_path.is_file() or not evidence_path.is_relative_to(REPO_ROOT):
        return {**probe, "verified": False, "reason": "Compatibility evidence is unavailable"}
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
    entry = (REPO_ROOT / str(item["entry"])).resolve()
    actual_hash = hashlib.sha256(entry.read_bytes()).hexdigest() if entry.is_file() else None
    expected_hash = evidence.get("entrySha256")
    verified = bool(probe["launchable"] and actual_hash and actual_hash == expected_hash)
    return {
        **probe,
        "verified": verified,
        "edition": evidence.get("edition"),
        "engine": evidence.get("engine"),
        "entrySha256": actual_hash,
        "reason": None if verified else "Entry checksum does not match compatibility evidence",
        "evidenceRecord": evidence,
    }


def launch_plan(title_id: str) -> dict[str, Any]:
    item = catalogue_title(title_id)
    if not item["launchable"]:
        reason = "User-supplied media required" if item.get("mediaPolicy") == "user-supplied" else "Capsule is not verified for launch"
        return {"id": title_id, "launchable": False, "reason": reason}
    verification = verify_capsule(title_id)
    if not verification["verified"]:
        return {
            "id": title_id,
            "launchable": False,
            "reason": verification["reason"],
        }
    entry = (REPO_ROOT / str(item["entry"])).resolve()
    return {
        "id": title_id,
        "launchable": True,
        "runtime": "terminal",
        "protocol": "ucode-session/1",
        "session": "capsule",
        "titleId": title_id,
        "entry": str(entry),
    }


async def library_handler(_: web.Request) -> web.Response:
    return web.json_response({"format": "ucode-library/1", "titles": catalogue_titles()})


async def title_handler(request: web.Request) -> web.Response:
    try:
        return web.json_response(title_detail(request.match_info["title_id"]))
    except KeyError:
        raise web.HTTPNotFound(text="Unknown uCode title")


async def launch_handler(request: web.Request) -> web.Response:
    try:
        plan = launch_plan(request.match_info["title_id"])
    except KeyError:
        raise web.HTTPNotFound(text="Unknown uCode title")
    return web.json_response(plan, status=200 if plan["launchable"] else 409)


async def probe_handler(request: web.Request) -> web.Response:
    try:
        return web.json_response(probe_capsule(request.match_info["title_id"]))
    except KeyError:
        raise web.HTTPNotFound(text="Unknown uCode title")


async def verify_handler(request: web.Request) -> web.Response:
    try:
        result = verify_capsule(request.match_info["title_id"])
    except KeyError:
        raise web.HTTPNotFound(text="Unknown uCode title")
    return web.json_response(result, status=200 if result["verified"] else 409)


def register_software_library_routes(app: web.Application) -> None:
    app.router.add_get("/api/ucode/library", library_handler)
    app.router.add_get("/api/ucode/library/{title_id}", title_handler)
    app.router.add_post("/api/ucode/library/{title_id}/launch", launch_handler)
    app.router.add_post("/api/ucode/library/{title_id}/probe", probe_handler)
    app.router.add_post("/api/ucode/library/{title_id}/verify", verify_handler)
