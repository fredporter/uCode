import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { PythonProcessBridge } from '../src/bridge/python-process-bridge'

function hasPython(): boolean {
  try {
    execSync('python3 --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Skip the whole suite when no Python interpreter is available.
const describeBridge = hasPython() ? describe : describe.skip

describeBridge('PythonProcessBridge (integration)', () => {
  it('dispatches commands, loads teletext pages, and reads grid state', async () => {
    const proc = new PythonProcessBridge()
    const dispatch = await proc.start()

    const setResult = await dispatch('GRID SET 2 2 #')
    expect(setResult.output).toContain("Set (2,2)")

    const getResult = await dispatch('GRID GET 2 2')
    expect(getResult.output).toContain("(2,2) = '#'")

    const page = await proc.teletextPage(100)
    expect(page?.page).toBe(100)
    expect(page?.title).toContain('Main Index')

    const grid = await proc.gridState()
    expect(grid.width).toBeGreaterThan(0)
    expect(grid.height).toBeGreaterThan(0)

    proc.stop()
  }, 15000)
})
