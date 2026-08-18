import {
  SurfaceStore,
  TABS,
  bufferToGrid,
  pixelBufferToGridBuffer,
  type TabId,
} from '@udos/gridcore'
import { TerminalWidget } from '../widgets/TerminalWidget'
import { TeletextWidget } from '../widgets/TeletextWidget'
import { CanvasViewport } from '../canvas/CanvasViewport'

export interface TabHostOptions {
  store?: SurfaceStore
  width?: number
  height?: number
  target?: HTMLElement
}

/**
 * Embeddable tab host for the five uCode tabs (Terminal, Teletext, Pixel,
 * Grid, Layer). Manages a tab bar and delegates rendering to the appropriate
 * widget, wiring cross-tab navigation (e.g. CEEFAX -> Teletext).
 */
export class TabHost {
  private store: SurfaceStore
  private root: HTMLDivElement
  private tabBar: HTMLDivElement
  private content: HTMLDivElement
  private buttons: Map<TabId, HTMLButtonElement> = new Map()
  private terminal: TerminalWidget
  private teletext: TeletextWidget
  private preview: CanvasViewport
  private unsubscribe: () => void

  constructor(options: TabHostOptions = {}) {
    this.store = options.store ?? new SurfaceStore()
    const width = options.width ?? 960
    const height = options.height ?? 600

    this.root = document.createElement('div')
    this.root.style.display = 'flex'
    this.root.style.flexDirection = 'column'

    this.tabBar = document.createElement('div')
    this.tabBar.style.display = 'flex'
    this.tabBar.style.gap = '4px'
    this.tabBar.style.padding = '4px'

    this.content = document.createElement('div')
    this.content.style.flex = '1'
    this.content.style.position = 'relative'
    this.content.style.overflow = 'auto'

    this.root.appendChild(this.tabBar)
    this.root.appendChild(this.content)

    for (const tab of TABS) {
      const btn = document.createElement('button')
      btn.textContent = tab
      btn.addEventListener('click', () => this.store.setActiveTab(tab))
      this.tabBar.appendChild(btn)
      this.buttons.set(tab, btn)
    }

    this.terminal = new TerminalWidget({
      width,
      height,
      zoom: 'auto',
      borderMode: 1,
      displayMode: 'teletext',
      palette: 'teletext',
      font: 'petme64',
      onTeletextNavigate: (page: number) => this.store.navigateToTeletext(page),
    })
    this.teletext = new TeletextWidget({
      width,
      height,
      zoom: 'auto',
      borderMode: 1,
      displayMode: 'teletext',
      palette: 'teletext',
      font: 'teletext50',
    })
    this.preview = new CanvasViewport({
      width,
      height,
      zoom: 'auto',
      borderMode: 1,
      displayMode: 'teletext',
      palette: 'teletext',
      font: 'teletext50',
    })

    this.unsubscribe = this.store.subscribe(() => this.renderActive())

    if (options.target) options.target.appendChild(this.root)
    this.renderActive()
  }

  private renderActive(): void {
    const tab = this.store.getActiveTab()
    this.content.innerHTML = ''

    for (const [id, btn] of this.buttons) {
      btn.style.fontWeight = id === tab ? 'bold' : 'normal'
    }

    if (tab === 'terminal') {
      const el = this.terminal.getElement()
      if (el) this.content.appendChild(el)
      this.terminal.render()
    } else if (tab === 'teletext') {
      const page = this.store.consumeTeletextPage()
      if (page !== null) this.teletext.navigateToPage(page)
      this.content.appendChild(this.teletext.getElement())
      this.teletext.render()
    } else if (tab === 'grid') {
      this.preview.render(bufferToGrid(this.store.gridEditor.buffer))
      this.content.appendChild(this.preview.getElement())
    } else if (tab === 'pixel') {
      this.preview.render(bufferToGrid(pixelBufferToGridBuffer(this.store.pixelEditor.buffer)))
      this.content.appendChild(this.preview.getElement())
    } else if (tab === 'layer') {
      this.preview.render(bufferToGrid(this.store.layerComposer.compose()))
      this.content.appendChild(this.preview.getElement())
    }
  }

  getElement(): HTMLDivElement {
    return this.root
  }

  getStore(): SurfaceStore {
    return this.store
  }

  destroy(): void {
    this.unsubscribe()
    this.terminal.destroy()
    this.teletext.destroy()
    this.preview.destroy()
    this.root.remove()
  }
}
