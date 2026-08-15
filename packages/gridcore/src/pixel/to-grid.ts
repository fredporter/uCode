import { cellKey, createGrid, type Grid } from '../geometry/grid'
import { getPixel, PIXEL_SIZE, type PixelBuffer } from './pixel-buffer'

/**
 * Convert a pixel buffer into a Grid for preview: each pixel becomes one
 * solid-colour cell (fg = bg = colour), renderable by any viewport.
 */
export function pixelBufferToGrid(buffer: PixelBuffer, size = PIXEL_SIZE): Grid {
  const grid = createGrid(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = getPixel(buffer, x, y)
      const cell = grid.cells.get(cellKey(x, y, 0))
      if (cell) {
        cell.char = ' '
        cell.fg = color
        cell.bg = color
      }
    }
  }
  return grid
}
