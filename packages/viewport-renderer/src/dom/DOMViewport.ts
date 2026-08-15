import { getViewportCells, type Cell, type Grid, type Viewport } from '@udos/gridcore'
import { getPalette } from '../palette/usx'
import { resolveDisplayColors } from '../palette/display'
import { ViewportWidget, type CanvasViewportOptions } from '../core/ViewportWidget'

let blinkStyleInjected = false
function ensureBlinkStyle(): void {
  if (blinkStyleInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = '@keyframes ucode-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0.15 } }'
  document.head.appendChild(style)
  blinkStyleInjected = true
}

export class DOMViewport extends ViewportWidget {
  private root: HTMLDivElement
  private lastGrid: Grid | null = null

  constructor(options: CanvasViewportOptions) {
    super(options)
    this.root = document.createElement('div')
    this.root.style.display = 'grid'
    this.root.style.fontFamily = 'monospace'
    this.root.style.lineHeight = '1'
    if (options.target) options.target.appendChild(this.root)
  }

  render(grid: Grid): void {
    this.lastGrid = grid
    this.drawGrid(grid)
  }

  update(grid: Grid): void {
    this.lastGrid = grid
    this.drawGrid(grid)
  }

  updateCell(x: number, y: number, cell: Cell): void {
    if (!this.lastGrid) return
    this.lastGrid.cells.set(`${x}:${y}:${cell.layer}`, cell)
    this.drawGrid(this.lastGrid)
  }

  getElement(): HTMLDivElement {
    return this.root
  }

  destroy(): void {
    this.root.remove()
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
    const palette = getPalette(this.options.palette)

    this.root.style.gridTemplateColumns = `repeat(${grid.cols}, 24px)`
    this.root.style.gridTemplateRows = `repeat(${grid.rows}, 24px)`
    this.root.innerHTML = ''

    for (const cell of visible) {
      const node = document.createElement('span')
      const char = cell.char ?? ' '
      const baseFg = palette[Math.max(0, Math.min(cell.fg ?? 7, palette.length - 1))]
      const baseBg = palette[Math.max(0, Math.min(cell.bg ?? 0, palette.length - 1))]
      const { fg, bg } = resolveDisplayColors(baseFg, baseBg, this.options.displayMode, char)

      node.textContent = char === ' ' ? '\u00a0' : char
      node.style.width = '24px'
      node.style.height = '24px'
      node.style.display = 'inline-flex'
      node.style.alignItems = 'center'
      node.style.justifyContent = 'center'
      node.style.color = fg
      node.style.backgroundColor = bg
      node.style.fontWeight = cell.bold ? 'bold' : 'normal'
      if (cell.flash) {
        ensureBlinkStyle()
        node.style.animation = 'ucode-blink 1s step-start infinite'
      }
      this.root.appendChild(node)
    }
  }
}
