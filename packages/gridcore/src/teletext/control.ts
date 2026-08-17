// BBC MODE 7 (teletext) control codes and line interpreter.
//
// Control codes live in the 0x00-0x1F range, matching the BBC Micro MODE 7
// teletext character set. They set state (colour, double-height, flash,
// graphics mode) and do not advance the cursor.

import { patternToChar } from "../seeds"

// Alphanumeric foreground colours (0x00-0x07)
export const ALPHA_BLACK = 0x00
export const ALPHA_RED = 0x01
export const ALPHA_GREEN = 0x02
export const ALPHA_YELLOW = 0x03
export const ALPHA_BLUE = 0x04
export const ALPHA_MAGENTA = 0x05
export const ALPHA_CYAN = 0x06
export const ALPHA_WHITE = 0x07

export const FLASH = 0x08
export const STEADY = 0x09
export const END_BOX = 0x0a
export const START_BOX = 0x0b
export const NORMAL_HEIGHT = 0x0c
export const DOUBLE_HEIGHT = 0x0d

// Graphics foreground colours (0x10-0x17)
export const GRAPHICS_BLACK = 0x10
export const GRAPHICS_RED = 0x11
export const GRAPHICS_GREEN = 0x12
export const GRAPHICS_YELLOW = 0x13
export const GRAPHICS_BLUE = 0x14
export const GRAPHICS_MAGENTA = 0x15
export const GRAPHICS_CYAN = 0x16
export const GRAPHICS_WHITE = 0x17

export const CONCEAL = 0x18
export const CONTIGUOUS_GRAPHICS = 0x19
export const SEPARATED_GRAPHICS = 0x1a
export const ESCAPE = 0x1b
export const BLACK_BACKGROUND = 0x1c
export const NEW_BACKGROUND = 0x1d
export const HOLD_GRAPHICS = 0x1e
export const RELEASE_GRAPHICS = 0x1f

export interface TeletextCell {
  char: string
  fg: number
  bg: number
  /** Double-height glyph half. */
  dh?: "top" | "bottom"
  blink: boolean
  /** Mosaic block graphic flag (sextant glyph lives in `char`). */
  mosaic?: boolean
}

export interface TeletextState {
  fg: number
  bg: number
  doubleHeight: boolean
  flash: boolean
}

/**
 * Interpret a single teletext line (no embedded newlines) into styled cells.
 * Control codes set state; printable characters advance the cursor. In
 * graphics mode, each character's low 6 bits encode a 2x3 mosaic block:
 * bit 0 = top-left, bit 1 = top-right, bit 2 = mid-left, bit 3 = mid-right,
 * bit 4 = bottom-left, bit 5 = bottom-right.
 */
export function interpretTeletextLine(
  line: string,
  initial: Partial<TeletextState> = {},
): TeletextCell[] {
  let fg = initial.fg ?? 7
  let bg = initial.bg ?? 0
  let doubleHeight = initial.doubleHeight ?? false
  let flash = initial.flash ?? false
  let graphics: 'none' | 'separated' | 'contiguous' = 'none'

  const cells: TeletextCell[] = []

  for (const ch of line) {
    const code = ch.charCodeAt(0)

    if (code < 0x20) {
      if (code >= ALPHA_BLACK && code <= ALPHA_WHITE) { fg = code; continue }
      if (code >= GRAPHICS_BLACK && code <= GRAPHICS_WHITE) { fg = code - 0x10; continue }
      switch (code) {
        case FLASH: flash = true; continue
        case STEADY: flash = false; continue
        case NORMAL_HEIGHT: doubleHeight = false; continue
        case DOUBLE_HEIGHT: doubleHeight = true; continue
        case BLACK_BACKGROUND: bg = 0; continue
        case NEW_BACKGROUND: bg = fg; continue
        case SEPARATED_GRAPHICS: graphics = 'separated'; continue
        case CONTIGUOUS_GRAPHICS: graphics = 'contiguous'; continue
        case RELEASE_GRAPHICS: graphics = 'none'; continue
        // HOLD_GRAPHICS / CONCEAL / box codes are no-ops at this level.
        default: continue
      }
    }

    if (graphics !== 'none') {
      cells.push({
        char: patternToChar(code & 0x3f),
        fg,
        bg,
        dh: doubleHeight ? "top" : undefined,
        blink: flash,
        mosaic: true,
      })
      continue
    }

    cells.push({ char: ch, fg, bg, dh: doubleHeight ? "top" : undefined, blink: flash })
  }

  return cells
}
