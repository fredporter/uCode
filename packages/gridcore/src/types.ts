/**
 * Grid Algebra — Core Types (canonical).
 *
 * Shared palette / viewport / layout types. The cell model itself
 * (`GridCell` / `GridBuffer`) lives in `buffer/cell.ts`.
 */

/** Colour palette entry. */
export interface ColourEntry {
  index: number;
  name: string;
  hex: string;
}


/** Column specification for prose layouts (Grid Algebra v2.0). */
export interface ColumnSpec {
  count: number;
  width: string;
  gap: string;
  breakpoint: number;
  maxWidth: string;
}

/** Grid character presets. */
export interface GridPreset {
  name: string;
  cols: number;
  rows: number;
  aspect: string;
  description: string;
}

/** Markdown rendering mode. */
export type RenderMode = "prose" | "columns" | "slides" | "web-pub" | "grid";

/** GridCore UI interaction mode. */
export type GridMode = "view" | "edit" | "map";
