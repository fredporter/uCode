import type { OutputLine } from '../terminal/terminal-surface'
import type { TeletextPage } from '../teletext/teletext-surface'
import { PythonProcessBridge, type PythonBridgeOptions } from './python-process-bridge'

// ── Types ─────────────────────────────────────────────────────────

export type BridgeMode = 'in-process' | 'websocket' | 'mock'

export interface BridgeMessage {
  type: 'command' | 'output' | 'teletext-load' | 'teletext-page' | 'error'
  payload: unknown
}

export interface CommandResult {
  output: string | string[] | OutputLine[]
  teletextPage?: number
}

export interface GridStateCell {
  char: string
  fg: string | number
  bg: string | number
}

export interface GridState {
  width: number
  height: number
  cells: GridStateCell[][]
}

export type CommandDispatcher = (command: string) => CommandResult | Promise<CommandResult>

export interface RuntimeBridgeOptions {
  mode?: BridgeMode
  dispatcher?: CommandDispatcher
  /** Optional teletext page loader for in-process/mock mode. */
  teletextLoader?: (page: number) => TeletextPage | Promise<TeletextPage | null> | null
}

// R// R// R// R// R// R// R// R// R// R// R// R// R// R// R// RridgeOptions }

// ── Default in-process dispatcher ────────────────────────────────

const HELP_TEXT = 'Commands: HELP BEEP RENUM GRID LAYER MAP WORLD VAULT CEEFAX UVOX SKIN LENS QUIT'

function defaultDispatcher(command: string): CommandResult {
  const upper = command.toUpperCase().trim()

  if (upper === 'HELP') return { output: HELP_TEXT }
  if (upper === 'BEEP') return { output: '\x07' }
  if (upper === 'QUIT') return { output: 'Goodbye.' }
  if (upper === 'CEEFAX') return { output: 'Loading Teletext Reader...', teletextPage: 100 }
  if (upper.startsWith('CEEFAX ')) {
    const page = parseInt(upper.slice(7).trim(), 10)
    if (!isNaN(page) && page >= 100) return { output: 'Loading page ' + page + '...', teletextPage: page }
    return { output: 'Usage: CEEFAX [page number]' }
  }
  if (upper === 'VAULT') return { output: 'Usage: VAULT <key>. Keys: ollama_endpoint, hivemind_api_key, openrouter_api_key' }
  if (upper.startsWith('VAULT ')) {
    const key = upper.slice(6).trim()
    if (key === 'ollama_endpoint') return { output: 'ollama_endpoint = http://localhost:11434' }
    if (key === 'hivemind_api_key') return { output: 'hivemind_api_key = [SET]' }
    if (key === 'openrouter_api_key') return { output: 'openrouter_api_key = [SET]' }
    return { output: 'Vault key \'' + key + '\' not found.' }
  }
  if (upper === 'WORLD LIST' || upper === 'WORLD') return { output: ['Worlds:', '  default (40x25, 2 layers)', '  test-world (80x24, 3 layers)'] }
  if (upper.startsWith('WORLD NEW ')) return { output: 'World \'' + upper.slice(10).trim() + '\' created with 2 layers.' }
  if (upper === 'GRID' || upper.startsWith('GRID ')) return { output: 'GRID GET <col> <row> | GRID SET <col> <row> <char>' }
  if (upper.startsWith('GRID SET ')) {
    const parts = upper.slice(9).trim().split(/\s+/)
    if (parts.length >= 3) return { output: 'Set (' + parts[0] + ',' + parts[1] + ') to \'' + parts[2] + '\'' }
    return { output: 'Usage: GRID SET <col> <row> <char>' }
  }
  if (upper.startsWith('GRID GET ')) {
    const parts = upper.slice(9).trim().split(/\s+/)
    if (parts.length >= 2) return { output: '  (' + parts[0] + ',' + parts[1] + ') = \' \'' }
    return { output: 'Usage: GRID GET <col> <row>' }
  }
  if (upper === 'LAYER' || upper === 'LAYER LIST') return { output: ['Layers:', '  main (40x25)', '  fx (40x25)'] }
  if (upper === 'MAP' || upper === 'MAP LIST') return { output: '  (no maps loaded)' }
  if (upper === 'RENUM') return { output: 'No program loaded.' }
  if (upper === 'UVOX') return { output: 'UVox spatial algebra engine is in development.' }
  if (upper.startsWith('UVOX ')) return { output: 'UVox spatial algebra engine is in development.' }
  if (upper === 'SKIN') return { output: ['Skins: bbc, teletext, inverse, classic, dark, retro'] }
  if (upper === 'LENS') return { output: 'LENS: viewport capture/restore. Usage: LENS CAPTURE | LENS RESTORE' }
  if (upper.startsWith('GRIDSMITH CREATE_WORLD ') || upper.startsWith('WORLD CREATE ')) {
    const name = upper.includes('CREATE_WORLD ') ? upper.split('CREATE_WORLD ')[1].trim() : upper.split('WORLD CREATE ')[1].trim()
    return { output: 'World \'' + name + '\' created via GridSmith. use GRIDSMITH WORLD LIST to verify' }
  }
  if (upper === 'GRIDSMITH CREATE_GRID' || upper.startsWith('GRIDSMITH CREATE_GRID ')) {
    return { output: 'Grid created. Use GRIDSMITH CELL EDIT <grid> <x> <y> <char> to populate.' }
  }
  if (upper.startsWith('GRIDSMITH CELL EDIT ')) return { output: 'Cell edited. Use GRID GET <x> <y> to verify.' }
  if (upper.startsWith('GRIDSMITH PATHFIND ') || upper.startsWith('GRIDSMITH PATH FIND ')) return { output: 'Pathfinding dispatched. Use GRIDSMITH PATH RESULT to check.' }
  if (upper === 'GRIDSMITH TOOLS LIST') {
    return { output: ['GridSmith Tools (10 available):', '  create_world, import_basic_program, import_amos_program,', '  create_grid, edit_cell, compose_layers, export_uvox,', '  pathfind, latlon_to_ucode, ucode_to_latlon'] }
  }
  if (upper === 'GRIDSMITH COMPOSE_LAYERS' || upper.startsWith('GRIDSMITH COMPOSE ')) return { output: 'Layers composed. Viewport updated.' }
  if (upper === 'GRIDSMITH EXPORT_UVOX' || upper.startsWith('GRIDSMITH EXPORT ')) return { output: 'UVox export initiated. Check workspaces/gridcore/grids/exports/ for .uvox files.' }
  if (upper === 'GRIDSMITH LATLON_TO_UCODE' || upper.startsWith('GRIDSMITH LATLON ')) return { output: 'Use: GRIDSMITH LATLON_TO_UCODE <lat> <lon>' }
  if (upper.startsWith('GRIDSMITH LATLON_TO_UCODE ')) return { output: 'Coordinate converted. Use GRIDSMITH UCODE_TO_LATLON to reverse.' }
  if (upper === 'GRIDSMITH' || upper === 'GRIDSMITH HELP') {
    return { output: ['GridSmith Agent — world builder tools:',
      '  GRIDSMITH TOOLS LIST             List all tools',
      '  GRIDSMITH CREATE_WORLD <name>    Create a new world',
      '  GRIDSMITH CREATE_GRID [cols rows] Create a named grid',
      '  GRIDSMITH CELL EDIT <g> <x> <y> <c>  Edit a cell',
      '  GRIDSMITH PATHFIND <g> <sx> <sy> <ex> <ey>  Find path',
      '  GRIDSMITH COMPOSE_LAYERS <g>     Compose layers',
      '  GRIDSMITH EXPORT_UVOX <g> <out>  Export UVox artifact',
      '  GRIDSMITH LATLON_TO_UCODE <lat> <lon>  Convert coords',
      'Type GRIDSMITH <command> for details.'] }
  }
  return { output: 'Unknown command: ' + command + '. Type HELP for available commands.' }
}

// ── RuntimeBridge ─────────────────────────────────────────────────

/**
 * Create a RuntimeBridge wired to a live Python process.
 * Spawns `python gridcore_adapter.py` via PythonProcessBridge and
 * replaces the mock dispatcher with real JSON-RPC dispatch.
 */
export async function createProcessBridge(options?: PythonBridgeOptions): Promise<RuntimeBridge> {
  const proc = new PythonProcessBridge(options)
  const dispatcher = await proc.start()
  const result = new RuntimeBridge({ dispatcher })
  result.attachProcessBridge(proc)
  return result
}

export class RuntimeBridge {
  private mode: BridgeMode
  private dispatcher: CommandDispatcher
  private teletextLoader: ((page: number) => TeletextPage | Promise<TeletextPage | null> | null) | null
  private processBridge: PythonProcessBridge | null = null
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  constructor(options: RuntimeBridgeOptions = {}) {
    this.mode = options.mode ?? 'in-process'
    this.dispatcher = options.dispatcher ?? defaultDispatcher
    this.teletextLoader = options.teletextLoader ?? null
  }

  // ── Event system ──

  on(event: string, fn: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
  }

  off(event: string, fn: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(fn)
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(fn => fn(...args))
  }

  // ── Command dispatch ──

  async sendCommand(command: string): Promise<void> {
    try {
      const result = await this.dispatcher(command)
      this.emit('command-output', result.output)
      if (result.teletextPage !== undefined) this.emit('teletext-navigate', result.teletextPage)
    } catch (err) {
      this.emit('error', String(err))
    }
  }

  async loadTeletextPage(pageNumber: number): Promise<TeletextPage | null> {
    if (this.processBridge) {
      try { return await this.processBridge.teletextPage(pageNumber) } catch { return null }
    }
    if (this.teletextLoader) {
      try { return await this.teletextLoader(pageNumber) } catch { return null }
    }
    return null
  }

  /** Reset the live session (only meaningful with a process bridge). */
  async resetSession(): Promise<string> {
    if (this.processBridge) {
      try { return await this.processBridge.resetSession() } catch { return 'Session reset failed.' }
    }
    return 'No live session (in-process mode).'
  }

  /** Read the current grid state (only meaningful with a process bridge). */
  async getGridState(): Promise<GridState | null> {
    if (this.processBridge) {
      try { return await this.processBridge.gridState() } catch { return null }
    }
    return null
  }

  /** Attach a live Python process bridge (used by createProcessBridge). */
  attachProcessBridge(proc: PythonProcessBridge): void {
    this.processBridge = proc
  }

  getProcessBridge(): PythonProcessBridge | null {
    return this.processBridge
  }

  getDispatcher(): CommandDispatcher { return this.dispatcher }
  setDispatcher(dispatcher: CommandDispatcher): void { this.dispatcher = dispatcher }
  getMode(): BridgeMode { return this.mode }

  async connectWebSocket(url: string): Promise<void> {
    this.mode = 'websocket'
    try {
      const ws = new WebSocket(url)
      this._ws = ws
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'command-output') this.emit('command-output', msg.payload)
          else if (msg.type === 'teletext-navigate') this.emit('teletext-navigate', msg.payload)
          else if (msg.type === 'error') this.emit('error', msg.payload)
        } catch { this.emit('command-output', event.data) }
      }
      this.dispatcher = async (command: string) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ command }))
        return { output: '' }
      }
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error('WebSocket connection failed'))
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000)
      })
    } catch (err) {
      this.mode = 'in-process'
      this.dispatcher = defaultDispatcher
      throw err
    }
  }

  disconnectWebSocket(): void {
    if (this._ws) { this._ws.close(); this._ws = null }
    this.mode = 'in-process'
    this.dispatcher = defaultDispatcher
  }

  stopProcessBridge(): void {
    if (this.processBridge) {
      this.processBridge.stop()
      this.processBridge = null
    }
    this.dispatcher = defaultDispatcher
  }

  private _ws: WebSocket | null = null
}
