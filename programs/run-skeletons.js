const fs = require('fs');
const path = require('path');
const repoRoot = path.resolve(__dirname, '..');
const { ucodeWeaver } = require(path.join(repoRoot, 'agents/gridsmith/dist/index.cjs'));

function generate(programName, outputDir, gdd) {
  const code = ucodeWeaver({gdd: gdd, program_name: programName, runtime: 'bbc_basic_sdl', display_mode: 'teletext'});
  const entryFile = path.join(outputDir, programName.toLowerCase().replace(/[^a-z]/g, '_') + '.bbc');
  fs.writeFileSync(entryFile, code.generated_code, 'utf-8');
  process.stdout.write(programName + ': ' + code.generated_code.split('\n').length + ' lines -> ' + entryFile + '\n');
}

const nethackGDD = {
  title: 'NetHack (uCode Adaptation)',
  genre: ['roguelike', 'dungeon_crawler'],
  summary: 'Classic roguelike dungeon exploration. Descend through the Dungeons of Doom to retrieve the Amulet of Yendor.',
  core_mechanics: [
    { name: 'dungeon_generation', description: 'Procedural dungeon levels with rooms and corridors' },
    { name: 'turn_based_movement', description: 'Each action advances the game state by one turn' },
    { name: 'combat_system', description: 'Melee and ranged combat with d20-style hit rolls' },
    { name: 'inventory_system', description: 'Items, weapons, armor, scrolls, potions, and wands' },
    { name: 'monster_ai', description: 'Monsters patrol, chase, and use special abilities' },
  ],
  uCode_integration: {
    lens_extractors: [
      { target: 'dungeon_level', type: 'uint8', description: 'Current dungeon depth' },
      { target: 'player_hp', type: 'uint16', description: 'Player hit points' },
      { target: 'player_level', type: 'uint8', description: 'Player experience level' },
      { target: 'turn_count', type: 'uint32', description: 'Game turn counter' },
      { target: 'inventory', type: 'array', description: 'Player inventory item IDs' },
    ],
    skin_themes: [
      { name: 'dark_fantasy', description: 'Dark background for dungeon atmosphere' },
      { name: 'teletext_classic', description: 'Standard teletext' },
    ],
    mcp_commands: [
      { name: 'nethack_save', description: 'Save game state' },
      { name: 'nethack_load', description: 'Load game state' },
      { name: 'nethack_status', description: 'Query game state' },
      { name: 'nethack_pause', description: 'Pause game' },
    ],
  },
};

const eamonGDD = {
  title: 'Eamon (uCode Adaptation)',
  genre: ['text_adventure', 'rpg'],
  summary: 'Classic text adventure with character creation, combat, magic, and exploration.',
  core_mechanics: [
    { name: 'text_parser', description: 'VERB NOUN parser with abbreviations' },
    { name: 'character_creation', description: 'Roll stats, choose weapons and armor' },
    { name: 'combat_system', description: 'Turn-based combat with weapon damage dice' },
    { name: 'world_model', description: 'Room-based navigation with exits and objects', locations: [
      { id: 'main_hall', name: 'Main Hall', exits: ['east=training_grounds', 'west=armory'] },
      { id: 'training_grounds', name: 'Training Grounds', exits: ['west=main_hall'] },
      { id: 'armory', name: 'Armory', exits: ['east=main_hall'] },
    ]},
  ],
  uCode_integration: {
    lens_extractors: [
      { target: 'player_hp', type: 'uint16', description: 'Player hardiness' },
      { target: 'current_room', type: 'string', description: 'Current room ID' },
      { target: 'gold', type: 'uint32', description: 'Gold carried' },
      { target: 'weapon_name', type: 'string', description: 'Equipped weapon' },
      { target: 'armor_class', type: 'uint8', description: 'Current armor rating' },
    ],
    skin_themes: [
      { name: 'dark_fantasy', description: 'Dark medieval atmosphere' },
    ],
    mcp_commands: [
      { name: 'eamon_save', description: 'Save character' },
      { name: 'eamon_load', description: 'Load character' },
      { name: 'eamon_status', description: 'Character sheet' },
    ],
  },
};

generate('NetHack', path.join(repoRoot, 'programs/nethack/src'), nethackGDD);
generate('uConstruct', path.join(repoRoot, 'programs/uconstruct/src'), { title: 'uConstruct', genre: ['construction', 'simulation'], summary: 'Build a castle.', core_mechanics: [{ name: 'tile_editor', description: 'Place tiles to build' }], uCode_integration: { lens_extractors: [{ target: 'stone', type: 'uint16', description: 'Stone count' }, { target: 'wood', type: 'uint16', description: 'Wood count' }], skin_themes: [{ name: 'repton_classic', description: 'Warm tones' }], mcp_commands: [{ name: 'uconstruct_save', description: 'Save castle' }] } });
generate('Eamon', path.join(repoRoot, 'programs/eamon/src'), eamonGDD);
