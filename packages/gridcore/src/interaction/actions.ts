/** Renderer-independent actions shared by every GridCore surface. */

export type GridInputSource =
  | "keyboard"
  | "keypad"
  | "pointer"
  | "touch"
  | "pen"
  | "controller"
  | "program";

export type GridMoveDirection = "up" | "down" | "left" | "right";

export type GridAction =
  | { type: "activate"; targetId?: string }
  | { type: "back" }
  | { type: "move"; direction: GridMoveDirection; amount?: number }
  | { type: "select"; targetId?: string; extend?: boolean }
  | { type: "paint"; targetId?: string }
  | { type: "erase"; targetId?: string }
  | { type: "pan"; dx: number; dy: number }
  | { type: "zoom"; delta: number; anchor?: LatticePoint }
  | { type: "page"; delta?: number; page?: number }
  | { type: "subpage"; delta: number }
  | { type: "fasttext"; index: number }
  | { type: "tool"; tool: string }
  | { type: "context"; targetId?: string }
  | { type: "drag"; phase: "start" | "move" | "end"; at: LatticePoint }
  | { type: "input"; text: string };

export interface LatticePoint {
  x: number;
  y: number;
}

export interface GridActionEvent {
  action: GridAction;
  source: GridInputSource;
  timestamp: number;
  originalType?: string;
}

export function gridAction(
  action: GridAction,
  source: GridInputSource,
  originalType?: string,
  timestamp = Date.now(),
): GridActionEvent {
  return { action, source, originalType, timestamp };
}
