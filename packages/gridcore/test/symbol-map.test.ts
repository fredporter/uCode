import { describe, expect, it } from 'vitest'
import { PIXEL_HEIGHT, PIXEL_WIDTH } from '../src/pixel/pixel-buffer'
import {
  createSymbolMap,
  deserializeSymbolMap,
  glyphBitmapToPixelBuffer,
  serializeSymbolMap,
} from '../src/pixel/symbol-map'

describe('symbol map', () => {
  it('scales an 8x8 bitmap to fill the 24x24 cell at 3x', () => {
    const bitmap = new Uint8Array(64)
    bitmap[0] = 1 // single lit pixel in the glyph's top-left
    const buf = glyphBitmapToPixelBuffer(bitmap, 8, 8, 7)
    expect(buf.length).toBe(PIXEL_WIDTH * PIXEL_HEIGHT)
    // 3x3 block of colour 7 at the origin, nothing past column 2
    expect(buf[0]).toBe(7)
    expect(buf[2]).toBe(7)
    expect(buf[PIXEL_WIDTH * 2 + 2]).toBe(7)
    expect(buf[3]).toBe(0)
  })

  it('round-trips a symbol map through serialisation', () => {
    const map = createSymbolMap()
    const bitmap = new Uint8Array(64)
    bitmap[0] = 1
    map.set(0x41, glyphBitmapToPixelBuffer(bitmap, 8, 8, 4))

    const restored = deserializeSymbolMap(
      JSON.parse(JSON.stringify(serializeSymbolMap(map))),
    )
    expect(restored.has(0x41)).toBe(true)
    expect(restored.get(0x41)![0]).toBe(4)
  })
})
