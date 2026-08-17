// Bake the Bedstead glyph atlas from bedstead-20.bdf (true SAA5050 bitmap).
//
// Bedstead is distributed as a bitmap font (BDF) — the BDF bitmaps ARE the
// source of truth, so the atlas is pixel-perfect. Bedstead's cell is 12×20
// (FONTBOUNDINGBOX 12 20), which at 2× is 24×40 — the authentic Teletext
// proportions (10×18 matrix).
//
// Bakes ASCII plus the box-drawing, block-element and 2×3 sextant mosaic
// glyphs so the teletext view renders the same symbols and graphics blocks
// the Terminal view uses.
//
// Usage: node scripts/bake-bedstead-atlas.mjs

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────
const GLYPH_W = 12;
const GLYPH_H = 20;
const BDF_PATH = resolve(
  __dirname,
  "../../uCore/frontend-vue/public/fonts/bedstead-20.bdf",
);

// ── BDF parsing ───────────────────────────────────────────────────
const bdf = readFileSync(BDF_PATH, "latin1");
const glyphBlocks = bdf.match(/STARTCHAR[\s\S]*?ENDCHAR/g) || [];
if (glyphBlocks.length === 0) {
  throw new Error(`No glyphs parsed from ${BDF_PATH}`);
}

// BDF bitmaps are left-aligned to a whole number of bytes; drop the trailing
// padding bits so each row is exactly GLYPH_W bits (MSB = leftmost pixel).
const rowBits = Math.ceil(GLYPH_W / 8) * 8; // 16 for a 12-wide cell
const shift = rowBits - GLYPH_W; // 4
const hexLen = Math.ceil(GLYPH_W / 4); // 3 hex digits

/** Codepoints to bake: ASCII + box-drawing + blocks + 2×3 sextants. */
function shouldBake(cp) {
  return (
    (cp >= 0x20 && cp <= 0x7e) ||
    (cp >= 0x2500 && cp <= 0x257f) ||
    (cp >= 0x2580 && cp <= 0x259f) ||
    (cp >= 0x1fb00 && cp <= 0x1fb3b)
  );
}

const glyphs = {};
for (const block of glyphBlocks) {
  const encMatch = block.match(/^ENCODING\s+(-?\d+)$/m);
  const bitmapMatch = block.match(/^BITMAP\s*\n([0-9A-Fa-f\n]+)/m);
  if (!encMatch || !bitmapMatch) continue;
  const cp = parseInt(encMatch[1], 10);
  if (!shouldBake(cp)) continue;

  const rows = bitmapMatch[1]
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, GLYPH_H);
  const encoded = [];
  for (let r = 0; r < GLYPH_H; r++) {
    const raw = rows[r] || "0";
    const value = (parseInt(raw, 16) >>> 0) >>> shift; // 12 significant bits
    encoded.push(value.toString(16).toUpperCase().padStart(hexLen, "0"));
  }
  const key = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
  glyphs[key] = encoded;
}

const atlas = {
  format: "ucode-glyph-atlas-v1",
  family: "Bedstead",
  glyphW: GLYPH_W,
  glyphH: GLYPH_H,
  cellW: 24,
  cellH: 40,
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
    `${base}/glyph-atlas.bedstead.json`,
    JSON.stringify(atlas, null, 2) + "\n",
  );
  console.log(
    `wrote ${base}/glyph-atlas.bedstead.json (${Object.keys(glyphs).length} glyphs)`,
  );
}
