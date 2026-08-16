/**
 * Grid Seed — connected-cell artwork schema (ucode-grid-seed-v1).
 *
 * A seed describes a grid of cells where each cell is a 6-bit sextant block
 * pattern (2×3 sub-cells, bit0=TL … bit5=BR). Seeds are font-agnostic: the
 * same JSON renders in the Terminal (8×8) and Teletext (12×16) views via the
 * shared sextant pattern table.
 *
 * @see seeds/gridcore/grids/*.json
 * @see render-seed.ts
 */

export interface GridSeed {
  /** Schema discriminator: "ucode-grid-seed-v1". */
  format: string;
  /** Human-readable name. */
  name: string;
  /** Number of cells wide. */
  cols: number;
  /** Number of cells tall. */
  rows: number;
  /** Default foreground colour index (0-7). */
  fg?: number;
  /** Default background colour index (0-7). */
  bg?: number;
  /** Row-major 6-bit sextant patterns (0-63); 0 = empty cell. */
  cells: number[];
}

/** Predicate: is this a valid ucode-grid-seed-v1 document? */
export function isGridSeed(value: unknown): value is GridSeed {
  if (typeof value !== "object" || value === null) return false;
  const seed = value as Partial<GridSeed>;
  return (
    seed.format === "ucode-grid-seed-v1" &&
    typeof seed.cols === "number" &&
    typeof seed.rows === "number" &&
    Array.isArray(seed.cells) &&
    seed.cells.length >= seed.cols * seed.rows
  );
}
