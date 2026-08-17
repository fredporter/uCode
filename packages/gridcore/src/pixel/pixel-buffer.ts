export const PIXEL_SIZE = 24 // canonical square cell (terminal)
export const PIXEL_WIDTH = 24
export const PIXEL_HEIGHT = 24
export const PIXEL_COUNT = PIXEL_SIZE * PIXEL_SIZE

/** Number of colours in the pixel-editor palette. */
export const PIXEL_COLOURS = 32

/** A colour index in the pixel palette (0..31). */
export type PixelColor = number

/** A bitmap of colour indices, stored row-major (width × height). */
export type PixelBuffer = Uint8Array

/** Ink bounding box of a pixel buffer (0 = transparent/empty). */
export interface InkBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function createPixelBuffer(
  fill: PixelColor = 0,
  width: number = PIXEL_WIDTH,
  height: number = PIXEL_HEIGHT,
): PixelBuffer {
  const buf = new Uint8Array(width * height)
  if (fill !== 0) buf.fill(fill)
  return buf
}

export function pixelIndex(x: number, y: number, width: number = PIXEL_WIDTH): number {
  return y * width + x
}

export function setPixel(
  buf: PixelBuffer,
  x: number,
  y: number,
  color: PixelColor,
  width: number = PIXEL_WIDTH,
  height: number = PIXEL_HEIGHT,
): void {
  if (x < 0 || y < 0 || x >= width || y >= height) return
  buf[pixelIndex(x, y, width)] = color
}

export function getPixel(
  buf: PixelBuffer,
  x: number,
  y: number,
  width: number = PIXEL_WIDTH,
  height: number = PIXEL_HEIGHT,
): PixelColor {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0
  return buf[pixelIndex(x, y, width)]
}

export function fillPixelBuffer(buf: PixelBuffer, color: PixelColor): void {
  buf.fill(color)
}

export function clearPixelBuffer(buf: PixelBuffer): void {
  buf.fill(0)
}

export function clonePixelBuffer(buf: PixelBuffer): PixelBuffer {
  return buf.slice()
}

/**
 * Measure the bounding box of non-empty (non-zero) pixels. Returns null for an
 * empty buffer. Used to surface variable-width glyph metrics.
 */
export function measureInkBounds(
  buf: PixelBuffer,
  width: number = PIXEL_WIDTH,
  height: number = PIXEL_HEIGHT,
): InkBounds | null {
  let minX = width
  let maxX = -1
  let minY = height
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (buf[y * width + x] !== 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY }
}

