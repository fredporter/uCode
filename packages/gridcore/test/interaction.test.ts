import { describe, expect, it } from "vitest";
import {
  actionFromControllerButton,
  actionFromKey,
  actionFromPoint,
  actionFromSwipe,
  hitTestGridRegions,
  moveGridRegionFocus,
  type GridRegion,
} from "../src/interaction";

const regions: GridRegion[] = [
  {
    id: "news",
    bounds: { x: 2, y: 3, width: 4, height: 2 },
    action: { type: "activate" },
    label: "News",
    role: "link",
  },
];

describe("GridCore semantic interaction", () => {
  it("maps keyboard navigation and activation to semantic actions", () => {
    expect(actionFromKey({ key: "ArrowRight" })?.action).toEqual({
      type: "move",
      direction: "right",
    });
    expect(actionFromKey({ key: "Enter" })?.action).toEqual({ type: "activate" });
    expect(actionFromKey({ key: "7" }, "keypad")?.action).toEqual({
      type: "input",
      text: "7",
    });
  });

  it("hit-tests pointer and expanded touch targets in lattice space", () => {
    expect(hitTestGridRegions(regions, { x: 2, y: 3 })?.id).toBe("news");
    expect(hitTestGridRegions(regions, { x: 1.5, y: 3 })).toBeNull();
    expect(actionFromPoint(regions, 1.5, 3, "touch")?.action).toEqual({
      type: "activate",
      targetId: "news",
    });
  });

  it("maps gestures and controllers without surface-specific events", () => {
    expect(actionFromSwipe(-4, 0)?.action).toEqual({ type: "page", delta: 1 });
    expect(actionFromControllerButton("primary")?.action).toEqual({
      type: "activate",
    });
  });

  it("moves semantic focus spatially rather than by DOM position", () => {
    const focusRegions: GridRegion[] = [
      ...regions,
      {
        id: "docs",
        bounds: { x: 8, y: 3, width: 4, height: 2 },
        action: { type: "activate" },
        label: "Docs",
        role: "link",
      },
      {
        id: "help",
        bounds: { x: 2, y: 8, width: 4, height: 2 },
        action: { type: "activate" },
        label: "Help",
        role: "link",
      },
    ];
    expect(moveGridRegionFocus(focusRegions, "news", "right")?.id).toBe("docs");
    expect(moveGridRegionFocus(focusRegions, "news", "down")?.id).toBe("help");
  });
});
