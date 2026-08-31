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
  private revision = 0;
  private savedRevision = 0;
  private selection: PixelSelection | null = null;
  private clipboard: PixelClipboard | null = null;

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

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get dirty(): boolean { return this.revision !== this.savedRevision; }

  markSaved(): void {
    this.savedRevision = this.revision;
  }

  getSelection(): PixelSelection | null {
    return this.selection ? { ...this.selection } : null;
  }
  get hasClipboard(): boolean { return this.clipboard !== null; }

  select(x: number, y: number, width: number, height: number): void {
    const left = Math.max(0, Math.min(this._width - 1, x));
    const top = Math.max(0, Math.min(this._height - 1, y));
    this.selection = {
      x: left,
      y: top,
      width: Math.max(1, Math.min(width, this._width - left)),
      height: Math.max(1, Math.min(height, this._height - top)),
    };
  }

  clearSelection(): void { this.selection = null; }

  copy(): PixelClipboard | null {
    if (!this.selection) return null;
    const { x, y, width, height } = this.selection;
    const pixels = createPixelBuffer(0, width, height);
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      pixels[row * width + col] = this.data[(y + row) * this._width + x + col];
    }
    this.clipboard = { width, height, pixels };
    return { width, height, pixels: clonePixelBuffer(pixels) };
  }

  cut(): PixelClipboard | null {
    const copied = this.copy();
    if (!copied || !this.selection) return copied;
    this.commit();
    this.forSelection((x, y) => setPixel(this.data, x, y, 0, this._width, this._height));
    return copied;
  }

  paste(x: number, y: number): void {
    if (!this.clipboard) return;
    this.commit();
    for (let row = 0; row < this.clipboard.height; row++) for (let col = 0; col < this.clipboard.width; col++) {
      setPixel(this.data, x + col, y + row, this.clipboard.pixels[row * this.clipboard.width + col], this._width, this._height);
    }
  }

  flipSelection(horizontal: boolean): void {
    if (!this.selection) return;
    const copied = this.copy();
    if (!copied) return;
    this.commit();
    const { x, y, width, height } = this.selection;
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      const sourceX = horizontal ? width - 1 - col : col;
      const sourceY = horizontal ? row : height - 1 - row;
      setPixel(this.data, x + col, y + row, copied.pixels[sourceY * width + sourceX], this._width, this._height);
    }
  }

  moveSelection(dx: number, dy: number): void {
    if (!this.selection || (dx === 0 && dy === 0)) return;
    const copied = this.copy();
    if (!copied) return;
    const targetX = Math.max(0, Math.min(this._width - copied.width, this.selection.x + dx));
    const targetY = Math.max(0, Math.min(this._height - copied.height, this.selection.y + dy));
    if (targetX === this.selection.x && targetY === this.selection.y) return;
    this.commit();
    this.forSelection((x, y) => setPixel(this.data, x, y, 0, this._width, this._height));
    for (let row = 0; row < copied.height; row++) for (let col = 0; col < copied.width; col++) {
      setPixel(this.data, targetX + col, targetY + row, copied.pixels[row * copied.width + col], this._width, this._height);
    }
    this.selection = { x: targetX, y: targetY, width: copied.width, height: copied.height };
  }

  rotateSelection(clockwise = true): void {
    if (!this.selection) return;
    const copied = this.copy();
    if (!copied) return;
    const { x, y } = this.selection;
    const width = copied.height;
    const height = copied.width;
    this.commit();
    this.forSelection((px, py) => setPixel(this.data, px, py, 0, this._width, this._height));
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      const sourceX = clockwise ? row : copied.width - 1 - row;
      const sourceY = clockwise ? copied.height - 1 - col : col;
      setPixel(this.data, x + col, y + row, copied.pixels[sourceY * copied.width + sourceX], this._width, this._height);
    }
    this.selection = {
      x,
      y,
      width: Math.min(width, this._width - x),
      height: Math.min(height, this._height - y),
    };
  }

  private forSelection(operation: (x: number, y: number) => void): void {
    if (!this.selection) return;
    for (let y = this.selection.y; y < this.selection.y + this.selection.height; y++) {
      for (let x = this.selection.x; x < this.selection.x + this.selection.width; x++) operation(x, y);
    }
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
    this.revision--;
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(clonePixelBuffer(this.data));
    this.data = next;
    this.revision++;
  }

  private commit(): void {
    this.undoStack.push(clonePixelBuffer(this.data));
    this.redoStack = [];
    this.revision++;
  }
}

export interface PixelSelection { x: number; y: number; width: number; height: number }
export interface PixelClipboard { width: number; height: number; pixels: PixelBuffer }
