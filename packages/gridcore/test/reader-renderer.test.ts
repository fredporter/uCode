import { describe, expect, it } from 'vitest'

import { readerBufferText, renderReaderTeletextPage } from '../src/teletext/reader-renderer'
import { dataPage, graphicsPage, mapPage } from '../src/teletext/reader-model'

describe('reader page golden rendering', () => {
  it.each([
    [102, dataPage(), 'GRIDCORE SIGNAL'],
    [103, mapPage(), 'THE uCODE NETWORK'],
    [104, graphicsPage(), 'MODERN MOSAIC WORKSHOP'],
  ] as const)('renders page %i deterministically', (page, content, marker) => {
    const buffer = renderReaderTeletextPage(page, content, {
      cols: 74,
      rows: 25,
      clock: 'Mon 01 Jan 12:00/00',
    })
    const golden = readerBufferText(buffer)
    expect(golden).toContain(`P${page} CEEFAX ${page}`)
    expect(golden).toContain(marker)
    expect(golden).toContain('Index')
    expect(buffer).toHaveLength(25)
    expect(buffer.every((row) => row.length === 74)).toBe(true)
    expect(buffer.flat().some((cell) => cell.mosaic)).toBe(true)
  })
})
