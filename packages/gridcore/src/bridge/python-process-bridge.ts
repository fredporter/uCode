/**
 * Python Process Bridge — spawns the Python gridcore_adapter as a child
 * process and communicates via JSON-RPC over stdin/stdout.
 *
 * This replaces the hardcoded defaultDispatcher with the real Python
 * runtime, giving TerminalSurface and TeletextSurface access to all
 * 13 uCode commands, VAULT, CEEFAX, and LENS.
 */

import { spawn, type ChildProcess } from 'child_process'
import { delimiter, dirname, join } from 'path'
import { existsSync } from 'fs'
import type { CommandDispatcher, CommandResult, GridState } from './runtime-bridge'
import type { TeletextPage } from '../teletext/teletext-surface'

export interface PythonBridgeOptions {
  /** Python interpreter command (default 'python3'). */
  python?: string
  /** Project root (defaults to the resolved uCode repo root). */
  projectRoot?: string
  /** Override for the runtimes/basic directory. */
  runtimeDir?: string
  /** Override for the shared/src directory (for udos_shared). */
  sharedDir?: string
  /** Timeout in ms for each RPC call (default 5000). */
  timeoutMs?: number
}

/** Resolve the uCode repo root by walking up to the adapter marker file. */
function defaultProjectRoot(): string {
  const base = typeof __dirname !== 'undefined' ? __dirname : process.cwd()
  let dir = base
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'runtimes', 'basic', 'bridge', 'gridcore_adapter.py'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return base
}

export class PythonProcessBridge {
  private process: ChildProcess | null = null
  private dispatcher: CommandDispatcher | null = null
  private ready: boolean = false
  private pending: Map<string, {
    resolve: (result: unknown) => void
    reject: (err: Error) => void
  }> = new Map()
  private requestId = 0
  private buffer = ''

  constructor(private options: PythonBridgeOptions = {}) {}

  /** Start the Python subprocess and return a dispatcher */
  async start(): Promise<CommandDispatcher> {
    if (this.dispatcher) return this.dispatcher

    const root = this.options.projectRoot ?? defaultProjectRoot()
    const runtimeDir = this.options.runtimeDir ?? join(root, 'runtimes', 'basic')
    const sharedDir = this.options.sharedDir ?? join(root, 'shared', 'src')
    const python = this.options.python ?? process.env.PYTHON ?? 'python3'

    // Run the adapter as a module so its relative imports resolve, with
    // shared/src on PYTHONPATH so udos_shared is importable.
    this.process = spawn(python, ['-m', 'bridge.gridcore_adapter'], {
      cwd: runtimeDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: [sharedDir, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
      },
    })

    this.process.stdout!.on('data', (data: Buffer) => {
      this.handleStdout(data)
    })

    this.process.stderr!.on('data', (data: Buffer) => {
      // Stderr is for logging, not JSON-RPC
      const msg = data.toString().trim()
      if (msg) console.error('[python-bridge stderr]', msg)
    })

    this.process.on('exit', (code) => {
      this.ready = false
      if (code !== 0 && code !== null) {
        console.error(`[python-bridge] exited with code ${code}`)
      }
      this.rejectAll(new Error(`Python process exited (code ${code})`))
    })

    this.process.on('error', (err) => {
      this.ready = false
      console.error('[python-bridge] process error:', err.message)
      this.rejectAll(err)
    })

    // Create the dispatcher
    this.dispatcher = (command: string): Promise<CommandResult> => {
      return this.dispatchCommand(command)
    }

    this.ready = true
    return this.dispatcher
  }

  /** Stop the Python process */
  stop(): void {
    if (this.process) {
      this.process.stdin!.end()
      this.process.kill()
      this.process = null
    }
    this.ready = false
    this.dispatcher = null
    this.pending.clear()
  }

  /** Check if the bridge is running */
  isReady(): boolean {
    return this.ready && this.process !== null
  }

  // ── Private helpers ──────────────────────────────────────────

  private async dispatchCommand(command: string): Promise<CommandResult> {
    try {
      return await this.call<CommandResult>('dispatch', { command })
    } catch {
      return { output: 'Python runtime not running.' }
    }
  }

  /** Load a teletext page from the runtime page store. */
  async teletextPage(page: number): Promise<TeletextPage | null> {
    const result = await this.call<{ page: TeletextPage | null }>('teletext_page', { page })
    return result?.page ?? null
  }

  /** Reset the shared session state. */
  async resetSession(): Promise<string> {
    const result = await this.call<{ output?: string }>('session_reset', {})
    return result?.output ?? 'Session reset.'
  }

  /** Read the current grid state from the session. */
  async gridState(): Promise<GridState> {
    return this.call<GridState>('grid_state', {})
  }

  /** Send a generic JSON-RPC call and resolve with the result payload. */
  private call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Python runtime not running.'))
        return
      }

      const id = String(++this.requestId)
      const request = { jsonrpc: '2.0', method, params, id }
      const timeout = this.options.timeoutMs ?? 5000
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timed out after ${timeout}ms: ${method}`))
      }, timeout)

      this.pending.set(id, {
        resolve: (result) => {
          clearTimeout(timer)
          resolve(result as T)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })

      this.process.stdin.write(JSON.stringify(request) + '\n')
    })
  }

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString()
    const lines = this.buffer.split('\n')
    // Keep the last (potentially incomplete) line in the buffer
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const response = JSON.parse(trimmed)
        if (response.id && this.pending.has(response.id)) {
          const { resolve, reject } = this.pending.get(response.id)!
          this.pending.delete(response.id)

          if (response.error) {
            reject(new Error(response.error.message ?? 'Unknown error'))
          } else {
            resolve(response.result)
          }
        }
      } catch {
        // Non-JSON line (e.g., debug output) — ignore
      }
    }
  }

  private rejectAll(err: Error): void {
    for (const [, { reject }] of this.pending) {
      reject(err)
    }
    this.pending.clear()
  }
}