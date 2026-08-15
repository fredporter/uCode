import { createBuffer } from '../buffer/cell'
import { GridEditor } from '../editor/GridEditor'
import { LayerComposer } from '../layers/LayerComposer'
import { PixelEditor } from '../pixel/pixel-editor'

export type TabId = 'terminal' | 'teletext' | 'pixel' | 'grid' | 'layer'

export const TABS: TabId[] = ['terminal', 'teletext', 'pixel', 'grid', 'layer']

export interface SurfaceStoreOptions {
  cols?: number
  rows?: number
}

/**
 * Shared state store coordinating the five uCode tabs (Terminal, Teletext,
 * Pixel, Grid, Layer). Holds the three editors and handles cross-tab wiring
 * (e.g. CEEFAX in the terminal navigates to the teletext tab).
 */
export class SurfaceStore {
  readonly cols: number
  readonly rows: number

  readonly gridEditor: GridEditor
  readonly layerComposer: LayerComposer
  readonly pixelEditor: PixelEditor

  private activeTab: TabId = 'terminal'
  private pendingTeletextPage: number | null = null
  private listeners: Set<() => void> = new Set()

  constructor(options: SurfaceStoreOptions = {}) {
    this.cols = options.cols ?? 80
    this.rows = options.rows ?? 24
    this.gridEditor = new GridEditor(createBuffer(this.cols, this.rows))
    this.layerComposer = new LayerComposer()
    this.pixelEditor = new PixelEditor()
  }

  getActiveTab(): TabId {
    return this.activeTab
  }

  setActiveTab(tab: TabId): void {
    if (this.activeTab === tab) return
    this.activeTab = tab
    this.emit()
  }

  /** Cross-tab wiring: switch to the teletext tab with a pending page. */
  navigateToTeletext(page: number): void {
    this.pendingTeletextPage = page
    this.activeTab = 'teletext'
    this.emit()
  }

  /** Consume (and clear) the pending teletext page, if any. */
  consumeTeletextPage(): number | null {
    const page = this.pendingTeletextPage
    this.pendingTeletextPage = null
    return page
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach(fn => fn())
  }
}
