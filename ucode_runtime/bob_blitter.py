"""uCode Runtime BOB (Blitter Object) Engine over 4×4 Dot Lattice.

Implements canonical specifications from:
- global-knowledge/standards/GRIDCORE-STANDARDS.json
- global-knowledge/standards/DEVICE-DISPLAY-STANDARDS.md
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

DOT_PX: int = 4
MAX_BOB_DIM_PX: int = 128
MAX_BOB_DIM_DOTS: int = MAX_BOB_DIM_PX // DOT_PX  # 32 dots
MAX_BOB_RAM_BYTES: int = 128 * 1024  # 128 KB
MAX_BOB_GIF_BYTES: int = 60 * 1024  # 60 KB


@dataclass
class BobFrame:
    width_dots: int
    height_dots: int
    data: bytes | bytearray
    duration_ms: int = 83


@dataclass
class BobDefinition:
    id: str | int
    width_dots: int
    height_dots: int
    frames: List[BobFrame] = field(default_factory=list)
    transparent_index: int = 0
    name: str = ""

    @property
    def width_px(self) -> int:
        return self.width_dots * DOT_PX

    @property
    def height_px(self) -> int:
        return self.height_dots * DOT_PX

    @property
    def ram_footprint_bytes(self) -> int:
        # width * height * frames * 1 byte
        num_frames = max(1, len(self.frames))
        return self.width_px * self.height_px * num_frames


@dataclass
class BobInstance:
    id: str | int
    def_id: str | int
    x_dots: int
    y_dots: int
    vx_dots: int = 0
    vy_dots: int = 0
    active_frame: int = 0
    elapsed_ms: int = 0
    visible: bool = True

    @property
    def x_px(self) -> int:
        return self.x_dots * DOT_PX

    @property
    def y_px(self) -> int:
        return self.y_dots * DOT_PX


class BobBlitterRuntime:
    """Runtime BOB manager tracking active sprites over the 4×4 dot lattice."""

    def __init__(self) -> None:
        self.definitions: Dict[str | int, BobDefinition] = {}
        self.instances: Dict[str | int, BobInstance] = {}

    def define_bob(
        self,
        id: str | int,
        width_dots: int,
        height_dots: int,
        frames: Optional[List[BobFrame]] = None,
        transparent_index: int = 0,
        name: str = "",
    ) -> BobDefinition:
        if width_dots > MAX_BOB_DIM_DOTS or height_dots > MAX_BOB_DIM_DOTS:
            raise ValueError(
                f"BOB '{id}' dimensions ({width_dots * DOT_PX}x{height_dots * DOT_PX}px) "
                f"exceed maximum {MAX_BOB_DIM_PX}x{MAX_BOB_DIM_PX}px"
            )

        frames_list = frames or [
            BobFrame(
                width_dots=width_dots,
                height_dots=height_dots,
                data=b"\x00" * (width_dots * height_dots),
            )
        ]

        b_def = BobDefinition(
            id=id,
            width_dots=width_dots,
            height_dots=height_dots,
            frames=frames_list,
            transparent_index=transparent_index,
            name=name,
        )

        if b_def.ram_footprint_bytes > MAX_BOB_RAM_BYTES:
            raise ValueError(
                f"BOB '{id}' memory footprint ({b_def.ram_footprint_bytes} bytes) "
                f"exceeds maximum {MAX_BOB_RAM_BYTES} bytes"
            )

        self.definitions[id] = b_def
        return b_def

    def bob(
        self,
        id: str | int,
        x_dots: int,
        y_dots: int,
        frame: Optional[int] = None,
    ) -> BobInstance:
        """Place or move BOB instance at dot lattice coordinates (AMOS BOB id, x, y, frame)."""
        inst = self.instances.get(id)
        if not inst:
            if id not in self.definitions:
                # Auto-define a standard 2x2 dot (8x8px) placeholder if not pre-defined
                self.define_bob(id, width_dots=2, height_dots=2, name=f"Bob {id}")
            inst = BobInstance(
                id=id,
                def_id=id,
                x_dots=int(round(x_dots)),
                y_dots=int(round(y_dots)),
                active_frame=frame or 0,
                visible=True,
            )
            self.instances[id] = inst
        else:
            inst.x_dots = int(round(x_dots))
            inst.y_dots = int(round(y_dots))
            if frame is not None:
                b_def = self.definitions.get(inst.def_id)
                num_frames = len(b_def.frames) if b_def else 1
                inst.active_frame = frame % num_frames
            inst.visible = True
        return inst

    def bob_off(self, id: str | int) -> None:
        """Hide BOB (AMOS BOB OFF id)."""
        inst = self.instances.get(id)
        if inst:
            inst.visible = False

    def step(
        self,
        delta_ms: int,
        bounds_dots: Optional[Tuple[int, int, int, int]] = None,
        bounce: bool = True,
    ) -> None:
        """Step all active BOB instances on the dot lattice."""
        for inst in self.instances.values():
            if not inst.visible:
                continue

            inst.x_dots += inst.vx_dots
            inst.y_dots += inst.vy_dots

            b_def = self.definitions.get(inst.def_id)
            w = b_def.width_dots if b_def else 2
            h = b_def.height_dots if b_def else 2

            if bounds_dots:
                min_x, min_y, max_x, max_y = bounds_dots
                if inst.x_dots < min_x:
                    inst.x_dots = min_x
                    if bounce:
                        inst.vx_dots = -inst.vx_dots
                elif inst.x_dots + w > max_x:
                    inst.x_dots = max_x - w
                    if bounce:
                        inst.vx_dots = -inst.vx_dots

                if inst.y_dots < min_y:
                    inst.y_dots = min_y
                    if bounce:
                        inst.vy_dots = -inst.vy_dots
                elif inst.y_dots + h > max_y:
                    inst.y_dots = max_y - h
                    if bounce:
                        inst.vy_dots = -inst.vy_dots

            if b_def and len(b_def.frames) > 1:
                inst.elapsed_ms += delta_ms
                cur_dur = b_def.frames[inst.active_frame].duration_ms
                while inst.elapsed_ms >= cur_dur:
                    inst.elapsed_ms -= cur_dur
                    inst.active_frame = (inst.active_frame + 1) % len(b_def.frames)

    def check_collisions(self) -> List[Tuple[BobInstance, BobInstance]]:
        """Return colliding pairs on dot lattice."""
        active = [b for b in self.instances.values() if b.visible]
        collisions: List[Tuple[BobInstance, BobInstance]] = []

        for i in range(len(active)):
            for j in range(i + 1, len(active)):
                b1 = active[i]
                b2 = active[j]
                d1 = self.definitions.get(b1.def_id)
                d2 = self.definitions.get(b2.def_id)
                w1 = d1.width_dots if d1 else 2
                h1 = d1.height_dots if d1 else 2
                w2 = d2.width_dots if d2 else 2
                h2 = d2.height_dots if d2 else 2

                left = max(b1.x_dots, b2.x_dots)
                right = min(b1.x_dots + w1, b2.x_dots + w2)
                top = max(b1.y_dots, b2.y_dots)
                bottom = min(b1.y_dots + h1, b2.y_dots + h2)

                if left < right and top < bottom:
                    collisions.append((b1, b2))

        return collisions

    def parse_basic_bob_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse BASIC / AMOS BOB instruction."""
        trimmed = line.strip()
        # Strip optional leading line numbers (e.g. '100 BOB 1, 10, 20, 0')
        trimmed = re.sub(r"^\d+\s+", "", trimmed)
        # BOB OFF id
        m_off = re.match(r"^BOB\s+OFF\s+(\d+|[a-zA-Z0-9_]+)", trimmed, re.IGNORECASE)
        if m_off:
            bob_id = int(m_off.group(1)) if m_off.group(1).isdigit() else m_off.group(1)
            self.bob_off(bob_id)
            return {"action": "bob_off", "id": bob_id}

        # BOB id, x, y, image_or_frame
        m_bob = re.match(
            r"^BOB\s+(\d+|[a-zA-Z0-9_]+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)(?:\s*,\s*([^\s,]+))?",
            trimmed,
            re.IGNORECASE,
        )
        if m_bob:
            raw_id = m_bob.group(1)
            bob_id = int(raw_id) if raw_id.isdigit() else raw_id
            x = int(m_bob.group(2))
            y = int(m_bob.group(3))
            frame_or_asset = m_bob.group(4)

            frame = None
            asset = None
            if frame_or_asset:
                cleaned = frame_or_asset.strip("\"'")
                if cleaned.isdigit():
                    frame = int(cleaned)
                else:
                    asset = cleaned

            inst = self.bob(bob_id, x, y, frame=frame)
            return {
                "action": "bob",
                "id": bob_id,
                "x_dots": x,
                "y_dots": y,
                "frame": frame,
                "asset": asset,
                "instance": inst,
            }

        return None
