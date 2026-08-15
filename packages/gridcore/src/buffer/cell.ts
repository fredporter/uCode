export interface BufferCell {
  char: string
  fg: number
  bg: number
  bold: boolean
  flash: boolean
  doubleHeight: boolean
  doubleWidth: boolean
  /** 6-bit teletext mosaic pattern (0-63); undefined = no mosaic block */
  mosaic?: number
  /** Optional per-cell render width in CSS px (variable char width) */
  width?: number
}

export type GridCell = BufferCell
export type GridBuffer = BufferCell[][]

export const TERMINAL_COLS = 80
export const TERMINAL_ROWS = 24

export function createBufferCell(
  char = ' ',
  fg = 7,
  bg = 0,
  bold = false,
  flash = false,
  doubleHeight = false,
  doubleWidth = false,
  mosaic?: number,
  width?: number,
): BufferCell {
  return { char, fg, bg, bold, flash, doubleHeight, doubleWidth, mosaic, width }
}


export function createBuffer(cols: number, rows: number): GridBuffer {
  const out: GridBuffer = []
  for (let y = 0; y < rows; y++) {
    const row: BufferCell[] = []
    for (let x = 0; x < cols; x++) row.push(createBufferCell())
    out.push(row)
  }
  return out
}

export function cloneBuffer(buf: GridBuffer): GridBuffer {
  return buf.map(row => row.map(cell => ({ ...cell })))
}

export function getBufferDimensions(buf: GridBuffer): { cols: number; rows: number } {
  return { rows: buf.length, cols: buf.length ? buf[0].length : 0 }
}

export function getDimensions(buf: GridBuffer): { cols: number; rows: number } {
  return getBufferDimensions(buf)
}

export function sameDimensions(a: GridBuffer, b: GridBuffer): boolean {
  const da = getBufferDimensions(a)
  const db = getBufferDimensions(b)
  return da.cols === db.cols && da.rows === db.rows
}
