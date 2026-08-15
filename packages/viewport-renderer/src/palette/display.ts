import type { DisplayMode } from '@udos/gridcore'

/** Convert a hex colour to a luminance-based grayscale hex colour. */
export function toGrayScale(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const v = parseInt(m[1], 16)
  const r = (v >> 16) & 0xff
  const g = (v >> 8) & 0xff
  const b = v & 0xff
  const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  const gs = lum.toString(16).padStart(2, '0')
  return `#${gs}${gs}${gs}`
}

/**
 * Resolve the effective foreground/background colours for a cell given the
 * active display mode.
 */
export function resolveDisplayColors(
  fg: string,
  bg: string,
  mode: DisplayMode,
  char?: string,
): { fg: string; bg: string } {
  if (mode === 'mono') {
    return { fg: toGrayScale(fg), bg: toGrayScale(bg) }
  }
  if (mode === 'wireframe') {
    const visible = char !== undefined && char !== ' '
    return { fg: visible ? '#ffffff' : '#000000', bg: '#000000' }
  }
  return { fg, bg }
}
