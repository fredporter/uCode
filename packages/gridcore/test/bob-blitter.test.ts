import { describe, expect, it } from "vitest";
import {
  BobBlitter,
  createBobFromAscii,
  MAX_BOB_DIMENSION_DOTS,
  MAX_BOB_RAM_BYTES,
} from "../src/coordinates/bob";
import { DOT_PX, SQUARE_CELL, TALL_CELL } from "../src/coordinates/dot";
import { createBuffer } from "../src/buffer/cell";
import { createPixelBuffer, getPixel } from "../src/pixel/pixel-buffer";

describe("GridCore BOB (Blitter Object) Engine over 4×4 Dot Lattice", () => {
  it("enforces dot lattice invariants and maximum memory budgets", () => {
    const blitter = new BobBlitter();

    // 16x16 dots = 64x64 px (standard BOB size)
    const validDef = {
      id: 1,
      widthDots: 16,
      heightDots: 16,
      frames: [
        {
          widthDots: 16,
          heightDots: 16,
          dots: new Uint8Array(256),
          durationMs: 83,
        },
        {
          widthDots: 16,
          heightDots: 16,
          dots: new Uint8Array(256),
          durationMs: 83,
        },
      ],
    };

    blitter.defineBob(validDef);
    expect(blitter.hasDefinition(1)).toBe(true);

    const mem = blitter.calculateMemoryFootprint(validDef);
    // 64 * 64 * 2 frames * 1 byte = 8,192 bytes
    expect(mem.ramBytes).toBe(64 * 64 * 2);
    expect(mem.fitsBudget).toBe(true);
    expect(mem.ramBytes).toBeLessThanOrEqual(MAX_BOB_RAM_BYTES);
  });

  it("rejects BOB definitions that exceed 128x128 px lattice bounds", () => {
    const blitter = new BobBlitter();
    const oversizedDef = {
      id: "too-large",
      widthDots: MAX_BOB_DIMENSION_DOTS + 1, // > 32 dots (> 128px)
      heightDots: 16,
      frames: [{ widthDots: 33, heightDots: 16, dots: new Uint8Array(33 * 16) }],
    };

    expect(() => blitter.defineBob(oversizedDef)).toThrow(/exceed maximum/);
  });

  it("positions and moves BOBs via AMOS-style command syntax (BOB n, x, y, frame)", () => {
    const blitter = new BobBlitter();
    const def = createBobFromAscii(
      10,
      [
        ["11", "11"], // Frame 0 (2x2 dots = 8x8px)
        ["22", "22"], // Frame 1
      ],
      { "1": 1, "2": 2, " ": 0 },
    );
    blitter.defineBob(def);

    // Initial position BOB 10, 5, 8, 0
    const inst = blitter.bob(10, 5, 8, 0);
    expect(inst.x).toBe(5);
    expect(inst.y).toBe(8);
    expect(inst.activeFrame).toBe(0);
    expect(inst.visible).toBe(true);

    // Move to 12, 20 with frame 1
    blitter.bob(10, 12, 20, 1);
    expect(inst.x).toBe(12);
    expect(inst.y).toBe(20);
    expect(inst.activeFrame).toBe(1);

    // BOB OFF 10
    blitter.bobOff(10);
    expect(inst.visible).toBe(false);
  });

  it("advances animations and performs bounds bouncing over dot lattice", () => {
    const blitter = new BobBlitter();
    const def = createBobFromAscii(
      "hero",
      [
        ["1"],
        ["2"],
        ["3"],
      ],
      { "1": 1, "2": 2, "3": 3 },
      100, // 100ms per frame
    );
    blitter.defineBob(def);

    const inst = blitter.bob("hero", 0, 0, 0);
    blitter.setVelocity("hero", 2, 0); // 2 dots per step

    // Step 100ms
    blitter.step(100, { minDotX: 0, minDotY: 0, maxDotX: 10, maxDotY: 10, bounce: true });
    expect(inst.x).toBe(2);
    expect(inst.activeFrame).toBe(1);

    // Step another 100ms
    blitter.step(100, { minDotX: 0, minDotY: 0, maxDotX: 10, maxDotY: 10, bounce: true });
    expect(inst.x).toBe(4);
    expect(inst.activeFrame).toBe(2);

    // Step loop back to frame 0
    blitter.step(100, { minDotX: 0, minDotY: 0, maxDotX: 10, maxDotY: 10, bounce: true });
    expect(inst.x).toBe(6);
    expect(inst.activeFrame).toBe(0);
  });

  it("detects collisions between BOBs in dot lattice space", () => {
    const blitter = new BobBlitter();
    const defA = createBobFromAscii(1, [["11", "11"]], { "1": 1 }); // 2x2 dots
    const defB = createBobFromAscii(2, [["22", "22"]], { "2": 2 }); // 2x2 dots

    blitter.defineBob(defA);
    blitter.defineBob(defB);

    // Far apart -> No collision
    blitter.bob(1, 0, 0);
    blitter.bob(2, 10, 10);
    expect(blitter.checkCollisions()).toHaveLength(0);

    // Overlapping at (1, 1)
    blitter.bob(2, 1, 1);
    const collisions = blitter.checkCollisions();
    expect(collisions).toHaveLength(1);
    expect(collisions[0].overlapDots).toEqual({
      x: 1,
      y: 1,
      w: 1,
      h: 1,
    });
  });

  it("blits BOBs onto pixel buffer with 4x4 physical dot scaling", () => {
    const blitter = new BobBlitter();
    // 2x2 dots = 8x8 device pixels
    const def = createBobFromAscii(
      "gem",
      [["10", "02"]], // (0,0) color 1, (1,1) color 2
      { "1": 1, "2": 2, "0": 0 },
    );
    blitter.defineBob(def);
    blitter.bob("gem", 0, 0);

    const pxBuffer = createPixelBuffer(0, 16, 16);
    blitter.blitToPixelBuffer(pxBuffer, 16, 16);

    // Dot (0,0) covers pixels (0..3, 0..3) with color 1
    for (let y = 0; y < DOT_PX; y++) {
      for (let x = 0; x < DOT_PX; x++) {
        expect(getPixel(pxBuffer, x, y, 16, 16)).toBe(1);
      }
    }

    // Dot (1,1) covers pixels (4..7, 4..7) with color 2
    for (let y = 4; y < 4 + DOT_PX; y++) {
      for (let x = 4; x < 4 + DOT_PX; x++) {
        expect(getPixel(pxBuffer, x, y, 16, 16)).toBe(2);
      }
    }

    // Transparent dot (1,0) at (4..7, 0..3) should remain 0
    expect(getPixel(pxBuffer, 4, 0, 16, 16)).toBe(0);
  });

  it("blits BOBs onto cell GridBuffer", () => {
    const blitter = new BobBlitter();
    const def = createBobFromAscii(
      "ship",
      [["11", "11"]], // 2x2 dots = 1 square cell (8x8px)
      { "1": 5 },
    );
    blitter.defineBob(def);
    blitter.bob("ship", 2, 2); // cell (1, 1) in square register

    const grid = createBuffer(10, 10);
    blitter.blitToGridBuffer(grid, SQUARE_CELL);

    // Cell (1, 1) should now have the blitted character stamp with color 5
    expect(grid[1][1].char).toBe("▣");
    expect(grid[1][1].fg).toBe(5);
  });
});
