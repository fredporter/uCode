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

  describe('defaultDispatcher BBC BASIC extended syntax', () => {
    it('handles TELETEXT.PAGE navigation', async () => {
      const bridge = new RuntimeBridge()
      let nav: unknown = null
      let output: unknown = null
      bridge.on('teletext-navigate', (p) => { nav = p })
      bridge.on('command-output', (o) => { output = o })

      await bridge.sendCommand('TELETEXT.PAGE 300')
      expect(nav).toBe(300)
      expect(output).toBe('Loading page 300...')

      await bridge.sendCommand('TELETEXT.PAGE')
      expect(output).toBe('Usage: TELETEXT.PAGE <page number>')
    })

    it('handles VAULT.OPEN and VAULT.LIST verbs', async () => {
      const bridge = new RuntimeBridge()
      let output: unknown = null
      bridge.on('command-output', (o) => { output = o })

      await bridge.sendCommand('VAULT.LIST')
      expect(Array.isArray(output)).toBe(true)
      expect(output).toContain('Vault Documents & Keys:')

      await bridge.sendCommand('VAULT.OPEN notes/tasks.md')
      expect(output).toBe('Opened vault document: notes/tasks.md')

      await bridge.sendCommand('VAULT.OPEN')
      expect(output).toBe('Usage: VAULT.OPEN <path>')
    })

    it('handles CAPSULE.LIST, CAPSULE.GET, and CAPSULE.RUN verbs', async () => {
      const bridge = new RuntimeBridge()
      let output: unknown = null
      bridge.on('command-output', (o) => { output = o })

      await bridge.sendCommand('CAPSULE.LIST')
      expect(Array.isArray(output)).toBe(true)
      expect((output as string[]).some((line) => line.includes('nethack'))).toBe(true)

      await bridge.sendCommand('CAPSULE.GET hero_x')
      expect(output).toBe('CAPSULE symbol hero_x = 0')

      await bridge.sendCommand('CAPSULE.GET nethack hero_hp')
      expect(output).toBe('CAPSULE [nethack] symbol hero_hp = 0')

      await bridge.sendCommand('CAPSULE.RUN nethack')
      expect(output).toBe("Launching capsule 'nethack'...")

      await bridge.sendCommand('CAPSULE.RUN')
      expect(output).toBe('Usage: CAPSULE.RUN <capsule_id>')
    })
  })
})
