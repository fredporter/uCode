/**
 * Seed Renderer — render a connected-cell seed into a GridBuffer.
 *
 * Each 6-bit pattern maps to a cell whose `mosaic` field carries the pattern
 * (the renderer draws the 2×3 block) and whose `char` carries the display
 * character (a Unicode sextant or block element). The pattern table mirrors
 * seeds/gridcore/sextant-patterns.json (bit0=TL … bit5=BR).
 *
 * @see seeds/gridcore/grids/*.json
 */

import { createBufferCell, type GridBuffer } from "../buffer/cell";
import type { GridSeed } from "./grid-seed";

/**
 * 2×3 sextant digit strings indexed 0–59, matching the Unicode sextant block
 * U+1FB00–U+1FB3B in order. Digits: 1=TL 2=TR 3=ML 4=MR 5=BL 6=BR.
 * Pattern 21 (left half "135") has no sextant codepoint — it is the block
 * element U+258C. Patterns 61/62 are unrepresentable as a single codepoint.
 */
const SEXTANT_DIGITS: string[] = [
  "1",
  "2",
  "12",
  "3",
  "13",
  "23",
  "123",
  "4",
  "14",
  "24",
  "124",
  "34",
  "134",
  "234",
  "1234",
  "5",
  "15",
  "25",
  "125",
  "35",
  "235",
  "1235",
  "45",
  "145",
  "245",
  "1245",
  "345",
  "1345",
  "2345",
  "12345",
  "6",
  "16",
  "26",
  "126",
  "36",
  "136",
  "236",
  "1236",
  "46",
  "146",
  "246",
  "1246",
  "346",
  "1346",
  "2346",
  "12346",
  "56",
  "156",
  "256",
  "1256",
  "356",
  "1356",
  "2356",
  "12356",
  "456",
  "1456",
  "2456",
  "12456",
  "3456",
  "123456",
];

function digitsToPattern(digits: string): number {
  let pattern = 0;
  for (const ch of digits) {
    const d = ch.charCodeAt(0) - 48; // '1'..'6'
    if (d >= 1 && d <= 6) pattern |= 1 << (d - 1);
  }
  return pattern;
}

/** Build the 6-bit pattern → Unicode codepoint map. */
function buildPatternMap(): Map<number, number> {
  const map = new Map<number, number>();
  for (let idx = 0; idx < SEXTANT_DIGITS.length; idx++) {
    map.set(digitsToPattern(SEXTANT_DIGITS[idx]), 0x1fb00 + idx);
  }
  // Block-element patterns that have no sextant codepoint.
  map.set(21, 0x258c); // ▌ left half ("135")
  map.set(63, 0x2588); // █ full block ("123456")
  return map;
}

const PATTERN_TO_CODE = buildPatternMap();

/** Convert a 6-bit pattern to its display character (space for empty). */
export function patternToChar(pattern: number): string {
  if (pattern <= 0) return " ";
  const code = PATTERN_TO_CODE.get(pattern);
  return code !== undefined ? String.fromCodePoint(code) : " ";
}

/**
 * Render a seed into a canonical GridBuffer. Empty cells (pattern 0) become
 * spaces; filled cells carry `mosaic: pattern` plus the display character.
 */
export function renderSeed(seed: GridSeed): GridBuffer {
  const { cols, rows } = seed;
  const fg = seed.fg ?? 7;
  const bg = seed.bg ?? 0;
  const buf: GridBuffer = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const pattern = seed.cells[r * cols + c] ?? 0;
      row.push(
        createBufferCell(
          patternToChar(pattern),
          fg,
          bg,
          false,
          false,
          false,
          false,
          pattern === 0 ? undefined : pattern,
        ),
      );
    }
    buf.push(row);
  }
  return buf;
}
