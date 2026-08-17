import { describe, expect, it } from 'vitest'
import { createCell } from '../src/geometry/cell'
import { createGrid, setCell } from '../src/geometry/grid'
import { createBuffer } from '../src/buffer/cell'
import { writeBufferString } from '../src/buffer/transform'
import { bufferToGrid, cellToBuffer, gridToBuffer } from '../src/buffer/convert'

describe('cell model conversion', () => {
  it('converts a geometry cell to a buffer cell', () => {
    const cell = createCell('L340-AB-0000-0', 1, 2, 0)
    cell.char = 'X'
    cell.fg = 2
    cell.bg = 1
    cell.bold = true
    cell.dh = "top"
    cell.mosaic = true

    const buf = cellToBuffer(cell)
    expect(buf.char).toBe('X')
    expect(buf.fg).toBe(2)
    expect(buf.bg).toBe(1)
    expect(buf.bold).toBe(true)
    expect(buf.dh).toBe("top")
    expect(buf.mosaic).toBe(true)
  })

  it('converts a populated grid to a 2D buffer', () => {
    const grid = createGrid(4, 3)
    const cell = createCell('L340-0201-0000-0', 2, 1, 0)
    cell.char = '#'
    cell.fg = 6
    setCell(grid, cell)

    const buffer = gridToBuffer(grid)
    expect(buffer.length).toBe(3)
    expect(buffer[0].length).toBe(4)
    expect(buffer[1][2].char).toBe('#')
    expect(buffer[1][2].fg).toBe(6)
  })

  it('round-trips buffer -> grid -> buffer', () => {
    const buffer = writeBufferString(createBuffer(5, 2), 1, 0, 'ABC', 3, 4)
    const grid = bufferToGrid(buffer)
    expect(grid.cols).toBe(5)
    expect(grid.rows).toBe(2)
    expect(grid.cells.size).toBe(10)

    const roundTrip = gridToBuffer(grid)
    expect(roundTrip[0][1].char).toBe('A')
    expect(roundTrip[0][2].char).toBe('B')
    expect(roundTrip[0][3].char).toBe('C')
    expect(roundTrip[0][1].fg).toBe(3)
    expect(roundTrip[0][1].bg).toBe(4)
  })

  it('bufferToGrid preserves display flags', () => {
    const buffer = createBuffer(2, 1)
    buffer[0][0] = {
      char: 'M',
      fg: 7,
      bg: 0,
      bold: true,
      blink: true,
      mosaic: true,
    }
    const grid = bufferToGrid(buffer)
    const cell = grid.cells.get('0:0:0')
    expect(cell).toBeTruthy()
    expect(cell!.char).toBe('M')
    expect(cell!.bold).toBe(true)
    expect(cell!.blink).toBe(true)
    expect(cell!.mosaic).toBe(true)
  })
})
