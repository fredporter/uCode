const path = require('path');
const repoRoot = path.resolve(__dirname, '../../..');
const { sourceMiner, lensCraft, commandScribe, skinWeaver, writeSkinManifest, inspireEngine, ucodeWeaver } = require(path.join(repoRoot, 'agents/gridsmith/dist/index.cjs'));
const p = __dirname;

const m = sourceMiner({source:{type:'local_path',url:p,language:['6502']},options:{scan_depth:'full',target_patterns:['*.asm']}});
process.stdout.write('Source-Miner: ' + m.findings.memory_map.length + ' mem, ' + m.findings.functions.length + ' func, ' + m.findings.data_structures.length + ' structs\n');

const c = lensCraft({source_miner_report:{source:p,findings:{memory_map:m.findings.memory_map,functions:m.findings.functions}},emulator:{type:'6502',endianness:'little'},output:{language:'python',module_name:'elite_lens',path:path.join(repoRoot, 'programs/elite/lens')}});
process.stdout.write('LENS-Craft: ' + c.extractors.length + ' extractors -> ' + c.written_to + '\n');

const s = commandScribe({program_name:'Elite',program_type:'adapt-source',game_mechanics:{genre:['space_trading','combat']},source_miner_report:{findings:{memory_map:m.findings.memory_map,functions:m.findings.functions}}});
process.stdout.write('Command-Scribe: ' + s.commands.length + ' commands\n');
s.commands.forEach(function(cmd){process.stdout.write('  ' + cmd.name + ' [' + cmd.action + ']\n')});

const skin = skinWeaver({source_assets:[{path:'gfx/ships/adder.bin',type:'wireframe_model'},{path:'gfx/ships/cobra.bin',type:'wireframe_model'},{path:'text/planet_descriptions.txt',type:'teletext_pages'}],target:{locale:'teletext_grid',resolution:{cols:40,rows:25},palette:'elite_wireframe'}});
const skinPath = writeSkinManifest(skin, path.join(repoRoot, 'programs/elite/skin'), 'yaml');
process.stdout.write('SKIN-Weaver: ' + skin.manifest.character_mappings.length + ' mappings -> ' + skinPath + '\n');

// Knight Orc: uCode-Weaver
const gdd = inspireEngine({target_game:'Knight Orc',approach:'rewrite_inspired_by',research_sources:[],design_constraints:{target_runtime:'bbc_basic_sdl',display_mode:'teletext'}});
const code = ucodeWeaver({gdd:gdd.game_design_document,program_name:'Knight Orc',runtime:'bbc_basic_sdl',display_mode:'teletext'});
process.stdout.write('uCode-Weaver (Knight Orc): ' + code.generated_code.split('\n').length + ' lines\n');
