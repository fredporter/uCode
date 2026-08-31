import { cloneBuffer, createBuffer, type GridBuffer } from '../buffer/cell'

export const WORLD_GRID_COLS = 40
export const WORLD_GRID_ROWS = 25
export const WORLD_LEVEL_STEP = 100
export const MAX_WORLD_STACK_GRIDS = 1_000

export interface WorldAddress { level: number; column: number; row: number }
export interface WorldGridDocument {
  id: string; name: string; address: string; buffer: GridBuffer; visible: boolean; locked: boolean
}
export interface WorldStackDocument {
  format: 'ucode-world-stack-v1'; version: 1
  cols: typeof WORLD_GRID_COLS; rows: typeof WORLD_GRID_ROWS
  activeAddress: string; grids: WorldGridDocument[]
}

const code = (value: number) => value.toString(36).toUpperCase().padStart(2, '0')

/** Native address syntax. Geography adapters may map into it, but it never stores latitude/longitude. */
export function formatWorldAddress(address: WorldAddress): string {
  if (!Number.isInteger(address.level) || address.level < 0 || address.level % WORLD_LEVEL_STEP !== 0 ||
      !Number.isInteger(address.column) || !Number.isInteger(address.row) ||
      address.column < 0 || address.row < 0 || address.column >= 36 ** 2 || address.row >= 36 ** 2) throw new Error('Invalid world address')
  return `L${address.level}-${code(address.column)}${code(address.row)}`
}

export function parseWorldAddress(value: string): WorldAddress | null {
  const match = /^L(\d+)-([A-Z0-9]{2})([A-Z0-9]{2})$/.exec(value.toUpperCase())
  if (!match) return null
  const level = Number(match[1])
  if (level % WORLD_LEVEL_STEP !== 0) return null
  return { level, column: Number.parseInt(match[2], 36), row: Number.parseInt(match[3], 36) }
}

/** Each finer grid divides its parent into an exact 2×2 set. */
export function childWorldAddresses(value: string): string[] {
  const parent = parseWorldAddress(value)
  if (!parent) throw new Error('Invalid world address')
  return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => formatWorldAddress({
    level: parent.level + WORLD_LEVEL_STEP, column: parent.column * 2 + dx, row: parent.row * 2 + dy,
  }))
}

export function parentWorldAddress(value: string): string | null {
  const child = parseWorldAddress(value)
  if (!child || child.level < WORLD_LEVEL_STEP) return null
  return formatWorldAddress({ level: child.level - WORLD_LEVEL_STEP, column: Math.floor(child.column / 2), row: Math.floor(child.row / 2) })
}

export function createWorldGrid(address: string, name = 'Untitled grid'): WorldGridDocument {
  if (!parseWorldAddress(address)) throw new Error('Invalid world address')
  return { id: `grid-${address.toLowerCase()}`, name, address, buffer: createBuffer(WORLD_GRID_COLS, WORLD_GRID_ROWS), visible: true, locked: false }
}

export function createWorldStack(rootAddress = 'L200-5533'): WorldStackDocument {
  const root = createWorldGrid(rootAddress, 'World overview')
  return { format: 'ucode-world-stack-v1', version: 1, cols: WORLD_GRID_COLS, rows: WORLD_GRID_ROWS, activeAddress: rootAddress, grids: [root] }
}

export function cloneWorldStack(stack: WorldStackDocument): WorldStackDocument {
  return { ...stack, grids: stack.grids.map(grid => ({ ...grid, buffer: cloneBuffer(grid.buffer) })) }
}

function isCanonicalWorldAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const address = parseWorldAddress(value)
  return address !== null && formatWorldAddress(address) === value
}

function isWorldGrid(value: unknown): value is WorldGridDocument {
  if (!value || typeof value !== 'object') return false
  const grid = value as Partial<WorldGridDocument>
  return typeof grid.id === 'string' && !!grid.id && typeof grid.name === 'string' && !!grid.name &&
    isCanonicalWorldAddress(grid.address) && typeof grid.visible === 'boolean' && typeof grid.locked === 'boolean' &&
    Array.isArray(grid.buffer) && grid.buffer.length === WORLD_GRID_ROWS &&
    grid.buffer.every(row => Array.isArray(row) && row.length === WORLD_GRID_COLS && row.every(cell =>
      Boolean(cell) && typeof cell.char === 'string' && Number.isFinite(cell.fg) && Number.isFinite(cell.bg),
    ))
}

export function validateWorldStack(value: unknown): value is WorldStackDocument {
  if (!value || typeof value !== 'object') return false
  const stack = value as Partial<WorldStackDocument>
  return stack.format === 'ucode-world-stack-v1' && stack.version === 1 && stack.cols === WORLD_GRID_COLS &&
    stack.rows === WORLD_GRID_ROWS && typeof stack.activeAddress === 'string' && Array.isArray(stack.grids) &&
    stack.grids.length > 0 && stack.grids.length <= MAX_WORLD_STACK_GRIDS &&
    stack.grids.every(isWorldGrid) && stack.grids.some(grid => grid.address === stack.activeAddress) &&
    new Set(stack.grids.map(grid => grid.id)).size === stack.grids.length &&
    new Set(stack.grids.map(grid => grid.address)).size === stack.grids.length
}

/** Serialize a native World stack without sharing mutable cell buffers. */
export function serializeWorldStack(stack: WorldStackDocument): WorldStackDocument {
  if (!validateWorldStack(stack)) throw new Error('Invalid world stack')
  return cloneWorldStack(stack)
}

/** Restore a validated native World stack without accepting legacy coordinates. */
export function deserializeWorldStack(value: unknown): WorldStackDocument {
  if (!value || typeof value !== 'object') throw new Error('Invalid world stack')
  const stack = value as Partial<WorldStackDocument>
  if (stack.format !== 'ucode-world-stack-v1') throw new Error('Unsupported world stack format')
  if (stack.version !== 1) throw new Error('Unsupported world stack version')
  if (!Array.isArray(stack.grids) || stack.grids.length > MAX_WORLD_STACK_GRIDS) {
    throw new Error(`World stack exceeds ${MAX_WORLD_STACK_GRIDS} grid limit`)
  }
  if (!validateWorldStack(stack)) throw new Error('Invalid world stack document')
  return cloneWorldStack(stack)
}
