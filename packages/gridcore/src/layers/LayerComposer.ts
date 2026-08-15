import { cloneBuffer, createBuffer, type GridBuffer } from '../buffer/cell'
import { overlayBuffer } from '../buffer/transform'

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

export const BASELINE_LAYER_NAMES = ['terrain', 'details', 'foreground', 'lighting', 'collision', 'entities'] as const

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
      opacity: Math.max(l1.opacity, l2.opacity),
      blendMode: l2.blendMode,
      locked: false,
      buffer: overlayBuffer(l1.buffer, l2.buffer),
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
    return [...this.layers]
  }

  /** Compose all visible layers bottom-up into a single buffer. */
  compose(): GridBuffer {
    const visible = this.layers.filter(layer => layer.visible).sort((a, b) => a.zIndex - b.zIndex)
    if (visible.length === 0) return createBuffer(this.cols, this.rows)
    let out = cloneBuffer(visible[0].buffer)
    for (let i = 1; i < visible.length; i++) {
      out = overlayBuffer(out, visible[i].buffer)
    }
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

