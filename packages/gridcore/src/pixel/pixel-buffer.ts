export const PIXEL_SIZE = 24
export const PIXEL_COUNT = PIXEL_SIZE * PIXEL_SIZE

/** A colour index in the 8-colour MODE 7 palette (0-7). */
export type PixelColor = number

/** A 24x24 bitmap of colour indices, stored row-major. */
export type PixelBuffer = Uint8Array

export function createPixelBuffer(fill: PixelColor = 0): PixelBuffer {
  const buf = new Uint8Array(PIXEL_COUNT)
  if (fill !== 0) buf.fill(fill)
  return buf
}

export function pixelIndex(x: number, y: number): number {
  return y * PIXEL_SIZE + x
}

export function setPixel(buf: PixelBuffer, x: number, y: number, color: PixelColor): void {
  if (x < 0 || y < 0 || x >= PIXEL_SIZE || y >= PIXEL_SIZE) return
  buf[pixelIndex(x, y)] = color
}

export function getPixel(buf: PixelBuffer, x: number, y: number): PixelColor {
  if (x < 0 || y < 0 || x >= PIXEL_SIZE || y >= PIXEL_SIZE) return 0
  return buf[pixelIndex(x, y)]
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
