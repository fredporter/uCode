import type { Cell } from '../geometry/cell'
import { createEmptyBlock2x3, type Block2x3 } from './block2x3'

/** Convert a 6-bit mosaic pattern to a Block2x3. */
export function patternToBlock(pattern: number): Block2x3 {
  return {
    topLeft: (pattern & 1) === 1,
    topRight: (pattern & 2) === 2,
    midLeft: (pattern & 4) === 4,
    midRight: (pattern & 8) === 8,
    bottomLeft: (pattern & 16) === 16,
    bottomRight: (pattern & 32) === 32,
  }
}

/** Convert a Block2x3 back to its 6-bit pattern. */
export function blockToPattern(block: Block2x3): number {
  let p = 0
  if (block.topLeft) p |= 1
  if (block.topRight) p |= 2
  if (block.midLeft) p |= 4
  if (block.midRight) p |= 8
  if (block.bottomLeft) p |= 16
  if (block.bottomRight) p |= 32
  return p
}

export function calculateMosaicBlock(cell: Cell): Block2x3 {
  if (cell.mosaic !== undefined) return patternToBlock(cell.mosaic)
  const block = createEmptyBlock2x3()
  const seed = `${cell.x},${cell.y},${cell.layer}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return patternToBlock(seed & 0x3f)
}
