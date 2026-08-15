import { describe, expect, it } from 'vitest'
import { resolveDisplayColors, toGrayScale } from '../src/palette/display'

describe('display mode colour resolution', () => {
  it('passes colours through in teletext mode', () => {
    expect(resolveDisplayColors('#ff0000', '#000000', 'teletext')).toEqual({ fg: '#ff0000', bg: '#000000' })
  })

  it('grayscales in mono mode', () => {
    expect(resolveDisplayColors('#ffffff', '#000000', 'mono')).toEqual({ fg: '#ffffff', bg: '#000000' })
    expect(toGrayScale('#ff0000')).toBe('#4c4c4c')
  })

  it('high contrast in wireframe mode', () => {
    expect(resolveDisplayColors('#ff0000', '#000000', 'wireframe', 'X')).toEqual({ fg: '#ffffff', bg: '#000000' })
    expect(resolveDisplayColors('#ff0000', '#000000', 'wireframe', ' ')).toEqual({ fg: '#000000', bg: '#000000' })
  })
})
