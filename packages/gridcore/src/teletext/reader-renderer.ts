import { createBuffer, type GridBuffer, writeBufferString } from '../buffer'
import {
  BUILTIN_MOSAIC_STAMPS,
  drawMosaicLine,
  drawMosaicRectangle,
  drawTeletextBarChart,
  drawTeletextPanel,
  stampMosaic,
} from './graphics'
import {
  TELETEXT_FASTEXT,
  writeBoxedDoubleHeightTitle,
  writeSeparatedBar,
  type ReaderTeletextPage,
} from './reader-model'

export interface ReaderRenderOptions {
  cols?: number
  rows?: number
  clock?: string
  subpage?: number
}

function fillRow(buffer: GridBuffer, y: number, fg: number, bg: number): void {
  const row = buffer[y]
  if (!row) return
  for (let x = 0; x < row.length; x++) row[x] = { ...row[x], char: ' ', fg, bg }
}

export function renderReaderTeletextPage(
  pageNumber: number,
  page: ReaderTeletextPage,
  options: ReaderRenderOptions = {},
): GridBuffer {
  const cols = options.cols ?? 40
  const rows = options.rows ?? 25
  const clock = options.clock ?? ''
  let buffer = createBuffer(cols, rows)

  fillRow(buffer, 0, 7, 4)
  buffer = writeBufferString(buffer, 1, 0, `P${pageNumber} CEEFAX ${pageNumber}`, 7, 4, true)
  if (clock) buffer = writeBufferString(buffer, cols - clock.length - 1, 0, clock, 7, 4)

  if (page.flash) {
    fillRow(buffer, 1, 7, 1)
    buffer = writeBufferString(buffer, 1, 1, 'NEWFLASH', 7, 1, true)
    for (const cell of buffer[1]) cell.blink = true
  } else {
    writeSeparatedBar(buffer, 1, page.colour ?? 6)
  }

  writeBoxedDoubleHeightTitle(buffer, page.title, page.colour ?? 6)
  for (let index = 0; index < page.lines.length && 6 + index < rows - 2; index++) {
    buffer = writeBufferString(buffer, 1, 6 + index, page.lines[index], 7, 0)
  }

  if (page.composition === 'data') {
    drawTeletextPanel(buffer, 43, 7, 27, 14, { foreground: page.colour ?? 3 })
    drawTeletextBarChart(buffer, 47, 18, [3, 7, 5, 9, 6, 11, 8], 8)
  } else if (page.composition === 'map') {
    drawTeletextPanel(buffer, 43, 7, 27, 14, { foreground: page.colour ?? 6 })
    const island = BUILTIN_MOSAIC_STAMPS.find((stamp) => stamp.id === 'island')
    if (island) stampMosaic(buffer, { x: 96, y: 28 }, island, { colour: 6 })
    drawMosaicLine(buffer, { x: 90, y: 50 }, { x: 132, y: 30 }, { colour: 3 })
    drawMosaicLine(buffer, { x: 104, y: 56 }, { x: 136, y: 48 }, { colour: 2 })
  } else if (page.composition === 'graphics') {
    BUILTIN_MOSAIC_STAMPS.forEach((stamp, index) => {
      stampMosaic(buffer, { x: 88 + index * 14, y: 28 }, stamp, {
        colour: [2, 3, 6, 4][index],
      })
    })
    drawMosaicRectangle(buffer, { x: 86, y: 24 }, { x: 142, y: 55 }, { colour: 2 })
  }

  const segmentWidth = Math.floor(cols / TELETEXT_FASTEXT.length)
  TELETEXT_FASTEXT.forEach((link, index) => {
    const label = ` ${link.label} `.padEnd(segmentWidth).slice(0, segmentWidth)
    buffer = writeBufferString(buffer, index * segmentWidth, rows - 2, label, 7, link.color)
  })

  const subpages = page.subpages ?? 1
  const subLabel = subpages > 1 ? `${(options.subpage ?? 0) + 1}/${subpages}` : `P${pageNumber}`
  fillRow(buffer, rows - 1, 7, 4)
  buffer = writeBufferString(buffer, 0, rows - 1, `P${pageNumber}`, 7, 4)
  buffer = writeBufferString(buffer, 6, rows - 1, 'BBC1', 7, 4)
  buffer = writeBufferString(buffer, 12, rows - 1, subLabel, 7, 4)
  if (clock) buffer = writeBufferString(buffer, cols - clock.length - 1, rows - 1, clock, 7, 4)
  return buffer
}

export function readerBufferText(buffer: GridBuffer): string {
  return buffer.map((row) => row.map((cell) => cell.char).join('').trimEnd()).join('\n')
}
