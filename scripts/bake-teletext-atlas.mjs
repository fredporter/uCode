// Bake the teletext glyph atlas from MODE7GX3.TTF using exact font metrics.
//
// The atlas is the single source of truth for codepoint → glyph-bitmap mapping
// used by the GridCore bitmap renderer. This script rasterises the source font
// deterministically (no browser, no anti-aliasing) with opentype.js and writes
// the committed seed files consumed by the frontend.
//
// Mapping: the font em (1000 units, ascender 800 / descender -200) is mapped
// 1:1 onto the glyphH-row G0 grid, so capital ink (~700 units) occupies ~7 of
// the 10 rows with natural margins. The glyph advance is centred horizontally.
//
// Usage: node scripts/bake-teletext-atlas.mjs

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const require = createRequire(
  resolve(__dirname, "../../uCore/frontend-vue/package.json"),
);
const opentype = require("opentype.js");

// ── Configuration ─────────────────────────────────────────────────
const GLYPH_W = 12;
// MODE7GX3's native aspect is advance:em = 780:1000 (≈ 12:15.4) — the glyph
// cell is TALLER than wide. We bake at 12×16 with SQUARE pixels (advance fills
// the full 12 columns), which reproduces the reference Ceefax proportions and
// keeps double-height splits at a clean 8/8 rows.
const GLYPH_H = 16;
const CACHE_SCALE = 4; // oversampling factor (device px per glyph row)
const FONT_PATH = resolve(
  __dirname,
  "../../uCore/frontend-vue/public/fonts/MODE7GX3.TTF",
);

// ── Font & metrics ────────────────────────────────────────────────
const font = opentype.parse(readFileSync(FONT_PATH));
const { unitsPerEm, ascender } = font;
// Monospaced advance (780 units) maps to the full glyph width with SQUARE
// pixels. The font's em (1000u) is therefore ~15.4 rows tall; we centre it
// vertically within the 16-row glyph so the ascender top and descender bottom
// both fall inside the grid (no clipping).
const advanceWidth = font.charToGlyph("A").advanceWidth; // 780 (monospace)

const canvasW = GLYPH_W * CACHE_SCALE;
const canvasH = GLYPH_H * CACHE_SCALE;
const pxPerUnit = canvasW / advanceWidth; // square pixels
const emCanvasH = unitsPerEm * pxPerUnit; // em height in canvas px (~61.5)
// Centre the em box vertically and place the baseline at the font's ascender.
const baselineY =
  (canvasH - emCanvasH) / 2 + (ascender / unitsPerEm) * emCanvasH;

// ── Geometry helpers ──────────────────────────────────────────────
/** Even-odd point-in-polygon test. */
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > py !== yj > py) {
      const xInt = ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (px < xInt) inside = !inside;
    }
  }
  return inside;
}

/** Map a font-unit point (y-up) to canvas pixels (y-down). */
function mapPoint(x, y) {
  return [x * pxPerUnit, baselineY - y * pxPerUnit];
}

/** Flatten a glyph path into closed polygons (canvas px coordinates). */
function glyphPolygons(glyph) {
  const polys = [];
  let poly = null;
  for (const cmd of glyph.path.commands) {
    if (cmd.type === "M") {
      poly = [mapPoint(cmd.x, cmd.y)];
    } else if (cmd.type === "L") {
      if (poly) poly.push(mapPoint(cmd.x, cmd.y));
    } else if (cmd.type === "Q") {
      if (poly)
        flattenQuad(poly, mapPoint(cmd.x1, cmd.y1), mapPoint(cmd.x, cmd.y));
    } else if (cmd.type === "C") {
      if (poly) {
        flattenCubic(
          poly,
          mapPoint(cmd.x1, cmd.y1),
          mapPoint(cmd.x2, cmd.y2),
          mapPoint(cmd.x, cmd.y),
        );
      }
    } else if (cmd.type === "Z") {
      if (poly && poly.length > 2) polys.push(poly);
      poly = null;
    }
  }
  if (poly && poly.length > 2) polys.push(poly);
  return polys;
}

/** Flatten a quadratic Bézier onto `poly` (adaptive subdivision). */
function flattenQuad(poly, [cx, cy], [x2, y2]) {
  const [x0, y0] = poly[poly.length - 1];
  const dx = x2 - x0;
  const dy = y2 - y0;
  const denom = Math.hypot(dx, dy) || 1;
  const d = Math.abs((cx - x0) * dy - (cy - y0) * dx) / denom;
  if (d < 0.35) {
    poly.push([x2, y2]);
    return;
  }
  const mx01 = (x0 + cx) / 2,
    my01 = (y0 + cy) / 2;
  const mx12 = (cx + x2) / 2,
    my12 = (cy + y2) / 2;
  const mx = (mx01 + mx12) / 2,
    my = (my01 + my12) / 2;
  flattenQuad(poly, [mx01, my01], [mx, my]);
  flattenQuad(poly, [mx12, my12], [x2, y2]);
}

/** Flatten a cubic Bézier onto `poly` (adaptive subdivision). */
function flattenCubic(poly, [x1, y1], [x2, y2], [x3, y3]) {
  const [x0, y0] = poly[poly.length - 1];
  const dx = x3 - x0;
  const dy = y3 - y0;
  const denom = Math.hypot(dx, dy) || 1;
  const d =
    (Math.abs((x1 - x0) * dy - (y1 - y0) * dx) +
      Math.abs((x2 - x0) * dy - (y2 - y0) * dx)) /
    denom;
  if (d < 0.35) {
    poly.push([x3, y3]);
    return;
  }
  const m01 = [(x0 + x1) / 2, (y0 + y1) / 2];
  const m12 = [(x1 + x2) / 2, (y1 + y2) / 2];
  const m23 = [(x2 + x3) / 2, (y2 + y3) / 2];
  const m012 = [(m01[0] + m12[0]) / 2, (m01[1] + m12[1]) / 2];
  const m123 = [(m12[0] + m23[0]) / 2, (m12[1] + m23[1]) / 2];
  const m = [(m012[0] + m123[0]) / 2, (m012[1] + m123[1]) / 2];
  flattenCubic(poly, m01, m012, m);
  flattenCubic(poly, m123, m23, [x3, y3]);
}

/** Rasterise a glyph to a GLYPH_W×GLYPH_H binary bitmap (0/1). */
function rasteriseGlyph(glyph) {
  const polys = glyphPolygons(glyph);
  const bitmap = new Uint8Array(GLYPH_W * GLYPH_H);
  for (let row = 0; row < GLYPH_H; row++) {
    for (let col = 0; col < GLYPH_W; col++) {
      const cx = col * CACHE_SCALE + CACHE_SCALE / 2;
      const cy = row * CACHE_SCALE + CACHE_SCALE / 2;
      let inside = false;
      for (const poly of polys) {
        if (pointInPolygon(cx, cy, poly)) inside = !inside;
      }
      bitmap[row * GLYPH_W + col] = inside ? 1 : 0;
    }
  }
  return bitmap;
}

/** Encode a bitmap row as a zero-padded hex string (MSB = col 0). */
function encodeRow(bitmap, row) {
  let value = 0;
  for (let col = 0; col < GLYPH_W; col++) {
    value = (value << 1) | (bitmap[row * GLYPH_W + col] ? 1 : 0);
  }
  return value
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(GLYPH_W / 4), "0");
}

// ── Bake ──────────────────────────────────────────────────────────
const glyphs = {};
for (let cp = 32; cp <= 126; cp++) {
  const glyph = font.charToGlyph(String.fromCharCode(cp));
  const bitmap = rasteriseGlyph(glyph);
  const rows = [];
  for (let row = 0; row < GLYPH_H; row++) rows.push(encodeRow(bitmap, row));
  const key = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
  glyphs[key] = rows;
}

const atlas = {
  format: "ucode-glyph-atlas-v1",
  family: "MODE7GX3",
  glyphW: GLYPH_W,
  glyphH: GLYPH_H,
  cellW: 24,
  cellH: 32,
  scale: 2,
  offsetX: 0,
  offsetY: 0,
  glyphs,
};

const targets = [
  resolve(__dirname, "../seeds/gridcore"),
  resolve(__dirname, "../../uCore/frontend-vue/src/grid-core/seeds"),
];
for (const base of targets) {
  mkdirSync(base, { recursive: true });
  writeFileSync(
    `${base}/glyph-atlas.teletext.json`,
    JSON.stringify(atlas, null, 2) + "\n",
  );
  console.log(
    `wrote ${base}/glyph-atlas.teletext.json (${Object.keys(glyphs).length} glyphs)`,
  );
}
