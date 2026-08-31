export type TeletextReaderStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'offline'
  | 'error'

export interface TeletextReaderState {
  page: number
  subpage: number
  history: number[]
  entry: string
  status: TeletextReaderStatus
  message: string | null
}

export interface TeletextPageEntryResult {
  state: TeletextReaderState
  requestedPage: number | null
}

export const TELETEXT_MIN_PAGE = 100
export const TELETEXT_MAX_PAGE = 899

export function createTeletextReaderState(
  page = TELETEXT_MIN_PAGE,
): TeletextReaderState {
  return {
    page: clampTeletextPage(page),
    subpage: 0,
    history: [],
    entry: '',
    status: 'idle',
    message: null,
  }
}

export function isTeletextPage(page: number): boolean {
  return Number.isInteger(page) && page >= TELETEXT_MIN_PAGE && page <= TELETEXT_MAX_PAGE
}

export function clampTeletextPage(page: number): number {
  return Math.min(TELETEXT_MAX_PAGE, Math.max(TELETEXT_MIN_PAGE, Math.round(page)))
}

export function enterTeletextDigit(
  state: TeletextReaderState,
  digit: string,
): TeletextPageEntryResult {
  if (!/^\d$/.test(digit)) return { state, requestedPage: null }

  const entry = `${state.entry}${digit}`.slice(-3)
  if (entry.length < 3) {
    return { state: { ...state, entry }, requestedPage: null }
  }

  const requestedPage = Number(entry)
  return {
    state: { ...state, entry: '' },
    requestedPage: isTeletextPage(requestedPage) ? requestedPage : null,
  }
}

export function clearTeletextEntry(state: TeletextReaderState): TeletextReaderState {
  return state.entry ? { ...state, entry: '' } : state
}

export function navigateTeletext(
  state: TeletextReaderState,
  page: number,
): TeletextReaderState {
  if (!isTeletextPage(page) || page === state.page) {
    return clearTeletextEntry(state)
  }
  return {
    ...state,
    page,
    subpage: 0,
    entry: '',
    history: [...state.history, state.page],
  }
}

export function backTeletext(state: TeletextReaderState): TeletextReaderState {
  const page = state.history.at(-1)
  if (page === undefined) return clearTeletextEntry(state)
  return {
    ...state,
    page,
    subpage: 0,
    entry: '',
    history: state.history.slice(0, -1),
  }
}

export function stepTeletextSubpage(
  state: TeletextReaderState,
  delta: number,
  total: number,
): TeletextReaderState {
  if (total <= 1) return state.subpage === 0 ? state : { ...state, subpage: 0 }
  const subpage = (state.subpage + delta + total) % total
  return { ...state, subpage }
}

export function setTeletextStatus(
  state: TeletextReaderState,
  status: TeletextReaderStatus,
  message: string | null = null,
): TeletextReaderState {
  return { ...state, status, message }
}

export function teletextEntryLabel(state: Pick<TeletextReaderState, 'entry'>): string {
  return state.entry ? `P${state.entry.padEnd(3, '\u00b7')}` : ''
}
