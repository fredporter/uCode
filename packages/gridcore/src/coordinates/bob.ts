/**
 * GridCore BOB (Blitter Object) Engine — Animated Sprites over the 4×4 Dot Lattice.
 *
 * Implements canonical specifications from:
 * - global-knowledge/standards/GRIDCORE-STANDARDS.json (bob_blitter_objects)
 * - global-knowledge/standards/DEVICE-DISPLAY-STANDARDS.md (bob_budget)
 *
 * A BOB moves smoothly across the unified dot lattice (1 dot = 4x4 device pixels)
 * and can blit onto square registers (8x8 = 2x2 dots), tall registers (12x20 = 3x5 dots),
 * or continuous pixel buffers.
 */

import {
  DOT_PX,
  DotPoint,
  DotRect,
  dotsToPx,
  pxToDots,
  SQUARE_CELL,
  TALL_CELL,
  CellRegister,
  registerDotsW,
  registerDotsH,
} from "./dot";
import { GridBuffer, createBufferCell } from "../buffer/cell";
import { PixelBuffer, setPixel } from "../pixel/pixel-buffer";

export interface BobFrame {
  /** Width in dots (1 dot = 4px). */
  readonly widthDots: number;
  /** Height in dots (1 dot = 4px). */
  readonly heightDots: number;
  /** Indexed palette color for each dot (row-major). 0 indicates transparent. */
  readonly dots: Uint8Array | number[];
  /** Frame duration in milliseconds (default: 83ms ~ 12fps). */
  readonly durationMs?: number;
}

export interface BobDefinition {
  readonly id: string | number;
  readonly name?: string;
  readonly widthDots: number;
  readonly heightDots: number;
  readonly frames: BobFrame[];
  /** Palette index representing transparency (default: 0). */
  readonly transparentIndex?: number;
  /** Anchor/hotspot offset in dots (default: {x: 0, y: 0}). */
  readonly hotspot?: DotPoint;
}

export interface BobInstance {
  readonly id: string | number;
  readonly def: BobDefinition;
  /** Horizontal position in dot lattice coordinates. */
  x: number;
  /** Vertical position in dot lattice coordinates. */
  y: number;
  /** Velocity in dots per step. */
  vx: number;
  /** Velocity in dots per step. */
  vy: number;
  /** Current animation frame index. */
  activeFrame: number;
  /** Accumulated milliseconds for frame pacing. */
  elapsedMs: number;
  /** Visibility toggle. */
  visible: boolean;
  /** Optional custom collision box in dots. Defaults to full frame dimensions. */
  collisionBox?: DotRect;
}

export interface BobCollisionEvent {
  bob1: BobInstance;
  bob2: BobInstance;
  overlapDots: DotRect;
}

export const MAX_BOB_DIMENSION_PX = 128;
export const MAX_BOB_DIMENSION_DOTS = MAX_BOB_DIMENSION_PX / DOT_PX; // 32 dots
export const MAX_BOB_RAM_BYTES = 128 * 1024; // 128 KB
export const MAX_BOB_GIF_BYTES = 60 * 1024; // 60 KB

export class BobBlitter {
  private definitions = new Map<string | number, BobDefinition>();
  private instances = new Map<string | number, BobInstance>();

  /**
   * Register a new BOB animation asset.
   */
  defineBob(def: BobDefinition): void {
    if (
      def.widthDots > MAX_BOB_DIMENSION_DOTS ||
      def.heightDots > MAX_BOB_DIMENSION_DOTS
    ) {
      throw new Error(
        `BOB dimensions (${def.widthDots * DOT_PX}x${def.heightDots * DOT_PX}px) exceed maximum ${MAX_BOB_DIMENSION_PX}x${MAX_BOB_DIMENSION_PX}px limit`,
      );
    }
    if (!def.frames || def.frames.length === 0) {
      throw new Error(`BOB '${def.id}' must define at least one frame`);
    }
    const memory = this.calculateMemoryFootprint(def);
    if (!memory.fitsBudget) {
      throw new Error(
        `BOB '${def.id}' RAM footprint (${memory.ramBytes} bytes) exceeds maximum budget (${MAX_BOB_RAM_BYTES} bytes)`,
      );
    }
    this.definitions.set(def.id, def);
  }

  getDefinition(id: string | number): BobDefinition | undefined {
    return this.definitions.get(id);
  }

  hasDefinition(id: string | number): boolean {
    return this.definitions.has(id);
  }

  /**
   * Classic AMOS/BBC BASIC command: BOB number, x, y, frame.
   * Positions or creates a BOB instance at integer dot lattice coordinates.
   */
  bob(
    id: string | number,
    xDots: number,
    yDots: number,
    frame?: number,
  ): BobInstance {
    let instance = this.instances.get(id);
    if (!instance) {
      const def = this.definitions.get(id);
      if (!def) {
        throw new Error(
          `Cannot place undefined BOB '${id}'. Call defineBob() first.`,
        );
      }
      instance = {
        id,
        def,
        x: Math.round(xDots),
        y: Math.round(yDots),
        vx: 0,
        vy: 0,
        activeFrame: frame !== undefined ? frame % def.frames.length : 0,
        elapsedMs: 0,
        visible: true,
      };
      this.instances.set(id, instance);
    } else {
      instance.x = Math.round(xDots);
      instance.y = Math.round(yDots);
      if (frame !== undefined) {
        instance.activeFrame = frame % instance.def.frames.length;
      }
      instance.visible = true;
    }
    return instance;
  }

  /**
   * Hide a BOB (AMOS BOB OFF id).
   */
  bobOff(id: string | number): void {
    const inst = this.instances.get(id);
    if (inst) {
      inst.visible = false;
    }
  }

  removeBob(id: string | number): boolean {
    return this.instances.delete(id);
  }

  getInstance(id: string | number): BobInstance | undefined {
    return this.instances.get(id);
  }

  listInstances(): BobInstance[] {
    return Array.from(this.instances.values());
  }

  setVelocity(id: string | number, vx: number, vy: number): void {
    const inst = this.instances.get(id);
    if (inst) {
      inst.vx = vx;
      inst.vy = vy;
    }
  }

  /**
   * Advance animation frames and physics step over dot lattice.
   */
  step(
    deltaMs: number,
    bounds?: {
      minDotX: number;
      minDotY: number;
      maxDotX: number;
      maxDotY: number;
      bounce?: boolean;
    },
  ): void {
    for (const inst of this.instances.values()) {
      if (!inst.visible) continue;

      // Update position
      inst.x += inst.vx;
      inst.y += inst.vy;

      // Check bounds
      if (bounds) {
        const w = inst.def.widthDots;
        const h = inst.def.heightDots;
        if (inst.x < bounds.minDotX) {
          inst.x = bounds.minDotX;
          if (bounds.bounce) inst.vx = -inst.vx;
        } else if (inst.x + w > bounds.maxDotX) {
          inst.x = bounds.maxDotX - w;
          if (bounds.bounce) inst.vx = -inst.vx;
        }

        if (inst.y < bounds.minDotY) {
          inst.y = bounds.minDotY;
          if (bounds.bounce) inst.vy = -inst.vy;
        } else if (inst.y + h > bounds.maxDotY) {
          inst.y = bounds.maxDotY - h;
          if (bounds.bounce) inst.vy = -inst.vy;
        }
      }

      // Advance animation frame
      if (inst.def.frames.length > 1) {
        inst.elapsedMs += deltaMs;
        const currentFrameDuration =
          inst.def.frames[inst.activeFrame]?.durationMs ?? 83;
        while (inst.elapsedMs >= currentFrameDuration) {
          inst.elapsedMs -= currentFrameDuration;
          inst.activeFrame = (inst.activeFrame + 1) % inst.def.frames.length;
        }
      }
    }
  }

  /**
   * Check bounding box collisions between all active BOBs on dot lattice.
   */
  checkCollisions(): BobCollisionEvent[] {
    const collisions: BobCollisionEvent[] = [];
    const active = Array.from(this.instances.values()).filter((b) => b.visible);

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const b1 = active[i];
        const b2 = active[j];

        const r1: DotRect = b1.collisionBox ?? {
          x: b1.x,
          y: b1.y,
          w: b1.def.widthDots,
          h: b1.def.heightDots,
        };
        const r2: DotRect = b2.collisionBox ?? {
          x: b2.x,
          y: b2.y,
          w: b2.def.widthDots,
          h: b2.def.heightDots,
        };

        const left = Math.max(r1.x, r2.x);
        const right = Math.min(r1.x + r1.w, r2.x + r2.w);
        const top = Math.max(r1.y, r2.y);
        const bottom = Math.min(r1.y + r1.h, r2.y + r2.h);

        if (left < right && top < bottom) {
          collisions.push({
            bob1: b1,
            bob2: b2,
            overlapDots: {
              x: left,
              y: top,
              w: right - left,
              h: bottom - top,
            },
          });
        }
      }
    }
    return collisions;
  }

  /**
   * Blit all active visible BOBs onto a high-res PixelBuffer (1 dot = 4x4 px).
   */
  blitToPixelBuffer(
    buffer: PixelBuffer,
    bufWidthPx: number,
    bufHeightPx: number,
  ): void {
    const transparentIdx = 0;
    for (const inst of this.instances.values()) {
      if (!inst.visible) continue;

      const frame = inst.def.frames[inst.activeFrame];
      if (!frame) continue;

      const trans = inst.def.transparentIndex ?? transparentIdx;
      const originXpx = dotsToPx(inst.x);
      const originYpx = dotsToPx(inst.y);

      for (let dy = 0; dy < frame.heightDots; dy++) {
        for (let dx = 0; dx < frame.widthDots; dx++) {
          const color = frame.dots[dy * frame.widthDots + dx];
          if (color === trans || color === 0) continue;

          // Stamp 4x4 physical pixels for each dot
          const pxBase = originXpx + dx * DOT_PX;
          const pyBase = originYpx + dy * DOT_PX;

          for (let py = 0; py < DOT_PX; py++) {
            const targetY = pyBase + py;
            if (targetY < 0 || targetY >= bufHeightPx) continue;
            for (let px = 0; px < DOT_PX; px++) {
              const targetX = pxBase + px;
              if (targetX < 0 || targetX >= bufWidthPx) continue;
              setPixel(buffer, targetX, targetY, color, bufWidthPx, bufHeightPx);
            }
          }
        }
      }
    }
  }

  /**
   * Blit active BOBs onto a cell-based GridBuffer (Square 2x2 dots or Tall 3x5 dots).
   */
  blitToGridBuffer(
    grid: GridBuffer,
    reg: CellRegister = SQUARE_CELL,
  ): void {
    const dotW = registerDotsW(reg);
    const dotH = registerDotsH(reg);
    const numRows = grid.length;
    const numCols = grid[0]?.length ?? 0;

    for (const inst of this.instances.values()) {
      if (!inst.visible) continue;

      const frame = inst.def.frames[inst.activeFrame];
      if (!frame) continue;

      const trans = inst.def.transparentIndex ?? 0;

      for (let dy = 0; dy < frame.heightDots; dy++) {
        for (let dx = 0; dx < frame.widthDots; dx++) {
          const color = frame.dots[dy * frame.widthDots + dx];
          if (color === trans || color === 0) continue;

          const globalDotX = inst.x + dx;
          const globalDotY = inst.y + dy;

          const cellCol = Math.floor(globalDotX / dotW);
          const cellRow = Math.floor(globalDotY / dotH);

          if (cellRow >= 0 && cellRow < numRows && cellCol >= 0 && cellCol < numCols) {
            // Paint cell foreground / block mosaic
            const currentCell = grid[cellRow][cellCol];
            grid[cellRow][cellCol] = createBufferCell(
              "▣",
              color,
              currentCell?.bg ?? 0,
            );
          }
        }
      }
    }
  }

  calculateMemoryFootprint(def: BobDefinition): {
    ramBytes: number;
    fitsBudget: boolean;
  } {
    const pxW = dotsToPx(def.widthDots);
    const pxH = dotsToPx(def.heightDots);
    const framesCount = Math.max(1, def.frames.length);
    // Formula from GRIDCORE-STANDARDS.json: width * height * frames * 1 byte
    const ramBytes = pxW * pxH * framesCount * 1;
    return {
      ramBytes,
      fitsBudget: ramBytes <= MAX_BOB_RAM_BYTES,
    };
  }

  clear(): void {
    this.instances.clear();
  }

  reset(): void {
    this.instances.clear();
    this.definitions.clear();
  }
}

/**
 * Helper to construct a multi-frame BOB from ASCII art patterns.
 */
export function createBobFromAscii(
  id: string | number,
  asciiFrames: string[][],
  paletteMap: Record<string, number>,
  durationMs = 83,
): BobDefinition {
  const heightDots = asciiFrames[0]?.length ?? 0;
  const widthDots = asciiFrames[0]?.[0]?.length ?? 0;

  const frames: BobFrame[] = asciiFrames.map((lines) => {
    const dots = new Uint8Array(widthDots * heightDots);
    for (let y = 0; y < heightDots; y++) {
      const line = lines[y] || "";
      for (let x = 0; x < widthDots; x++) {
        const char = line[x] || " ";
        dots[y * widthDots + x] = paletteMap[char] ?? 0;
      }
    }
    return {
      widthDots,
      heightDots,
      dots,
      durationMs,
    };
  });

  return {
    id,
    widthDots,
    heightDots,
    frames,
    transparentIndex: 0,
  };
}
