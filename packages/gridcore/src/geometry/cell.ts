export interface QRSlot {
  id: number;
  payload?: string;
}

export interface Cell {
  coord: string;
  x: number;
  y: number;
  layer: number;
  qrGrid: QRSlot[][];
  storage: number;
  char?: string;
  fg?: number;
  bg?: number;
  bold?: boolean;
  /** Teletext flash (blink). */
  blink?: boolean;
  /** Double-height glyph half. */
  dh?: "top" | "bottom";
  /** Mosaic block graphic flag (sextant glyph lives in `char`). */
  mosaic?: boolean;
  /** Optional per-cell render width in CSS px (variable char width). */
  width?: number;
  /** Optional 24x24 pixel bitmap (colour indices). */
  pixels?: Uint8Array;
}

export function calculateQRGrid(coord: string): QRSlot[][] {
  const slots: QRSlot[][] = [];
  let index = 0;
  for (let row = 0; row < 3; row++) {
    const line: QRSlot[] = [];
    for (let col = 0; col < 3; col++) {
      line.push({ id: index++, payload: `${coord}:qr:${row}-${col}` });
    }
    slots.push(line);
  }
  return slots;
}

export function createCell(coord: string, x = 0, y = 0, layer = 0): Cell {
  return {
    coord,
    x,
    y,
    layer,
    qrGrid: calculateQRGrid(coord),
    storage: 45 * 1024,
    char: " ",
    fg: 7,
    bg: 0,
    bold: false,
  };
}
