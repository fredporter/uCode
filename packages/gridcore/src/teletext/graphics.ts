import { charToPattern, patternToChar } from '../seeds'
import type { ReaderBuffer, ReaderBufferCell } from './reader-model'

export interface MosaicPoint {
  x: number
  y: number
}

export interface MosaicStamp {
  width: number
  height: number
  pixels: readonly boolean[]
}

export interface NamedMosaicStamp extends MosaicStamp {
  id: string
  label: string
  category: 'navigation' | 'weather' | 'map' | 'custom'
}

export interface MosaicRect {
  x: number
  y: number
  width: number
  height: number
}

export interface MosaicPaintOptions {
  colour: number
  background?: number
  erase?: boolean
  separated?: boolean
}

export interface TeletextPanelOptions {
  foreground: number
  background?: number
  fill?: boolean
}

export interface RgbaImage {
  width: number
  height: number
  data: ArrayLike<number>
}

export interface ImageToMosaicOptions {
  width: number
  height: number
  alphaThreshold?: number
  luminanceThreshold?: number
  invert?: boolean
}

const DOT_MASKS = [1, 2, 4, 8, 16, 32] as const

function stampFromRows(
  id: string,
  label: string,
  category: NamedMosaicStamp['category'],
  rows: readonly string[],
): NamedMosaicStamp {
  const width = Math.max(0, ...rows.map((row) => row.length))
  return {
    id,
    label,
    category,
    width,
    height: rows.length,
    pixels: rows.flatMap((row) =>
      Array.from({ length: width }, (_, x) => row[x] !== ' '),
    ),
  }
}

export const BUILTIN_MOSAIC_STAMPS: readonly NamedMosaicStamp[] = [
  stampFromRows('arrow-right', 'Arrow', 'navigation', [
    '  #  ', '  ## ', '#####', '  ## ', '  #  ',
  ]),
  stampFromRows('sun', 'Sun', 'weather', [
    '# # #', ' ### ', '#####', ' ### ', '# # #',
  ]),
  stampFromRows('cloud', 'Cloud', 'weather', [
    '  ###  ', ' ##### ', '#######', ' ##### ',
  ]),
  stampFromRows('island', 'Island', 'map', [
    '   ##   ', ' ####   ', '######  ', ' ###### ', '  ####  ', '   ##   ',
  ]),
]

export function findMosaicStamp(id: string): NamedMosaicStamp | undefined {
  return BUILTIN_MOSAIC_STAMPS.find((stamp) => stamp.id === id)
}

export function nameMosaicStamp(
  stamp: MosaicStamp,
  id: string,
  label: string,
): NamedMosaicStamp {
  return { ...stamp, pixels: [...stamp.pixels], id, label, category: 'custom' }
}

function cellAt(buffer: ReaderBuffer, cellX: number, cellY: number): ReaderBufferCell | null {
  return buffer[cellY]?.[cellX] ?? null
}

export function mosaicDotSize(buffer: ReaderBuffer): { width: number; height: number } {
  return {
    width: (buffer[0]?.length ?? 0) * 2,
    height: buffer.length * 3,
  }
}

export function mosaicPatternAt(buffer: ReaderBuffer, cellX: number, cellY: number): number {
  const cell = cellAt(buffer, cellX, cellY)
  return cell?.mosaic ? charToPattern(cell.char) : 0
}

export function paintMosaicDot(
  buffer: ReaderBuffer,
  x: number,
  y: number,
  options: MosaicPaintOptions,
): boolean {
  const size = mosaicDotSize(buffer)
  if (x < 0 || y < 0 || x >= size.width || y >= size.height) return false

  const cellX = Math.floor(x / 2)
  const cellY = Math.floor(y / 3)
  const cell = cellAt(buffer, cellX, cellY)
  if (!cell) return false

  const bit = DOT_MASKS[(y % 3) * 2 + (x % 2)]
  const current = mosaicPatternAt(buffer, cellX, cellY)
  const pattern = options.erase ? current & ~bit : current | bit
  buffer[cellY][cellX] = {
    ...cell,
    char: patternToChar(pattern),
    fg: options.colour,
    bg: options.background ?? cell.bg,
    mosaic: true,
  }
  return true
}

export function drawMosaicLine(
  buffer: ReaderBuffer,
  from: MosaicPoint,
  to: MosaicPoint,
  options: MosaicPaintOptions,
): void {
  let x = Math.round(from.x)
  let y = Math.round(from.y)
  const endX = Math.round(to.x)
  const endY = Math.round(to.y)
  const dx = Math.abs(endX - x)
  const sx = x < endX ? 1 : -1
  const dy = -Math.abs(endY - y)
  const sy = y < endY ? 1 : -1
  let error = dx + dy

  while (true) {
    paintMosaicDot(buffer, x, y, options)
    if (x === endX && y === endY) break
    const twice = error * 2
    if (twice >= dy) {
      error += dy
      x += sx
    }
    if (twice <= dx) {
      error += dx
      y += sy
    }
  }
}

export function drawMosaicRectangle(
  buffer: ReaderBuffer,
  from: MosaicPoint,
  to: MosaicPoint,
  options: MosaicPaintOptions,
  filled = false,
): void {
  const left = Math.min(from.x, to.x)
  const right = Math.max(from.x, to.x)
  const top = Math.min(from.y, to.y)
  const bottom = Math.max(from.y, to.y)
  if (filled) {
    for (let y = top; y <= bottom; y++) {
      drawMosaicLine(buffer, { x: left, y }, { x: right, y }, options)
    }
    return
  }
  drawMosaicLine(buffer, { x: left, y: top }, { x: right, y: top }, options)
  drawMosaicLine(buffer, { x: right, y: top }, { x: right, y: bottom }, options)
  drawMosaicLine(buffer, { x: right, y: bottom }, { x: left, y: bottom }, options)
  drawMosaicLine(buffer, { x: left, y: bottom }, { x: left, y: top }, options)
}

export function fillMosaicRegion(
  buffer: ReaderBuffer,
  start: MosaicPoint,
  options: MosaicPaintOptions,
): void {
  const size = mosaicDotSize(buffer)
  if (start.x < 0 || start.y < 0 || start.x >= size.width || start.y >= size.height) return
  const target = mosaicDotIsSet(buffer, start.x, start.y)
  const replacement = !options.erase
  if (target === replacement) return

  const pending: MosaicPoint[] = [start]
  const visited = new Set<string>()
  while (pending.length) {
    const point = pending.pop()!
    const key = `${point.x}:${point.y}`
    if (visited.has(key)) continue
    visited.add(key)
    if (
      point.x < 0 || point.y < 0 || point.x >= size.width || point.y >= size.height ||
      mosaicDotIsSet(buffer, point.x, point.y) !== target
    ) continue
    paintMosaicDot(buffer, point.x, point.y, options)
    pending.push(
      { x: point.x - 1, y: point.y },
      { x: point.x + 1, y: point.y },
      { x: point.x, y: point.y - 1 },
      { x: point.x, y: point.y + 1 },
    )
  }
}

export function mosaicDotIsSet(buffer: ReaderBuffer, x: number, y: number): boolean {
  if (x < 0 || y < 0) return false
  const pattern = mosaicPatternAt(buffer, Math.floor(x / 2), Math.floor(y / 3))
  return (pattern & DOT_MASKS[(y % 3) * 2 + (x % 2)]) !== 0
}

export function stampMosaic(
  buffer: ReaderBuffer,
  origin: MosaicPoint,
  stamp: MosaicStamp,
  options: MosaicPaintOptions,
): void {
  for (let y = 0; y < stamp.height; y++) {
    for (let x = 0; x < stamp.width; x++) {
      if (stamp.pixels[y * stamp.width + x]) {
        paintMosaicDot(buffer, origin.x + x, origin.y + y, options)
      }
    }
  }
}

export function mosaicRect(from: MosaicPoint, to: MosaicPoint): MosaicRect {
  const x = Math.min(from.x, to.x)
  const y = Math.min(from.y, to.y)
  return {
    x,
    y,
    width: Math.abs(to.x - from.x) + 1,
    height: Math.abs(to.y - from.y) + 1,
  }
}

export function extractMosaicStamp(buffer: ReaderBuffer, rect: MosaicRect): MosaicStamp {
  const pixels: boolean[] = []
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      pixels.push(mosaicDotIsSet(buffer, rect.x + x, rect.y + y))
    }
  }
  return { width: rect.width, height: rect.height, pixels }
}

export function clearMosaicRect(
  buffer: ReaderBuffer,
  rect: MosaicRect,
  colour = 7,
): void {
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      paintMosaicDot(buffer, rect.x + x, rect.y + y, { colour, erase: true })
    }
  }
}

/** Downsample RGBA pixels into a portable monochrome Teletext mosaic stamp. */
export function imageToMosaicStamp(
  image: RgbaImage,
  options: ImageToMosaicOptions,
): MosaicStamp {
  const width = Math.max(1, Math.round(options.width))
  const height = Math.max(1, Math.round(options.height))
  const alphaThreshold = options.alphaThreshold ?? 32
  const luminanceThreshold = options.luminanceThreshold ?? 128
  const pixels: boolean[] = []

  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(image.height - 1, Math.floor(((y + 0.5) / height) * image.height))
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(image.width - 1, Math.floor(((x + 0.5) / width) * image.width))
      const offset = (sourceY * image.width + sourceX) * 4
      const red = image.data[offset] ?? 0
      const green = image.data[offset + 1] ?? 0
      const blue = image.data[offset + 2] ?? 0
      const alpha = image.data[offset + 3] ?? 255
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      const visible = alpha >= alphaThreshold
      const lit = visible && luminance >= luminanceThreshold
      pixels.push(options.invert ? visible && !lit : lit)
    }
  }

  return { width, height, pixels }
}

export function drawTeletextPanel(
  buffer: ReaderBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  options: TeletextPanelOptions,
): void {
  if (width < 2 || height < 2) return
  const fg = options.foreground
  const bg = options.background ?? 0
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = cellAt(buffer, col, row)
      if (!cell) continue
      const edge = row === y || row === y + height - 1 || col === x || col === x + width - 1
      if (edge || options.fill) {
        buffer[row][col] = { ...cell, char: edge ? '█' : ' ', fg, bg: options.fill ? fg : bg }
      }
    }
  }
}

export function drawTeletextBarChart(
  buffer: ReaderBuffer,
  x: number,
  baselineY: number,
  values: readonly number[],
  maxHeight: number,
  colours: readonly number[] = [2, 3, 6, 4],
): void {
  const peak = Math.max(1, ...values)
  values.forEach((value, index) => {
    const height = Math.max(0, Math.round((value / peak) * maxHeight))
    for (let row = 0; row < height; row++) {
      const cell = cellAt(buffer, x + index, baselineY - row)
      if (cell) buffer[baselineY - row][x + index] = {
        ...cell,
        char: '█',
        fg: colours[index % colours.length],
        mosaic: true,
      }
    }
  })
}
