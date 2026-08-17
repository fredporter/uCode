import { createGrid, type Grid } from "../geometry/grid";
import { FG } from "../terminal/terminal-surface";
import {
  FLASH,
  interpretTeletextLine,
  SEPARATED_GRAPHICS,
  STEADY,
} from "./control";

// ── Constants ─────────────────────────────────────────────────────

export const DEFAULT_TELETEXT_COLS = 40;
export const DEFAULT_TELETEXT_ROWS = 25;

// ── Types ─────────────────────────────────────────────────────────

export interface FastTextLink {
  color: "red" | "green" | "yellow" | "cyan";
  label: string;
  page: number;
}

export interface TeletextPage {
  page: number;
  title: string;
  date?: string;
  header: string;
  content: string[];
  fasttext: FastTextLink[];
  subpage?: number;
  flags?: Record<string, boolean>;
}

export type PageLoader = (
  pageNumber: number,
) => TeletextPage | Promise<TeletextPage>;

export interface TeletextSurfaceOptions {
  cols?: number;
  rows?: number;
  pageLoader?: PageLoader;
}

// ── Colour helpers ────────────────────────────────────────────────

const FASTEXT_COLORS: Record<FastTextLink["color"], number> = {
  red: FG.RED,
  green: FG.GREEN,
  yellow: FG.YELLOW,
  cyan: FG.CYAN,
};

// ── TeletextSurface ───────────────────────────────────────────────

export class TeletextSurface {
  readonly cols: number;
  readonly rows: number;

  private grid: Grid;
  private currentPage: TeletextPage | null = null;
  private pageLoader: PageLoader | null = null;
  private onChange: (() => void) | null = null;

  // Rich state
  private pageStack: number[] = [];
  private lastPage: number = 100;

  constructor(options: TeletextSurfaceOptions = {}) {
    this.cols = options.cols ?? DEFAULT_TELETEXT_COLS;
    this.rows = options.rows ?? DEFAULT_TELETEXT_ROWS;
    this.pageLoader = options.pageLoader ?? null;
    this.grid = createGrid(this.cols, this.rows);
  }

  // ── public API ──────────────────────────────────────────────────

  /** Set the page loader used to resolve page numbers to content */
  setPageLoader(loader: PageLoader): void {
    this.pageLoader = loader;
  }

  /** Register a callback for display changes */
  onDisplayChange(fn: () => void): void {
    this.onChange = fn;
  }

  /** Get the raw grid for rendering */
  getGrid(): Grid {
    return this.grid;
  }

  /** Get the current page number (or 0 if none loaded) */
  getCurrentPageNumber(): number {
    return this.currentPage?.page ?? 0;
  }

  /** Get the current page data */
  getCurrentPage(): TeletextPage | null {
    return this.currentPage;
  }

  /** Navigate to a page by number */
  async navigateTo(pageNumber: number): Promise<void> {
    // Push current page onto stack for "back" navigation
    if (this.currentPage) {
      this.pageStack.push(this.currentPage.page);
    }
    this.lastPage = pageNumber;
    await this.loadPage(pageNumber);
  }

  /** Go back to the previous page */
  async goBack(): Promise<void> {
    const prev = this.pageStack.pop();
    if (prev !== undefined) {
      this.lastPage = prev;
      await this.loadPage(prev);
    }
  }

  /** Load a page directly (without stack push) */
  async loadPage(pageNumber: number): Promise<void> {
    if (!this.pageLoader) {
      this.renderError(
        `No page loader configured. Cannot load page ${pageNumber}.`,
      );
      return;
    }

    try {
      const page = await this.pageLoader(pageNumber);
      this.currentPage = page;
      this.renderPage(page);
    } catch (err) {
      this.renderError(`Failed to load page ${pageNumber}: ${err}`);
    }
  }

  /** Load a page object directly (bypass loader) */
  loadPageObject(page: TeletextPage): void {
    this.currentPage = page;
    this.renderPage(page);
  }

  // ── Rendering ───────────────────────────────────────────────────

  private renderPage(page: TeletextPage): void {
    this.clearGrid();

    // Row 0: header bar (blue background, white text, double height)
    this.writeInterpretedRow(0, page.header, FG.WHITE, FG.BLUE, {
      doubleHeight: true,
    });

    // Row 1: mosaic block separator (full-width solid blocks)
    const separator =
      String.fromCharCode(SEPARATED_GRAPHICS) +
      String.fromCharCode(0x3f).repeat(this.cols);
    this.writeInterpretedRow(1, separator, FG.CYAN, FG.BLACK);

    // Rows 2-21: content area
    const contentStartRow = 2;
    const contentEndRow = this.rows - 4; // leave 3 rows for FASTEXT + status
    const maxContentRows = contentEndRow - contentStartRow + 1;

    for (let i = 0; i < Math.min(page.content.length, maxContentRows); i++) {
      this.writeInterpretedRow(
        contentStartRow + i,
        page.content[i],
        FG.YELLOW,
        FG.BLACK,
      );
    }

    // FASTEXT row: colored navigation links at bottom
    const fasttextRow = this.rows - 2;
    this.renderFastText(fasttextRow, page.fasttext);

    // Status row: page number (flashing), subpage indicator, date
    const statusRow = this.rows - 1;
    const subpageStr =
      page.subpage !== undefined && page.subpage > 0
        ? `/${page.subpage.toString().padStart(2, "0")}`
        : "";
    const statusText = `${String.fromCharCode(FLASH)}P${page.page}${subpageStr}${String.fromCharCode(STEADY)}  ${page.date ?? ""}`;
    this.writeInterpretedRow(statusRow, statusText, FG.GREEN, FG.BLACK);

    this.onChange?.();
  }

  private renderFastText(row: number, links: FastTextLink[]): void {
    if (links.length === 0) return;

    const segWidth = Math.floor(this.cols / links.length);
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const fg = FASTEXT_COLORS[link.color] ?? FG.WHITE;
      const startCol = i * segWidth;
      const label = ` ${link.label} `.padEnd(segWidth).slice(0, segWidth);
      this.writeRowSegment(
        row,
        startCol,
        label,
        fg,
        link.color === "red" ? FG.RED : FG.BLACK,
        true,
      );
    }
  }

  private renderError(message: string): void {
    this.clearGrid();
    this.writeRow(2, "ERROR", FG.RED, FG.BLACK, true);
    this.writeRow(4, message, FG.RED, FG.BLACK);
    this.onChange?.();
  }

  // ── cell helpers ────────────────────────────────────────────────

  private clearGrid(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid.cells.get(`${x}:${y}:0`);
        if (cell) {
          cell.char = " ";
          cell.fg = FG.WHITE;
          cell.bg = FG.BLACK;
        }
      }
    }
  }

  private writeRow(
    row: number,
    text: string,
    fg: number,
    bg: number,
    bold = false,
  ): void {
    for (let col = 0; col < this.cols; col++) {
      const key = `${col}:${row}:0`;
      const cell = this.grid.cells.get(key);
      if (cell) {
        cell.char = col < text.length ? text[col] : " ";
        cell.fg = fg;
        cell.bg = bg;
      }
    }
  }

  private writeRowSegment(
    row: number,
    startCol: number,
    text: string,
    fg: number,
    bg: number,
    bold = false,
  ): void {
    for (let i = 0; i < text.length && startCol + i < this.cols; i++) {
      const key = `${startCol + i}:${row}:0`;
      const cell = this.grid.cells.get(key);
      if (cell) {
        cell.char = text[i];
        cell.fg = fg;
        cell.bg = bg;
      }
    }
  }

  /** Write a row, interpreting teletext control codes into per-cell styling. */
  private writeInterpretedRow(
    row: number,
    text: string,
    defaultFg: number,
    defaultBg: number,
    initial: { doubleHeight?: boolean } = {},
  ): void {
    const cells = interpretTeletextLine(text, {
      fg: defaultFg,
      bg: defaultBg,
      doubleHeight: initial.doubleHeight,
    });
    for (let col = 0; col < this.cols; col++) {
      const key = `${col}:${row}:0`;
      const cell = this.grid.cells.get(key);
      if (!cell) continue;
      const tc = cells[col];
      if (tc) {
        cell.char = tc.char;
        cell.fg = tc.fg;
        cell.bg = tc.bg;
        cell.dh = tc.dh;
        cell.blink = tc.blink;
        if (tc.mosaic !== undefined) cell.mosaic = tc.mosaic;
      } else {
        cell.char = " ";
        cell.fg = defaultFg;
        cell.bg = defaultBg;
      }
    }
  }
}
