// ---------------------------------------------------------------------------
// Types (aligned with SKILLS_FRAMEWORK.md §4)
// ---------------------------------------------------------------------------

export interface CommandScribeInput {
  program_name: string
  program_type: 'adapt-source' | 'rewrite' | 'port-c-to-basic' | 'rewrite_inspired_by'
  game_mechanics: {
    genre: string[]
    save_system?: string
    input_method?: string
    persistence?: string
  }
  source_miner_report: {
    findings: {
      memory_map: Array<{
        label: string
        address: string
        type: string
        description: string
        confidence: number
      }>
      functions: Array<{
        name: string
        address: string
        description: string
        parameters?: Array<{ register?: string; description: string }>
      }>
    }
  }
}

export interface ControlCommand {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string; default?: string }>
  action: 'lens_capture' | 'lens_restore' | 'control_inject' | 'emulator_control' | 'lens_query'
  payload: Record<string, unknown>
}

export interface CommandScribeOutput {
  skill: 'Command-Scribe'
  version: '1.0'
  executed_at: string
  program: string
  commands: ControlCommand[]
}

// ---------------------------------------------------------------------------
// Command generation from Source-Miner findings
// ---------------------------------------------------------------------------

function generateStandardCommands(
  programName: string,
  memoryMap: CommandScribeInput['source_miner_report']['findings']['memory_map'],
  input: CommandScribeInput,
): ControlCommand[] {
  const prefix = programName.toLowerCase().replace(/[^a-z]/g, '_')
  const commands: ControlCommand[] = []

  // Collect game state keys for save/load
  const stateKeys = memoryMap
    .filter(
      (m) =>
        /score|status|state|lives|level|time|health|energy|position|inventory|credits|ship/i.test(
          m.label,
        ) && m.confidence >= 0.7,
    )
    .map((m) => {
      // Convert label to snake_case key
      return m.label
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/^_/, '')
    })

  const uniqueKeys = [...new Set(stateKeys)].slice(0, 10)

  // Save command
  commands.push({
    name: `${prefix}_save`,
    description: `Save current game state via LENS capture`,
    parameters: {
      slot: { type: 'string', description: 'Save slot name', default: 'autosave' },
    },
    action: 'lens_capture',
    payload: {
      target: 'variables',
      scope: `${prefix}_save`,
      keys: uniqueKeys,
    },
  })

  // Load command
  commands.push({
    name: `${prefix}_load`,
    description: `Restore saved game state`,
    parameters: {
      slot: { type: 'string', description: 'Save slot to load', default: 'autosave' },
    },
    action: 'lens_restore',
    payload: {
      target: 'variables',
      scope: `${prefix}_save`,
      keys: uniqueKeys,
    },
  })

  // Status query
  commands.push({
    name: `${prefix}_status`,
    description: `Query current game state`,
    parameters: {},
    action: 'lens_query',
    payload: {
      extractor: `${prefix}_lens_extractor`,
      method: 'capture_all',
    },
  })

  // Pause/resume
  commands.push({
    name: `${prefix}_pause`,
    description: `Pause/resume game execution`,
    parameters: {},
    action: 'emulator_control',
    payload: {
      command: 'toggle_pause',
    },
  })

  // Inject commands for key subroutines (from functions array, filtered from source_miner_report)
  const functions = (input as CommandScribeInput).source_miner_report?.findings?.functions || []
  const injectableFunctions = functions
    .filter(
      (f: { name: string; address: string; description: string }) =>
        /Dock|Jump|Launch|Title|Death|Win|Lose|Reset/i.test(f.name) &&
        f.address,
    )
    .slice(0, 5)

  for (const fn of injectableFunctions) {
    const actionName = fn.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    commands.push({
      name: `${prefix}_${actionName}`,
      description: fn.description || `Trigger ${fn.name} routine`,
      parameters: {},
      action: 'control_inject',
      payload: {
        target: '6502_execute',
        address: fn.address,
        description: `Call ${fn.name} routine at ${fn.address}`,
      },
    })
  }

  return commands
}

// ---------------------------------------------------------------------------
// Main Command-Scribe entry point
// ---------------------------------------------------------------------------

export function commandScribe(input: CommandScribeInput): CommandScribeOutput {
  const memoryMap = input.source_miner_report.findings.memory_map || []

  const commands = generateStandardCommands(input.program_name, memoryMap, input)

  return {
    skill: 'Command-Scribe',
    version: '1.0',
    executed_at: new Date().toISOString(),
    program: input.program_name,
    commands,
  }
}