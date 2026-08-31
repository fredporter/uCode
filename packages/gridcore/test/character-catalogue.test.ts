import { describe, expect, it } from 'vitest'
import { CHARACTER_CATALOGUE, deserializeCharacterCatalogue, searchCharacterCatalogue, serializeCharacterCatalogue } from '../src/characters/catalogue'

describe('character catalogue', () => {
  it('unifies curated retro symbols, modern emoji, mosaics and sprites', () => {
    const emoji = CHARACTER_CATALOGUE.filter(item => item.kind === 'emoji')
    expect(emoji).toHaveLength(103)
    expect(CHARACTER_CATALOGUE.filter(item => item.kind === 'teletext-mosaic')).toHaveLength(128)
    expect(emoji.some(item => item.preview === '❤️')).toBe(true)
    expect(emoji.some(item => item.preview === '👍🏽')).toBe(true)
    expect(emoji.some(item => item.preview === '👩‍💻')).toBe(true)
    expect(emoji.some(item => item.preview === '🦄')).toBe(false)
    expect(CHARACTER_CATALOGUE.some(item => item.kind === 'sprite')).toBe(true)
    expect(CHARACTER_CATALOGUE.some(item => item.kind === 'icon')).toBe(true)
    expect(CHARACTER_CATALOGUE.some(item => item.kind === 'bob')).toBe(true)
    expect(CHARACTER_CATALOGUE.filter(item => item.kind === 'sprite').every(item => item.bitmap?.pixels.some(Boolean))).toBe(true)
    expect(CHARACTER_CATALOGUE.filter(item => item.kind === 'bob').every(item => item.frames?.length === 2)).toBe(true)
  })

  it('searches labels, tags, grapheme ids, category and register', () => {
    expect(searchCharacterCatalogue(CHARACTER_CATALOGUE, { text: 'box drawing', limit: 5 })).toHaveLength(5)
    expect(searchCharacterCatalogue(CHARACTER_CATALOGUE, { category: 'emoji' }).every(item => item.kind === 'emoji')).toBe(true)
    expect(searchCharacterCatalogue(CHARACTER_CATALOGUE, { category: 'teletext-mosaic', register: 'square' })).toEqual([])
    expect(searchCharacterCatalogue(CHARACTER_CATALOGUE, { text: '1F469' }).some(item => item.preview === '👩‍💻')).toBe(true)
  })

  it('declares fallback/provenance and round-trips a versioned document', () => {
    expect(CHARACTER_CATALOGUE.every(item =>
      item.version === 1 && item.rendering && item.provenance && item.license &&
      item.tags.length && item.registers.length && item.metrics.width > 0 && item.metrics.height > 0,
    )).toBe(true)
    const source = CHARACTER_CATALOGUE.slice(0, 3)
    expect(deserializeCharacterCatalogue(serializeCharacterCatalogue(source)).map(item => item.id))
      .toEqual(source.map(item => item.id))
    expect(() => deserializeCharacterCatalogue({ format: 'old' })).toThrow('Unsupported')
    const incomplete = JSON.parse(JSON.stringify(serializeCharacterCatalogue(source)))
    delete incomplete.entries[0].version
    expect(() => deserializeCharacterCatalogue(incomplete)).toThrow('Invalid character catalogue entry 0')
  })

  it('round-trips independent sprite and BOB pixel payloads', () => {
    const sprite = CHARACTER_CATALOGUE.find(item => item.kind === 'sprite')!
    const bob = CHARACTER_CATALOGUE.find(item => item.kind === 'bob')!
    const document = JSON.parse(JSON.stringify(serializeCharacterCatalogue([sprite, bob])))
    const [restoredSprite, restoredBob] = deserializeCharacterCatalogue(document)

    expect(restoredSprite.bitmap).toEqual(sprite.bitmap)
    expect(restoredBob.bitmap).toEqual(bob.bitmap)
    expect(restoredBob.frames).toEqual(bob.frames)
    restoredSprite.bitmap!.pixels[0] = !restoredSprite.bitmap!.pixels[0]
    expect(sprite.bitmap!.pixels[0]).not.toBe(restoredSprite.bitmap!.pixels[0])
  })

  it('rejects malformed sprite and BOB pixel payloads', () => {
    const sprite = CHARACTER_CATALOGUE.find(item => item.kind === 'sprite')!
    const bob = CHARACTER_CATALOGUE.find(item => item.kind === 'bob')!
    const malformedSprite = serializeCharacterCatalogue([sprite])
    malformedSprite.entries[0].bitmap!.pixels.pop()
    expect(() => deserializeCharacterCatalogue(malformedSprite)).toThrow('Invalid character catalogue entry 0')

    const malformedBob = serializeCharacterCatalogue([bob])
    malformedBob.entries[0].frames![0].pixels[0] = 'invalid' as unknown as boolean
    expect(() => deserializeCharacterCatalogue(malformedBob)).toThrow('Invalid character catalogue entry 0')
  })

  it('distinguishes baked core artwork from platform emoji fallbacks', () => {
    const baked = CHARACTER_CATALOGUE.filter(item => item.rendering === 'deterministic-bitmap')
    expect(baked.length).toBeGreaterThanOrEqual(17)
    expect(baked.every(item => item.bitmapId?.startsWith('U+'))).toBe(true)
    expect(CHARACTER_CATALOGUE.find(item => item.preview === '😀')?.rendering)
      .toBe('deterministic-bitmap')
    expect(CHARACTER_CATALOGUE.find(item => item.preview === '🧑‍🚀')?.rendering)
      .toBe('platform-fallback')
  })
})
