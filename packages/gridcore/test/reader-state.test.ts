import { describe, expect, it } from 'vitest'

import {
  backTeletext,
  createTeletextReaderState,
  enterTeletextDigit,
  navigateTeletext,
  stepTeletextSubpage,
  teletextEntryLabel,
} from '../src/teletext/reader-state'

describe('teletext reader state', () => {
  it('shows partial keypad entry and requests a valid three-digit page', () => {
    let state = createTeletextReaderState()
    let result = enterTeletextDigit(state, '2')
    state = result.state
    expect(teletextEntryLabel(state)).toBe('P2\u00b7\u00b7')

    result = enterTeletextDigit(state, '5')
    result = enterTeletextDigit(result.state, '0')
    expect(result.requestedPage).toBe(250)
    expect(result.state.entry).toBe('')
  })

  it('rejects page zero without changing the current page', () => {
    let state = createTeletextReaderState(200)
    for (const digit of '000') state = enterTeletextDigit(state, digit).state
    expect(state.page).toBe(200)
    expect(state.entry).toBe('')
  })

  it('keeps reversible navigation history', () => {
    const moved = navigateTeletext(createTeletextReaderState(), 200)
    expect(moved.page).toBe(200)
    expect(backTeletext(moved).page).toBe(100)
  })

  it('wraps manual and automatic subpage movement', () => {
    const state = { ...createTeletextReaderState(), subpage: 2 }
    expect(stepTeletextSubpage(state, 1, 3).subpage).toBe(0)
    expect(stepTeletextSubpage(state, -1, 3).subpage).toBe(1)
  })
})
