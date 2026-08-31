import { describe, expect, it } from 'vitest'
import { createBuffer, createBufferCell, type GridBuffer } from '../src/buffer/cell'
import { LayerComposer, createBaselineLayers, deserializeLayerProject, MAX_LAYER_PROJECT_CELLS, serializeLayerProject } from '../src/layers/LayerComposer'

function withChar(buf: GridBuffer, x: number, y: number, char: string): GridBuffer {
  buf[y][x] = createBufferCell(char)
  return buf
}

describe('createBaselineLayers', () => {
  it('creates 6 named layers', () => {
    const layers = createBaselineLayers(40, 25)
    expect(layers.length).toBe(6)
    expect(layers.map(l => l.name)).toEqual(['terrain', 'details', 'foreground', 'lighting', 'collision', 'entities'])
    expect(layers[0].zIndex).toBe(0)
    expect(layers[5].zIndex).toBe(5)
    expect(layers[0].buffer.length).toBe(25)
  })
})

describe('LayerComposer', () => {
  it('composes visible layers bottom-up', () => {
    const c = new LayerComposer()
    const base = c.createLayer({ name: 'base', zIndex: 0, buffer: createBuffer(4, 2) })
    const top = c.createLayer({ name: 'top', zIndex: 1, buffer: createBuffer(4, 2) })

    c.setLayerBuffer(base.id, withChar(createBuffer(4, 2), 0, 0, 'A'))
    c.setLayerBuffer(top.id, withChar(createBuffer(4, 2), 1, 0, 'B'))

    const composed = c.compose()
    expect(composed[0][0].char).toBe('A')
    expect(composed[0][1].char).toBe('B')
  })

  it('hides a layer from composition', () => {
    const c = new LayerComposer()
    const base = c.createLayer({ name: 'base', zIndex: 0, buffer: createBuffer(4, 2) })
    const top = c.createLayer({ name: 'top', zIndex: 1, buffer: createBuffer(4, 2) })
    c.setLayerBuffer(base.id, withChar(createBuffer(4, 2), 0, 0, 'A'))
    c.setLayerBuffer(top.id, withChar(createBuffer(4, 2), 0, 0, 'B'))

    c.setLayerVisibility(top.id, false)
    const composed = c.compose()
    expect(composed[0][0].char).toBe('A')
  })

  it('reorders layers', () => {
    const c = new LayerComposer()
    const a = c.createLayer({ name: 'a', zIndex: 0 })
    const b = c.createLayer({ name: 'b', zIndex: 1 })
    c.reorderLayer(b.id, 0)
    expect(c.list()[0].id).toBe(b.id)
    expect(c.list()[0].zIndex).toBe(0)
  })

  it('merges layers with buffers', () => {
    const c = new LayerComposer()
    const a = c.createLayer({ name: 'a', zIndex: 0, buffer: withChar(createBuffer(4, 2), 0, 0, 'A') })
    const b = c.createLayer({ name: 'b', zIndex: 1, buffer: withChar(createBuffer(4, 2), 1, 0, 'B') })
    const merged = c.mergeLayers(a.id, b.id)
    expect(merged).toBeTruthy()
    expect(merged!.buffer[0][0].char).toBe('A')
    expect(merged!.buffer[0][1].char).toBe('B')
    expect(c.list().length).toBe(1)
  })

  it('duplicates independent layer data and updates blend mode', () => {
    const c = new LayerComposer()
    const source = c.createLayer({ name: 'art', buffer: withChar(createBuffer(2, 1), 0, 0, 'A') })
    const copy = c.duplicateLayer(source.id)
    expect(copy?.name).toBe('art copy')
    c.setLayerBlendMode(copy!.id, 'screen')
    const listed = c.list()
    expect(listed.find(layer => layer.id === copy!.id)?.blendMode).toBe('screen')
    listed[0].buffer[0][0].char = 'X'
    expect(c.getLayer(source.id)?.buffer[0][0].char).toBe('A')
  })

  it('applies palette blend modes and deterministic opacity dithering', () => {
    const c = new LayerComposer()
    const base = c.createLayer({ name: 'base', buffer: withChar(createBuffer(2, 2), 0, 0, 'A') })
    const baseBuffer = createBuffer(2, 2)
    for (const row of baseBuffer) for (const cell of row) Object.assign(cell, { char: 'A', fg: 2 })
    c.setLayerBuffer(base.id, baseBuffer)
    const topBuffer = createBuffer(2, 2)
    for (const row of topBuffer) for (const cell of row) Object.assign(cell, { char: 'B', fg: 6 })
    const top = c.createLayer({ name: 'top', buffer: topBuffer, blendMode: 'multiply', opacity: 0.5 })
    const composed = c.compose()
    expect(composed.flat().filter(cell => cell.char === 'B')).toHaveLength(2)
    expect(composed.flat().filter(cell => cell.char === 'B').every(cell => cell.fg === 2)).toBe(true)
    c.setLayerOpacity(top.id, 1)
    c.setLayerBlendMode(top.id, 'screen')
    expect(c.compose()[0][0].fg).toBe(6)
  })

  it('round-trips every layer buffer and composition setting without flattening', () => {
    const source = new LayerComposer()
    const terrain = source.createLayer({ name: 'terrain', buffer: withChar(createBuffer(3, 2), 0, 0, '#') })
    const entities = source.createLayer({
      name: 'entities', buffer: withChar(createBuffer(3, 2), 2, 1, '@'),
      visible: false, opacity: 0.5, blendMode: 'screen', locked: true,
    })
    const document = serializeLayerProject(source, entities.id)
    const restored = deserializeLayerProject(JSON.parse(JSON.stringify(document)))
    const layers = restored.composer.list()
    expect(layers).toHaveLength(2)
    expect(layers[0].buffer[0][0].char).toBe('#')
    expect(layers[1]).toMatchObject({ name: 'entities', visible: false, opacity: 0.5, blendMode: 'screen', locked: true })
    expect(layers[1].buffer[1][2].char).toBe('@')
    expect(restored.selectedLayerId).toBe(layers[1].id)
    expect(terrain.id).not.toBe(layers[0].id)
  })

  it('rejects malformed layered projects', () => {
    expect(() => deserializeLayerProject({ format: 'ucode-layer-project-v1', version: 1, cols: 2, rows: 2, layers: [] })).toThrow()
  })

  it('rejects unsupported document versions', () => {
    expect(() => deserializeLayerProject({
      format: 'ucode-layer-project-v1', version: 2, cols: 1, rows: 1, layers: [],
    })).toThrow('Unsupported layer project version')
  })

  it('rejects partial layer rows before restoring buffers', () => {
    expect(() => deserializeLayerProject({
      format: 'ucode-layer-project-v1', version: 1, cols: 2, rows: 1,
      layers: [{ name: 'partial', visible: true, opacity: 1, blendMode: 'normal', locked: false, cells: [[{ c: 'A', f: 7, b: 0 }]] }],
    })).toThrow('Invalid layer row 0')
  })

  it('rejects oversized dimensions without requiring a cell matrix', () => {
    expect(() => deserializeLayerProject({
      format: 'ucode-layer-project-v1', version: 1, cols: MAX_LAYER_PROJECT_CELLS + 1, rows: 1,
      layers: [{}],
    })).toThrow(`Layer project exceeds ${MAX_LAYER_PROJECT_CELLS} cell limit`)
  })
})
