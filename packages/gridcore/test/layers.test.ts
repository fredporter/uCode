import { describe, expect, it } from 'vitest'
import { createBuffer, createBufferCell, type GridBuffer } from '../src/buffer/cell'
import { LayerComposer, createBaselineLayers } from '../src/layers/LayerComposer'

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
})
