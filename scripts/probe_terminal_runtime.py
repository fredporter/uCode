#!/usr/bin/env python3
"""Probe a running uCore Terminal WebSocket with a real shell command."""

from __future__ import annotations

import argparse
import asyncio

from aiohttp import ClientSession


async def probe(url: str, timeout: float) -> None:
    async with ClientSession() as client:
        async with client.ws_connect(url, heartbeat=20) as ws:
            ready = await ws.receive_json(timeout=timeout)
            if ready.get("type") != "ready":
                raise RuntimeError(f"Terminal did not become ready: {ready}")
            marker = "UCODE_TERMINAL_WS_OK"
            await ws.send_json({"type": "input", "data": f"printf '{marker}\\n'\r"})
            captured = ""
            while marker not in captured:
                message = await ws.receive_json(timeout=timeout)
                if message.get("type") == "error":
                    raise RuntimeError(str(message.get("message", "Terminal error")))
                if message.get("type") == "output":
                    captured += str(message.get("data", ""))
            print(marker)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--url",
        default="ws://127.0.0.1:8484/api/terminal/runtime/ws",
    )
    parser.add_argument("--timeout", type=float, default=3.0)
    args = parser.parse_args()
    asyncio.run(probe(args.url, args.timeout))


if __name__ == "__main__":
    main()
