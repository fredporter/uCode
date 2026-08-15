import { describe, expect, it } from 'vitest'
import { createBuffer, createBufferCell } from '../src/buffer/cell'
import { GridEditor } from '../src/editor/GridEditor'

describe('GridEditor', () => {
  it('places characters with correct undo/redo', () => {
    const e = new GridEditor(createBuffer(4, 2))
    e.placeCharacter(1, 0, 'A')
    expect(e.buffer[0][1].char).toBe('A')

    e.undo()
    expect(e.buffer[0][1].char).toBe(' ')

    e.redo()
    expect(e.buffer[0][1].char).toBe('A')
  })

  it('restores the previous value on undo (not a default)', () => {
    const buf = createBuffer(4, 2)
    buf[0][0] = createBufferCell('Z', 3, 1)
    const e = new GridEditor(buf)

    e.placeCharacter(0, 0, 'B')
    expect(e.buffer[0][0].char).toBe('B')

    e.undo()
    expect(e.buffer[0][0].char).toBe('Z')
  })

  it('fills a region and undoes', () => {
    const e = new GridEditor(createBuffer(4, 3))
    e.fillRegion(1, 1, 2, 2, { char: '#', fg: 2 })
    expect(e.buffer[1][1].char).toBe('#')
    expect(e.buffer[2][2].char).toBe('#')
    expect(e.buffer[0][0].char).toBe(' ')

    e.undo()
    expect(e.buffer[1][1].char).toBe(' ')
  })

  it('selects, copies, cuts, and pastes', () => {
    const buf = createBuffer(5, 3)
    buf[0][0] = createBufferCell('A')
    buf[0][1] = createBufferCell('B')
    const e = new GridEditor(buf)

    e.select(0, 0, 2, 1)
    const copied = e.copy()
    expect(copied![0][0].char).toBe('A')
    expect(copied![0][1].char).toBe('B')

    e.paste(3, 2)
    expect(e.buffer[2][3].char).toBe('A')
    expect(e.buffer[2][4].char).toBe('B')

    e.undo()
    expect(e.buffer[2][3].char).toBe(' ')

    e.cut()
    expect(e.buffer[0][0].char).toBe(' ')
    expect(e.buffer[0][1].char).toBe(' ')
  })
})
