// ── Reader Teletext Model ─────────────────────────────────────────
// E1: extracted from uCore frontend-vue/src/surfaces/ucode/UCodeSurface.vue
// This is the "reader" model that drives the Ceefax-style vault teletext UI.
// The existing TeletextSurface/TeletextPage in teletext-surface.ts is a
// separate "control-code interpreter" model; unification is E2-E4.
// ────────────────────────────────────────────────────────────────────

import { patternToChar } from "../seeds";

// ── Constants ─────────────────────────────────────────────────────

export const TELETEXT_FASTEXT = [
  { label: "Index", color: 1, page: 100 },
  { label: "Docs", color: 2, page: 200 },
  { label: "Knowledge", color: 3, page: 300 },
  { label: "Help", color: 4, page: 888 },
];

export const DOCS_PER_LIST_PAGE = 14;
export const MAX_DOCS_PER_LIBRARY = 48;
export const DOC_PAGE_OFFSET = 50;
export const DOC_SCREEN_LINES = 15;

// ── Types ─────────────────────────────────────────────────────────

/** A vault document (from /api/library/search). */
export interface VaultDoc {
  path: string;
  filename: string;
  binder: string | null;
  tags: string[];
  preview: string;
  extension: string;
}

/** A library grouping for teletext page ranges. */
export interface VaultLibrary {
  id: string;
  label: string;
  source: string;
  tag: string | null;
  page: number;
  colour: number;
  docs: VaultDoc[];
}

/** A static public library definition for mapping vault sources → page ranges. */
export interface PublicLibraryDef {
  id: string;
  label: string;
  source: string;
  tag: string | null;
  page: number;
  colour: number;
}

/** The rendered teletext page model (reader style), not control-code style. */
export interface ReaderTeletextPage {
  title: string;
  lines: string[];
  flash?: boolean;
  colour?: number;
  subpages?: number;
}

/** A minimal GridBuffer-like interface that the renderers target. */
export interface ReaderBufferCell {
  char: string;
  fg: number;
  bg: number;
  dh?: "top" | "bottom";
  mosaic?: boolean;
  blink?: boolean;
}

export type ReaderBuffer = ReaderBufferCell[][];

// ── Helpers ───────────────────────────────────────────────────────

export function docTitle(doc: VaultDoc): string {
  const base = doc.filename.replace(/\.[^.]+$/, "");
  const title = base.replace(/[-_]+/g, " ").trim();
  return title || doc.filename;
}

export function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) {
      out.push("");
      continue;
    }
    let rest = line;
    while (rest.length > width) {
      const cut = rest.lastIndexOf(" ", width);
      const at = cut < 1 ? width : cut;
      out.push(rest.slice(0, at).trimEnd());
      rest = rest.slice(at).trimStart();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/** Library that owns a given page number (by hundred-block). */
export function libraryForPage(page: number, libraries: VaultLibrary[]): VaultLibrary | undefined {
  const base = Math.floor(page / 100) * 100;
  return libraries.find((lib) => lib.page === base);
}

/** Rotating subpage index (0-based) within the current page. */
export const teletextSubpage = ref(0);

/** Tick counter for subpage auto-rotation. */
export let teletextTick = 0;

/** Split a document's wrapped body into screens of ~15 lines. */
export function docScreens(doc: VaultDoc): string[][] {
  const body = doc.path && vaultDocCache?.get(doc.path) ?? doc.preview;
  const wrapped = wrapText(body, 38);
  const screens: string[][] = [];
  for (let i = 0; i < wrapped.length; i += DOC_SCREEN_LINES) {
    screens.push(wrapped.slice(i, i + DOC_SCREEN_LINES));
  }
  return screens.length > 0 ? screens : [[]];
}

/** Fetch one library source's document list. */
export async function fetchVaultSource(source: string): Promise<VaultDoc[]> {
  const res = await fetch(UCORE_API + "/api/library/search?q=" + encodeURIComponent(source) + "&limit=400");
  if (!res.ok) throw new Error("HTTP " + res.status + " (" + source + ")");
  const data = await res.json();
  const raw = Array.isArray(data.results) ? data.results : [];
  return raw.map((d) => {
    const item = d as Record<string, unknown>;
    const tags = Array.isArray(item.tags) ? (item.tags as string[]) : [];
    return {
      path: String(item.path ?? ""),
      filename: String(item.filename ?? ""),
      binder: item.binder ? String(item.binder) : null,
      tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
      preview: String(item.preview ?? ""),
      extension: String(item.extension ?? ""),
    };
  });
}

/** Fetch the published vault index and group docs into libraries. */
export async function loadVaultContent(): Promise<void> {
  try {
    const sources = new Set(PUBLIC_LIBRARY_DEFS.map((def) => def.source));
    const fetched = new Map<string, VaultDoc[]>();
    await Promise.all(
      Array.from(sources).map(async (source) => {
        fetched.set(source, await fetchVaultSource(source));
      }),
    );
    vaultLibraries.value = PUBLIC_LIBRARY_DEFS.map((def) => {
      const all = fetched.get(def.source) ?? [];
      const docs = (def.tag ? all.filter((d) => d.tags.includes(def.tag)) : all)
        .filter((d) => d.extension === "md" || d.extension === "markdown")
        .slice(0, MAX_DOCS_PER_LIBRARY);
      return { ...def, docs };
    });
    vaultError.value = null;
  } catch (e) {
    vaultError.value = e instanceof Error ? e.message : String(e);
  } finally {
    vaultLoaded.value = true;
    renderTeletextPage();
  }
}

/** Ceefax-style clock: `Mon 16 Aug 21:00/12`. */
export function ceefaxClock(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dd = String(d.getDate()).padStart(2, " ");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${days[d.getDay()]} ${dd} ${months[d.getMonth()]} ${hh}:${mm}/${ss}`;
}

/** Write a double-height string: top half in row y, bottom half in row y+1. */
export function writeDoubleHeight(buf: ReaderBuffer, x: number, y: number, text: string, fg: number, bg: number): void {
  const cols = buf[0]?.length ?? 0;
  for (let i = 0; i < text.length && x + i < cols; i++) {
    if (y >= 0 && y < buf.length)
      buf[y][x + i] = { char: text[i], fg, bg, dh: "top" };
    if (y + 1 >= 0 && y + 1 < buf.length)
      buf[y + 1][x + i] = { char: text[i], fg, bg, dh: "bottom" };
  }
}

/** Write a full-width horizontal rule of mosaic blocks (▀ upper-half). */
export function writeMosaicRule(buf: ReaderBuffer, y: number, color: number): void {
  const cols = buf[0]?.length ?? 0;
  if (y < 0 || y >= buf.length) return;
  for (let c = 0; c < cols; c++) {
    buf[y][c] = { char: "\u2580", fg: color, bg: 0, mosaic: true };
  }
}

/** Write a full-width separated-graphics bar (top-row sextant blocks). */
export function writeSeparatedBar(buf: ReaderBuffer, y: number, color: number): void {
  const cols = buf[0]?.length ?? 0;
  if (y < 0 || y >= buf.length) return;
  for (let c = 0; c < cols; c++) {
    buf[y][c] = { char: patternToChar(3), fg: color, bg: 0, mosaic: true };
  }
}

/** Draw a boxed double-height title using 2×3 sextant edges. */
export function writeBoxedDoubleHeightTitle(buf: ReaderBuffer, title: string, colour: number): void {
  const c = buf[0]?.length ?? 0;
  const t = title.slice(0, 18);
  const innerW = Math.max(t.length + 2, 4); // title + left/right border
  const x = Math.max(0, Math.floor((c - innerW) / 2));
  const set = (row: number, col: number, pattern: number): void => {
    if (row >= 0 && row < buf.length && col >= 0 && col < c) {
      buf[row][col] = {
        char: patternToChar(pattern),
        fg: colour,
        bg: 0,
        mosaic: true,
      };
    }
  };
  // Top border + corners.
  set(2, x, 23);
  for (let i = 1; i < innerW - 1; i++) set(2, x + i, 3);
  set(2, x + innerW - 1, 43);
  // Left/right walls (rows 3-4).
  set(3, x, 21);
  set(4, x, 21);
  set(3, x + innerW - 1, 42);
  set(4, x + innerW - 1, 42);
  // Bottom border + corners.
  set(5, x, 53);
  for (let i = 1; i < innerW - 1; i++) set(5, x + i, 48);
  set(5, x + innerW - 1, 58);
  // Double-height title inside (yellow).
  for (let i = 0; i < t.length; i++) {
    const col = x + 1 + i;
    buf[3][col] = { char: t[i], fg: 3, bg: 0, dh: "top" };
    buf[4][col] = { char: t[i], fg: 3, bg: 0, dh: "bottom" };
  }
}

// ── Page Builders (stateless, pure functions where possible) ─────
// These are the builders currently inline in UCodeSurface.vue.
// They don't capture refs/state here; instead, they accept the loaded data
// (vaultLibraries, vaultLoaded, vaultError) and return a ReaderTeletextPage.
// ────────────────────────────────────────────────────────────────────

interface BuilderContext {
  vaultLibraries: VaultLibrary[];
  vaultLoaded: boolean;
  vaultError: string | null;
  /** Optional: doc content cache (path → full text) for multi-screen docs. */
  vaultDocCache?: Map<string, string>;
  /** Optional: current subpage index (0-based) for doc pages. */
  teletextSubpage?: number;
}

export function mainIndexPage(ctx: BuilderContext): ReaderTeletextPage {
  const { vaultLibraries, vaultLoaded, vaultError } = ctx;
  if (!vaultLoaded) {
    return {
      title: "uCode",
      colour: 6,
      lines: ["", "  Loading published content...", "  (vault index)"],
    };
  }
  if (vaultError) {
    return {
      title: "uCode",
      colour: 1,
      lines: [
        "",
        `  Vault unavailable: ${vaultError.slice(0, 30)}`,
        "",
        "  NEWS ............... 101",
        "  HELP ............... 888",
        "  INDEX .............. 199",
      ],
    };
  }
  const lines: string[] = [
    "  uCODE TELETEXT READER",
    "  Published vault content",
    "",
  ];
  for (const lib of vaultLibraries) {
    const count = lib.docs.length;
    lines.push(
      `  ${lib.label.toUpperCase()} ${"".padEnd(Math.max(1, 18 - lib.label.length), ".")} ${lib.page}  (${count})`,
    );
  }
  lines.push("");
  lines.push("  NEWS ............... 101");
  lines.push("  HELP ............... 888");
  lines.push("  INDEX .............. 199");
  lines.push("");
  lines.push("  Type 0-9 for page number");
  lines.push("  F1-F4 fastext shortcuts");
  return { title: "uCode", colour: 6, lines };
}

export function docListPage(
  lib: VaultLibrary,
  listIdx: number,
  ctx: BuilderContext,
): ReaderTeletextPage {
  if (!ctx.vaultLoaded) {
    return {
      title: lib.label,
      colour: lib.colour,
      lines: ["", "  Loading published content..."],
    };
  }
  const docs = lib.docs;
  const start = listIdx * DOCS_PER_LIST_PAGE;
  const pageDocs = docs.slice(start, start + DOCS_PER_LIST_PAGE);
  const lines: string[] = [
    `  ${lib.label.toUpperCase()} (${docs.length} docs)`,
    "",
  ];
  if (pageDocs.length === 0) {
    lines.push("  No documents indexed yet.");
    lines.push("  Add files under the Public");
    lines.push("  vault and rebuild the index.");
  } else {
    pageDocs.forEach((doc, i) => {
      const readPage = lib.page + DOC_PAGE_OFFSET + start + i;
      lines.push(
        `  ${String(readPage).padStart(3, " ")}  ${docTitle(doc).slice(0, 29)}`,
      );
      lines.push(`       ${doc.preview.slice(0, 32)}`);
    });
  }
  const nextStart = start + DOCS_PER_LIST_PAGE;
  if (nextStart < docs.length) {
    lines.push("");
    lines.push(`  MORE ............... ${lib.page + 1 + listIdx + 1}`);
  }
  return { title: lib.label, colour: lib.colour, lines };
}

/** Split a document's wrapped body into screens of ~15 lines. */
export function docScreens(doc: VaultDoc): string[][] {
  const body = doc.path && vaultDocCache?.get(doc.path) ?? doc.preview;
  const wrapped = wrapText(body, 38);
  const screens: string[][] = [];
  for (let i = 0; i < wrapped.length; i += DOC_SCREEN_LINES) {
    screens.push(wrapped.slice(i, i + DOC_SCREEN_LINES));
  }
  return screens.length > 0 ? screens : [[]];
}

export function docContentPage(
  lib: VaultLibrary,
  docIdx: number,
  ctx: BuilderContext,
): ReaderTeletextPage {
  const doc = lib.docs[docIdx];
  if (!doc) {
    return {
      title: "P??",
      colour: lib.colour,
      lines: ["  Document not found."],
    };
  }
  const screens = docScreens(doc, ctx);
  const total = screens.length;
  const subpage =
    ctx.teletextSubpage !== undefined
      ? Math.min(ctx.teletextSubpage, total - 1)
      : 0;
  const lines: string[] = [
    `  ${docTitle(doc).slice(0, 36)}`,
    `  ${doc.filename.slice(0, 36)}`,
    "",
  ];
  for (const line of screens[subpage]) lines.push(`  ${line.slice(0, 38)}`);
  lines.push("");
  lines.push(`  Back: ${lib.page}  ·  ESC to go back`);
  return {
    title: docTitle(doc).slice(0, 14),
    colour: lib.colour,
    lines,
    subpages: total,
  };
}

export function newsPage(): ReaderTeletextPage {
  return {
    title: "NEWS",
    flash: true,
    colour: 2,
    lines: [
      "  Teletext reader wired to the",
      "  public vault index.",
      "",
      "  DOCUMENTATION ....... 200",
      "  GLOBAL KNOWLEDGE .... 300",
      "  LEARNING ............ 400",
      "",
      "  Type a 3-digit page number",
      "  to browse published content.",
    ],
  };
}

export function subIndexPage(): ReaderTeletextPage {
  return {
    title: "INDEX",
    colour: 3,
    lines: [
      "  100  Main Index",
      "  101  News Headlines",
      "  200  Documentation",
      "  300  Global Knowledge",
      "  400  Learning",
      "  888  Help and About",
    ],
  };
}

export function helpPage(): ReaderTeletextPage {
  return {
    title: "HELP",
    colour: 4,
    lines: [
      "  Number keys 0-9 navigate",
      "  F1-F4 fastext shortcuts",
      "  ESC or B goes back",
      "",
      "  uCode GridCore teletext",
      "  reader with G0 rendering",
      "",
      "  Content from the public",
      "  vault (published docs).",
    ],
  };
}

/** Map a page number to a ReaderTeletextPage. */
export function teletextContent(
  page: number,
  ctx: BuilderContext,
): ReaderTeletextPage {
  const lib = libraryForPage(page, ctx.vaultLibraries);
  if (lib) {
    const docIdx = page - lib.page - DOC_PAGE_OFFSET;
    if (docIdx >= 0 && docIdx < lib.docs.length) {
      return docContentPage(lib, docIdx, ctx);
    }
    const listIdx = page - lib.page - 1;
    if (listIdx >= 0) return docListPage(lib, listIdx, ctx);
    return docListPage(lib, 0, ctx);
  }

  switch (page) {
    case 100:
      return mainIndexPage(ctx);
    case 101:
      return newsPage();
    case 199:
      return subIndexPage();
    case 888:
      return helpPage();
    default:
      return {
        title: `P${page}`,
        colour: 6,
        lines: ["  Press 100 for Main Index", "  Press 199 for Full Index"],
      };
  }
}
