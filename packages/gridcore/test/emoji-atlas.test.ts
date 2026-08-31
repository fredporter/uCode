import { describe, expect, it } from "vitest";
import { getPixel, measureInkBounds } from "../src/pixel/pixel-buffer";
import { EMOJI_ATLAS } from "../src/seeds/emoji-atlas";
import {
  emojiAtlasSize,
  getEmojiGlyph,
  loadEmojiAtlas,
} from "../src/seeds/emoji";
import atlasReference from "../../../seeds/gridcore/glyph-atlas.emoji.json";

describe("emoji atlas", () => {
  const atlas = loadEmojiAtlas();

  it("bakes the curated set deterministically", () => {
    // 8 solid squares + 9 geometric glyphs
    expect(emojiAtlasSize(atlas)).toBe(17);
  });

  it("matches its JSON reference with valid fixed-size palette buffers", () => {
    expect(EMOJI_ATLAS).toEqual(atlasReference);
    for (const pixels of Object.values(EMOJI_ATLAS.glyphs)) {
      expect(pixels).toHaveLength(EMOJI_ATLAS.cellW * EMOJI_ATLAS.cellH);
      expect(pixels.every((pixel) => Number.isInteger(pixel) && pixel >= 0 && pixel <= 31)).toBe(true);
    }
  });

  it("renders the red heart as red ink on a transparent background", () => {
    const heart = getEmojiGlyph(atlas, 0x2764);
    expect(heart).toBeTruthy();
    expect(heart!.length).toBe(12 * 12);
    expect(Array.from(heart!).some((v) => v === 1)).toBe(true); // red
    expect(heart![0]).toBe(0); // transparent corner
  });

  it("renders the smiley with yellow face and dark features", () => {
    const smiley = getEmojiGlyph(atlas, 0x1f600);
    expect(smiley).toBeTruthy();
    const values = Array.from(smiley!);
    expect(values.some((v) => v === 3)).toBe(true); // yellow
    expect(values.some((v) => v === 31)).toBe(true); // dark features
  });

  it("renders the solid red square as a full 12x12 of red", () => {
    const square = getEmojiGlyph(atlas, 0x1f7e5);
    expect(square).toBeTruthy();
    expect(Array.from(square!).every((v) => v === 1)).toBe(true);
  });

  it("exposes ink bounds for variable glyph metrics", () => {
    const check = getEmojiGlyph(atlas, 0x2714);
    const bounds = measureInkBounds(check!, 12, 12);
    expect(bounds).not.toBeNull();
  });

  it("returns undefined for unbaked code points", () => {
    expect(getEmojiGlyph(atlas, 0x0041)).toBeUndefined(); // 'A' is not emoji
    expect(getPixel(getEmojiGlyph(atlas, 0x2716)!, 0, 0, 12, 12)).toBe(1); // cross top-left red
  });
});
