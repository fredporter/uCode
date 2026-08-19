import { createGrid, listCells, latLonToUCode, uCodeToLatLon } from '@udos/gridcore'
import type { Grid } from '@udos/gridcore'
import { importBasicProgram } from './tools/basic'
import { importAmosProgram } from './tools/amos'
import { editCell } from './tools/cell'
import type { CellPayload } from './tools/cell'
import { composeGridLayers } from './tools/layers'
import { exportUvox } from './tools/uvox'
import { findPath } from './tools/pathfind'
import { createWorld, createWorldManifest } from './tools/world'
import type { WorldCreationOptions } from './tools/world'
import { sourceMiner } from './tools/source-miner'
import type {
  SourceMinerInput,
  SourceMinerOutput,
  MemoryMapEntry,
  FunctionEntry,
  DataStructure,
  AssetReference,
  Recommendation,
} from './tools/source-miner'
import { lensCraft } from './tools/lens-craft'
import type {
  LensCraftInput,
  LensCraftOutput,
  ExtractorDefinition,
} from './tools/lens-craft'
import { skinWeaver, writeSkinManifest } from './tools/skin-weaver'
import type {
  SkinWeaverInput,
  SkinWeaverOutput,
  SkinManifest,
  CharacterMapping,
} from './tools/skin-weaver'
import { commandScribe } from './tools/command-scribe'
import type { CommandScribeInput, CommandScribeOutput, ControlCommand } from './tools/command-scribe'
import { inspireEngine } from './tools/inspire-engine'
import { ucodeWeaver } from './tools/ucode-weaver'
import type { UCodeWeaverInput, UCodeWeaverOutput, BbcBasicProcedure } from './tools/ucode-weaver'
import type {
  InspireEngineInput,
  InspireEngineOutput,
  GameDesignDocument,
  CoreMechanic,
} from './tools/inspire-engine'

export interface GridSmithToolParameter {
  type: 'string' | 'number' | 'array' | 'object'
  description: string
  default?: string | number | number[]
  items?: { type: 'number' }
}

export interface GridSmithToolDefinition {
  name: string
  description: string
  parameters: Record<string, GridSmithToolParameter>
}

export const GRIDSMITH_TOOLS: GridSmithToolDefinition[] = [
  {
    name: 'create_world',
    description: 'Create a new world with optional terrain.',
    parameters: {
      name: { type: 'string', description: 'World name' },
      type: { type: 'string', description: 'World type: earth, dungeon, vault, or library' },
      cols: { type: 'number', description: 'Grid column count', default: 80 },
      rows: { type: 'number', description: 'Grid row count', default: 24 },
      seed: { type: 'number', description: 'Random seed', default: 0 },
      terrain: { type: 'object', description: 'Map of "x,y" -> character for terrain' },
    },
  },
  {
    name: 'import_basic_program',
    description: 'Import a BASIC program as a grid world.',
    parameters: {
      program: { type: 'string', description: 'BASIC program code or file path' },
      world_name: { type: 'string', description: 'Name for the generated world' },
    },
  },
  {
    name: 'import_amos_program',
    description: 'Import an AMOS program as a grid world.',
    parameters: {
      program: { type: 'string', description: 'AMOS program code or file path' },
      world_name: { type: 'string', description: 'Name for the generated world' },
    },
  },
  {
    name: 'create_grid',
    description: 'Create a new grid.',
    parameters: {
      cols: { type: 'number', description: 'Grid column count', default: 80 },
      rows: { type: 'number', description: 'Grid row count', default: 24 },
      cell_size: { type: 'number', description: 'Logical cell size', default: 24 },
    },
  },
  {
    name: 'edit_cell',
    description: 'Edit a specific cell.',
    parameters: {
      grid_id: { type: 'string', description: 'Grid identifier' },
      x: { type: 'number', description: 'X cell coordinate' },
      y: { type: 'number', description: 'Y cell coordinate' },
      layer: { type: 'number', description: 'Layer index', default: 0 },
      data: { type: 'object', description: 'Cell payload (char, fg, bg)' },
    },
  },
  {
    name: 'compose_layers',
    description: 'Compose layers into a single view.',
    parameters: {
      grid_id: { type: 'string', description: 'Grid identifier' },
      layers: {
        type: 'array',
        description: 'Ordered layer list',
        default: [0, 1, 2, 3, 4, 5],
        items: { type: 'number' },
      },
    },
  },
  {
    name: 'export_uvox',
    description: 'Export a grid as a .uvox artifact.',
    parameters: {
      grid_id: { type: 'string', description: 'Grid identifier' },
      output_path: { type: 'string', description: 'Output file path' },
    },
  },
  {
    name: 'pathfind',
    description: 'Find path between two points on a grid (A*).',
    parameters: {
      grid_id: { type: 'string', description: 'Grid identifier' },
      start_x: { type: 'number', description: 'Start X coordinate' },
      start_y: { type: 'number', description: 'Start Y coordinate' },
      end_x: { type: 'number', description: 'End X coordinate' },
      end_y: { type: 'number', description: 'End Y coordinate' },
      layer: { type: 'number', description: 'Layer index', default: 0 },
    },
  },
  {
    name: 'latlon_to_ucode',
    description: 'Convert lat/lon to uCode.',
    parameters: {
      lat: { type: 'number', description: 'Latitude' },
      lon: { type: 'number', description: 'Longitude' },
      level: { type: 'number', description: 'uCode level', default: 340 },
    },
  },
  {
    name: 'ucode_to_latlon',
    description: 'Convert uCode to lat/lon.',
    parameters: {
      coord: { type: 'string', description: 'uCode coordinate' },
    },
  },
  {
    name: 'source_miner',
    description: 'Scan 6502 assembly source code for LENS-extractable integration points.',
    parameters: {
      source_path: { type: 'string', description: 'Path to source directory or file' },
      language: { type: 'string', description: 'Source language(s) as CSV', default: '6502' },
      target_patterns: { type: 'string', description: 'File patterns as CSV (e.g. *.asm,*.s)', default: '' },
      exclude_patterns: { type: 'string', description: 'Exclude patterns as CSV (e.g. test_*,*.tmp)', default: '' },
    },
  },
  {
    name: 'lens_craft',
    description: 'Generate Python LENS extractor code from a Source-Miner report.',
    parameters: {
      source_miner_json: { type: 'string', description: 'Source-Miner output as JSON string' },
      module_name: { type: 'string', description: 'Python module name (e.g. elite_lens)' },
      output_path: { type: 'string', description: 'Output file path (e.g. runtimes/basic/bridge/lens/extractors/)', default: '' },
    },
  },
  {
    name: 'skin_weaver',
    description: 'Convert original game assets to uCode SKIN manifest.',
    parameters: {
      assets_json: { type: 'string', description: 'JSON array of asset objects [{path, type, format?}]' },
      skin_name: { type: 'string', description: 'Name for the generated skin' },
      palette: { type: 'string', description: 'Palette: bbc_mode7, teletext_classic, dark_fantasy, repton_classic, elite_wireframe', default: 'bbc_mode7' },
      output_dir: { type: 'string', description: 'Output directory for .skin.yaml manifest', default: '' },
    },
  },
  {
    name: 'command_scribe',
    description: 'Generate control command specifications from Source-Miner report.',
    parameters: {
      source_miner_json: { type: 'string', description: 'Source-Miner output as JSON string' },
      program_name: { type: 'string', description: 'Program name (e.g. Elite, Repton)' },
      program_type: { type: 'string', description: 'adapt-source, rewrite, port-c-to-basic, or rewrite_inspired_by', default: 'adapt-source' },
    },
  },
  {
    name: 'inspire_engine',
    description: 'Generate game design documents for rewrite-inspired projects.',
    parameters: {
      target_game: { type: 'string', description: 'Game name (e.g. Knight Orc, Apple Panic, uConstruct)' },
      sources_json: { type: 'string', description: 'JSON array of research sources [{type, url, reliability}]', default: '[]' },
      runtime: { type: 'string', description: 'Target runtime', default: 'bbc_basic_sdl' },
      display_mode: { type: 'string', description: 'Display mode', default: 'teletext' },
    },
  },
  {
    name: 'ucode_weaver',
    description: 'Generate BBC BASIC skeleton code from a game design document.',
    parameters: {
      gdd_json: { type: 'string', description: 'Inspire-Engine GDD output as JSON string' },
      program_name: { type: 'string', description: 'Program name (e.g. Apple Panic, Knight Orc)' },
      runtime: { type: 'string', description: 'Target runtime', default: 'bbc_basic_sdl' },
      display_mode: { type: 'string', description: 'Display mode', default: 'teletext' },
    },
  },
]

export function createGridWorld(cols = 80, rows = 24): { grid: Grid; cols: number; rows: number; cellCount: number } {
  const grid = createGrid(cols, rows)
  return {
    grid,
    cols: grid.cols,
    rows: grid.rows,
    cellCount: listCells(grid).length,
  }
}

export function convertLatLonToUCode(lat: number, lon: number, level = 340): string {
  return latLonToUCode(lat, lon, level)
}

export function convertUCodeToLatLon(coord: string): { lat: number; lon: number } | null {
  return uCodeToLatLon(coord)
}

export {
  importBasicProgram,
  importAmosProgram,
  editCell,
  composeGridLayers,
  exportUvox,
  findPath,
  createWorld,
  createWorldManifest,
  sourceMiner,
  lensCraft,
  skinWeaver,
  writeSkinManifest,
  commandScribe,
  inspireEngine,
  ucodeWeaver,
}
export type {
  Grid,
  CellPayload,
  WorldCreationOptions,
  SourceMinerInput,
  SourceMinerOutput,
  MemoryMapEntry,
  FunctionEntry,
  DataStructure,
  AssetReference,
  Recommendation,
  LensCraftInput,
  LensCraftOutput,
  ExtractorDefinition,
  SkinWeaverInput,
  SkinWeaverOutput,
  SkinManifest,
  CharacterMapping,
  CommandScribeInput,
  CommandScribeOutput,
  ControlCommand,
  InspireEngineInput,
  InspireEngineOutput,
  GameDesignDocument,
  CoreMechanic,
  UCodeWeaverInput,
  UCodeWeaverOutput,
  BbcBasicProcedure,
}
