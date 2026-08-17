import {
  PIXEL_COLOURS,
  PIXEL_HEIGHT,
  PIXEL_WIDTH,
  clearPixelBuffer,
  clonePixelBuffer,
  createPixelBuffer,
  fillPixelBuffer,
  setPixel,
  type PixelBuffer,
  type PixelColor,
} from "./pixel-buffer";

/**
 * Sub-cell pixel editor over a colour-index bitmap (24×24 terminal, 24×40
 * teletext). Snapshot-based undo/redo keeps every mutation reversible.
 */
export class PixelEditor {
  private data: PixelBuffer;
  private undoStack: PixelBuffer[] = [];
  private redoStack: PixelBuffer[] = [];
  private color: PixelColor = 7;
  private _width: number;
  private _height: number;

  constructor(
    initial?: PixelBuffer,
    width: number = PIXEL_WIDTH,
    height: number = PIXEL_HEIGHT,
  ) {
    this._width = width;
    this._height = height;
    this.data = initial
      ? clonePixelBuffer(initial)
      : createPixelBuffer(0, width, height);
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get size(): number {
    return PIXEL_WIDTH;
  }

  get buffer(): PixelBuffer {
    return clonePixelBuffer(this.data);
  }

  setColor(color: PixelColor): void {
    this.color = Math.max(0, Math.min(PIXEL_COLOURS - 1, color));
  }

  getColor(): PixelColor {
    return this.color;
  }

  paint(x: number, y: number, color?: PixelColor): void {
    this.commit();
    setPixel(this.data, x, y, color ?? this.color, this._width, this._height);
  }

  erase(x: number, y: number): void {
    this.commit();
    setPixel(this.data, x, y, 0, this._width, this._height);
  }

  /** Flood-fill the connected region at (x, y) with the current colour. */
  floodFill(x: number, y: number, color?: PixelColor): void {
    if (x < 0 || y < 0 || x >= this._width || y >= this._height) return;
    const target = this.data[y * this._width + x];
    const fill = color ?? this.color;
    if (target === fill) return;
    this.commit();
    const stack: [number, number][] = [[x, y]];
    const visited = new Set<number>();
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = cy * this._width + cx;
      if (visited.has(key)) continue;
      visited.add(key);
      if (cx < 0 || cx >= this._width || cy < 0 || cy >= this._height) continue;
      if (this.data[key] !== target) continue;
      this.data[key] = fill;
      stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
    }
  }

  fill(color?: PixelColor): void {
    this.commit();
    fillPixelBuffer(this.data, color ?? this.color);
  }

  clear(): void {
    this.commit();
    clearPixelBuffer(this.data);
  }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(clonePixelBuffer(this.data));
    this.data = prev;
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(clonePixelBuffer(this.data));
    this.data = next;
  }

  private commit(): void {
    this.undoStack.push(clonePixelBuffer(this.data));
    this.redoStack = [];
  }
}
