import {
  cloneBuffer,
  createBufferCell,
  getBufferDimensions,
  type GridBuffer,
} from "./cell";

export function resizeBuffer(
  buf: GridBuffer,
  newCols: number,
  newRows: number,
): GridBuffer {
  const { cols, rows } = getBufferDimensions(buf);
  const out: GridBuffer = [];

  for (let y = 0; y < newRows; y++) {
    const row = [];
    for (let x = 0; x < newCols; x++) {
      if (y < rows && x < cols) row.push({ ...buf[y][x] });
      else row.push(createBufferCell());
    }
    out.push(row);
  }

  return out;
}

export function overlayBuffer(
  base: GridBuffer,
  top: GridBuffer,
  offsetX = 0,
  offsetY = 0,
): GridBuffer {
  const out = cloneBuffer(base);
  const { cols: baseCols, rows: baseRows } = getBufferDimensions(base);
  const { cols: topCols, rows: topRows } = getBufferDimensions(top);

  for (let ty = 0; ty < topRows; ty++) {
    for (let tx = 0; tx < topCols; tx++) {
      const bx = offsetX + tx;
      const by = offsetY + ty;
      if (bx < 0 || by < 0 || bx >= baseCols || by >= baseRows) continue;
      const cell = top[ty][tx];
      if (cell.char !== " " || cell.bg !== 0) out[by][bx] = { ...cell };
    }
  }

  return out;
}

export function scrollBuffer(buf: GridBuffer, lines: number): GridBuffer {
  const { cols, rows } = getBufferDimensions(buf);
  const out = cloneBuffer(buf);

  if (lines > 0) {
    for (let y = 0; y < rows; y++) {
      const src = y + lines;
      out[y] =
        src < rows
          ? buf[src].map((c) => ({ ...c }))
          : Array.from({ length: cols }, () => createBufferCell());
    }
  } else if (lines < 0) {
    const shift = -lines;
    for (let y = rows - 1; y >= 0; y--) {
      const src = y - shift;
      out[y] =
        src >= 0
          ? buf[src].map((c) => ({ ...c }))
          : Array.from({ length: cols }, () => createBufferCell());
    }
  }

  return out;
}

export function writeBufferString(
  buf: GridBuffer,
  x: number,
  y: number,
  text: string,
  fg = 7,
  bg = 0,
  bold = false,
): GridBuffer {
  const out = cloneBuffer(buf);
  const { cols, rows } = getBufferDimensions(out);
  if (y < 0 || y >= rows) return out;

  for (let i = 0; i < text.length; i++) {
    const dx = x + i;
    if (dx < 0 || dx >= cols) continue;
    out[y][dx] = { char: text[i], fg, bg, bold };
  }

  return out;
}

export function cropBuffer(
  buf: GridBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
): GridBuffer {
  const { cols, rows } = getBufferDimensions(buf);
  const out: GridBuffer = [];

  for (let dy = 0; dy < h; dy++) {
    const row = [];
    for (let dx = 0; dx < w; dx++) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx >= 0 && sx < cols && sy >= 0 && sy < rows)
        row.push({ ...buf[sy][sx] });
      else row.push(createBufferCell());
    }
    out.push(row);
  }

  return out;
}

export function mergeBuffer(a: GridBuffer, b: GridBuffer): GridBuffer {
  const out = cloneBuffer(a);
  const { cols, rows } = getBufferDimensions(a);

  for (let y = 0; y < rows && y < b.length; y++) {
    for (let x = 0; x < cols && x < b[y].length; x++) {
      const cell = b[y][x];
      if (cell.char !== " " || cell.bg !== 0) out[y][x] = { ...cell };
    }
  }

  return out;
}

export function fillBuffer(
  buf: GridBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  char: string,
  fg: number,
  bg: number,
): GridBuffer {
  const out = cloneBuffer(buf);
  const { cols, rows } = getBufferDimensions(buf);

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const fx = x + dx;
      const fy = y + dy;
      if (fx >= 0 && fx < cols && fy >= 0 && fy < rows) {
        out[fy][fx] = { ...out[fy][fx], char, fg, bg };
      }
    }
  }

  return out;
}

export const resize = resizeBuffer;
export const overlay = overlayBuffer;
export const scroll = scrollBuffer;
export const crop = cropBuffer;
export const merge = mergeBuffer;
export const fill = fillBuffer;
export const writeString = writeBufferString;
