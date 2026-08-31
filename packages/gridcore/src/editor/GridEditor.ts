import {
  cloneBuffer,
  createBufferCell,
  type BufferCell,
  type GridBuffer,
} from '../buffer/cell'
import { cropBuffer, overlayBuffer } from '../buffer/transform'

export interface GridSelection {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Character/tile editor over a GridBuffer. Snapshot-based undo/redo restores
 * the exact previous state (rather than resetting to defaults), and selection
 * enables copy/cut/paste region operations.
 */
export class GridEditor {
  private state: GridBuffer
  private undoStack: GridBuffer[] = []
  private redoStack: GridBuffer[] = []
  private selection: GridSelection | null = null
  private clipboard: GridBuffer | null = null
  private revision = 0
  private savedRevision = 0

  constructor(initial: GridBuffer) {
    this.state = cloneBuffer(initial)
  }

  get buffer(): GridBuffer {
    return cloneBuffer(this.state)
  }

  get cols(): number {
    return this.state.length ? this.state[0].length : 0
  }

  get rows(): number {
    return this.state.length
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get dirty(): boolean {
    return this.revision !== this.savedRevision
  }

  get hasClipboard(): boolean {
    return this.clipboard !== null
  }

  markSaved(): void {
    this.savedRevision = this.revision
  }

  /** Apply an arbitrary buffer mutation as one undoable transaction. */
  mutate(operation: (draft: GridBuffer) => void): void {
    const draft = cloneBuffer(this.state)
    operation(draft)
    this.commit()
    this.state = draft
  }

  /** Replace the document buffer as one undoable transaction. */
  replace(buffer: GridBuffer): void {
    this.commit()
    this.state = cloneBuffer(buffer)
  }

  // ── cell editing ───────────────────────────────────────────────

  placeCharacter(x: number, y: number, char: string): void {
    if (!this.inBounds(x, y)) return
    this.commit()
    this.state[y][x].char = char.slice(0, 1) || ' '
  }

  setForeground(x: number, y: number, fg: number): void {
    if (!this.inBounds(x, y)) return
    this.commit()
    this.state[y][x].fg = fg
  }

  setBackground(x: number, y: number, bg: number): void {
    if (!this.inBounds(x, y)) return
    this.commit()
    this.state[y][x].bg = bg
  }

  /** Backward-compatible alias for setForeground. */
  setPixel(x: number, y: number, color: number): void {
    this.setForeground(x, y, color)
  }

  clearCell(x: number, y: number): void {
    if (!this.inBounds(x, y)) return
    this.commit()
    this.state[y][x] = createBufferCell()
  }

  getCell(x: number, y: number): BufferCell | null {
    return this.inBounds(x, y) ? { ...this.state[y][x] } : null
  }

  // ── region operations ──────────────────────────────────────────

  fillRegion(x: number, y: number, w: number, h: number, patch: Partial<BufferCell>): void {
    this.commit()
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx
        const cy = y + dy
        if (this.inBounds(cx, cy)) this.state[cy][cx] = { ...this.state[cy][cx], ...patch }
      }
    }
  }

  /** Stamp an arbitrary buffer (e.g. a tile brush) at a position. */
  stamp(buffer: GridBuffer, x: number, y: number): void {
    this.commit()
    this.state = overlayBuffer(this.state, buffer, x, y)
  }

  // ── selection / clipboard ──────────────────────────────────────

  select(x: number, y: number, w: number, h: number): void {
    this.selection = { x, y, w, h }
  }

  getSelection(): GridSelection | null {
    return this.selection ? { ...this.selection } : null
  }

  clearSelection(): void {
    this.selection = null
  }

  copy(): GridBuffer | null {
    if (!this.selection) return null
    this.clipboard = cropBuffer(this.state, this.selection.x, this.selection.y, this.selection.w, this.selection.h)
    return cloneBuffer(this.clipboard)
  }

  cut(): GridBuffer | null {
    const region = this.copy()
    if (region && this.selection) {
      this.fillRegion(this.selection.x, this.selection.y, this.selection.w, this.selection.h, createBufferCell())
    }
    return region
  }

  paste(x: number, y: number): void {
    if (!this.clipboard) return
    this.stamp(this.clipboard, x, y)
  }

  // ── history ────────────────────────────────────────────────────

  undo(): void {
    const prev = this.undoStack.pop()
    if (!prev) return
    this.redoStack.push(cloneBuffer(this.state))
    this.state = prev
    this.revision--
  }

  redo(): void {
    const next = this.redoStack.pop()
    if (!next) return
    this.undoStack.push(cloneBuffer(this.state))
    this.state = next
    this.revision++
  }

  // ── internal ───────────────────────────────────────────────────

  private commit(): void {
    this.undoStack.push(cloneBuffer(this.state))
    if (this.undoStack.length > 100) this.undoStack.shift()
    this.redoStack = []
    this.revision++
  }

  private inBounds(x: number, y: number): boolean {
    return y >= 0 && y < this.state.length && x >= 0 && x < this.state[y].length
  }
}
