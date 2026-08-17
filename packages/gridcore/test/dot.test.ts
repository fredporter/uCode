import { describe, expect, it } from "vitest";
import {
  COLUMN_PITCH_PX,
  DOT_PX,
  ROW_PITCH_PX,
  SQUARE_CELL,
  SUPER_CELL,
  TALL_CELL,
  cellToDotRect,
  cellToPxRect,
  cellsPerSuperCell,
  dotToCell,
  dotsToPx,
  pxToDots,
  registerDotsH,
  registerDotsW,
} from "../src/coordinates/dot";

describe("grid cell algebra (dot lattice)", () => {
  it("defines the 4px dot invariant shared by both fonts", () => {
    expect(DOT_PX).toBe(4);
    expect(8 % DOT_PX).toBe(0);
    expect(12 % DOT_PX).toBe(0);
    expect(20 % DOT_PX).toBe(0);
  });

  it("sizes each register in whole dots", () => {
    expect(registerDotsW(SQUARE_CELL)).toBe(2);
    expect(registerDotsH(SQUARE_CELL)).toBe(2);
    expect(registerDotsW(TALL_CELL)).toBe(3);
    expect(registerDotsH(TALL_CELL)).toBe(5);
  });

  it("aligns both registers on the shared pitches", () => {
    // 3 square cells = 2 tall cells = 24px = 6 dots wide
    expect(3 * SQUARE_CELL.glyphW).toBe(COLUMN_PITCH_PX);
    expect(2 * TALL_CELL.glyphW).toBe(COLUMN_PITCH_PX);
    // 5 square rows = 2 tall rows = 40px = 10 dots tall
    expect(5 * SQUARE_CELL.glyphH).toBe(ROW_PITCH_PX);
    expect(2 * TALL_CELL.glyphH).toBe(ROW_PITCH_PX);
    expect(SUPER_CELL.dotsW).toBe(6);
    expect(SUPER_CELL.dotsH).toBe(10);
  });

  it("maps cells to dot and pixel rects", () => {
    expect(cellToDotRect(0, 0, SQUARE_CELL)).toEqual({
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    });
    expect(cellToDotRect(1, 0, SQUARE_CELL)).toEqual({
      x: 2,
      y: 0,
      w: 2,
      h: 2,
    });
    expect(cellToDotRect(0, 0, TALL_CELL)).toEqual({ x: 0, y: 0, w: 3, h: 5 });
    expect(cellToPxRect(0, 0, SQUARE_CELL)).toEqual({ x: 0, y: 0, w: 8, h: 8 });
    expect(cellToPxRect(2, 1, TALL_CELL)).toEqual({
      x: 24,
      y: 20,
      w: 12,
      h: 20,
    });
  });

  it("resolves dots back to cells (floored)", () => {
    expect(dotToCell(5, 5, SQUARE_CELL)).toEqual({ col: 2, row: 2 });
    expect(dotToCell(5, 11, TALL_CELL)).toEqual({ col: 1, row: 2 });
  });

  it("tiles one super-cell with both registers", () => {
    expect(cellsPerSuperCell(SQUARE_CELL)).toEqual({ col: 3, row: 5 });
    expect(cellsPerSuperCell(TALL_CELL)).toEqual({ col: 2, row: 2 });
  });

  it("converts between pixels and dots", () => {
    expect(dotsToPx(6)).toBe(24);
    expect(pxToDots(24)).toBe(6);
    expect(pxToDots(40)).toBe(10);
  });
});
