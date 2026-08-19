// ---------------------------------------------------------------------------
// Types (aligned with SKILLS_FRAMEWORK.md §5)
// ---------------------------------------------------------------------------

export interface ResearchSource {
  type: 'mobygames' | 'wikipedia' | 'forum_thread' | 'review' | 'wiki' | 'manual' | 'let_s_play'
  url: string
  reliability: 'high' | 'medium' | 'low'
}

export interface DesignConstraints {
  target_runtime: string
  display_mode: string
  max_program_size?: string
}

export interface InspireEngineInput {
  target_game: string
  approach: 'rewrite_inspired_by'
  research_sources: ResearchSource[]
  design_constraints: DesignConstraints
}

export interface CoreMechanic {
  name: string
  description: string
  constraints?: string[]
  implementation?: string
  vocabulary_size?: string
  spells?: Array<{ name: string; cost: number; effect: string; learn_location?: string }>
  locations?: Array<{ id: string; name: string; exits: string[] }>
}

export interface LensExtractorTarget {
  target: string
  type: string
  description: string
}

export interface SkinThemeTarget {
  name: string
  description: string
}

export interface ControlCommandTarget {
  name: string
  description: string
}

export interface UCodeIntegration {
  lens_extractors: LensExtractorTarget[]
  skin_themes: SkinThemeTarget[]
  control_commands: ControlCommandTarget[]
}

export interface GameDesignDocument {
  title: string
  genre: string[]
  summary: string
  core_mechanics: CoreMechanic[]
  uCode_integration: UCodeIntegration
}

export interface EffortEstimate {
  total_weeks: number
  breakdown: Record<string, number>
}

export interface InspireEngineOutput {
  skill: 'Inspire-Engine'
  version: '1.0'
  executed_at: string
  target_game: string
  game_design_document: GameDesignDocument
  effort_estimate: EffortEstimate
}

// ---------------------------------------------------------------------------
// Built-in game knowledge (curated from spec universe)
// ---------------------------------------------------------------------------

interface GameTemplate {
  title: string
  genre: string[]
  summary: string
  core_mechanics: CoreMechanic[]
  effort: EffortEstimate
}

const GAME_TEMPLATES: Record<string, GameTemplate> = {
  'knight orc': {
    title: 'Knight Orc (uCode Adaptation)',
    genre: ['text_adventure', 'fantasy'],
    summary: 'You are Grindleguts, an orc seeking revenge in a fantasy/sci-fi world. The game features a real-time NPC schedule system unique to the KAOS engine.',
    core_mechanics: [
      {
        name: 'text_parser',
        description: 'Standard text adventure parser supporting VERB NOUN grammar',
        constraints: ['max 2 words per command', 'abbreviation support (N=North, X=Examine, I=Inventory)'],
        vocabulary_size: '~200 words (60 verbs, 140 nouns/adjectives)',
      },
      {
        name: 'npc_schedules',
        description: 'NPCs follow daily routines independent of player actions. Time advances with player actions.',
        implementation: 'Tick-based time system. Each NPC has a schedule array: [location, time_start, time_end, action]',
        constraints: ['Clock resolution: 1 tick per command', 'Day/night cycle: 24 ticks (1 tick = 1 in-game hour)'],
      },
      {
        name: 'magic_system',
        description: 'Spell casting with mana cost and component requirements',
        spells: [
          { name: 'BLAST', cost: 5, effect: 'damage_target', learn_location: 'wizard_tower' },
          { name: 'HEAL', cost: 3, effect: 'restore_health', learn_location: 'healer_hut' },
          { name: 'SHIELD', cost: 4, effect: 'temporary_defense', learn_location: 'wizard_tower' },
          { name: 'INVIS', cost: 8, effect: 'avoid_combat', learn_location: 'thieves_guild' },
          { name: 'LIGHT', cost: 2, effect: 'illuminate_dark_rooms', learn_location: 'general_store' },
        ],
      },
      {
        name: 'world_model',
        description: 'Multi-location world with movable objects and NPCs',
        locations: [
          { id: 'orc_camp', name: 'Orc Camp', exits: ['north=dark_forest'] },
          { id: 'dark_forest', name: 'Dark Forest', exits: ['south=orc_camp', 'east=wizard_tower', 'north=castle_gate'] },
          { id: 'wizard_tower', name: "Wizard's Tower", exits: ['west=dark_forest'] },
          { id: 'castle_gate', name: 'Castle Gate', exits: ['south=dark_forest', 'north=courtyard'] },
          { id: 'courtyard', name: 'Castle Courtyard', exits: ['south=castle_gate', 'north=throne_room'] },
          { id: 'throne_room', name: 'Throne Room', exits: ['south=courtyard'] },
          { id: 'healer_hut', name: "Healer's Hut", exits: ['east=orc_camp'] },
          { id: 'thieves_guild', name: "Thieves' Guild", exits: ['west=dark_forest'] },
          { id: 'general_store', name: 'General Store', exits: ['north=orc_camp'] },
        ],
      },
      {
        name: 'combat_system',
        description: 'Turn-based combat with hit points, armor class, and weapon modifiers',
        constraints: ['Player HP: 20-50 based on class', 'Weapon damage: 1d4 (fists) to 3d6 (battle axe)', 'Enemy AC reduces hit probability'],
      },
    ],
    effort: {
      total_weeks: 10,
      breakdown: {
        core_engine: 3,
        parser_and_vocabulary: 1,
        world_building: 2,
        npc_system: 2,
        magic_system: 1,
        testing: 1,
      },
    },
  },
  'apple panic': {
    title: 'Apple Panic (uCode Adaptation)',
    genre: ['platformer', 'arcade'],
    summary: 'Dig through platforms to trap enemies and collect treasure. Inspired by the classic 1981 Apple II game Space Panic. Single-screen arcade action with progressive difficulty.',
    core_mechanics: [
      {
        name: 'digging_system',
        description: 'Player digs holes in platforms. Enemies fall through holes and are temporarily trapped. Fill holes to eliminate trapped enemies.',
        constraints: ['Max 3 holes at once', 'Holes auto-fill after 5 seconds', 'Enemies trapped for 3 seconds'],
      },
      {
        name: 'ladder_movement',
        description: 'Player moves between platform levels using ladders. 5 platform levels stacked vertically.',
        constraints: ['Player can only climb when aligned with ladder', 'Cannot dig while on ladder'],
      },
      {
        name: 'enemy_ai',
        description: 'Simple patrol AI. Enemies walk left-right on platforms until they encounter a hole or the player.',
        implementation: 'State machine: PATROL → FALL → TRAPPED → ESCAPE → PATROL',
        constraints: ['3 enemies at start, +1 per level', 'Enemy speed increases by 10% per level'],
      },
      {
        name: 'scoring',
        description: 'Points awarded for trapping enemies (100), filling holes with trapped enemy (200), and collecting treasure drops (500).',
      },
      {
        name: 'world_model',
        description: 'Single screen with 5 horizontal platforms, 2 ladders, and 3-7 enemies',
      },
    ],
    effort: {
      total_weeks: 2,
      breakdown: {
        core_engine: 1,
        enemy_ai: 0.5,
        scoring_and_ui: 0.25,
        testing: 0.25,
      },
    },
  },
  uconstruct: {
    title: 'uConstruct (uCode Adaptation)',
    genre: ['construction', 'simulation'],
    summary: 'Build and manage a medieval castle using tile-based construction mechanics. Inspired by the 1984 game ACS (Adventure Construction Set). Design rooms, place furniture, and manage resources.',
    core_mechanics: [
      {
        name: 'tile_editor',
        description: 'Place and remove tiles on a grid to construct rooms, walls, and terrain',
        implementation: 'Grid-based editor with cursor navigation. Tile types: WALL, FLOOR, DOOR, WATER, GRASS, ROAD.',
        constraints: ['Grid size: 64x48 tiles', '16 tile types', 'Undo/Redo stack (20 levels)'],
      },
      {
        name: 'room_system',
        description: 'Enclosed areas become rooms with defined purposes',
        constraints: ['Room requires: at least 1 door, minimum 4x4 tiles', 'Room types: BEDROOM, KITCHEN, ARMORY, THRONE, DUNGEON, LIBRARY, STORAGE'],
      },
      {
        name: 'resource_management',
        description: 'Track stone, wood, gold, and food. Resources consumed during construction.',
        constraints: ['Starting: 500 stone, 300 wood, 100 gold, 200 food', 'Wall costs 2 stone, Floor costs 1 stone, Door costs 3 wood'],
      },
      {
        name: 'scoring',
        description: 'Castle score based on room count, room variety, defensive capability, and aesthetic appeal',
      },
    ],
    effort: {
      total_weeks: 10,
      breakdown: {
        core_engine: 3,
        tile_editor: 2,
        room_system: 1.5,
        resource_system: 1.5,
        ui_and_input: 1,
        testing: 1,
      },
    },
  },
}

function getGameTemplate(name: string): GameTemplate | null {
  const lower = name.toLowerCase()
  // Direct match
  if (GAME_TEMPLATES[lower]) return GAME_TEMPLATES[lower]
  // Partial match
  for (const [key, tmpl] of Object.entries(GAME_TEMPLATES)) {
    if (lower.includes(key) || key.includes(lower)) return tmpl
  }
  return null
}

function buildGDD(targetGame: string, template: GameTemplate): GameDesignDocument {
  const uCodeIntegration: UCodeIntegration = {
    lens_extractors: buildLensTargets(template),
    skin_themes: buildSkinThemes(template),
    control_commands: buildControlCommands(targetGame, template),
  }

  return {
    title: template.title,
    genre: template.genre,
    summary: template.summary,
    core_mechanics: template.core_mechanics,
    uCode_integration: uCodeIntegration,
  }
}

function buildLensTargets(template: GameTemplate): LensExtractorTarget[] {
  const targets: LensExtractorTarget[] = [
    { target: 'game_state', type: 'string', description: 'Current game state (title, playing, paused, game_over)' },
    { target: 'score', type: 'uint32', description: 'Player score' },
  ]

  // Add genre-specific targets
  const genres = template.genre
  if (genres.includes('text_adventure')) {
    targets.push(
      { target: 'player_location', type: 'string', description: 'Current location ID' },
      { target: 'player_inventory', type: 'array', description: 'List of carried item IDs' },
      { target: 'game_time', type: 'uint16', description: 'Current game time in ticks' },
      { target: 'npc_statuses', type: 'array', description: 'Array of {npc_id, location, action} for each NPC' },
    )
  }
  if (genres.includes('platformer') || genres.includes('arcade')) {
    targets.push(
      { target: 'player_x', type: 'uint16', description: 'Player X position' },
      { target: 'player_y', type: 'uint16', description: 'Player Y position' },
      { target: 'lives', type: 'uint8', description: 'Lives remaining' },
      { target: 'level', type: 'uint8', description: 'Current level number' },
      { target: 'enemies_remaining', type: 'uint8', description: 'Enemies still active' },
    )
  }
  if (genres.includes('construction') || genres.includes('simulation')) {
    targets.push(
      { target: 'stone', type: 'uint16', description: 'Stone resource count' },
      { target: 'wood', type: 'uint16', description: 'Wood resource count' },
      { target: 'gold', type: 'uint16', description: 'Gold resource count' },
      { target: 'food', type: 'uint16', description: 'Food resource count' },
      { target: 'room_count', type: 'uint8', description: 'Number of rooms built' },
    )
  }

  return targets
}

function buildSkinThemes(template: GameTemplate): SkinThemeTarget[] {
  const themes: SkinThemeTarget[] = [{ name: 'teletext_classic', description: 'Standard MODE 7 teletext' }]

  const genres = template.genre
  if (genres.includes('fantasy') || genres.includes('text_adventure')) {
    themes.push({ name: 'dark_fantasy', description: 'Dark background with muted colours for fantasy atmosphere' })
  }
  if (genres.includes('platformer') || genres.includes('arcade')) {
    themes.push({ name: 'bbc_mode7', description: 'Bright primary colours for arcade visibility' })
  }
  if (genres.includes('construction') || genres.includes('simulation')) {
    themes.push({ name: 'repton_classic', description: 'Warm earth tones for medieval construction theme' })
  }

  return themes
}

function buildControlCommands(targetGame: string, template: GameTemplate): ControlCommandTarget[] {
  const prefix = targetGame.toLowerCase().replace(/[^a-z]/g, '_')
  const commands: ControlCommandTarget[] = [
    { name: `${prefix}_save`, description: 'Save game state' },
    { name: `${prefix}_load`, description: 'Load game state' },
    { name: `${prefix}_status`, description: 'Query current game state' },
    { name: `${prefix}_pause`, description: 'Pause/resume game' },
  ]

  const genres = template.genre
  if (genres.includes('text_adventure')) {
    commands.push({ name: `${prefix}_time_skip`, description: 'Advance game time by N ticks' })
  }
  if (genres.includes('platformer') || genres.includes('arcade')) {
    commands.push({ name: `${prefix}_level_select`, description: 'Select level to play' })
  }
  if (genres.includes('construction') || genres.includes('simulation')) {
    commands.push({ name: `${prefix}_export_map`, description: 'Export current castle map' })
  }

  return commands
}

// ---------------------------------------------------------------------------
// Main Inspire-Engine entry point
// ---------------------------------------------------------------------------

export function inspireEngine(input: InspireEngineInput): InspireEngineOutput {
  const template = getGameTemplate(input.target_game)

  if (!template) {
    throw new Error(
      `No built-in game design template found for "${input.target_game}". ` +
      `Supported games: ${Object.keys(GAME_TEMPLATES).join(', ')}. ` +
      `Use research_sources to provide context for a custom game.`,
    )
  }

  const gdd = buildGDD(input.target_game, template)

  return {
    skill: 'Inspire-Engine',
    version: '1.0',
    executed_at: new Date().toISOString(),
    target_game: input.target_game,
    game_design_document: gdd,
    effort_estimate: template.effort,
  }
}