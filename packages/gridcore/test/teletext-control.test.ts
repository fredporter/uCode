import { describe, expect, it } from 'vitest'
import {
  interpretTeletextLine,
  ALPHA_RED,
  DOUBLE_HEIGHT,
  FLASH,
  STEADY,
  NEW_BACKGROUND,
  SEPARATED_GRAPHICS,
  RELEASE_GRAPHICS,
} from '../src/teletext/control'
import { patternToBlock, blockToPattern } from '../src/teletext/mosaic'

const c = (code: number): string => String.fromCharCode(code)

describe('teletext control interpreter', () => {
  it('renders plain text with default style', () => {
    const cells = interpretTeletextLine('hi')
    expect(cells).toEqual([
      { char: 'h', fg: 7, bg: 0, doubleHeight: false, flash: false },
      { char: 'i', fg: 7, bg: 0, doubleHeight: false, flash: false },
    ])
  })

  it('applies colour codes', () => {
    const cells = interpretTeletextLine(`${c(ALPHA_RED)}red`)
    expect(cells[0].fg).toBe(1)
    expect(cells[0].char).toBe('r')
  })

  it('applies double height', () => {
    const cells = interpretTeletextLine(`${c(DOUBLE_HEIGHT)}HI`)
    expect(cells[0].doubleHeight).toBe(true)
    expect(cells[0].char).toBe('H')
  })

  it('toggles flash on and off', () => {
    const cells = interpretTeletextLine(`${c(FLASH)}A${c(STEADY)}B`)
    expect(cells[0].flash).toBe(true)
    expect(cells[1].flash).toBe(false)
  })

  it('sets new background from foreground', () => {
    const cells = interpretTeletextLine(`${c(ALPHA_RED)}${c(NEW_BACKGROUND)}X`)
    expect(cells[0].fg).toBe(1)
    expect(cells[0].bg).toBe(1)
  })

  it('decodes separated graphics into mosaic blocks', () => {
    // 0x3f = all six bits set = full block
    const cells = interpretTeletextLine(`${c(SEPARATED_GRAPHICS)}${c(0x3f)}${c(RELEASE_GRAPHICS)}A`)
    expect(cells[0].mosaic).toBe(0x3f)
    expect(cells[0].char).toBe(' ')
    expect(cells[1].char).toBe('A')
    expect(cells[1].mosaic).toBeUndefined()
  })

  it('patternToBlock / blockToPattern round-trip', () => {
    const block = patternToBlock(0b101010)
    expect(block.topLeft).toBe(false)
    expect(block.topRight).toBe(true)
    expect(block.midLeft).toBe(false)
    expect(block.midRight).toBe(true)
    expect(block.bottomLeft).toBe(false)
    expect(block.bottomRight).toBe(true)
    expect(blockToPattern(block)).toBe(0b101010)
  })
})
