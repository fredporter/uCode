import { describe, expect, it } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { sourceMiner } from '../src/tools/source-miner'
import { lensCraft } from '../src/tools/lens-craft'
import { commandScribe } from '../src/tools/command-scribe'

const TEST_DIR = join(tmpdir(), 'gridsmith-pipeline-test')

/**
 * End-to-end pipeline test:
 *   6502 Assembly → Source-Miner → LENS-Craft → Command-Scribe
 *
 * Uses a realistic Elite-style 6502 assembly fixture with:
 *   - Memory-mapped hardware registers
 *   - Game state variables (score, lives, ship status, inventory)
 *   - Subroutines (DockShip, JumpWarp, MainLoop)
 *   - Data structures (EnemyData)
 *   - Asset references (gfx/, text/)
 */
describe('End-to-End Skills Pipeline', () => {
  function setupE2eFixture(): void {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(TEST_DIR, { recursive: true })

    // Realistic Elite-style assembly with BeebAsm syntax
    writeFileSync(join(TEST_DIR, 'elite.asm'), `
      ORG &1100

      \\ Elite-style 6502 assembly for pipeline test

      \\ Memory-mapped addresses
      VIA_PORTB = &FE40
      VIA_PORTA = &FE41
      OSWRCH   = &FFEE
      OSBYTE   = &FFF4

      \\ Game state constants
      SCORE_ADDR      EQU &0900
      LIVES_ADDR      EQU &0904
      SHIP_STATUS     EQU &0920   ; 0=docked, 1=in flight, 2=docking
      CREDITS_LO      EQU &0940
      CREDITS_HI      EQU &0941
      INVENTORY_START EQU &0960

      \\ Entry point
      .MainEntry
      JSR InitGame
      JMP MainLoop

      \\ Initialize game state
      .InitGame
      LDA #3
      STA LIVES_ADDR      ; 3 lives
      LDA #0
      STA SCORE_ADDR      ; Score = 0
      STA SCORE_ADDR+1
      STA SHIP_STATUS     ; Docked
      LDA #&64            ; 100 decicredits = 10 credits
      STA CREDITS_LO
      LDA #0
      STA CREDITS_HI
      RTS

      \\ Main game loop
      .MainLoop
      JSR ProcessInput
      JSR UpdateUniverse
      JSR RenderView
      JMP MainLoop

      \\ Process player input
      .ProcessInput
      JSR OSBYTE
      RTS

      \\ Update universe state
      .UpdateUniverse
      JSR MoveShips
      JSR CheckDocking
      RTS

      \\ Render current view
      .RenderView
      RTS

      \\ Dock with station
      .DockShip
      LDA #2
      STA SHIP_STATUS      ; docking
      JSR AnimateDocking
      LDA #0
      STA SHIP_STATUS      ; docked
      RTS

      .AnimateDocking
      RTS

      \\ Hyperspace jump
      .JumpWarp
      LDA #1
      STA SHIP_STATUS      ; in flight
      JSR AnimateJump
      RTS

      .AnimateJump
      RTS

      \\ Move NPC ships
      .MoveShips
      RTS

      \\ Check if player is near station
      .CheckDocking
      RTS

      \\ Enemy ship data: 4 bytes per enemy, 8 enemies
      .EnemyData
      SKIP 32

      \\ Score display (16-bit BCD)
      .Score
      EQUB 0,0

      \\ Lives
      .Lives
      EQUB 3

      \\ Inventory: 12 commodity slots
      .Inventory
      EQUB 0,0,0,0,0,0,0,0,0,0,0,0
    `, 'utf-8')

    // Asset directories
    mkdirSync(join(TEST_DIR, 'gfx/sprites'), { recursive: true })
    mkdirSync(join(TEST_DIR, 'text'), { recursive: true })
    writeFileSync(join(TEST_DIR, 'gfx/sprites/adder.bin'), '')
    writeFileSync(join(TEST_DIR, 'gfx/sprites/cobra.bin'), '')
    writeFileSync(join(TEST_DIR, 'text/planet_descriptions.txt'), 'Lave is most famous for its vast rain forests.')
  }

  it('Source-Miner extracts memory map, functions, and assets', () => {
    setupE2eFixture()

    const minerResult = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: { scan_depth: 'full', target_patterns: ['*.asm'] },
    })

    // Memory map: should find EQU constants and data labels
    expect(minerResult.findings.memory_map.length).toBeGreaterThan(5)
    const shipStatus = minerResult.findings.memory_map.find((m) => m.label === 'SHIP_STATUS')
    expect(shipStatus).toBeDefined()
    expect(shipStatus?.address).toBe('0x0920')
    expect(shipStatus?.description).toMatch(/docked/)

    const score = minerResult.findings.memory_map.find((m) => m.label === 'SCORE_ADDR')
    expect(score).toBeDefined()

    const creditsLo = minerResult.findings.memory_map.find((m) => m.label === 'CREDITS_LO')
    expect(creditsLo).toBeDefined()

    // Functions: should find subroutines
    expect(minerResult.findings.functions.length).toBeGreaterThan(3)
    const funcNames = minerResult.findings.functions.map((f) => f.name)
    expect(funcNames).toContain('MainEntry')
    expect(funcNames).toContain('MainLoop')
    expect(funcNames).toContain('DockShip')
    expect(funcNames).toContain('JumpWarp')
    expect(funcNames).toContain('InitGame')

    // Data structures
    const enemyData = minerResult.findings.data_structures.find((s) => s.name === 'EnemyData')
    expect(enemyData).toBeDefined()
    expect(enemyData?.size).toBe(32)

    // Assets (must match the heuristics in source-miner.ts)
    const assetTypes = minerResult.findings.asset_references.map((a) => a.type)
    expect(assetTypes).toContain('sprite_data')
    expect(assetTypes).toContain('teletext_pages')

    // Recommendations: should generate actionable recommendations
    expect(minerResult.recommendations.length).toBeGreaterThan(0)
    const hasLensRecs = minerResult.recommendations.some((r) => r.action === 'create_lens_extractor')
    expect(hasLensRecs).toBe(true)
    const hasMcpRecs = minerResult.recommendations.some((r) => r.action === 'create_control_command')
    expect(hasMcpRecs).toBe(true)
    const hasSkinRecs = minerResult.recommendations.some((r) => r.action === 'create_skin_manifest')
    expect(hasSkinRecs).toBe(true)

    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('LENS-Craft generates Python extractor from Source-Miner output', () => {
    setupE2eFixture()

    // Step 1: Source-Miner
    const minerResult = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: { scan_depth: 'full', target_patterns: ['*.asm'] },
    })

    // Step 2: LENS-Craft
    const craftResult = lensCraft({
      source_miner_report: {
        source: TEST_DIR,
        findings: {
          memory_map: minerResult.findings.memory_map,
          functions: minerResult.findings.functions,
        },
      },
      emulator: { type: '6502', endianness: 'little' },
      output: {
        language: 'python',
        module_name: 'elite_lens',
        path: join(TEST_DIR, 'lens_output'),
      },
    })

    // Should generate extractors
    expect(craftResult.extractors.length).toBeGreaterThan(3)

    // Ship status should be detected as bitmask (has "status" in description)
    const shipExtractor = craftResult.extractors.find((e) => e.name.includes('ship_status'))
    expect(shipExtractor).toBeDefined()
    expect(shipExtractor?.type).toBe('bitmask')
    expect(shipExtractor?.labels?.['0']).toBe('docked')
    expect(shipExtractor?.labels?.['1']).toBe('in_flight')

    // Should have written file to disk
    expect(craftResult.written_to).toBeTruthy()
    const writtenPath = craftResult.written_to!
    const { readFileSync } = require('node:fs')
    const fileContent = readFileSync(writtenPath, 'utf-8')
    expect(fileContent).toMatch(/class EliteLensExtractor:/)
    expect(fileContent).toMatch(/def capture_all/)
    expect(fileContent).toMatch(/read_byte\(0x920\)/) // SHIP_STATUS address

    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('Command-Scribe generates commands from Source-Miner output', () => {
    setupE2eFixture()

    // Step 1: Source-Miner
    const minerResult = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: { scan_depth: 'full', target_patterns: ['*.asm'] },
    })

    // Step 2: Command-Scribe
    const scribeResult = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: ['space_trading', 'combat'] },
      source_miner_report: {
        findings: {
          memory_map: minerResult.findings.memory_map,
          functions: minerResult.findings.functions,
        },
      },
    })

    // Should have standard commands
    const cmdNames = scribeResult.commands.map((c) => c.name)
    expect(cmdNames).toContain('elite_save')
    expect(cmdNames).toContain('elite_load')
    expect(cmdNames).toContain('elite_status')
    expect(cmdNames).toContain('elite_pause')

    // Should have inject commands for subroutines
    expect(cmdNames).toContain('elite_dockship')
    expect(cmdNames).toContain('elite_jumpwarp')

    // Save command should include state keys from memory map
    const saveCmd = scribeResult.commands.find((c) => c.name === 'elite_save')
    const keys = saveCmd?.payload.keys as string[]
    expect(keys).toContain('ship_status')
    expect(keys).toContain('lives')

    // DockShip inject should reference correct address
    const dockCmd = scribeResult.commands.find((c) => c.name === 'elite_dockship')
    expect(dockCmd?.payload.address).toBeTruthy()

    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('full pipeline: Source-Miner → LENS-Craft → Command-Scribe in sequence', () => {
    setupE2eFixture()

    // Step 1: Mine the assembly source
    const minerResult = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: { scan_depth: 'full', target_patterns: ['*.asm'] },
    })

    expect(minerResult.skill).toBe('Source-Miner')

    // Step 2: Generate Python LENS extractor
    const craftResult = lensCraft({
      source_miner_report: {
        source: TEST_DIR,
        findings: {
          memory_map: minerResult.findings.memory_map,
          functions: minerResult.findings.functions,
        },
      },
      emulator: { type: '6502', endianness: 'little' },
      output: {
        language: 'python',
        module_name: 'elite_lens',
      },
    })

    expect(craftResult.skill).toBe('LENS-Craft')
    expect(craftResult.extractors.length).toBeGreaterThan(0)

    // Step 3: Generate control command specs
    const scribeResult = commandScribe({
      program_name: 'Elite',
      program_type: 'adapt-source',
      game_mechanics: { genre: ['space_trading', 'combat'] },
      source_miner_report: {
        findings: {
          memory_map: minerResult.findings.memory_map,
          functions: minerResult.findings.functions,
        },
      },
    })

    expect(scribeResult.skill).toBe('Command-Scribe')
    expect(scribeResult.commands.length).toBeGreaterThan(4)

    // The pipeline produces consistent results:
    // - Memory map from Source-Miner feeds LENS-Craft extractors
    // - Same memory map feeds Command-Scribe state keys
    const memoryLabels = minerResult.findings.memory_map
      .filter((m) => m.confidence >= 0.7)
      .map((m) => m.label)

    const extractorNames = craftResult.extractors.map((e) => e.name)
    // Extractors should reference labels from memory map
    const hasShipStatus = extractorNames.some((n) => n.includes('ship_status'))
    expect(hasShipStatus).toBe(true)

    const saveKeys = (scribeResult.commands.find((c) => c.name === 'elite_save')?.payload.keys as string[]) || []
    // Save keys should reference labels from memory map
    const hasShipStatusKey = saveKeys.some((k) => k.includes('ship_status'))
    expect(hasShipStatusKey).toBe(true)

    rmSync(TEST_DIR, { recursive: true, force: true })
  })
})