import { createPixelBuffer, type PixelBuffer } from "../pixel/pixel-buffer";
import { EMOJI_ATLAS } from "./emoji-atlas";

/** Deterministic colour-emoji atlas: Unicode codepoint → 12×12 colour bitmap. */
export type EmojiAtlas = Map<number, PixelBuffer>;

/**
 * Load the deterministic colour-emoji atlas into a map of PixelBuffers.
 * Each glyph is a 12×12 colour-index bitmap against the 32-colour palette;
 * index 0 marks transparent pixels.
 */
export function loadEmojiAtlas(): EmojiAtlas {
  const map: EmojiAtlas = new Map();
  const { cellW, cellH, glyphs } = EMOJI_ATLAS;
  for (const [key, pixels] of Object.entries(glyphs)) {
    const code = parseInt(key.replace(/^U\+/, ""), 16);
    if (Number.isNaN(code)) continue;
    const buf = createPixelBuffer(0, cellW, cellH);
    for (let i = 0; i < Math.min(pixels.length, buf.length); i++) {
      const n = Number(pixels[i]);
      buf[i] = Number.isFinite(n) ? Math.max(0, Math.min(31, n)) : 0;
    }
    map.set(code, buf);
  }
  return map;
}

/** Look up one emoji glyph by code point (returns undefined if not baked). */
export function getEmojiGlyph(
  atlas: EmojiAtlas,
  charCode: number,
): PixelBuffer | undefined {
  return atlas.get(charCode);
}

/** The number of glyphs in the baked atlas. */
export function emojiAtlasSize(atlas: EmojiAtlas): number {
  return atlas.size;
}
