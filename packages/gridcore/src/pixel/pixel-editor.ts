import {
  PIXEL_SIZE,
  clearPixelBuffer,
  clonePixelBuffer,
  createPixelBuffer,
  fillPixelBuffer,
  setPixel,
  type PixelBuffer,
  type PixelColor,
} from './pixel-buffer'

/**
 * Sub-cell pixel editor over a 24x24 colour-index bitmap. Snapshot-based
 * undo/redo keeps every mutation reversible.
 */
export class PixelEditor {
  private data: PixelBuffer
  private undoStack: PixelBuffer[] = []
  private redoStack: PixelBuffer[] = []
  private color: PixelColor = 7

  constructor(initial?: PixelBuffer) {
    this.data = initial ? clonePixelBuffer(initial) : createPixelBuffer(0)
  }

  get size(): number {
    return PIXEL_SIZE
  }

  get buffer(): PixelBuffer {
    return clonePixelBuffer(this.data)
  }

  setColor(color: PixelColor): void {
    this.color = Math.max(0, Math.min(7, color))
  }

  getColor(): PixelColor {
    return this.color
  }

  paint(x: number, y: number): void {
    this.commit()
    setPixel(this.data, x, y, this.color)
  }

  erase(x: number, y: number): void {
    this.commit()
    setPixel(this.data, x, y, 0)
  }

  fill(color?: PixelColor): void {
    this.commit()
    fillPixelBuffer(this.data, color ?? this.color)
  }

  clear(): void {
    this.commit()
    clearPixelBuffer(this.data)
  }

  undo(): void {
    const prev = this.undoStack.pop()
    if (!prev) return
    this.redoStack.push(clonePixelBuffer(this.data))
    this.data = prev
  }

  redo(): void {
    const next = this.redoStack.pop()
    if (!next) return
    this.undoStack.push(clonePixelBuffer(this.data))
    this.data = next
  }

  private commit(): void {
    this.undoStack.push(clonePixelBuffer(this.data))
    this.redoStack = []
  }
}
