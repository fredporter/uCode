import { describe, expect, it } from "vitest";
import { actionFromPoint } from "../src/interaction";
import { readingCellRect, teletextReaderRegions } from "../src/teletext";

describe("modern Teletext semantic regions", () => {
  it("creates page links and FASTEXT targets in lattice coordinates", () => {
    const regions = teletextReaderRegions(
      ["NEWS ........ 101", "not a link"],
      74,
      25,
      [{ label: "Index", page: 100 }],
    );
    expect(regions.map((region) => region.id)).toEqual([
      "teletext-page-101-0",
      "teletext-fasttext-0",
    ]);
    expect(regions[0].bounds).toEqual(readingCellRect(0, 6, 74));
  });

  it("activates the same page action from a touch hit", () => {
    const regions = teletextReaderRegions(
      ["  200  Documentation"],
      74,
      25,
      [],
    );
    const bounds = regions[0].bounds;
    expect(
      actionFromPoint(regions, bounds.x + 1, bounds.y + 1, "touch")?.action,
    ).toEqual({ type: "page", page: 200 });
  });
});
