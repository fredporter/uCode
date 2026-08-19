import { describe, expect, it } from 'vitest'
import { inspireEngine } from '../src/tools/inspire-engine'

describe('Inspire-Engine', () => {
  it('generates GDD for Knight Orc', () => {
    const result = inspireEngine({
      target_game: 'Knight Orc',
      approach: 'rewrite_inspired_by',
      research_sources: [
        { type: 'wikipedia', url: 'https://en.wikipedia.org/wiki/Knight_Orc', reliability: 'high' },
      ],
      design_constraints: {
        target_runtime: 'bbc_basic_sdl',
        display_mode: 'teletext',
      },
    })

    expect(result.skill).toBe('Inspire-Engine')
    expect(result.version).toBe('1.0')
    expect(result.target_game).toBe('Knight Orc')
    expect(result.game_design_document.title).toMatch(/Knight Orc/)
    expect(result.game_design_document.genre).toContain('text_adventure')
    expect(result.game_design_document.genre).toContain('fantasy')
    expect(result.game_design_document.summary).toBeTruthy()

    // Core mechanics
    const mechanics = result.game_design_document.core_mechanics
    expect(mechanics.length).toBeGreaterThan(0)

    const parser = mechanics.find((m) => m.name === 'text_parser')
    expect(parser).toBeDefined()
    expect(parser?.vocabulary_size).toMatch(/200/)

    const npc = mechanics.find((m) => m.name === 'npc_schedules')
    expect(npc).toBeDefined()
    expect(npc?.implementation).toMatch(/Tick-based/)

    const magic = mechanics.find((m) => m.name === 'magic_system')
    expect(magic).toBeDefined()
    expect(magic?.spells?.length).toBe(5)

    const world = mechanics.find((m) => m.name === 'world_model')
    expect(world).toBeDefined()
    expect(world?.locations?.length).toBe(9)

    // Effort estimate
    expect(result.effort_estimate.total_weeks).toBe(10)
    expect(result.effort_estimate.breakdown.core_engine).toBe(3)
    expect(result.effort_estimate.breakdown.npc_system).toBe(2)

    // uCode integration
    const integration = result.game_design_document.uCode_integration
    expect(integration.lens_extractors.length).toBeGreaterThan(0)
    expect(integration.skin_themes.length).toBeGreaterThan(0)
    expect(integration.control_commands.length).toBeGreaterThan(0)

    const lensTargets = integration.lens_extractors.map((l) => l.target)
    expect(lensTargets).toContain('player_location')
    expect(lensTargets).toContain('game_time')
    expect(lensTargets).toContain('npc_statuses')

    const skinNames = integration.skin_themes.map((s) => s.name)
    expect(skinNames).toContain('dark_fantasy')

    const cmdNames = integration.control_commands.map((c) => c.name)
    expect(cmdNames).toContain('knight_orc_time_skip')
  })

  it('generates GDD for Apple Panic', () => {
    const result = inspireEngine({
      target_game: 'Apple Panic',
      approach: 'rewrite_inspired_by',
      research_sources: [],
      design_constraints: {
        target_runtime: 'bbc_basic_sdl',
        display_mode: 'teletext',
      },
    })

    expect(result.game_design_document.genre).toContain('platformer')
    expect(result.game_design_document.genre).toContain('arcade')

    const digging = result.game_design_document.core_mechanics.find((m) => m.name === 'digging_system')
    expect(digging).toBeDefined()
    expect(digging?.constraints?.length).toBeGreaterThan(0)

    expect(result.effort_estimate.total_weeks).toBe(2)

    // Platformer-specific LENS targets
    const lensTargets = result.game_design_document.uCode_integration.lens_extractors.map((l) => l.target)
    expect(lensTargets).toContain('player_x')
    expect(lensTargets).toContain('player_y')
    expect(lensTargets).toContain('lives')
    expect(lensTargets).toContain('level')

    const cmdNames = result.game_design_document.uCode_integration.control_commands.map((c) => c.name)
    expect(cmdNames).toContain('apple_panic_level_select')
  })

  it('generates GDD for uConstruct', () => {
    const result = inspireEngine({
      target_game: 'uConstruct',
      approach: 'rewrite_inspired_by',
      research_sources: [],
      design_constraints: {
        target_runtime: 'bbc_basic_sdl',
        display_mode: 'teletext',
      },
    })

    expect(result.game_design_document.genre).toContain('construction')
    expect(result.game_design_document.genre).toContain('simulation')
    expect(result.effort_estimate.total_weeks).toBe(10)

    // Resource LENS targets
    const lensTargets = result.game_design_document.uCode_integration.lens_extractors.map((l) => l.target)
    expect(lensTargets).toContain('stone')
    expect(lensTargets).toContain('wood')
    expect(lensTargets).toContain('gold')
    expect(lensTargets).toContain('food')
    expect(lensTargets).toContain('room_count')

    const cmdNames = result.game_design_document.uCode_integration.control_commands.map((c) => c.name)
    expect(cmdNames).toContain('uconstruct_export_map')
  })

  it('matches target game with case-insensitive partial match', () => {
    const result = inspireEngine({
      target_game: 'knight orc',
      approach: 'rewrite_inspired_by',
      research_sources: [],
      design_constraints: {
        target_runtime: 'bbc_basic_sdl',
        display_mode: 'teletext',
      },
    })

    expect(result.target_game).toBe('knight orc')
    expect(result.game_design_document.title).toMatch(/Knight Orc/)
  })

  it('generates uCode integration with all three sections', () => {
    const result = inspireEngine({
      target_game: 'Knight Orc',
      approach: 'rewrite_inspired_by',
      research_sources: [],
      design_constraints: {
        target_runtime: 'bbc_basic_sdl',
        display_mode: 'teletext',
      },
    })

    const integration = result.game_design_document.uCode_integration
    expect(integration.lens_extractors).toBeDefined()
    expect(integration.skin_themes).toBeDefined()
    expect(integration.control_commands).toBeDefined()

    // All lens extractors should have required fields
    for (const lens of integration.lens_extractors) {
      expect(lens.target).toBeTruthy()
      expect(lens.type).toBeTruthy()
      expect(lens.description).toBeTruthy()
    }

    // All control commands should have name and description
    for (const cmd of integration.control_commands) {
      expect(cmd.name).toBeTruthy()
      expect(cmd.description).toBeTruthy()
    }
  })

  it('throws for unknown game', () => {
    expect(() =>
      inspireEngine({
        target_game: 'TotallyUnknownGame123',
        approach: 'rewrite_inspired_by',
        research_sources: [],
        design_constraints: {
          target_runtime: 'bbc_basic_sdl',
          display_mode: 'teletext',
        },
      }),
    ).toThrow(/No built-in game design template/)
  })
})