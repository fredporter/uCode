import { patternToChar } from '../seeds'
import { EMOJI_ATLAS } from '../seeds/emoji-atlas'
import { BUILTIN_MOSAIC_STAMPS } from '../teletext/graphics'
import { toGrapheme } from './grapheme'
import type { CharacterAssetKind, GlyphRef } from './types'

export type CharacterCatalogueCategory = CharacterAssetKind | 'all'
export type CharacterRegister = 'square' | 'reading'

export interface CharacterCatalogueEntry extends GlyphRef {
  version: 1
  label: string
  preview: string
  registers: CharacterRegister[]
  rendering: 'font-atlas' | 'procedural' | 'deterministic-bitmap' | 'platform-fallback'
  provenance: string
  license: string
  bitmapId?: string
  bitmap?: {
    width: number
    height: number
    pixels: boolean[]
  }
  frames?: Array<{
    width: number
    height: number
    pixels: boolean[]
  }>
}

const EMOJI = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘',
  '😎','🤓','🧐','🤖','👻','💀','👾','🐱','🐶','🦊','🐸','🐝','🦋','🌱','🌲','🌵',
  '🍎','🍋','🍄','🍕','🎮','🕹️','🎲','♟️','⚽','🏆','🚗','🚀','🛸','⌚','💡','🔑',
  '🔒','🔓','🔔','🎵','❤️','🧡','💛','💚','💙','💜','⭐','✨','🔥','⚡','☀️','🌙',
  '☁️','🌧️','❄️','🟥','🟦','🟧','🟨','🟩','🟪','⬛','⬜','✔','✖','✅','❌','⚠️','ℹ️','⬅️','⬆️','➡️','⬇️','↩️','▶️','⏸️','⏹️',
  '👍','👍🏽','👎','👏','🙌','👋','✋','👌','🤝','👩‍💻','🧑‍🚀','👨‍👩‍👧','🏳️‍🌈','🏴‍☠️',
] as const

// Deliberately constrained to shapes that are useful in grid software. Broad
// Unicode symbol sweeps produce unsupported-font tofu and an unusable picker.
const RETRO_SYMBOL_RANGES = [
  [0x2500, 0x257f, 'box drawing'],
  [0x2580, 0x259f, 'block'],
] as const

const RETRO_SYMBOLS = [
  '←','↑','→','↓','↔','↕','↖','↗','↘','↙','↩','↪','↻',
  '±','×','÷','≈','≠','≤','≥','∞','√','°','•','·','…','©','®','™',
  '■','□','▪','▫','▲','△','▼','▽','◆','◇','○','●','◐','◑','◒','◓',
  '♠','♥','♦','♣','♪','♫','☀','☁','☂','☃','☎','☑','☒','☠','⚑','⚐',
] as const

const ICONS = [
  ['⌂', 'Home'], ['⌕', 'Search'], ['⚙', 'Settings'], ['✎', 'Edit'],
  ['✓', 'Confirm'], ['✕', 'Close'], ['＋', 'Add'], ['−', 'Remove'],
  ['←', 'Back'], ['→', 'Forward'], ['↑', 'Up'], ['↓', 'Down'],
  ['▶', 'Play'], ['Ⅱ', 'Pause'], ['■', 'Stop'], ['↻', 'Refresh'],
  ['☰', 'Menu'], ['ⓘ', 'Information'], ['⚠', 'Warning'], ['★', 'Favourite'],
] as const

const CHARACTER_KINDS = new Set<CharacterAssetKind>([
  'glyph', 'icon', 'symbol', 'emoji', 'teletext-mosaic', 'sprite', 'bob',
])
const CHARACTER_REGISTERS = new Set<CharacterRegister>(['square', 'reading'])
const CHARACTER_RENDERINGS = new Set<CharacterCatalogueEntry['rendering']>([
  'font-atlas', 'procedural', 'deterministic-bitmap', 'platform-fallback',
])

type PixelAsset = NonNullable<CharacterCatalogueEntry['bitmap']>

function isPixelAsset(value: unknown): value is PixelAsset {
  if (!value || typeof value !== 'object') return false
  const asset = value as Partial<PixelAsset>
  return Number.isInteger(asset.width) && asset.width! > 0 &&
    Number.isInteger(asset.height) && asset.height! > 0 &&
    Array.isArray(asset.pixels) && asset.pixels.length === asset.width! * asset.height! &&
    asset.pixels.every(pixel => typeof pixel === 'boolean')
}

function clonePixelAsset(asset: PixelAsset): PixelAsset {
  return { width: asset.width, height: asset.height, pixels: [...asset.pixels] }
}

function entry(
  preview: string,
  kind: CharacterAssetKind,
  label: string,
  tags: string[],
  family?: string,
  rendering: CharacterCatalogueEntry['rendering'] = 'platform-fallback',
  provenance = 'Unicode Standard',
  license = 'Unicode Data Files and Software License',
): CharacterCatalogueEntry {
  const grapheme = toGrapheme(preview)
  const codepoints = Array.from(preview).filter((char) => char.codePointAt(0) !== 0xfe0f)
  const bitmapId = codepoints.length === 1
    ? `U+${codepoints[0].codePointAt(0)!.toString(16).toUpperCase()}`
    : undefined
  const hasDeterministicBitmap = Boolean(bitmapId && bitmapId in EMOJI_ATLAS.glyphs)
  return {
    id: `${kind}:${grapheme.id}`, kind, version: 1, label, preview, grapheme, family,
    metrics: { width: 1, height: 1, advance: 1 }, tags,
    registers: ['square', 'reading'],
    rendering: rendering === 'platform-fallback' && hasDeterministicBitmap
      ? 'deterministic-bitmap'
      : rendering,
    provenance: hasDeterministicBitmap ? 'uCode Pixel Emoji atlas' : provenance,
    license: hasDeterministicBitmap ? 'uCode project license' : license,
    bitmapId: hasDeterministicBitmap ? bitmapId : undefined,
  }
}

export function buildCharacterCatalogue(): CharacterCatalogueEntry[] {
  const entries: CharacterCatalogueEntry[] = []
  for (let code = 0x20; code <= 0x7e; code++) {
    const preview = String.fromCodePoint(code)
    entries.push(entry(preview, 'glyph', `ASCII ${preview}`, ['ascii', 'latin'], 'terminal', 'font-atlas', 'uCode core font atlases', 'Project font licenses'))
  }
  for (let code = 0xa0; code <= 0xff; code++) {
    entries.push(entry(String.fromCodePoint(code), 'glyph', `Latin-1 U+${code.toString(16).toUpperCase()}`, ['latin-1'], 'bedstead', 'font-atlas', 'Bedstead font atlas', 'Bedstead font license'))
  }
  for (const [start, end, tag] of RETRO_SYMBOL_RANGES) for (let code = start; code <= end; code++) {
    entries.push(entry(String.fromCodePoint(code), 'symbol', `${tag} U+${code.toString(16).toUpperCase()}`, [tag, 'unicode']))
  }
  for (const preview of RETRO_SYMBOLS) entries.push(entry(preview, 'symbol', `Retro symbol ${preview}`, ['retro', 'game', 'software']))
  for (const [preview, label] of ICONS) entries.push(entry(preview, 'icon', label, ['icon', 'ui', label.toLocaleLowerCase()]))
  for (const emoji of EMOJI) entries.push(entry(emoji, 'emoji', `Emoji ${toGrapheme(emoji).id}`, ['emoji', 'colour']))
  for (const separated of [false, true]) for (let bits = 0; bits < 64; bits++) {
    const mode = separated ? 'separated' : 'contiguous'
    entries.push({
      ...entry(patternToChar(bits), 'teletext-mosaic', `Mosaic ${bits} ${mode}`, ['teletext', 'mosaic', mode], 'bedstead', 'procedural', 'GridCore 2x3 mosaic generator', 'uCode project license'),
      id: `teletext-mosaic:${mode}:${bits}`, registers: ['reading'],
    })
  }
  for (const stamp of BUILTIN_MOSAIC_STAMPS) entries.push({
    ...entry('▣', 'sprite', stamp.label, ['sprite', 'stamp', stamp.category], undefined, 'procedural', 'GridCore built-in mosaic stamps', 'uCode project license'),
    id: `sprite:${stamp.id}`,
    bitmap: { width: stamp.width, height: stamp.height, pixels: [...stamp.pixels] },
  })
  for (const stamp of BUILTIN_MOSAIC_STAMPS) entries.push({
    ...entry('⬚', 'bob', `${stamp.label} BOB`, ['bob', 'sprite', 'animated', stamp.category], undefined, 'procedural', 'GridCore built-in mosaic stamps', 'uCode project license'),
    id: `bob:${stamp.id}`,
    bitmap: { width: stamp.width, height: stamp.height, pixels: [...stamp.pixels] },
    frames: [
      { width: stamp.width, height: stamp.height, pixels: [...stamp.pixels] },
      {
        width: stamp.width,
        height: stamp.height,
        pixels: Array.from({ length: stamp.pixels.length }, (_, index) => {
          const y = Math.floor(index / stamp.width)
          const x = index % stamp.width
          return Boolean(stamp.pixels[y * stamp.width + (stamp.width - 1 - x)])
        }),
      },
    ],
  })
  return entries
}

export interface CharacterCatalogueQuery {
  text?: string
  category?: CharacterCatalogueCategory
  register?: CharacterRegister
  limit?: number
}

export function searchCharacterCatalogue(catalogue: readonly CharacterCatalogueEntry[], query: CharacterCatalogueQuery = {}): CharacterCatalogueEntry[] {
  const needle = query.text?.trim().toLocaleLowerCase() ?? ''
  return catalogue.filter((item) => {
    if (query.category && query.category !== 'all' && item.kind !== query.category) return false
    if (query.register && !item.registers.includes(query.register)) return false
    if (!needle) return true
    return [item.preview, item.label, item.grapheme?.id, ...(item.tags ?? [])].join(' ').toLocaleLowerCase().includes(needle)
  }).slice(0, query.limit ?? catalogue.length)
}

export const CHARACTER_CATALOGUE = buildCharacterCatalogue()

export interface CharacterCatalogueDocument {
  format: 'ucode-character-catalogue-v1'
  version: 1
  entries: CharacterCatalogueEntry[]
}

export function serializeCharacterCatalogue(entries: readonly CharacterCatalogueEntry[]): CharacterCatalogueDocument {
  return {
    format: 'ucode-character-catalogue-v1',
    version: 1,
    entries: entries.map(item => ({
      ...item,
      tags: [...(item.tags ?? [])],
      registers: [...item.registers],
      ...(item.bitmap ? { bitmap: clonePixelAsset(item.bitmap) } : {}),
      ...(item.frames ? { frames: item.frames.map(clonePixelAsset) } : {}),
    })),
  }
}

export function deserializeCharacterCatalogue(value: unknown): CharacterCatalogueEntry[] {
  if (!value || typeof value !== 'object') throw new Error('Invalid character catalogue')
  const document = value as Partial<CharacterCatalogueDocument>
  if (document.format !== 'ucode-character-catalogue-v1' || document.version !== 1 || !Array.isArray(document.entries)) {
    throw new Error('Unsupported character catalogue format')
  }
  return document.entries.map((item, index): CharacterCatalogueEntry => {
    const metrics = item?.metrics
    if (!item || typeof item.id !== 'string' || !item.id ||
        typeof item.kind !== 'string' || !CHARACTER_KINDS.has(item.kind as CharacterAssetKind) ||
        item.version !== 1 || typeof item.label !== 'string' || !item.label ||
        typeof item.preview !== 'string' || !item.preview ||
        !metrics || typeof metrics !== 'object' ||
        !Number.isFinite(metrics.width) || metrics.width <= 0 ||
        !Number.isFinite(metrics.height) || metrics.height <= 0 ||
        !Array.isArray(item.tags) || !item.tags.length || !item.tags.every(tag => typeof tag === 'string' && tag) ||
        !Array.isArray(item.registers) || !item.registers.length ||
        !item.registers.every(register => CHARACTER_REGISTERS.has(register)) ||
        typeof item.rendering !== 'string' || !CHARACTER_RENDERINGS.has(item.rendering as CharacterCatalogueEntry['rendering']) ||
        typeof item.provenance !== 'string' || !item.provenance ||
        typeof item.license !== 'string' || !item.license ||
        (item.bitmap !== undefined && !isPixelAsset(item.bitmap)) ||
        (item.frames !== undefined && (!item.bitmap || !Array.isArray(item.frames) || !item.frames.length ||
          !item.frames.every(frame => isPixelAsset(frame) && frame.width === item.bitmap!.width && frame.height === item.bitmap!.height)))) {
      throw new Error(`Invalid character catalogue entry ${index}`)
    }
    return item as CharacterCatalogueEntry
  })
}
