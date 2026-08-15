import { createCell, type Cell } from '../geometry/cell'
import { cellKey, type Grid } from '../geometry/grid'
import { createBufferCell, type BufferCell, type GridBuffer } from './cell'

/**
 * Convert a spatially-addressed geometry Cell (Map-based Grid) into a
 * BufferCell (2D-array display cell). Spatial addressing is dropped; only the
 * shared display attributes are preserved.
 */
export function cellToBuffer(cell: Cell): BufferCell {
  return {
    char: cell.char ?? ' ',
    fg: cell.fg ?? 7,
    bg: cell.bg ?? 0,
    bold: cell.bold ?? false,
    flash: cell.flash ?? false,
    doubleHeight: cell.doubleHeight ?? false,
    doubleWidth: cell.doubleWidth ?? false,
    mosaic: cell.mosaic,
    width: cell.width,
  }
}

/**
 * Convert a BufferCell into a spatially-addressed geometry Cell, synthesising a
 * uCode coordinate in the same scheme used by createGrid.
 */
export function bufferCellToCell(cell: BufferCell, x: number, y: number, layer = 0): Cell {
  const coord = `L340-${x.toString(36).toUpperCase().padStart(2, '0')}${y.toString(36).toUpperCase().padStart(2, '0')}-0000-${layer}`
  const out = createCell(coord, x, y, layer)
  out.char = cell.char
  out.fg = cell.fg
  out.bg = cell.bg
  out.bold = cell.bold
  out.flash = cell.flash
  out.doubleHeight = cell.doubleHeight
  out.doubleWidth = cell.doubleWidth
  out.mosaic = cell.mosaic
  out.width = cell.width
  return out
}

/**
 * Flatten a single layer of a Map-based Grid into a 2D GridBuffer, so surfaces
 * (Grid) can feed editors (GridBuffer).
 */
export function gridToBuffer(grid: Grid, layer = 0): GridBuffer {
  const buffer: GridBuffer = []
  for (let y = 0; y < grid.rows; y++) {
    const row: BufferCell[] = []
    for (let x = 0; x < grid.cols; x++) {
      const cell = grid.cells.get(cellKey(x, y, layer))
      row.push(cell ? cellToBuffer(cell) : createBufferCell())
    }
    buffer.push(row)
  }
  return buffer
}

/**
 * Rebuild a Map-based Grid from a 2D GridBuffer, so editors (GridBuffer) can
 * feed surfaces and renderers (Grid). The grid contains exactly one layer.
 */
export function bufferToGrid(buffer: GridBuffer, layer = 0): Grid {
  const rows = buffer.length
  const cols = rows ? buffer[0].length : 0
  const grid: Grid = { cols, rows, cells: new Map() }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      grid.cells.set(cellKey(x, y, layer), bufferCellToCell(buffer[y][x], x, y, layer))
    }
  }
  return grid
}
