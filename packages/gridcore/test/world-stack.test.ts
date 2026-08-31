import { describe, expect, it } from 'vitest'
import { childWorldAddresses, createWorldStack, deserializeWorldStack, formatWorldAddress, MAX_WORLD_STACK_GRIDS, parentWorldAddress, parseWorldAddress, serializeWorldStack, validateWorldStack, WORLD_GRID_COLS, WORLD_GRID_ROWS } from '../src/world/world-stack'

describe('fixed Grid world stack', () => {
  it('parses native discrete addresses without geographic coordinates', () => {
    expect(parseWorldAddress('L200-AA33')).toEqual({ level: 200, column: 370, row: 111 })
    expect(formatWorldAddress({ level: 200, column: 370, row: 111 })).toBe('L200-AA33')
    expect(parseWorldAddress('L250-AA33')).toBeNull()
  })
  it('uses an exact 2×2 parent/child scale at each 100-level step', () => {
    const children = childWorldAddresses('L200-AA33')
    expect(children).toEqual(['L300-KK66', 'L300-KL66', 'L300-KK67', 'L300-KL67'])
    expect(children.map(parentWorldAddress)).toEqual(Array(4).fill('L200-AA33'))
  })
  it('creates only fixed 40×25 flat grids inside a world stack', () => {
    const stack = createWorldStack()
    expect(stack.grids[0].buffer).toHaveLength(WORLD_GRID_ROWS)
    expect(stack.grids[0].buffer[0]).toHaveLength(WORLD_GRID_COLS)
    expect(validateWorldStack(stack)).toBe(true)
    expect(validateWorldStack({ ...stack, cols: 41 })).toBe(false)
  })
  it('round-trips independent native world documents', () => {
    const stack = createWorldStack()
    const restored = deserializeWorldStack(JSON.parse(JSON.stringify(serializeWorldStack(stack))))
    expect(restored).toEqual(stack)
    restored.grids[0].buffer[0][0].char = 'X'
    expect(stack.grids[0].buffer[0][0].char).toBe(' ')
  })
  it('rejects unsupported, partial, and inconsistent documents', () => {
    const stack = createWorldStack()
    expect(() => deserializeWorldStack({ ...stack, version: 2 })).toThrow('Unsupported world stack version')
    expect(() => deserializeWorldStack({ ...stack, activeAddress: 'L200-0000' })).toThrow('Invalid world stack document')
    expect(() => deserializeWorldStack({ ...stack, grids: [{ ...stack.grids[0], buffer: [[]] }] })).toThrow('Invalid world stack document')
  })
  it('rejects oversized stack records before cloning buffers', () => {
    expect(() => deserializeWorldStack({
      format: 'ucode-world-stack-v1', version: 1, cols: WORLD_GRID_COLS, rows: WORLD_GRID_ROWS,
      activeAddress: 'L200-5533', grids: Array.from({ length: MAX_WORLD_STACK_GRIDS + 1 }, () => ({})),
    })).toThrow(`World stack exceeds ${MAX_WORLD_STACK_GRIDS} grid limit`)
  })
})
