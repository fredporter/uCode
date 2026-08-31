import { clonePixelBuffer, createPixelBuffer, type PixelBuffer } from './pixel-buffer'

export interface PixelFrame {
  id: string
  name: string
  durationMs: number
  pixels: PixelBuffer
}

export interface PixelAnimationDocument {
  format: 'ucode-pixel-animation-v1'
  version: 1
  width: number
  height: number
  activeFrame: number
  frames: Array<{ name: string; durationMs: number; pixels: number[] }>
}

export const MAX_PIXEL_ANIMATION_PIXELS = 1_000_000

export class PixelAnimation {
  private frames: PixelFrame[]
  private activeIndex = 0

  constructor(initial: PixelBuffer, private width: number, private height: number, durationMs = 120) {
    this.frames = [this.makeFrame(initial, durationMs, 'Frame 1')]
  }

  get active(): number { return this.activeIndex }
  get length(): number { return this.frames.length }
  list(): PixelFrame[] { return this.frames.map(frame => ({ ...frame, pixels: clonePixelBuffer(frame.pixels) })) }
  current(): PixelFrame { const frame = this.frames[this.activeIndex]; return { ...frame, pixels: clonePixelBuffer(frame.pixels) } }
  previous(): PixelFrame | null {
    if (this.frames.length < 2) return null
    const frame = this.frames[(this.activeIndex - 1 + this.frames.length) % this.frames.length]
    return { ...frame, pixels: clonePixelBuffer(frame.pixels) }
  }

  select(index: number): void {
    this.activeIndex = Math.max(0, Math.min(this.frames.length - 1, index))
  }

  update(pixels: PixelBuffer): void {
    this.frames[this.activeIndex] = { ...this.frames[this.activeIndex], pixels: clonePixelBuffer(pixels) }
  }

  add(pixels = createPixelBuffer(0, this.width, this.height)): PixelFrame {
    const frame = this.makeFrame(pixels, this.current().durationMs, `Frame ${this.frames.length + 1}`)
    this.frames.splice(this.activeIndex + 1, 0, frame)
    this.activeIndex++
    return { ...frame, pixels: clonePixelBuffer(frame.pixels) }
  }

  duplicate(): PixelFrame { return this.add(this.current().pixels) }

  delete(): void {
    if (this.frames.length <= 1) return
    this.frames.splice(this.activeIndex, 1)
    this.activeIndex = Math.min(this.activeIndex, this.frames.length - 1)
  }

  setDuration(durationMs: number): void {
    this.frames[this.activeIndex] = { ...this.frames[this.activeIndex], durationMs: Math.max(16, Math.round(durationMs)) }
  }

  frameIndexAt(elapsedMs: number): number {
    const total = this.frames.reduce((sum, frame) => sum + frame.durationMs, 0)
    if (total <= 0) return 0
    let cursor = ((elapsedMs % total) + total) % total
    for (let index = 0; index < this.frames.length; index++) {
      cursor -= this.frames[index].durationMs
      if (cursor < 0) return index
    }
    return this.frames.length - 1
  }

  serialize(): PixelAnimationDocument {
    return {
      format: 'ucode-pixel-animation-v1', version: 1,
      width: this.width, height: this.height, activeFrame: this.activeIndex,
      frames: this.frames.map(frame => ({ name: frame.name, durationMs: frame.durationMs, pixels: Array.from(frame.pixels) })),
    }
  }

  static deserialize(value: unknown): PixelAnimation {
    if (!value || typeof value !== 'object') throw new Error('Invalid pixel animation')
    const document = value as Partial<PixelAnimationDocument>
    if (document.format !== 'ucode-pixel-animation-v1') {
      throw new Error('Unsupported pixel animation format')
    }
    if (document.version !== 1) {
      throw new Error('Unsupported pixel animation version')
    }
    if (!Number.isSafeInteger(document.width) || !Number.isSafeInteger(document.height) ||
        !document.width || !document.height || !Array.isArray(document.frames) || !document.frames.length) {
      throw new Error('Invalid pixel animation dimensions or frames')
    }
    if (document.width > Math.floor(MAX_PIXEL_ANIMATION_PIXELS / document.height)) {
      throw new Error(`Pixel animation frame exceeds ${MAX_PIXEL_ANIMATION_PIXELS} pixel limit`)
    }
    const expected = document.width * document.height
    if (document.frames.length > Math.floor(MAX_PIXEL_ANIMATION_PIXELS / expected)) {
      throw new Error(`Pixel animation exceeds ${MAX_PIXEL_ANIMATION_PIXELS} pixel limit`)
    }
    document.frames.forEach((frame, index) => {
      if (!frame || typeof frame.name !== 'string' || !Number.isFinite(frame.durationMs) ||
          !Array.isArray(frame.pixels) || frame.pixels.length !== expected) {
        throw new Error(`Invalid pixel frame ${index}`)
      }
    })
    const restored = new PixelAnimation(createPixelBuffer(0, document.width, document.height), document.width, document.height)
    restored.frames = document.frames.map((frame, index) => {
      const pixels = new Uint8Array(expected)
      frame.pixels.forEach((colour, pixel) => { pixels[pixel] = Math.max(0, Math.min(31, Number(colour) || 0)) })
      return restored.makeFrame(pixels, frame.durationMs, frame.name || `Frame ${index + 1}`)
    })
    restored.activeIndex = Math.max(0, Math.min(restored.frames.length - 1, document.activeFrame ?? 0))
    return restored
  }

  private makeFrame(pixels: PixelBuffer, durationMs: number, name: string): PixelFrame {
    return { id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, durationMs, pixels: clonePixelBuffer(pixels) }
  }
}
