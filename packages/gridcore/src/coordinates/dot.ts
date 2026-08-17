/**
 * Grid Cell Algebra — dot lattice & cell registers.
 *
 * The single coordinate space that unifies the two grid faces:
 *   - terminal (Press Start 2P) 8×8
 *   - teletext (Bedstead SAA5050) 12×20
 *
 * A **dot** is the finest common unit: 4×4 device pixels, because
 * 4 = gcd(8, 12) = gcd(8, 20). Every glyph is an integer dot-rectangle, so
 * cell and sprite coordinates share one lattice with no fractional scaling.
 *
 * See docs/GRID_CELL_ALGEBRA.md.
 */

/** One dot in device pixels. */
export const DOT_PX = 4;

/** Common column pitch: lcm(8, 12) = 24 px = 6 dots. */
export const COLUMN_PITCH_PX = 24;
/** Common row pitch: lcm(8, 20) = 40 px = 10 dots. */
export const ROW_PITCH_PX = 40;

/** Super-cell: 24×40 px = 6×10 dots. Tiles both registers exactly. */
export const SUPER_CELL = {
  pxW: COLUMN_PITCH_PX,
  pxH: ROW_PITCH_PX,
  dotsW: 6,
  dotsH: 10,
} as const;

export type CellRegisterName = 'square' | 'tall';

/** A named cell register — a glyph's native size in px. */
export interface CellRegister {
  readonly name: CellRegisterName;
  readonly glyphW: number;
  readonly glyphH: number;
}

/** Square cell (8×8 = 2×2 dots) — gaming, mapping, sprites/bobs. */
export const SQUARE_CELL: CellRegister = { name: 'square', glyphW: 8, glyphH: 8 };
/** Tall cell (12×20 = 3×5 dots) — docs, reading, teletext. */
export const TALL_CELL: CellRegister = { name: 'tall', glyphW: 12, glyphH: 20 };

export const CELL_REGISTERS: Readonly<Record<CellRegisterName, CellRegister>> = {
  square: SQUARE_CELL,
  tall: TALL_CELL,
};

export interface DotPoint {
  x: number;
  y: number;
}

export interface DotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CellPoint {
  col: number;
  row: number;
}

/** Width of a register in dots. */
export function registerDotsW(reg: CellRegister): number {
  return reg.glyphW / DOT_PX;
}

/** Height of a register in dots. */
export function registerDotsH(reg: CellRegister): number {
  return reg.glyphH / DOT_PX;
}

/** Convert dots to device pixels. */
export function dotsToPx(dots: number): number {
  return dots * DOT_PX;
}

/** Convert device pixels to dots. */
export function pxToDots(px: number): number {
  return px / DOT_PX;
}

/** Dot-space rectangle occupied by cell (col, row) for a register. */
export function cellToDotRect(col: number, row: number, reg: CellRegister): DotRect {
  const w = registerDotsW(reg);
  const h = registerDotsH(reg);
  return { x: col * w, y: row * h, w, h };
}

/** Pixel-space rectangle occupied by cell (col, row) for a register. */
export function cellToPxRect(col: number, row: number, reg: CellRegister): DotRect {
  return { x: col * reg.glyphW, y: row * reg.glyphH, w: reg.glyphW, h: reg.glyphH };
}

/** The cell containing a dot-space point (floored). */
export function dotToCell(x: number, y: number, reg: CellRegister): CellPoint {
  return {
    col: Math.floor(x / registerDotsW(reg)),
    row: Math.floor(y / registerDotsH(reg)),
  };
}

/** How many cells of a register tile one super-cell: 3×5 square, 2×2 tall. */
export function cellsPerSuperCell(reg: CellRegister): CellPoint {
  return {
    col: SUPER_CELL.dotsW / registerDotsW(reg),
    row: SUPER_CELL.dotsH / registerDotsH(reg),
  };
}
