"""Tests for uCode runtime BOB blitter engine over 4×4 dot lattice."""
import pytest
from ucode_runtime.bob_blitter import (
    BobBlitterRuntime,
    BobFrame,
    DOT_PX,
    MAX_BOB_DIM_DOTS,
    MAX_BOB_RAM_BYTES,
)


def test_bob_blitter_invariants():
    assert DOT_PX == 4
    assert MAX_BOB_DIM_DOTS == 32  # 128 / 4
    assert MAX_BOB_RAM_BYTES == 128 * 1024


def test_define_bob_within_budget():
    runtime = BobBlitterRuntime()
    # 16x16 dots = 64x64 px
    b_def = runtime.define_bob(
        id=1,
        width_dots=16,
        height_dots=16,
        frames=[
            BobFrame(width_dots=16, height_dots=16, data=b"\x01" * 256),
            BobFrame(width_dots=16, height_dots=16, data=b"\x02" * 256),
        ],
        name="hero_sprite",
    )
    assert b_def.width_px == 64
    assert b_def.height_px == 64
    assert b_def.ram_footprint_bytes == 64 * 64 * 2


def test_define_bob_rejects_oversized():
    runtime = BobBlitterRuntime()
    with pytest.raises(ValueError, match="exceed maximum"):
        runtime.define_bob(id="giant", width_dots=33, height_dots=10)


def test_parse_basic_bob_commands():
    runtime = BobBlitterRuntime()

    # Parse BOB 1, 10, 20, "hero.gif"
    res1 = runtime.parse_basic_bob_line('BOB 1, 10, 20, "hero.gif"')
    assert res1 is not None
    assert res1["action"] == "bob"
    assert res1["id"] == 1
    assert res1["x_dots"] == 10
    assert res1["y_dots"] == 20
    assert res1["asset"] == "hero.gif"

    inst = runtime.instances[1]
    assert inst.x_dots == 10
    assert inst.y_dots == 20
    assert inst.x_px == 40
    assert inst.y_px == 80
    assert inst.visible is True

    # Parse BOB OFF 1
    res2 = runtime.parse_basic_bob_line("BOB OFF 1")
    assert res2 is not None
    assert res2["action"] == "bob_off"
    assert inst.visible is False


def test_bob_step_and_collision_detection():
    runtime = BobBlitterRuntime()
    runtime.bob(1, 0, 0)
    runtime.bob(2, 5, 0)

    # Initial: no collision (0..2 vs 5..7)
    assert len(runtime.check_collisions()) == 0

    # Move BOB 1 towards BOB 2
    runtime.instances[1].vx_dots = 4
    runtime.step(50)
    # BOB 1 at x=4, BOB 2 at x=5 -> overlap between 4..6 and 5..7
    collisions = runtime.check_collisions()
    assert len(collisions) == 1
    assert (collisions[0][0].id, collisions[0][1].id) == (1, 2)
