export interface GridCell {
  char: string
  fg: number
  bg: number
  bold?: boolean
  /** Teletext flash (blink). */
  blink?: boolean
  /** Double-height glyph half. */
  dh?: "top" | "bottom"
  /** Mosaic block graphic flag (sextant glyph lives in `char`). */
  mosaic?: boolean
  /** Optional per-cell render width in CSS px (variable char width). */
  width?: number
}

/** @deprecated use `GridCell`. */
export type BufferCell = GridCell
export type GridBuffer = GridCell[][]

export const TERMINAL_COLS = 80
export const TERMINAL_ROWS = 24

export function createBufferCell(
  char = ' ',
  fg = 7,
  bg = 0,
  bold = false,
  blink?: boolean,
  mosaic?: boolean,
  dh?: "top" | "bottom",
  width?: number,
): GridCell {
  return { char, fg, bg, bold, blink, mosaic, dh, width }
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
