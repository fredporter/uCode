import type { Cell, Grid } from '@udos/gridcore'
import {
  TeletextSurface,
  TeletextPageProvider,
  type TeletextPage,
} from '@udos/gridcore'
import { CanvasViewport } from '../canvas/CanvasViewport'
import { ViewportWidget, type CanvasViewportOptions } from '../core/ViewportWidget'

export interface TeletextWidgetOptions extends CanvasViewportOptions {
  surface?: TeletextSurface
  provider?: TeletextPageProvider
  onNavigateBack?: () => void
}

export class TeletextWidget extends ViewportWidget {
  private viewport: CanvasViewport
  private surface: TeletextSurface
  private provider: TeletextPageProvider
  private numberBuffer: string = ''
  private numberBufferTimer: ReturnType<typeof setTimeout> | null = null
  private onNavigateBack?: () => void

  constructor(options: TeletextWidgetOptions) {
    super({
      ...options,
      font: 'teletext50',
      crtEffects: options.crtEffects ?? {
        scanlines: true,
        glow: true,
        vignette: true,
      },
    })

    this.surface = options.surface ?? new TeletextSurface({
      cols: options.width ? Math.floor(options.width / 24) : 40,
      rows: options.height ? Math.floor(options.height / 24) : 25,
    })

    this.provider = options.provider ?? new TeletextPageProvider()
    this.onNavigateBack = options.onNavigateBack

    // Set up page loader from provider
    this.surface.setPageLoader(this.provider.createPageLoader())

    // Wire surface changes to viewport re-render
    this.surface.onDisplayChange(() => {
      this.viewport.render(this.surface.getGrid())
    })

    this.viewport = new CanvasViewport({
      ...options,
      font: 'teletext50',
      crtEffects: options.crtEffects ?? {
        scanlines: true,
        glow: true,
        vignette: true,
      },
    })
  }

  /** Navigate to a specific page number */
  async navigateToPage(pageNumber: number): Promise<void> {
    this.numberBuffer = ''
    await this.surface.navigateTo(pageNumber)
  }

  /** Navigate back to previous page */
  async goBack(): Promise<void> {
    await this.surface.goBack()
  }

  /** Get the underlying teletext surface */
  getSurface(): TeletextSurface {
    return this.surface
  }

  /** Get the canvas element for external attachment. */
  getElement(): HTMLCanvasElement {
    return this.viewport.getElement()
  }

  /** Attach number-key page navigation (0-9) to any HTMLElement */
  attachPageNavigation(container: HTMLElement): void {
    const handler = (e: KeyboardEvent) => {
      // Only handle number keys and escape when element is focused or document
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        this.handleNumberKey(e.key)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.onNavigateBack?.()
      } else if (e.key === 'Backspace' || e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        this.surface.goBack().catch(() => {})
      }
    }

    // Make container focusable
    if (!container.getAttribute('tabindex')) {
      container.setAttribute('tabindex', '0')
    }
    container.addEventListener('keydown', handler)

    // Also listen on document for global number keys
    document.addEventListener('keydown', handler)
  }

  /** Handle number key input for page navigation */
  private handleNumberKey(digit: string): void {
    // Clear any previous timer
    if (this.numberBufferTimer) {
      clearTimeout(this.numberBufferTimer)
    }

    this.numberBuffer += digit

    // If we have 3 digits, navigate immediately
    if (this.numberBuffer.length >= 3) {
      const page = parseInt(this.numberBuffer, 10)
      this.numberBuffer = ''
      if (page >= 100 && page <= 899) {
        this.navigateToPage(page)
      }
      return
    }

    // Otherwise, wait 1.5s for more digits
    this.numberBufferTimer = setTimeout(() => {
      const page = parseInt(this.numberBuffer, 10)
      this.numberBuffer = ''
      if (page >= 100 && page <= 899) {
        this.navigateToPage(page)
      } else if (page >= 0 && page <= 9) {
        // Single digit: press and hold FASTEXT style
        const currentPage = this.surface.getCurrentPage()
        if (currentPage?.fasttext && currentPage.fasttext[page - 1]) {
          this.navigateToPage(currentPage.fasttext[page - 1].page)
        }
      }
    }, 1500)
  }

  render(grid?: Grid): void {
    this.viewport.render(grid ?? this.surface.getGrid())
  }

  update(grid?: Grid): void {
    this.viewport.update(grid ?? this.surface.getGrid())
  }

  updateCell(x: number, y: number, cell: Cell): void {
    this.viewport.updateCell(x, y, cell)
  }

  destroy(): void {
    if (this.numberBufferTimer) {
      clearTimeout(this.numberBufferTimer)
    }
    this.viewport.destroy()
  }
}