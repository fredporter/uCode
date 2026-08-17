import { describe, expect, it } from 'vitest'
import { applySgr, parseAnsiSegments, stripAnsi } from '../src/terminal/ansi'

describe('ansi parsing', () => {
  it('returns a single span for plain text', () => {
    const spans = parseAnsiSegments('hello')
    expect(spans).toEqual([{ text: 'hello', style: {} }])
  })

  it('parses foreground colour codes', () => {
    const spans = parseAnsiSegments('\x1b[31mred\x1b[0m')
    expect(spans).toEqual([{ text: 'red', style: { fg: 1 } }])
  })

  it('parses combined bold + colour and reset', () => {
    const spans = parseAnsiSegments('A\x1b[1;32mB\x1b[0mC')
    expect(spans).toEqual([
      { text: 'A', style: {} },
      { text: 'B', style: { bold: true, fg: 2 } },
      { text: 'C', style: {} },
    ])
  })

  it('maps bright colours to bold', () => {
    const spans = parseAnsiSegments('\x1b[91mX\x1b[0m')
    expect(spans[0].style).toEqual({ fg: 1, bold: true })
  })

  it('parses background colour codes', () => {
    const spans = parseAnsiSegments('\x1b[44mX\x1b[0m')
    expect(spans[0].style).toEqual({ bg: 4 })
  })

  it('parses reverse and blink', () => {
    const spans = parseAnsiSegments('\x1b[5;7mflash\x1b[0m')
    expect(spans[0].style).toEqual({ reverse: true, blink: true })
  })

  it('applySgr resets on code 0', () => {
    expect(applySgr({ fg: 3, bold: true }, [0])).toEqual({})
  })

  it('stripAnsi removes colour and control sequences', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red')
    expect(stripAnsi('A\x1b[2J\x1b[H B')).toBe('A B')
  })
})
