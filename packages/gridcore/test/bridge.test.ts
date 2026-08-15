import { describe, expect, it } from 'vitest'
import { RuntimeBridge } from '../src/bridge/runtime-bridge'
import type { TeletextPage } from '../src/teletext/teletext-surface'

const PAGE: TeletextPage = {
  page: 100,
  title: 'Test Page',
  header: 'uCode CEEFAX 100  Test',
  content: ['Line 1'],
  fasttext: [],
}

describe('RuntimeBridge', () => {
  it('dispatches commands through the injected dispatcher', async () => {
    const seen: string[] = []
    const bridge = new RuntimeBridge({
      dispatcher: (cmd) => {
        seen.push(cmd)
        return { output: 'ok:' + cmd }
      },
    })
    let emitted: unknown = null
    bridge.on('command-output', (o) => { emitted = o })

    await bridge.sendCommand('HELP')
    expect(seen).toEqual(['HELP'])
    expect(emitted).toBe('ok:HELP')
  })

  it('emits teletext-navigate when the dispatcher returns a page', async () => {
    const bridge = new RuntimeBridge({
      dispatcher: () => ({ output: 'Loading...', teletextPage: 400 }),
    })
    let nav: unknown = null
    bridge.on('teletext-navigate', (p) => { nav = p })

    await bridge.sendCommand('CEEFAX 400')
    expect(nav).toBe(400)
  })

  it('loads teletext pages via the injected loader', async () => {
    const bridge = new RuntimeBridge({
      teletextLoader: (n) => (n === 100 ? PAGE : null),
    })
    expect(await bridge.loadTeletextPage(100)).toBe(PAGE)
    expect(await bridge.loadTeletextPage(999)).toBeNull()
  })

  it('returns null when no loader and no process bridge', async () => {
    const bridge = new RuntimeBridge()
    expect(await bridge.loadTeletextPage(100)).toBeNull()
  })

  it('returns null grid state without a process bridge', async () => {
    const bridge = new RuntimeBridge()
    expect(await bridge.getGridState()).toBeNull()
  })

  it('reports in-process mode by default', () => {
    expect(new RuntimeBridge().getMode()).toBe('in-process')
  })
})
