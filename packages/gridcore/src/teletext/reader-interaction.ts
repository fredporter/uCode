import { registerDotsH, registerDotsW, TALL_CELL } from "../coordinates/dot";
import type { GridRegion, LatticeRect } from "../interaction";

export interface ReaderFasttextLink {
  label: string;
  page: number;
}

export function readingCellRect(
  col: number,
  row: number,
  width: number,
  height = 1,
): LatticeRect {
  const latticeWidth = registerDotsW(TALL_CELL);
  const latticeHeight = registerDotsH(TALL_CELL);
  return {
    x: col * latticeWidth,
    y: row * latticeHeight,
    width: width * latticeWidth,
    height: height * latticeHeight,
  };
}

/** Semantic page and FASTEXT regions for the modern Teletext reader. */
export function teletextReaderRegions(
  lines: readonly string[],
  cols: number,
  rows: number,
  fasttext: readonly ReaderFasttextLink[],
): GridRegion[] {
  const regions: GridRegion[] = [];
  lines.forEach((line, index) => {
    const match = line.match(/\b(\d{3})\b/);
    if (!match) return;
    const page = Number(match[1]);
    regions.push({
      id: `teletext-page-${page}-${index}`,
      bounds: readingCellRect(0, 6 + index, cols),
      action: { type: "page", page },
      label: line.trim(),
      role: "link",
      focusOrder: index,
    });
  });

  const segmentWidth = Math.floor(cols / Math.max(1, fasttext.length));
  fasttext.forEach((link, index) => {
    regions.push({
      id: `teletext-fasttext-${index}`,
      bounds: readingCellRect(index * segmentWidth, rows - 2, segmentWidth),
      action: { type: "fasttext", index },
      label: `${link.label}, page ${link.page}`,
      role: "link",
      focusOrder: 100 + index,
    });
  });
  return regions;
}
