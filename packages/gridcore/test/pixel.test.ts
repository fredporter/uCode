import { describe, expect, it } from 'vitest'
import {
  PIXEL_COUNT,
  PIXEL_SIZE,
  createPixelBuffer,
  fillPixelBuffer,
  getPixel,
  setPixel,
} from '../src/pixel/pixel-buffer'
import { PixelEditor } from '../src/pixel/pixel-editor'
import { pixelBufferToGrid } from '../src/pixel/to-grid'

describe('pixel buffer', () => {
  it('creates a 24x24 buffer', () => {
    const buf = createPixelBuffer()
    expect(buf.length).toBe(PIXEL_COUNT)
    expect(buf[0]).toBe(0)
  })

  it('setPixel / getPixel round-trip with bounds', () => {
    const buf = createPixelBuffer()
    setPixel(buf, 3, 4, 5)
    expect(getPixel(buf, 3, 4)).toBe(5)
    expect(getPixel(buf, 0, 0)).toBe(0)

    // Out of bounds is ignored safely
    setPixel(buf, -1, 0, 3)
    setPixel(buf, PIXEL_SIZE, PIXEL_SIZE, 3)
  })

  it('fills the buffer', () => {
    const buf = createPixelBuffer()
    fillPixelBuffer(buf, 7)
    expect(buf[0]).toBe(7)
    expect(buf[PIXEL_COUNT - 1]).toBe(7)
  })
})

describe('PixelEditor', () => {
  it('paints, erases, fills, clears with undo/redo', () => {
    const e = new PixelEditor()
    e.setColor(3)
    e.paint(0, 0)
    expect(e.buffer[0]).toBe(3)

    e.undo()
    expect(e.buffer[0]).toBe(0)

    e.redo()
    expect(e.buffer[0]).toBe(3)

    e.fill(5)
    expect(e.buffer[0]).toBe(5)

    e.undo()
    expect(e.buffer[0]).toBe(3)

    e.clear()
    expect(e.buffer[PIXEL_COUNT - 1]).toBe(0)
  })

  it('clamps colour to 0-7', () => {
    const e = new PixelEditor()
    e.setColor(99)
    expect(e.getColor()).toBe(7)
  })
})

describe('pixelBufferToGrid', () => {
  it('maps each pixel to a solid-colour cell', () => {
    const buf = createPixelBuffer()
    setPixel(buf, 1, 0, 4)
    const grid = pixelBufferToGrid(buf)
    expect(grid.cols).toBe(PIXEL_SIZE)
    expect(grid.rows).toBe(PIXEL_SIZE)
    const cell = grid.cells.get('1:0:0')
    expect(cell!.fg).toBe(4)
    expect(cell!.bg).toBe(4)
  })
})
