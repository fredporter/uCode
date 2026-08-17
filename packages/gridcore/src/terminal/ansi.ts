// ANSI / VDU escape-sequence parsing for the terminal surface.

export interface AnsiStyle {
  /** 0-7 palette index (BBC MODE 7 ordering matches ANSI 30-37). */
  fg?: number
  bg?: number
  bold?: boolean
  blink?: boolean
  reverse?: boolean
}

export interface AnsiSpan {
  text: string
  style: AnsiStyle
}

/** Apply a list of SGR parameter values to a style, returning the next style. */
export function applySgr(style: AnsiStyle, params: number[]): AnsiStyle {
  let next: AnsiStyle = { ...style }
  if (params.length === 0) params = [0]

  for (const p of params) {
    if (p === 0) { next = {}; continue }
    if (p === 1) { next = { ...next, bold: true }; continue }
    if (p === 5) { next = { ...next, blink: true }; continue }
    if (p === 7) { next = { ...next, reverse: true }; continue }
    if (p === 22) { next = { ...next, bold: false }; continue }
    if (p === 25) { next = { ...next, blink: false }; continue }
    if (p === 27) { next = { ...next, reverse: false }; continue }
    if (p === 39) { next = { ...next }; delete next.fg; continue }
    if (p === 49) { next = { ...next }; delete next.bg; continue }
    if (p >= 30 && p <= 37) { next = { ...next, fg: p - 30 }; continue }
    if (p >= 90 && p <= 97) { next = { ...next, fg: p - 90, bold: true }; continue }
    if (p >= 40 && p <= 47) { next = { ...next, bg: p - 40 }; continue }
    if (p >= 100 && p <= 107) { next = { ...next, bg: p - 100 }; continue }
  }
  return next
}

function isCsiFinal(ch: string): boolean {
  const c = ch.charCodeAt(0)
  return c >= 0x40 && c <= 0x7e
}

/**
 * Split text into styled spans, parsing ANSI SGR escape sequences.
 * Non-SGR control sequences (cursor/clear) are skipped at this level;
 * use stripAnsi to remove them entirely.
 */
export function parseAnsiSegments(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = []
  let style: AnsiStyle = {}
  let current = ''
  let i = 0

  const flush = (): void => {
    if (current.length > 0) {
      spans.push({ text: current, style: { ...style } })
      current = ''
    }
  }

  while (i < text.length) {
    if (text[i] === '\x1b' && text[i + 1] === '[') {
      let j = i + 2
      while (j < text.length && !isCsiFinal(text[j])) j++
      if (j >= text.length) {
        current += text[i]
        i++
        continue
      }
      const final = text[j]
      const raw = text.slice(i + 2, j)
      const params = raw.length ? raw.split(';').map(s => (s === '' ? 0 : parseInt(s, 10))) : [0]
      i = j + 1
      if (final === 'm') {
        flush()
        style = applySgr(style, params)
      }
      continue
    }
    current += text[i]
    i++
  }
  flush()
  return spans
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g

/** Remove all ANSI escape sequences from a string. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}
