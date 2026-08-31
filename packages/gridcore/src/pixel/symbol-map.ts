import { nearestColourIndex } from "../palette";
import type { ColourEntry } from "../types";
import {
  createPixelBuffer,
  PIXEL_COLOURS,
  PIXEL_HEIGHT,
  PIXEL_WIDTH,
  setPixel,
  type PixelBuffer,
} from "./pixel-buffer";

/**
 * A symbol map: Unicode codepoint → colour-index bitmap. This is the
 * "font / symbol character map" that ties a glyph (symbol) to its editable
 * pixel definition.
 */
export type SymbolMap = Map<number, PixelBuffer>;
export const MAX_SYMBOL_MAP_GLYPHS = 4_096;

export function createSymbolMap(): SymbolMap {
  return new Map();
}

/**
 * Scale a native glyph bitmap (gw×gh of 0/1 bits) into the pixel cell.
 *
 * The glyph's full em box determines its integer scale, then the actual ink
 * bounds are centred inside the target cell. This preserves the font's native
 * pixel size while correcting asymmetric side bearings and baselines in the
 * Pixel editor. Blank glyphs remain blank.
 */
export function glyphBitmapToPixelBuffer(
  bitmap: Uint8Array,
  gw: number,
  gh: number,
  colour = 7,
  cellW: number = PIXEL_WIDTH,
  cellH: number = PIXEL_HEIGHT,
): PixelBuffer {
  const out = createPixelBuffer(0, cellW, cellH);
  if (gw <= 0 || gh <= 0) return out;

  const scale = Math.max(
    1,
    Math.min(Math.floor(cellW / gw), Math.floor(cellH / gh)),
  );

  let minX = gw;
  let minY = gh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (bitmap[y * gw + x] !== 1) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return out;

  const inkW = maxX - minX + 1;
  const inkH = maxY - minY + 1;
  const ox = Math.floor((cellW - inkW * scale) / 2);
  const oy = Math.floor((cellH - inkH * scale) / 2);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (bitmap[y * gw + x] === 1) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            setPixel(
              out,
              ox + (x - minX) * scale + dx,
              oy + (y - minY) * scale + dy,
              colour,
              cellW,
              cellH,
            );
          }
        }
      }
    }
  }
  return out;
}

/** Serialise a symbol map to a plain object for export. */
export function serializeSymbolMap(map: SymbolMap): {
  format: string;
  glyphs: Record<string, number[]>;
} {
  const glyphs: Record<string, number[]> = {};
  for (const [code, buf] of map) {
    const key = `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
    glyphs[key] = Array.from(buf);
  }
  return { format: "ucode-symbol-map-v1", glyphs };
}

/** Deserialise a plain object into a symbol map. */
export function deserializeSymbolMap(data: unknown): SymbolMap {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid symbol map");
  }
  const obj = data as { format?: string; glyphs?: Record<string, unknown> };
  if (obj.format !== "ucode-symbol-map-v1") {
    throw new Error("Unsupported symbol map format");
  }
  if (!obj.glyphs || typeof obj.glyphs !== "object" || Array.isArray(obj.glyphs)) {
    throw new Error("Invalid symbol map glyphs");
  }
  const glyphs = Object.entries(obj.glyphs);
  if (glyphs.length > MAX_SYMBOL_MAP_GLYPHS) {
    throw new Error(`Symbol map exceeds ${MAX_SYMBOL_MAP_GLYPHS} glyph limit`);
  }

  const decodedGlyphs = glyphs.map(([key, value]) => {
    const match = /^U\+([0-9A-F]{4,6})$/.exec(key);
    const code = match ? Number.parseInt(match[1], 16) : Number.NaN;
    const validScalar = Number.isInteger(code) && code <= 0x10ffff &&
      (code < 0xd800 || code > 0xdfff);
    if (!validScalar || !Array.isArray(value) || value.length !== PIXEL_WIDTH * PIXEL_HEIGHT ||
        !value.every(pixel => Number.isInteger(pixel) && pixel >= 0 && pixel < PIXEL_COLOURS)) {
      throw new Error(`Invalid symbol map glyph: ${key}`);
    }
    return { code, pixels: value };
  });

  const map = createSymbolMap();
  for (const { code, pixels } of decodedGlyphs) {
    const buf = createPixelBuffer(0);
    buf.set(pixels);
    map.set(code, buf);
  }
  return map;
}

/**
 * Convert a colour-rasterised glyph (emoji/symbol RGBA pixels) into a
 * colour-index cell buffer. Each opaque pixel is quantised to the nearest
 * palette colour; transparent pixels become 0. The raster is scaled by the
 * largest uniform integer factor that fits the target cell and centred.
 */
export function colourGlyphToPixelBuffer(
  rgba: { data: Uint8ClampedArray; width: number; height: number },
  palette: ColourEntry[],
  cellW: number = PIXEL_WIDTH,
  cellH: number = PIXEL_HEIGHT,
): PixelBuffer {
  const out = createPixelBuffer(0, cellW, cellH);
  const { data, width, height } = rgba;
  if (width <= 0 || height <= 0) return out;

  const scale = Math.max(
    1,
    Math.min(Math.floor(cellW / width), Math.floor(cellH / height)),
  );
  const ox = Math.floor((cellW - width * scale) / 2);
  const oy = Math.floor((cellH - height * scale) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue; // transparent
      const idx = nearestColourIndex(
        data[i],
        data[i + 1],
        data[i + 2],
        palette,
      );
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          setPixel(
            out,
            ox + x * scale + dx,
            oy + y * scale + dy,
            idx,
            cellW,
            cellH,
          );
        }
      }
    }
  }
  return out;
}
