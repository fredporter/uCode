/**
 * Grid Algebra — Colour Palette
 *
 * 8-colour palette for teletext/grid rendering (dark + light variants) and the
 * 32-colour palette for the pixel editor.
 */

import type { ColourEntry } from "./types";

/** Dark theme palette (default). */
export const PALETTE_DARK: ColourEntry[] = [
  { index: 0, name: "Black", hex: "#000000" },
  { index: 1, name: "Red", hex: "#e6193c" },
  { index: 2, name: "Green", hex: "#3fb950" },
  { index: 3, name: "Yellow", hex: "#f2cc60" },
  { index: 4, name: "Blue", hex: "#58a6ff" },
  { index: 5, name: "Magenta", hex: "#bc8cff" },
  { index: 6, name: "Cyan", hex: "#39c5cf" },
  { index: 7, name: "White", hex: "#c9d1d9" },
];

/** Light theme palette. */
export const PALETTE_LIGHT: ColourEntry[] = [
  { index: 0, name: "Black", hex: "#000000" },
  { index: 1, name: "Red", hex: "#cc0000" },
  { index: 2, name: "Green", hex: "#00aa00" },
  { index: 3, name: "Yellow", hex: "#cccc00" },
  { index: 4, name: "Blue", hex: "#0000cc" },
  { index: 5, name: "Magenta", hex: "#cc00cc" },
  { index: 6, name: "Cyan", hex: "#00cccc" },
  { index: 7, name: "White", hex: "#ffffff" },
];

/**
 * 32-colour pixel-editor palette.
 *
 * Indices 0-7 stay MODE-7 aligned so grid cells remain compatible; the rest
 * add Bootstrap 4 utilities, greys, Fitzpatrick skin tones and deep shades.
 */
export const PALETTE_PIXEL_32: ColourEntry[] = [
  { index: 0, name: "Black", hex: "#000000" },
  { index: 1, name: "Red", hex: "#dc3545" },
  { index: 2, name: "Green", hex: "#28a745" },
  { index: 3, name: "Yellow", hex: "#ffc107" },
  { index: 4, name: "Blue", hex: "#007bff" },
  { index: 5, name: "Magenta", hex: "#d63384" },
  { index: 6, name: "Cyan", hex: "#17a2b8" },
  { index: 7, name: "White", hex: "#ffffff" },
  { index: 8, name: "Orange", hex: "#fd7e14" },
  { index: 9, name: "Pink", hex: "#e83e8c" },
  { index: 10, name: "Purple", hex: "#6f42c1" },
  { index: 11, name: "Indigo", hex: "#6610f2" },
  { index: 12, name: "Teal", hex: "#20c997" },
  { index: 13, name: "Navy", hex: "#0b3d91" },
  { index: 14, name: "Gold", hex: "#d4af37" },
  { index: 15, name: "Brown", hex: "#6f4e37" },
  { index: 16, name: "Rose", hex: "#ff6b81" },
  { index: 17, name: "Lime", hex: "#84cc16" },
  { index: 18, name: "Grey 100", hex: "#f8f9fa" },
  { index: 19, name: "Grey 200", hex: "#e9ecef" },
  { index: 20, name: "Grey 300", hex: "#dee2e6" },
  { index: 21, name: "Grey 400", hex: "#ced4da" },
  { index: 22, name: "Grey 500", hex: "#adb5bd" },
  { index: 23, name: "Grey 600", hex: "#6c757d" },
  { index: 24, name: "Grey 700", hex: "#495057" },
  { index: 25, name: "Skin Light", hex: "#ffdfc4" },
  { index: 26, name: "Skin Med-Light", hex: "#e8c39e" },
  { index: 27, name: "Skin Medium", hex: "#c89263" },
  { index: 28, name: "Skin Med-Dark", hex: "#8d5524" },
  { index: 29, name: "Skin Dark", hex: "#5c3a21" },
  { index: 30, name: "Deep Red", hex: "#7f1d1d" },
  { index: 31, name: "Deep Blue", hex: "#1e3a8a" },
];

/** Get the hex colour for an index (falls back to white). */
export function getColour(
  index: number,
  palette: ColourEntry[] = PALETTE_DARK,
): string {
  const entry =
    palette.find((c) => c.index === index) ??
    palette.find((c) => c.index === 7);
  return entry?.hex ?? "#ffffff";
}

/** Nearest palette colour index for an RGB triplet (Euclidean distance). */
export function nearestColourIndex(
  r: number,
  g: number,
  b: number,
  palette: ColourEntry[] = PALETTE_PIXEL_32,
): number {
  let best = 0;
  let bestDist = Infinity;
  for (const c of palette) {
    const cr = parseInt(c.hex.slice(1, 3), 16);
    const cg = parseInt(c.hex.slice(3, 5), 16);
    const cb = parseInt(c.hex.slice(5, 7), 16);
    const dr = r - cr;
    const dg = g - cg;
    const db = b - cb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c.index;
    }
  }
  return best;
}

/** Convert a colour index to a CSS colour string. */
export function colourCSS(
  index: number,
  palette: ColourEntry[] = PALETTE_DARK,
): string {
  return getColour(index, palette);
}
