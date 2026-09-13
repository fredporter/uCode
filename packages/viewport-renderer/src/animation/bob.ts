export interface BobState {
  x: number
  y: number
  vx: number
  vy: number
}

export function stepBob(state: BobState, width: number, height: number): BobState {
  let x = state.x + state.vx
  let y = state.y + state.vy
  let vx = state.vx
  let vy = state.vy

  if (x < 0 || x > width) {
    vx *= -1
    x = Math.max(0, Math.min(width, x))
  }

  if (y < 0 || y > height) {
    vy *= -1
    y = Math.max(0, Math.min(height, y))
  }

  return { x, y, vx, vy }
}

/** 1 dot = 4x4 device pixels on the universal lattice. */
export const DOT_PX = 4

export interface BobLatticeState {
  dotX: number
  dotY: number
  dotVx: number
  dotVy: number
  widthDots?: number
  heightDots?: number
}

export function stepBobLattice(
  state: BobLatticeState,
  maxDotsW: number,
  maxDotsH: number,
): BobLatticeState {
  let dotX = state.dotX + state.dotVx
  let dotY = state.dotY + state.dotVy
  let dotVx = state.dotVx
  let dotVy = state.dotVy
  const w = state.widthDots ?? 2
  const h = state.heightDots ?? 2

  if (dotX < 0 || dotX + w > maxDotsW) {
    dotVx *= -1
    dotX = Math.max(0, Math.min(maxDotsW - w, dotX))
  }

  if (dotY < 0 || dotY + h > maxDotsH) {
    dotVy *= -1
    dotY = Math.max(0, Math.min(maxDotsH - h, dotY))
  }

  return { ...state, dotX, dotY, dotVx, dotVy }
}
