import { describe, expect, it } from 'vitest'

import { createBuffer } from '../src/buffer'
import {
  drawMosaicLine,
  drawMosaicRectangle,
  drawTeletextBarChart,
  fillMosaicRegion,
  imageToMosaicStamp,
  mosaicDotIsSet,
  paintMosaicDot,
  stampMosaic,
  clearMosaicRect,
  extractMosaicStamp,
  mosaicRect,
  BUILTIN_MOSAIC_STAMPS,
  findMosaicStamp,
  nameMosaicStamp,
} from '../src/teletext/graphics'

describe('teletext graphics tools', () => {
  it('packs six paintable dots into one mosaic cell', () => {
    const buffer = createBuffer(1, 1)
    for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) {
      paintMosaicDot(buffer, x, y, { colour: 3 })
    }
    expect(buffer[0][0].mosaic).toBe(true)
    expect([0, 1, 2].every((y) => [0, 1].every((x) => mosaicDotIsSet(buffer, x, y)))).toBe(true)
  })

  it('draws lines and outlined rectangles in dot space', () => {
    const buffer = createBuffer(5, 4)
    drawMosaicLine(buffer, { x: 0, y: 0 }, { x: 5, y: 5 }, { colour: 2 })
    drawMosaicRectangle(buffer, { x: 2, y: 2 }, { x: 7, y: 8 }, { colour: 6 })
    expect(mosaicDotIsSet(buffer, 0, 0)).toBe(true)
    expect(mosaicDotIsSet(buffer, 5, 5)).toBe(true)
    expect(mosaicDotIsSet(buffer, 2, 8)).toBe(true)
  })

  it('flood fills enclosed regions and stamps reusable art', () => {
    const buffer = createBuffer(5, 4)
    drawMosaicRectangle(buffer, { x: 0, y: 0 }, { x: 7, y: 8 }, { colour: 2 })
    fillMosaicRegion(buffer, { x: 2, y: 2 }, { colour: 3 })
    stampMosaic(buffer, { x: 8, y: 0 }, {
      width: 2,
      height: 3,
      pixels: [true, false, true, true, true, false],
    }, { colour: 6 })
    expect(mosaicDotIsSet(buffer, 3, 4)).toBe(true)
    expect(mosaicDotIsSet(buffer, 8, 0)).toBe(true)
    expect(mosaicDotIsSet(buffer, 9, 0)).toBe(false)
  })

  it('renders compact data bars for editorial pages', () => {
    const buffer = createBuffer(8, 6)
    drawTeletextBarChart(buffer, 1, 5, [1, 2, 4], 4)
    expect(buffer[5][1].char).toBe('█')
    expect(buffer[2][3].char).toBe('█')
  })

  it('converts RGBA images into size-bounded mosaic stamps', () => {
    const stamp = imageToMosaicStamp({
      width: 2,
      height: 1,
      data: [255, 255, 255, 255, 0, 0, 0, 255],
    }, { width: 2, height: 1 })
    expect(stamp).toEqual({ width: 2, height: 1, pixels: [true, false] })
  })

  it('copies, clears and re-stamps an inclusive dot selection', () => {
    const buffer = createBuffer(4, 3)
    drawMosaicRectangle(buffer, { x: 1, y: 1 }, { x: 3, y: 3 }, { colour: 2 }, true)
    const rect = mosaicRect({ x: 3, y: 3 }, { x: 1, y: 1 })
    const stamp = extractMosaicStamp(buffer, rect)
    clearMosaicRect(buffer, rect)
    expect(mosaicDotIsSet(buffer, 2, 2)).toBe(false)
    stampMosaic(buffer, { x: 5, y: 4 }, stamp, { colour: 3 })
    expect(mosaicDotIsSet(buffer, 6, 5)).toBe(true)
  })

  it('provides searchable built-in and immutable custom stamp metadata', () => {
    expect(BUILTIN_MOSAIC_STAMPS.map((stamp) => stamp.id)).toContain('sun')
    expect(findMosaicStamp('island')?.category).toBe('map')
    const custom = nameMosaicStamp({ width: 1, height: 1, pixels: [true] }, 'mine', 'Mine')
    expect(custom).toMatchObject({ id: 'mine', label: 'Mine', category: 'custom' })
  })
})
