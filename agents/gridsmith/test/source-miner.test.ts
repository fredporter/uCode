import { describe, expect, it } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { sourceMiner } from '../src/tools/source-miner'

const TEST_DIR = join(tmpdir(), 'gridsmith-source-miner-test')

function createFixture(relPath: string, content: string): void {
  const fullPath = join(TEST_DIR, relPath)
  const dir = fullPath.split('/').slice(0, -1).join('/')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

function cleanup(): void {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true })
  } catch {
    // OK if it doesn't exist
  }
}

function setupFixtures(): void {
  cleanup()
  mkdirSync(TEST_DIR, { recursive: true })

  createFixture('src/main.asm', `
    ORG &1100

    \\ Main game initialization
    .MainInit
    LDA #0
    STA SCORE_LOW
    STA SCORE_HIGH
    STA LIVES
    JSR InitDisplay
    RTS

    \\ Score (16-bit BCD)
    .SCORE_LOW
    EQUB 0
    .SCORE_HIGH
    EQUB 0

    \\ Number of lives
    .LIVES
    EQUB 3

    \\ Ship status: 0=docked, 1=in flight
    SHIP_STATUS EQU $0222

    \\ Init display hardware
    .InitDisplay
    LDA #7
    LDX #0
    .loop
    STA &7C00,X
    INX
    BNE loop
    RTS

    \\ Main game loop
    .MainLoop
    JSR UpdateEnemies
    JSR MovePlayer
    JSR CheckCollision
    BNE .gameOver
    JMP MainLoop

    .gameOver
    DEC LIVES
    BNE MainLoop
    RTS

    \\ Update enemy positions
    .UpdateEnemies
    LDX #3
    .enemyLoop
    JSR MoveEnemy
    DEX
    BNE enemyLoop
    RTS

    .MovePlayer
    RTS

    .CheckCollision
    LDA #0
    RTS

    .MoveEnemy
    RTS
  `)

  createFixture('src/data.asm', `
    ORG &2000

    \\ Enemy data structure
    .EnemyData
    SKIP 64

    \\ Level layout
    .LevelMap
    EQUB 1,1,1,1,1,1,1,1,1,1
    EQUB 1,0,0,0,0,0,0,0,0,1
    EQUB 1,0,2,0,3,0,0,0,0,1
    EQUB 1,0,0,0,0,0,1,0,0,1
    EQUB 1,1,1,1,1,1,1,1,1,1

    \\ Time remaining
    TIME_REMAINING EQU $0240
  `)

  createFixture('gfx/sprites/ship.spr', '')
  createFixture('maps/level1.bin', '')
  createFixture('text/intro.txt', 'Welcome to Repton!')
}

describe('SourceMiner', () => {
  it('scans assembly files and extracts memory map entries', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: {
        scan_depth: 'full',
        target_patterns: ['*.asm'],
      },
    })

    expect(result.findings.memory_map.length).toBeGreaterThan(0)

    // Should find EQU constants
    const shipStatus = result.findings.memory_map.find((m) => m.label === 'SHIP_STATUS')
    expect(shipStatus).toBeDefined()
    expect(shipStatus?.address).toBe('0x0222')
    expect(shipStatus?.description).toMatch(/docked/)

    const timeRemaining = result.findings.memory_map.find((m) => m.label === 'TIME_REMAINING')
    expect(timeRemaining).toBeDefined()
    expect(timeRemaining?.address).toBe('0x0240')

    // Should find data labels
    const scoreLow = result.findings.memory_map.find((m) => m.label === 'SCORE_LOW')
    expect(scoreLow).toBeDefined()

    const lives = result.findings.memory_map.find((m) => m.label === 'LIVES')
    expect(lives).toBeDefined()

    cleanup()
  })

  it('extracts functions from assembly labels followed by opcodes', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: {
        scan_depth: 'full',
        target_patterns: ['*.asm'],
      },
    })

    const mainInit = result.findings.functions.find((f) => f.name === 'MainInit')
    expect(mainInit).toBeDefined()

    const mainLoop = result.findings.functions.find((f) => f.name === 'MainLoop')
    expect(mainLoop).toBeDefined()

    const initDisplay = result.findings.functions.find((f) => f.name === 'InitDisplay')
    expect(initDisplay).toBeDefined()

    const updateEnemies = result.findings.functions.find((f) => f.name === 'UpdateEnemies')
    expect(updateEnemies).toBeDefined()

    cleanup()
  })

  it('detects data structures from SKIP/RES directives', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: {
        scan_depth: 'full',
        target_patterns: ['*.asm'],
      },
    })

    const enemyData = result.findings.data_structures.find((s) => s.name === 'EnemyData')
    expect(enemyData).toBeDefined()
    expect(enemyData?.size).toBe(64)

    cleanup()
  })

  it('detects asset references in source tree', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: {
        scan_depth: 'full',
        target_patterns: ['*.asm'],
      },
    })

    expect(result.findings.asset_references.length).toBeGreaterThan(0)

    const hasSprites = result.findings.asset_references.some((a) => a.type === 'sprite_data')
    expect(hasSprites).toBe(true)

    const hasMaps = result.findings.asset_references.some((a) => a.type === 'map_data')
    expect(hasMaps).toBe(true)

    const hasText = result.findings.asset_references.some((a) => a.type === 'teletext_pages')
    expect(hasText).toBe(true)

    cleanup()
  })

  it('generates recommendations for game state variables', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: {
        scan_depth: 'full',
        target_patterns: ['*.asm'],
      },
    })

    expect(result.recommendations.length).toBeGreaterThan(0)

    // Should recommend LENS extractor for state variables
    const lensRecs = result.recommendations.filter((r) => r.action === 'create_lens_extractor')
    expect(lensRecs.length).toBeGreaterThan(0)

    // Should recommend control command for subroutines
    const controlRecs = result.recommendations.filter((r) => r.action === 'create_control_command')
    expect(controlRecs.length).toBeGreaterThan(0)

    // Should recommend SKIN for assets
    const skinRec = result.recommendations.find((r) => r.action === 'create_skin_manifest')
    expect(skinRec).toBeDefined()

    cleanup()
  })

  it('output conforms to Source-Miner schema', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: TEST_DIR, language: ['6502'] },
      options: {
        scan_depth: 'full',
        target_patterns: ['*.asm'],
      },
    })

    expect(result.skill).toBe('Source-Miner')
    expect(result.version).toBe('1.0')
    expect(result.executed_at).toBeTruthy()
    expect(result.source).toBeTruthy()
    expect(Array.isArray(result.findings.memory_map)).toBe(true)
    expect(Array.isArray(result.findings.functions)).toBe(true)
    expect(Array.isArray(result.findings.data_structures)).toBe(true)
    expect(Array.isArray(result.findings.asset_references)).toBe(true)
    expect(Array.isArray(result.recommendations)).toBe(true)

    // Verify memory map entry schema
    if (result.findings.memory_map.length > 0) {
      const entry = result.findings.memory_map[0]
      expect(typeof entry.label).toBe('string')
      expect(typeof entry.address).toBe('string')
      expect(typeof entry.type).toBe('string')
      expect(typeof entry.description).toBe('string')
      expect(typeof entry.confidence).toBe('number')
      expect(entry.confidence).toBeGreaterThanOrEqual(0)
      expect(entry.confidence).toBeLessThanOrEqual(1)
    }

    // Verify function entry schema
    if (result.findings.functions.length > 0) {
      const fn = result.findings.functions[0]
      expect(typeof fn.name).toBe('string')
      expect(typeof fn.address).toBe('string')
      expect(typeof fn.description).toBe('string')
      expect(Array.isArray(fn.parameters)).toBe(true)
    }

    // Verify recommendation schema
    if (result.recommendations.length > 0) {
      const rec = result.recommendations[0]
      expect(typeof rec.action).toBe('string')
      expect(typeof rec.target).toBe('string')
      expect(['high', 'medium', 'low']).toContain(rec.priority)
      expect(typeof rec.rationale).toBe('string')
    }

    cleanup()
  })

  it('handles single file scans', () => {
    setupFixtures()

    const result = sourceMiner({
      source: { type: 'local_path', url: join(TEST_DIR, 'src/main.asm'), language: ['6502'] },
      options: { scan_depth: 'full' },
    })

    expect(result.findings.functions.length).toBeGreaterThan(0)
    cleanup()
  })

  it('throws for non-existent path', () => {
    expect(() =>
      sourceMiner({
        source: { type: 'local_path', url: '/nonexistent/path/12345', language: ['6502'] },
        options: { scan_depth: 'full' },
      }),
    ).toThrow(/not found/)
  })

  it('handles empty directories gracefully', () => {
    const emptyDir = join(TEST_DIR, 'empty-dir')
    mkdirSync(emptyDir, { recursive: true })

    const result = sourceMiner({
      source: { type: 'local_path', url: emptyDir, language: ['6502'] },
      options: { scan_depth: 'full', target_patterns: ['*.asm'] },
    })

    expect(result.findings.memory_map.length).toBe(0)
    expect(result.findings.functions.length).toBe(0)
    expect(result.recommendations.length).toBe(0)
    cleanup()
  })
})