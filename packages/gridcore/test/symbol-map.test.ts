import { describe, expect, it } from "vitest";
import { PIXEL_HEIGHT, PIXEL_WIDTH } from "../src/pixel/pixel-buffer";
import {
  MAX_SYMBOL_MAP_GLYPHS,
  createSymbolMap,
  deserializeSymbolMap,
  glyphBitmapToPixelBuffer,
  serializeSymbolMap,
} from "../src/pixel/symbol-map";

describe("symbol map", () => {
  it("centres glyph ink inside the pixel cell without changing native scale", () => {
    const bitmap = new Uint8Array(64);
    bitmap[0] = 1; // single lit pixel in the glyph's top-left
    const buf = glyphBitmapToPixelBuffer(bitmap, 8, 8, 7);
    expect(buf.length).toBe(PIXEL_WIDTH * PIXEL_HEIGHT);
    // The native 3x scale is preserved, but the ink—not the em-box origin—is
    // centred in the 24x24 cell.
    expect(buf[10 * PIXEL_WIDTH + 10]).toBe(7);
    expect(buf[12 * PIXEL_WIDTH + 12]).toBe(7);
    expect(buf[0]).toBe(0);
  });

  it("round-trips a symbol map through serialisation", () => {
    const map = createSymbolMap();
    const bitmap = new Uint8Array(64);
    bitmap[0] = 1;
    const original = glyphBitmapToPixelBuffer(bitmap, 8, 8, 4);
    map.set(0x41, original);

    const restored = deserializeSymbolMap(
      JSON.parse(JSON.stringify(serializeSymbolMap(map))),
    );
    expect(restored.has(0x41)).toBe(true);
    expect(restored.get(0x41)).toEqual(original);
  });

  it("rejects unsupported and malformed symbol map payloads", () => {
    expect(() => deserializeSymbolMap({ format: 'old', glyphs: {} }))
      .toThrow('Unsupported symbol map format')
    expect(() => deserializeSymbolMap({
      format: 'ucode-symbol-map-v1', glyphs: { invalid: [] },
    })).toThrow('Invalid symbol map glyph: invalid')
    expect(() => deserializeSymbolMap({
      format: 'ucode-symbol-map-v1', glyphs: { 'U+0041': new Array(PIXEL_WIDTH * PIXEL_HEIGHT).fill(32) },
    })).toThrow('Invalid symbol map glyph: U+0041')
  })

  it("rejects oversized maps before allocating glyph buffers", () => {
    const glyphs = Object.fromEntries(
      Array.from({ length: MAX_SYMBOL_MAP_GLYPHS + 1 }, (_, index) => [`U+${index.toString(16).toUpperCase().padStart(4, '0')}`, []]),
    )
    expect(() => deserializeSymbolMap({ format: 'ucode-symbol-map-v1', glyphs }))
      .toThrow(`Symbol map exceeds ${MAX_SYMBOL_MAP_GLYPHS} glyph limit`)
  })
});
