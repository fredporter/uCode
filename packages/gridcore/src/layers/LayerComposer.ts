import { cloneBuffer, createBuffer, type GridBuffer } from '../buffer/cell'

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay'

export interface ComposedLayer {
  id: string
  name: string
  zIndex: number
  visible: boolean
  opacity: number
  blendMode: BlendMode
  locked?: boolean
  /** Per-layer cell data. */
  buffer: GridBuffer
}

export interface CreateLayerOptions {
  name: string
  zIndex?: number
  visible?: boolean
  opacity?: number
  blendMode?: BlendMode
  locked?: boolean
  buffer?: GridBuffer
  cols?: number
  rows?: number
}

export interface LayerProjectDocument {
  format: 'ucode-layer-project-v1'
  version: 1
  cols: number
  rows: number
  selectedLayer?: number
  layers: Array<{
    name: string
    visible: boolean
    opacity: number
    blendMode: BlendMode
    locked: boolean
    cells: Array<Array<{ c: string; f: number; b: number; mosaic?: boolean }>>
  }>
}

export const BASELINE_LAYER_NAMES = ['terrain', 'details', 'foreground', 'lighting', 'collision', 'entities'] as const
export const MAX_LAYER_PROJECT_CELLS = 1_000_000

const BAYER_2X2 = [0, 2, 3, 1] as const

function blendIndex(base: number, top: number, mode: BlendMode): number {
  if (mode === 'multiply') return Math.min(base, top)
  if (mode === 'screen') return Math.max(base, top)
  if (mode === 'overlay') return base < 4 ? Math.min(base, top) : Math.max(base, top)
  return top
}

function overlayComposedLayer(base: GridBuffer, layer: ComposedLayer): GridBuffer {
  const out = cloneBuffer(base)
  const threshold = Math.round(layer.opacity * 4)
  for (let y = 0; y < Math.min(out.length, layer.buffer.length); y++) {
    for (let x = 0; x < Math.min(out[y].length, layer.buffer[y].length); x++) {
      const top = layer.buffer[y][x]
      if (top.char === ' ' && top.bg === 0) continue
      if (threshold < 4 && BAYER_2X2[(y % 2) * 2 + (x % 2)] >= threshold) continue
      const bottom = out[y][x]
      out[y][x] = {
        ...top,
        fg: blendIndex(bottom.fg, top.fg, layer.blendMode),
        bg: blendIndex(bottom.bg, top.bg, layer.blendMode),
      }
    }
  }
  return out
}

/** The 6 baseline layers (terrain, details, foreground, lighting, collision, entities). */
export function createBaselineLayers(cols = 80, rows = 24): ComposedLayer[] {
  return BASELINE_LAYER_NAMES.map((name, i) => ({
    id: `layer-${name}`,
    name,
    zIndex: i,
    visible: i === 0,
    opacity: 1,
    blendMode: 'normal',
    buffer: createBuffer(cols, rows),
  }))
}

export class LayerComposer {
  private layers: ComposedLayer[] = []

  createLayer(options: CreateLayerOptions): ComposedLayer {
    const buffer = options.buffer ?? createBuffer(options.cols ?? 80, options.rows ?? 24)
    const layer: ComposedLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: options.name,
      zIndex: options.zIndex ?? this.layers.length,
      visible: options.visible ?? true,
      opacity: options.opacity ?? 1,
      blendMode: options.blendMode ?? 'normal',
      locked: options.locked ?? false,
      buffer,
    }
    this.layers.push(layer)
    this.layers.sort((a, b) => a.zIndex - b.zIndex)
    return layer
  }

  getLayer(layerId: string): ComposedLayer | null {
    return this.layers.find(layer => layer.id === layerId) ?? null
  }

  setLayerBuffer(layerId: string, buffer: GridBuffer): void {
    this.layers = this.layers.map(layer => (layer.id === layerId ? { ...layer, buffer: cloneBuffer(buffer) } : layer))
  }

  deleteLayer(layerId: string): void {
    this.layers = this.layers.filter(layer => layer.id !== layerId)
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    this.layers = this.layers.map(layer => (layer.id === layerId ? { ...layer, visible } : layer))
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    this.layers = this.layers.map(layer =>
      layer.id === layerId ? { ...layer, opacity: Math.max(0, Math.min(opacity, 1)) } : layer,
    )
  }

  setLayerBlendMode(layerId: string, blendMode: BlendMode): void {
    this.layers = this.layers.map(layer =>
      layer.id === layerId ? { ...layer, blendMode } : layer,
    )
  }

  duplicateLayer(layerId: string, name?: string): ComposedLayer | null {
    const source = this.layers.find(layer => layer.id === layerId)
    if (!source) return null
    const duplicate = this.createLayer({
      ...source,
      name: name ?? `${source.name} copy`,
      zIndex: source.zIndex + 1,
      buffer: cloneBuffer(source.buffer),
    })
    this.reorderLayer(duplicate.id, source.zIndex + 1)
    return duplicate
  }

  reorderLayer(layerId: string, newIndex: number): void {
    const idx = this.layers.findIndex(layer => layer.id === layerId)
    if (idx === -1) return
    const [layer] = this.layers.splice(idx, 1)
    const target = Math.max(0, Math.min(this.layers.length, newIndex))
    this.layers.splice(target, 0, layer)
    this.layers = this.layers.map((entry, index) => ({ ...entry, zIndex: index }))
  }

  mergeLayers(layerId1: string, layerId2: string): ComposedLayer | null {
    const l1 = this.layers.find(layer => layer.id === layerId1)
    const l2 = this.layers.find(layer => layer.id === layerId2)
    if (!l1 || !l2) return null

    const merged: ComposedLayer = {
      id: `merge-${Date.now()}`,
      name: `${l1.name} + ${l2.name}`,
      zIndex: Math.max(l1.zIndex, l2.zIndex),
      visible: l1.visible || l2.visible,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      buffer: overlayComposedLayer(l1.buffer, l2),
    }

    this.layers = this.layers.filter(layer => layer.id !== layerId1 && layer.id !== layerId2)
    this.layers.push(merged)
    this.layers.sort((a, b) => a.zIndex - b.zIndex)
    return merged
  }

  lockLayer(layerId: string): void {
    this.layers = this.layers.map(layer => (layer.id === layerId ? { ...layer, locked: true } : layer))
  }

  unlockLayer(layerId: string): void {
    this.layers = this.layers.map(layer => (layer.id === layerId ? { ...layer, locked: false } : layer))
  }

  list(): ComposedLayer[] {
    return this.layers.map(layer => ({ ...layer, buffer: cloneBuffer(layer.buffer) }))
  }

  /** Compose all visible layers bottom-up into a single buffer. */
  compose(): GridBuffer {
    const visible = this.layers.filter(layer => layer.visible).sort((a, b) => a.zIndex - b.zIndex)
    if (visible.length === 0) return createBuffer(this.cols, this.rows)
    let out = createBuffer(this.cols, this.rows)
    for (const layer of visible) out = overlayComposedLayer(out, layer)
    return out
  }

  get cols(): number {
    const first = this.layers[0]
    return first && first.buffer.length ? first.buffer[0].length : 0
  }

  get rows(): number {
    return this.layers[0] ? this.layers[0].buffer.length : 0
  }
}

/** Serialize all layer buffers without flattening their document semantics. */
export function serializeLayerProject(
  composer: LayerComposer,
  selectedLayerId?: string | null,
): LayerProjectDocument {
  const layers = composer.list()
  const selectedLayer = selectedLayerId
    ? layers.findIndex(layer => layer.id === selectedLayerId)
    : undefined
  return {
    format: 'ucode-layer-project-v1',
    version: 1,
    cols: composer.cols,
    rows: composer.rows,
    ...(selectedLayer !== undefined && selectedLayer >= 0 ? { selectedLayer } : {}),
    layers: layers.map(layer => ({
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      locked: layer.locked ?? false,
      cells: layer.buffer.map(row => row.map(cell => ({
        c: cell.char,
        f: cell.fg,
        b: cell.bg,
        ...(cell.mosaic ? { mosaic: true } : {}),
      }))),
    })),
  }
}

/** Validate and restore a versioned layered project. */
export function deserializeLayerProject(value: unknown): {
  composer: LayerComposer
  selectedLayerId: string | null
} {
  if (!value || typeof value !== 'object') throw new Error('Invalid layer project')
  const document = value as Partial<LayerProjectDocument>
  if (document.format !== 'ucode-layer-project-v1') {
    throw new Error('Unsupported layer project format')
  }
  if (document.version !== 1) {
    throw new Error('Unsupported layer project version')
  }
  if (!Number.isInteger(document.cols) || !Number.isInteger(document.rows) ||
      !document.cols || !document.rows || !Array.isArray(document.layers) || !document.layers.length) {
    throw new Error('Invalid layer project dimensions or layers')
  }
  const cellsPerLayer = document.cols * document.rows
  if (cellsPerLayer > MAX_LAYER_PROJECT_CELLS ||
      cellsPerLayer * document.layers.length > MAX_LAYER_PROJECT_CELLS) {
    throw new Error(`Layer project exceeds ${MAX_LAYER_PROJECT_CELLS} cell limit`)
  }
  document.layers.forEach((source, zIndex) => {
    if (!source || typeof source.name !== 'string' || !Array.isArray(source.cells) || source.cells.length !== document.rows) {
      throw new Error(`Invalid layer ${zIndex}`)
    }
    source.cells.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== document.cols) {
        throw new Error(`Invalid layer row ${rowIndex}`)
      }
      row.forEach((cell, colIndex) => {
        if (!cell || typeof cell.c !== 'string') {
          throw new Error(`Invalid layer cell ${colIndex},${rowIndex}`)
        }
      })
    })
  })
  const composer = new LayerComposer()
  const ids: string[] = []
  document.layers.forEach((source, zIndex) => {
    const buffer = createBuffer(document.cols!, document.rows!)
    for (let row = 0; row < document.rows!; row++) {
      for (let col = 0; col < document.cols!; col++) {
        const cell = source.cells[row][col]
        buffer[row][col] = { char: cell.c, fg: cell.f ?? 7, bg: cell.b ?? 0, ...(cell.mosaic ? { mosaic: true } : {}) }
      }
    }
    const layer = composer.createLayer({
      name: source.name,
      zIndex,
      visible: source.visible,
      opacity: source.opacity,
      blendMode: source.blendMode,
      locked: source.locked,
      buffer,
    })
    ids.push(layer.id)
  })
  const selectedIndex = Math.max(0, Math.min(ids.length - 1, document.selectedLayer ?? 0))
  return { composer, selectedLayerId: ids[selectedIndex] ?? null }
}
