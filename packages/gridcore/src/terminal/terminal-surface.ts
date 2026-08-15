import { createGrid, type Grid } from '../geometry/grid'
import { parseAnsiSegments } from './ansi'

// ── Colour indices (BBC MODE 7 palette) ──────────────────────────
export const FG = {
  BLACK: 0,
  RED: 1,
  GREEN: 2,
  YELLOW: 3,
  BLUE: 4,
  MAGENTA: 5,
  CYAN: 6,
  WHITE: 7,
} as const

export const BG = {
  BLACK: 0,
  RED: 1,
  GREEN: 2,
  YELLOW: 3,
  BLUE: 4,
  MAGENTA: 5,
  CYAN: 6,
  WHITE: 7,
} as const

// ── Types ─────────────────────────────────────────────────────────

export interface OutputLine {
  text: string
  role: 'prompt' | 'echo' | 'output' | 'error'
}

export type CommandHandler = (line: string) => string | OutputLine[] | Promise<string | OutputLine[]>

export interface TerminalSurfaceOptions {
  cols?: number // default 80
  rows?: number // default 24 (includes 1 prompt row)
  prompt?: string // default 'OK>'
  historySize?: number // default 100
}

// ── TerminalSurface ───────────────────────────────────────────────

export class TerminalSurface {
  readonly cols: number
  readonly rows: number
  readonly prompt: string

  private grid: Grid
  private historyBuffer: string[] = []
  private historyIndex: number = -1
  private maxHistory: number

  private outputStartRow: number // top row of scrollback region
  private promptRow: number // row where OK> prompt lives
  private outputRows: OutputLine[] = []
  private typedBuffer: string = ''

  private onCommand: CommandHandler | null = null
  private onChange: (() => void) | null = null

  constructor(options: TerminalSurfaceOptions = {}) {
    this.cols = options.cols ?? 80
    this.rows = options.rows ?? 24
    this.prompt = options.prompt ?? 'OK>'
    this.maxHistory = options.historySize ?? 100

    if (this.rows < 2) throw new Error('TerminalSurface rows must be >= 2')
    this.promptRow = this.rows - 1
    this.outputStartRow = 0

    this.grid = createGrid(this.cols, this.rows)
    this.redraw()
  }

  // ── public API ──────────────────────────────────────────────────

  /** Register handler for submitted commands */
  setCommandHandler(fn: CommandHandler): void {
    this.onCommand = fn
  }

  /** Register a callback for when the display changes */
  onDisplayChange(fn: () => void): void {
    this.onChange = fn
  }

  /** Get the raw grid for rendering */
  getGrid(): Grid {
    return this.grid
  }

  /** Write an output line (for backend to push results) */
  writeLine(text: string, role: OutputLine['role'] = 'output'): void {
    // Split embedded newlines into separate scrollback rows.
    const lines = text.split('\n')
    for (const line of lines) {
      this.outputRows.push({ text: line, role })
    }
    // Keep only visible output lines in the scrollback region
    const maxVisible = this.rows - 1 // one row reserved for prompt
    while (this.outputRows.length > maxVisible) {
      this.outputRows.shift()
    }
    this.redraw()
  }

  /** Write multiple output lines at once */
  writeLines(lines: OutputLine[]): void {
    for (const l of lines) this.writeLine(l.text, l.role)
  }

  /** Clear all output */
  clear(): void {
    this.outputRows = []
    this.redraw()
  }

  /** Handle a typed character */
  typeChar(ch: string): void {
    if (ch.length === 1) {
      // Allow printable ASCII only (32-126) + backspace via typeBackspace
      const code = ch.charCodeAt(0)
      if (code >= 32 && code <= 126) {
        this.typedBuffer += ch
      }
    }
    this.redraw()
  }

  /** Handle backspace */
  typeBackspace(): void {
    if (this.typedBuffer.length > 0) {
      this.typedBuffer = this.typedBuffer.slice(0, -1)
    }
    this.redraw()
  }

  /** Submit the typed buffer as a command */
  async submit(): Promise<void> {
    const cmd = this.typedBuffer.trim()
    this.typedBuffer = ''

    if (!cmd) {
      // Empty input → just show prompt again
      this.redraw()
      return
    }

    // Show echo of the command
    this.writeLine(`${this.prompt} ${cmd}`, 'echo')

    // Push to history
    this.historyBuffer.push(cmd)
    if (this.historyBuffer.length > this.maxHistory) {
      this.historyBuffer.shift()
    }
    this.historyIndex = -1

    // Dispatch
    if (this.onCommand) {
      try {
        const result = await this.onCommand(cmd)
        if (typeof result === 'string') {
          this.writeLine(result)
        } else if (Array.isArray(result)) {
          this.writeLines(result)
        }
      } catch (err) {
        this.writeLine(`Error: ${err}`, 'error')
      }
    }

    this.redraw()
  }

  /** Get the current typed input */
  getInput(): string {
    return this.typedBuffer
  }

  /** Set the typed input buffer */
  setInput(text: string): void {
    this.typedBuffer = text
    this.redraw()
  }

  /** Navigate history: -1 = older, +1 = newer */
  navigateHistory(direction: -1 | 1): string {
    if (this.historyBuffer.length === 0) return this.typedBuffer

    if (direction === -1) {
      // Go back in history
      if (this.historyIndex < this.historyBuffer.length - 1) {
        this.historyIndex++
      }
    } else if (direction === 1) {
      // Go forward in history
      if (this.historyIndex >= 0) {
        this.historyIndex--
      }
    }

    if (this.historyIndex === -1) {
      this.typedBuffer = ''
    } else {
      this.typedBuffer = this.historyBuffer[this.historyBuffer.length - 1 - this.historyIndex]
    }
    this.redraw()
    return this.typedBuffer
  }

  /** Reset the terminal fully */
  reset(): void {
    this.outputRows = []
    this.typedBuffer = ''
    this.historyIndex = -1
    this.redraw()
  }

  // ── internal ────────────────────────────────────────────────────

  private redraw(): void {
    // Clear grid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid.cells.get(`${x}:${y}:0`)
        if (cell) {
          cell.char = ' '
          cell.fg = FG.WHITE
          cell.bg = BG.BLACK
        }
      }
    }

    // Render output lines in the scrollback region
    const maxVisible = this.rows - 1
    const startIdx = Math.max(0, this.outputRows.length - maxVisible)
    for (let i = startIdx; i < this.outputRows.length; i++) {
      const line = this.outputRows[i]
      const row = this.outputStartRow + (i - startIdx)
      const fg = this.roleFg(line.role)
      this.writeStyledRow(row, line.text, fg)
    }

    // Render prompt × input at the bottom
    const promptText = `${this.prompt} ${this.typedBuffer}`
    const cursorCol = this.prompt.length + 1 + this.typedBuffer.length
    this.writeCellRow(this.promptRow, promptText, FG.GREEN, BG.BLACK)

    // Show cursor indicator at the input position
    if (cursorCol < this.cols) {
      const key = `${cursorCol}:${this.promptRow}:0`
      const cell = this.grid.cells.get(key)
      if (cell) {
        cell.char = this.typedBuffer.length > 0 ? ' ' : '_'
        cell.fg = FG.GREEN
        cell.bg = FG.GREEN // inverted cursor block
      }
    }

    this.onChange?.()
  }

  private roleFg(role: OutputLine['role']): number {
    switch (role) {
      case 'prompt': return FG.GREEN
      case 'echo': return FG.WHITE
      case 'output': return FG.CYAN
      case 'error': return FG.RED
      default: return FG.WHITE
    }
  }

  private writeCellRow(row: number, text: string, fg: number, bg: number): void {
    for (let col = 0; col < this.cols; col++) {
      const key = `${col}:${row}:0`
      const cell = this.grid.cells.get(key)
      if (cell) {
        cell.char = col < text.length ? text[col] : ' '
        cell.fg = fg
        cell.bg = bg
      }
    }
  }

  /** Write a row, parsing ANSI SGR sequences into per-cell styling. */
  private writeStyledRow(row: number, text: string, defaultFg: number): void {
    const spans = parseAnsiSegments(text)
    let col = 0
    const put = (ch: string, fg: number, bg: number, bold: boolean, flash: boolean): void => {
      if (col >= this.cols) return
      const cell = this.grid.cells.get(`${col}:${row}:0`)
      if (cell) {
        cell.char = ch
        cell.fg = fg
        cell.bg = bg
        cell.bold = bold
        cell.flash = flash
      }
      col++
    }

    for (const span of spans) {
      let fg = span.style.fg ?? defaultFg
      let bg = span.style.bg ?? BG.BLACK
      if (span.style.reverse) {
        const t = fg
        fg = bg
        bg = t
      }
      const bold = span.style.bold ?? false
      const flash = span.style.flash ?? false
      for (const ch of span.text) put(ch, fg, bg, bold, flash)
    }
    while (col < this.cols) put(' ', defaultFg, BG.BLACK, false, false)
  }
}