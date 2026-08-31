#!/usr/bin/env python3
"""Probe a catalogue capsule over the real ucode-session/1 WebSocket."""

from __future__ import annotations

import argparse
import asyncio
import json
import re

import aiohttp


async def probe(url: str, title_id: str, answer: str, verbose: bool = False) -> str:
    output = ""
    answered = False
    cursor_row = 1
    cursor_col = 1
    async with aiohttp.ClientSession() as client:
        async with client.ws_connect(url, heartbeat=10) as ws:
            await ws.send_json(
                {
                    "protocol": "ucode-session/1",
                    "type": "start",
                    "session": "capsule",
                    "titleId": title_id,
                    "cols": 40,
                    "rows": 25,
                }
            )
            while "CAPSULE_SMOKE_OK" not in output:
                message = await asyncio.wait_for(ws.receive(), timeout=8)
                if message.type != aiohttp.WSMsgType.TEXT:
                    raise RuntimeError(f"Capsule session closed before smoke marker: {message.type}")
                payload = json.loads(message.data)
                if verbose:
                    print(json.dumps(payload), flush=True)
                if payload.get("type") == "error":
                    raise RuntimeError(str(payload.get("message", "Capsule runtime error")))
                if payload.get("type") == "output":
                    chunk = str(payload.get("data", ""))
                    output += chunk
                    if "\x1b[6n" in chunk:
                        index = 0
                        while index < len(chunk):
                            match = re.match(r"\x1b\[(\d*);?(\d*)H", chunk[index:])
                            if match:
                                cursor_row = int(match.group(1) or 1)
                                cursor_col = min(40, int(match.group(2) or 1))
                                index += len(match.group(0))
                                continue
                            if chunk.startswith("\x1b[6n", index):
                                index += 4
                                continue
                            char = chunk[index]
                            if char == "\r":
                                cursor_col = 1
                            elif char == "\n":
                                cursor_row = min(25, cursor_row + 1)
                            elif char >= " ":
                                cursor_col = min(40, cursor_col + 1)
                            index += 1
                        await ws.send_json(
                            {
                                "protocol": "ucode-session/1",
                                "type": "input",
                                "channel": "keyboard",
                                "data": f"\x1b[{cursor_row};{cursor_col}R",
                            }
                        )
                    if "YOUR NAME:" in output and not answered:
                        await ws.send_json(
                            {
                                "protocol": "ucode-session/1",
                                "type": "input",
                                "channel": "touch",
                                "event": {"data": answer[0]},
                            }
                        )
                        await ws.send_json(
                            {
                                "protocol": "ucode-session/1",
                                "type": "input",
                                "channel": "keyboard",
                                "data": answer[1:] + "\r",
                            }
                        )
                        answered = True
            await ws.send_json(
                {"protocol": "ucode-session/1", "type": "stop"}
            )
            while True:
                payload = await asyncio.wait_for(ws.receive_json(), timeout=3)
                if payload.get("type") == "state" and payload.get("state") == "stopped":
                    break
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8484/api/ucode/runtime/ws")
    parser.add_argument("--title", default="basic-lab")
    parser.add_argument("--answer", default="CODEX")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    output = asyncio.run(probe(args.url, args.title, args.answer, args.verbose))
    required = (f"HELLO {args.answer}", "2 + 2 = 4", "CAPSULE_SMOKE_OK")
    missing = [text for text in required if text not in output]
    if missing:
        raise SystemExit(f"Capsule smoke assertions missing: {missing}")
    print("UCODE_CAPSULE_SESSION_OK")


if __name__ == "__main__":
    main()
