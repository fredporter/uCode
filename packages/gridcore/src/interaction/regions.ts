import type { GridAction, GridMoveDirection, LatticePoint } from "./actions";

export interface LatticeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GridRegionRole =
  | "button"
  | "link"
  | "cell"
  | "tool"
  | "document"
  | "graphics";

export interface GridRegion {
  id: string;
  bounds: LatticeRect;
  action: GridAction;
  label: string;
  role: GridRegionRole;
  disabled?: boolean;
  selected?: boolean;
  focusOrder?: number;
  zIndex?: number;
}

export function expandLatticeRect(rect: LatticeRect, amount: number): LatticeRect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

export function containsLatticePoint(rect: LatticeRect, point: LatticePoint): boolean {
  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x < rect.x + rect.width &&
    point.y < rect.y + rect.height
  );
}

/** Return the topmost enabled semantic region at a lattice point. */
export function hitTestGridRegions(
  regions: readonly GridRegion[],
  point: LatticePoint,
  coarseExpansion = 0,
): GridRegion | null {
  return (
    regions
      .filter(
        (region) =>
          !region.disabled &&
          containsLatticePoint(
            coarseExpansion
              ? expandLatticeRect(region.bounds, coarseExpansion)
              : region.bounds,
            point,
          ),
      )
      .sort(
        (a, b) =>
          (b.zIndex ?? 0) - (a.zIndex ?? 0) ||
          (a.focusOrder ?? 0) - (b.focusOrder ?? 0),
      )[0] ?? null
  );
}

export function focusableGridRegions(regions: readonly GridRegion[]): GridRegion[] {
  return regions
    .filter((region) => !region.disabled)
    .slice()
    .sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));
}

function regionCenter(region: GridRegion): LatticePoint {
  return {
    x: region.bounds.x + region.bounds.width / 2,
    y: region.bounds.y + region.bounds.height / 2,
  };
}

/** Spatial focus navigation independent of DOM order and rendering geometry. */
export function moveGridRegionFocus(
  regions: readonly GridRegion[],
  currentId: string | null,
  direction: GridMoveDirection,
): GridRegion | null {
  const focusable = focusableGridRegions(regions);
  if (!focusable.length) return null;
  const current = focusable.find((region) => region.id === currentId);
  if (!current) return focusable[0];
  const origin = regionCenter(current);
  const scored = focusable
    .filter((region) => region.id !== current.id)
    .map((region) => {
      const point = regionCenter(region);
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const primary =
        direction === "left"
          ? -dx
          : direction === "right"
            ? dx
            : direction === "up"
              ? -dy
              : dy;
      const secondary =
        direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
      return { region, primary, secondary };
    })
    .filter(({ primary }) => primary > 0)
    .sort(
      (a, b) =>
        a.primary - b.primary ||
        a.secondary - b.secondary ||
        (a.region.focusOrder ?? 0) - (b.region.focusOrder ?? 0),
    );
  return scored[0]?.region ?? current;
}
