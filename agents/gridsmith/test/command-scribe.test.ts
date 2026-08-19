import { describe, expect, it } from 'vitest'
import { commandScribe } from '../src/tools/command-scribe'

describe('Command-Scribe', () => {
  const minerReport = {
    findings: {
      memory_map: [
        { label: 'SCORE', address: '0x1100', type: 'byte', description: 'Player score', confidence: 0.9 },
        { label: 'LIVES', address: '0x1101', type: 'byte', description: 'Lives remaining', confidence: 0.85 },
        { label: 'SHIP_STATUS', address: '0x0222', type: 'byte', description: 'Ship docking status', confidence: 0.95 },
        { label: 'INVENTORY', address: '0x0240', type: 'array', description: 'Cargo inventory', confidence: 0.8, length: 12 },
      ],
      functions: [
        { name: 'DockShip', address: '0x1200', description: 'Execute docking sequence' },
        { name: 'JumpWarp', address: '0x1500', description: 'Hyperspace jump' },
        { name: 'MainLoop', address: '0x0400', description: 'Main game loop' },
      ],
    },
  }

  it('generates control commands from Source-Miner report', () => {
    const result = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: ['space_trading', 'combat'] },
      source_miner_report: minerReport,
    })

    expect(result.skill).toBe('Command-Scribe')
    expect(result.version).toBe('1.0')
    expect(result.program).toBe('Elite')
    expect(result.commands.length).toBeGreaterThan(0)
  })

  it('generates save command with state keys', () => {
    const result = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: [] },
      source_miner_report: minerReport,
    })

    const saveCmd = result.commands.find((c) => c.name === 'elite_save')
    expect(saveCmd).toBeDefined()
    expect(saveCmd?.action).toBe('lens_capture')
    expect(saveCmd?.parameters.slot).toBeDefined()
    expect(saveCmd?.payload.keys).toContain('score')
    expect(saveCmd?.payload.keys).toContain('lives')
  })

  it('generates load command', () => {
    const result = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: [] },
      source_miner_report: minerReport,
    })

    const loadCmd = result.commands.find((c) => c.name === 'elite_load')
    expect(loadCmd).toBeDefined()
    expect(loadCmd?.action).toBe('lens_restore')
    expect(loadCmd?.payload.scope).toBe('elite_save')
  })

  it('generates status query command', () => {
    const result = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: [] },
      source_miner_report: minerReport,
    })

    const statusCmd = result.commands.find((c) => c.name === 'elite_status')
    expect(statusCmd).toBeDefined()
    expect(statusCmd?.action).toBe('lens_query')
    expect(statusCmd?.payload.method).toBe('capture_all')
  })

  it('generates pause command', () => {
    const result = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: [] },
      source_miner_report: minerReport,
    })

    const pauseCmd = result.commands.find((c) => c.name === 'elite_pause')
    expect(pauseCmd).toBeDefined()
    expect(pauseCmd?.action).toBe('emulator_control')
    expect(pauseCmd?.payload.command).toBe('toggle_pause')
  })

  it('generates inject commands for subroutines', () => {
    const result = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: [] },
      source_miner_report: minerReport,
    })

    // DockShip should generate an inject command
    const dockCmd = result.commands.find((c) => c.name === 'elite_dockship')
    expect(dockCmd).toBeDefined()
    expect(dockCmd?.action).toBe('control_inject')
    expect(dockCmd?.payload.address).toBe('0x1200')

    // JumpWarp should also generate one
    const jumpCmd = result.commands.find((c) => c.name === 'elite_jumpwarp')
    expect(jumpCmd).toBeDefined()
    expect(jumpCmd?.action).toBe('control_inject')
  })

  it('filters out low-confidence state keys', () => {
    const lowConfReport = {
      findings: {
        memory_map: [
          { label: 'LOW_CONF_VAR', address: '0x5000', type: 'byte', description: 'Unreliable', confidence: 0.3 },
          ...minerReport.findings.memory_map,
        ],
        functions: [],
      },
    }

    const result = commandScribe({
      program_name: 'Test',
      program_type: 'adapt-source',
      game_mechanics: { genre: [] },
      source_miner_report: lowConfReport,
    })

    const saveCmd = result.commands.find((c) => c.name === 'test_save')
    expect(saveCmd).toBeDefined()
    const keys = saveCmd?.payload.keys as string[]
    expect(keys).not.toContain('low_conf_var')
  })

  it('sanitizes program name for command prefix', () => {
    const result = commandScribe({
      program_name: 'Knight Orc',
      program_type: 'rewrite',
      game_mechanics: { genre: ['text_adventure'] },
      source_miner_report: { findings: { memory_map: [], functions: [] } },
    })

    // Should still generate standard commands
    expect(result.commands.some((c) => c.name === 'knight_orc_save')).toBe(true)
    expect(result.commands.some((c) => c.name === 'knight_orc_load')).toBe(true)
    expect(result.commands.some((c) => c.name === 'knight_orc_status')).toBe(true)
  })
})