const path = require('path');
const repoRoot = path.resolve(__dirname, '../../..');
const { skinWeaver, writeSkinManifest } = require(path.join(repoRoot, 'agents/gridsmith/dist/index.cjs'));
const assets = [
  { path: 'gfx/sprites/repton_player.spr', type: 'sprite_data' },
  { path: 'gfx/sprites/diamond.spr', type: 'sprite_data' },
  { path: 'gfx/maps/level1.bin', type: 'map_data' },
  { path: 'text/instructions.txt', type: 'teletext_pages' },
];
const result = skinWeaver({
  source_assets: assets,
  target: { locale: 'teletext_grid', resolution: { cols: 40, rows: 25 }, palette: 'repton_classic' },
});
const writtenTo = writeSkinManifest(result, path.join(repoRoot, 'programs/repton/skin'), 'yaml');
process.stdout.write('SKIN-Weaver: ' + result.manifest.character_mappings.length + ' mappings written to ' + writtenTo + '\n');
