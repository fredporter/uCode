import { gridAction, type GridActionEvent, type GridInputSource } from "./actions";
import { hitTestGridRegions, type GridRegion } from "./regions";

export interface GridKeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export function actionFromKey(
  input: GridKeyInput,
  source: GridInputSource = "keyboard",
): GridActionEvent | null {
  const direction = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  } as const;
  if (input.key in direction) {
    return gridAction(
      { type: "move", direction: direction[input.key as keyof typeof direction] },
      source,
      "keydown",
    );
  }
  if (input.key === "Enter" || input.key === " ")
    return gridAction({ type: "activate" }, source, "keydown");
  if (input.key === "Escape" || input.key === "Backspace")
    return gridAction({ type: "back" }, source, "keydown");
  if (input.key === "PageUp")
    return gridAction({ type: "page", delta: -1 }, source, "keydown");
  if (input.key === "PageDown")
    return gridAction({ type: "page", delta: 1 }, source, "keydown");
  if (input.key.length === 1 && !input.ctrlKey && !input.metaKey)
    return gridAction({ type: "input", text: input.key }, source, "keydown");
  return null;
}

export function actionFromPoint(
  regions: readonly GridRegion[],
  x: number,
  y: number,
  source: "pointer" | "touch" | "pen",
  coarseExpansion = source === "touch" ? 1 : 0,
): GridActionEvent | null {
  const region = hitTestGridRegions(regions, { x, y }, coarseExpansion);
  if (!region) return null;
  const action = ["activate", "select", "paint", "erase", "context"].includes(
    region.action.type,
  )
    ? { ...region.action, targetId: region.id }
    : { ...region.action };
  return gridAction(action, source, source === "touch" ? "tap" : "click");
}

export function actionFromSwipe(dx: number, dy: number): GridActionEvent | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 1) return null;
  if (Math.abs(dx) >= Math.abs(dy))
    return gridAction({ type: "page", delta: dx < 0 ? 1 : -1 }, "touch", "swipe");
  return gridAction({ type: "pan", dx: 0, dy }, "touch", "swipe");
}

export function actionFromControllerButton(button: string): GridActionEvent | null {
  const mapping = {
    up: { type: "move", direction: "up" },
    down: { type: "move", direction: "down" },
    left: { type: "move", direction: "left" },
    right: { type: "move", direction: "right" },
    primary: { type: "activate" },
    secondary: { type: "back" },
  } as const;
  const action = mapping[button as keyof typeof mapping];
  return action ? gridAction(action, "controller", "button") : null;
}
