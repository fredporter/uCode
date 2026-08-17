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

export function createSymbolMap(): SymbolMap {
  return new Map();
}

/**
 * Scale a native glyph bitmap (gw×gh of 0/1 bits) into the pixel cell.
 *
 * The glyph's full em box is scaled by the largest uniform integer factor that
 * fits the target cell and placed at its natural origin — the glyph FILLS the
 * cell (terminal 8×8→24×24 @3×, teletext 12×20→24×40 @2×). No ink cropping,
 * no re-centring, so cells tile edge-to-edge with no gaps.
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
  const ox = Math.floor((cellW - gw * scale) / 2);
  const oy = Math.floor((cellH - gh * scale) / 2);

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (bitmap[y * gw + x] === 1) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            setPixel(
              out,
              ox + x * scale + dx,
              oy + y * scale + dy,
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
  const map = createSymbolMap();
  if (!data || typeof data !== "object") return map;
  const obj = data as { format?: string; glyphs?: Record<string, unknown> };
  if (obj.format !== "ucode-symbol-map-v1" || !obj.glyphs) return map;

  for (const [key, value] of Object.entries(obj.glyphs)) {
    const code = parseInt(key.replace(/^U\+/, ""), 16);
    if (Number.isNaN(code) || !Array.isArray(value)) continue;
    const buf = createPixelBuffer(0);
    for (let i = 0; i < Math.min(value.length, buf.length); i++) {
      const n = Number(value[i]);
      buf[i] = Number.isFinite(n)
        ? Math.max(0, Math.min(PIXEL_COLOURS - 1, n))
        : 0;
    }
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
