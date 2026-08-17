import { createBufferCell, type GridBuffer } from '../buffer'
import {
  createPixelBuffer,
  getPixel,
  PIXEL_COLOURS,
  PIXEL_HEIGHT,
  PIXEL_WIDTH,
  setPixel,
  type PixelBuffer,
} from './pixel-buffer'

/**
 * Convert a pixel buffer into a GridBuffer for preview: each pixel becomes
 * one solid-colour cell (fg = bg = colour), renderable by <gridui-canvas>.
 */
export function pixelBufferToGridBuffer(
  buffer: PixelBuffer,
  width = PIXEL_WIDTH,
  height = PIXEL_HEIGHT,
): GridBuffer {
  const grid: GridBuffer = []
  for (let y = 0; y < height; y++) {
    const row: GridBuffer[number] = []
    for (let x = 0; x < width; x++) {
      const color = getPixel(buffer, x, y, width, height)
      row.push(createBufferCell(' ', color, color))
    }
    grid.push(row)
  }
  return grid
}

/**
 * Inverse of {@link pixelBufferToGridBuffer}: read each solid-colour cell's
 * foreground index back into a PixelBuffer. Used by grid import on the Pixel tab.
 */
export function gridBufferToPixelBuffer(
  buf: GridBuffer,
  width = PIXEL_WIDTH,
  height = PIXEL_HEIGHT,
): PixelBuffer {
  const pixels = createPixelBuffer(0, width, height)
  for (let y = 0; y < Math.min(height, buf.length); y++) {
    const row = buf[y]
    if (!row) continue
    for (let x = 0; x < Math.min(width, row.length); x++) {
      const fg = row[x]?.fg ?? 0
      setPixel(pixels, x, y, Math.max(0, Math.min(PIXEL_COLOURS - 1, fg)), width, height)
    }
  }
  return pixels
}
