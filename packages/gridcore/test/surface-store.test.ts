import { describe, expect, it } from 'vitest'
import { SurfaceStore, TABS } from '../src/surface/surface-store'

describe('SurfaceStore', () => {
  it('manages the active tab', () => {
    const s = new SurfaceStore()
    expect(s.getActiveTab()).toBe('terminal')
    s.setActiveTab('grid')
    expect(s.getActiveTab()).toBe('grid')
  })

  it('navigates to teletext with a pending page', () => {
    const s = new SurfaceStore()
    s.navigateToTeletext(400)
    expect(s.getActiveTab()).toBe('teletext')
    expect(s.consumeTeletextPage()).toBe(400)
    expect(s.consumeTeletextPage()).toBeNull()
  })

  it('notifies subscribers on tab change', () => {
    const s = new SurfaceStore()
    let count = 0
    const unsub = s.subscribe(() => count++)
    s.setActiveTab('layer')
    expect(count).toBe(1)
    unsub()
    s.setActiveTab('pixel')
    expect(count).toBe(1)
  })

  it('holds editors sized to the store', () => {
    const s = new SurfaceStore({ cols: 40, rows: 25 })
    expect(s.gridEditor.cols).toBe(40)
    expect(s.gridEditor.rows).toBe(25)
    expect(s.pixelEditor.size).toBe(24)
    expect(s.layerComposer.list()).toEqual([])
  })

  it('exposes the five tab ids', () => {
    expect(TABS).toEqual(['terminal', 'teletext', 'pixel', 'grid', 'layer'])
  })
})
