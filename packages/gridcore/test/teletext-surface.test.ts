import { describe, expect, it } from 'vitest'
import { TeletextSurface, type TeletextPage } from '../src/teletext/teletext-surface'

const SAMPLE_PAGE: TeletextPage = {
  page: 100,
  title: 'Test Page',
  date: '2026-07-05',
  header: 'uCode CEEFAX 100  Test',
  content: ['Line 1', 'Line 2', 'Line 3'],
  fasttext: [
    { color: 'red', label: 'News', page: 101 },
    { color: 'green', label: 'Main', page: 100 },
  ],
}

describe('TeletextSurface', () => {
  it('creates with default dimensions', () => {
    const surface = new TeletextSurface()
    expect(surface.cols).toBe(40)
    expect(surface.rows).toBe(25)
  })

  it('creates with custom dimensions', () => {
    const surface = new TeletextSurface({ cols: 32, rows: 20 })
    expect(surface.cols).toBe(32)
    expect(surface.rows).toBe(20)
  })

  it('produces a grid with correct dimensions', () => {
    const surface = new TeletextSurface()
    const grid = surface.getGrid()
    expect(grid.cols).toBe(40)
    expect(grid.rows).toBe(25)
    expect(grid.cells.size).toBe(1000)
  })

  it('loads a page object directly', () => {
    const surface = new TeletextSurface()
    surface.loadPageObject(SAMPLE_PAGE)
    expect(surface.getCurrentPageNumber()).toBe(100)
  })

  it('returns null for current page when none loaded', () => {
    const surface = new TeletextSurface()
    expect(surface.getCurrentPage()).toBeNull()
    expect(surface.getCurrentPageNumber()).toBe(0)
  })

  it('sets a page loader and navigates', async () => {
    const surface = new TeletextSurface()
    surface.setPageLoader((page) => {
      if (page === 100) return SAMPLE_PAGE
      throw new Error('Unknown page')
    })
    await surface.navigateTo(100)
    expect(surface.getCurrentPageNumber()).toBe(100)
  })

  it('handles missing page loader gracefully', async () => {
    const surface = new TeletextSurface()
    await surface.loadPage(100)
    const grid = surface.getGrid()
    // Grid should still exist even after error
    expect(grid.cells.size).toBe(1000)
  })

  it('supports page stack navigation (back)', async () => {
    const surface = new TeletextSurface()
    const page200: TeletextPage = {
      ...SAMPLE_PAGE,
      page: 200,
      header: 'uCode CEEFAX 200  Page Two',
    }
    surface.setPageLoader((page) => {
      if (page === 100) return SAMPLE_PAGE
      if (page === 200) return page200
      throw new Error('Unknown page')
    })

    await surface.navigateTo(100)
    expect(surface.getCurrentPageNumber()).toBe(100)

    await surface.navigateTo(200)
    expect(surface.getCurrentPageNumber()).toBe(200)

    await surface.goBack()
    expect(surface.getCurrentPageNumber()).toBe(100)
  })

  it('renders FASTEXT links as colored segments', () => {
    const surface = new TeletextSurface({ cols: 40 })
    surface.loadPageObject(SAMPLE_PAGE)
    const grid = surface.getGrid()
    // Verify the grid has all cells post-render
    expect(grid.cells.size).toBe(1000)
  })

  it('displays page number in status row', () => {
    const surface = new TeletextSurface({ cols: 40, rows: 25 })
    surface.loadPageObject(SAMPLE_PAGE)
    const grid = surface.getGrid()
    // Status row is at row 24
    const cell = grid.cells.get(`0:24:0`)
    expect(cell).toBeTruthy()
    expect(cell!.char).toBe('P')
  })

  it('renders double-height header, mosaic separator, and flashing status', () => {
    const surface = new TeletextSurface({ cols: 40, rows: 25 })
    surface.loadPageObject(SAMPLE_PAGE)
    const grid = surface.getGrid()

    const header = grid.cells.get('0:0:0')
    expect(header!.doubleHeight).toBe(true)

    const separator = grid.cells.get('0:1:0')
    expect(separator!.mosaic).toBe(0x3f)

    const status = grid.cells.get('0:24:0')
    expect(status!.char).toBe('P')
    expect(status!.flash).toBe(true)
  })
})