import {
  BORDER_MODE_CONFIGS,
  calculateViewportSize,
  charToPattern,
  getViewportCells,
  type Cell,
  type Grid,
  type Viewport,
} from '@udos/gridcore'
import { applyCRTEffectsFilter } from '../effects/crt'
import { getPalette } from '../palette/usx'
import { resolveDisplayColors } from '../palette/display'
import { ViewportWidget, type CanvasViewportOptions } from '../core/ViewportWidget'

const FONT_FAMILIES: Record<string, string> = {
  petme64: 'PetMe64, PetMe128, monospace',
  teletext50: 'Teletext50, Bedstead, monospace',
  custom: 'custom-font, monospace',
}

export class CanvasViewport extends ViewportWidget {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private lastGrid: Grid | null = null
  private blinkOn = true
  private blinkTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: CanvasViewportOptions) {
    super(options)
    this.canvas = document.createElement('canvas')
    this.canvas.width = options.width
    this.canvas.height = options.height
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D
    if (options.target) options.target.appendChild(this.canvas)
  }

  render(grid: Grid): void {
    this.lastGrid = grid
    this.ensureBlink(grid)
    this.drawGrid(grid)
  }

  update(grid: Grid): void {
    this.lastGrid = grid
    this.ensureBlink(grid)
    this.drawGrid(grid)
  }

  updateCell(x: number, y: number, cell: Cell): void {
    if (!this.lastGrid) return
    this.lastGrid.cells.set(`${x}:${y}:${cell.layer}`, cell)
    this.ensureBlink(this.lastGrid)
    this.drawGrid(this.lastGrid)
  }

  setZoom(zoom: number): void {
    this.options.zoom = zoom
    if (this.lastGrid) this.drawGrid(this.lastGrid)
  }

  toDataURL(format: 'image/png' = 'image/png'): string {
    return this.canvas.toDataURL(format)
  }

  toBlob(callback: (blob: Blob | null) => void): void {
    this.canvas.toBlob(callback)
  }

  getElement(): HTMLCanvasElement {
    return this.canvas
  }

  destroy(): void {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer)
      this.blinkTimer = null
    }
    this.canvas.remove()
  }

  private ensureBlink(grid: Grid): void {
    const hasFlash = Array.from(grid.cells.values()).some(cell => cell.blink)
    if (hasFlash && !this.blinkTimer) {
      this.blinkTimer = setInterval(() => {
        this.blinkOn = !this.blinkOn
        if (this.lastGrid) this.drawGrid(this.lastGrid)
      }, 500)
    } else if (!hasFlash && this.blinkTimer) {
      clearInterval(this.blinkTimer)
      this.blinkTimer = null
      this.blinkOn = true
    }
  }

  private drawGrid(grid: Grid): void {
    const viewport: Viewport = {
      cols: grid.cols,
      rows: grid.rows,
      zoom: typeof this.options.zoom === 'number' ? this.options.zoom : 1,
      borderMode: this.options.borderMode,
      displayMode: this.options.displayMode,
    }

    const visible = getViewportCells(grid, viewport)
    const metrics = calculateViewportSize(
      this.options.width,
      this.options.height,
      viewport,
      24,
      24,
    )
    const palette = getPalette(this.options.palette)
    const fontFamily = FONT_FAMILIES[this.options.font] ?? FONT_FAMILIES.petme64

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.save()
    this.context.translate(metrics.padX, metrics.padY)
    this.context.scale(metrics.scale, metrics.scale)

    for (const cell of visible) {
      const char = cell.char ?? ' '
      const baseFg = palette[Math.max(0, Math.min(cell.fg ?? 7, palette.length - 1))]
      const baseBg = palette[Math.max(0, Math.min(cell.bg ?? 0, palette.length - 1))]
      const { fg, bg } = resolveDisplayColors(baseFg, baseBg, this.options.displayMode, char)

      const x = cell.x * 24
      const y = cell.y * 24

      // Zero-gap background (1px overlap per the rendering contract).
      this.context.fillStyle = bg
      this.context.fillRect(x, y, 25, 25)

      if (cell.mosaic) {
        this.drawMosaic(x, y, charToPattern(char), fg)
        continue
      }
      if (char === ' ') continue
      if (cell.blink && !this.blinkOn) continue

      const scaleX = cell.width ? cell.width / 24 : 1
      const scaleY = cell.dh ? 2 : 1
      const fontSize = 18
      this.context.save()
      this.context.translate(x + 12, y + 12)
      this.context.scale(scaleX, scaleY)
      this.context.fillStyle = fg
      this.context.font = `${cell.bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
      this.context.textBaseline = 'middle'
      this.context.textAlign = 'center'
      this.context.fillText(char, 0, 0)
      this.context.restore()
    }

    this.context.restore()

    if (this.options.crtEffects) {
      this.canvas.style.filter = applyCRTEffectsFilter(this.options.crtEffects)
    }

    const border = BORDER_MODE_CONFIGS[this.options.borderMode]
    this.canvas.style.padding = `${((1 - border.fillFraction) / 2) * 100}%`
  }

  /** Render a 2x3 teletext mosaic block from a 6-bit pattern. */
  private drawMosaic(x: number, y: number, pattern: number, fg: string): void {
    const cellW = 24 / 2
    const cellH = 24 / 3
    for (let sub = 0; sub < 6; sub++) {
      if ((pattern >> sub) & 1) {
        const sx = x + (sub % 2) * cellW
        const sy = y + Math.floor(sub / 2) * cellH
        this.context.fillStyle = fg
        this.context.fillRect(sx, sy, cellW + 1, cellH + 1)
      }
    }
  }
}
