# GridUI Rendering Contract — GridCore / uCode

**Date**: 2026-08-17
**Status**: v3 — Atlas-first bitmap rendering; Bedstead teletext; MODE7GX3 removed
**Purpose**: Defines the pixel-exact rendering contract for `<gridui-canvas>`.
All glyphs render as binary bitmaps (no `fillText`); the grid is a
`cols × rows` matrix whose cell size derives from the active font's native
glyph dimensions.

---

## Fonts

| Font | Glyph | Atlas | Used by |
|------|-------|-------|---------|
| `pressstart2p` | 8×8 | `glyph-atlas.terminal.json` (24×24 @3×) | Terminal, Glyphs |
| `bedstead` | 12×20 | `glyph-atlas.bedstead.json` (24×40 @2×, 298 glyphs) | Teletext, Grid, Layer, Pixel |

MODE7GX3 is **removed**. Bedstead (SAA5050, CC0) is the sole Teletext face.
The atlas is baked from `bedstead-20.bdf` by
`uCode/scripts/bake-bedstead-atlas.mjs`: ASCII + box-drawing (U+2500–257F) +
block elements (U+2580–259F) + 2×3 sextants (U+1FB00–1FB3B).

## Architecture

```
GridBuffer: GridCell[][]                ← grid-core/types.ts
  └── GridCell { char, fg, bg, bold?, blink?, mosaic?, dh? }
       ↓
<gridui-canvas> Web Component
  ├── Background: fillRect (+1px overlap, zero gaps)
  └── Glyph: GlyphAtlas → BitmapGlyphRenderer → binary fillRect
```

## Cell Sizing Modes

| Mode | Cell W×H | Glyph | Attribute |
|------|----------|-------|-----------|
| **native** | `glyphW·s × glyphH·s` (integer `s`) | fills cell, aspect-correct | default |
| **square** | `s × s` | fills the square cell | `square-cells` |
| **fit-exact** | `round(glyphW·s) × round(glyphH·s)`, fractional `s` | fills cell, aspect-correct | `fit-exact` |

`s` is whole device-pixels per glyph-pixel (crisp). `fit-exact` relaxes to a
fractional scale so the grid fills its container exactly while glyphs keep
their native aspect — no stretch, no gaps.

## Base Cell Algebra

Both fonts share a **4×4 device-pixel dot lattice** (4 = gcd(8,12) = gcd(8,20)):

| Register | Glyph | Dots | Default for |
|----------|-------|------|-------------|
| **square** | 8×8 | 2×2 | gaming, mapping, sprites/bobs |
| **tall** | 12×20 | 3×5 | docs, reading, teletext |

- Column pitch = lcm(8,12) = 24 px (6 dots) → 3 square cells = 2 tall cells.
- Row pitch = lcm(8,20) = 40 px (10 dots) → 5 square rows = 2 tall rows.
- Super-cell **24×40** tiles both exactly; sprites/bobs/emoji are free
  dot-rectangles with 1px motion. See `docs/GRID_CELL_ALGEBRA.md`.

## Surface Layout (UCodeSurface, route `/ucode`)

| Tab | Grid | Font | Cell mode | Frame |
|-----|------|------|-----------|-------|
| **Terminal** | 42×27 (40×25 content + 1-cell black margin) | `pressstart2p` | square 8×8 | C64 dark-blue bezel (4% pad); continuous block-cursor blink |
| **Teletext** | 74×25 | `bedstead` | native + `fit-exact` | 16:9, black border |
| **Grid** | 40×25 | `bedstead` | native | editor |
| **Layer** | 40×25 | `bedstead` | native | editor |
| **Pixel** | 24×24 | `bedstead` | native (sub-cell 24×24 bitmap) | 32-colour editor |
| **Glyphs** | 16×7 | `pressstart2p` / `bedstead` | native | inspector |

## Rendering Guarantees

- **Zero-gap backgrounds** — each cell bg is `fillRect(x, y, cellW + 1, cellH + 1)`.
- **Crisp glyphs** — binary bitmaps at uniform integer scale; `renderHalf`
  splits double-height glyphs top/bottom; `renderStretched` fills square /
  fractional cells without seams.
- **DPR** — canvas backing store = CSS dims × `devicePixelRatio`; integer-scaled
  cells stay crisp at any DPR.
- **Fit** — native mode grows in integer steps; `square-cells` and `fit-exact`
  fill the container (grid smaller than viewport centres; larger scrolls).

## Palettes

- `PALETTE_DARK` — 8-colour MODE 7 (indices 0–7): black `#000000`, red
  `#dc3545`, green `#198754`, yellow `#ffc107`, blue `#0d6efd`, magenta
  `#6f42c1`, cyan `#0dcaf0`, white `#f8f9fa`.
- `PALETTE_PIXEL_32` — 32-colour for the Pixel Editor: MODE 7 0–7, Bootstrap 4,
  greys, Fitzpatrick skin tones, deep shades.

## GridBuffer (canonical)

```typescript
interface GridCell {
  char: string            // single Unicode code point (incl. U+1FB00 sextants)
  fg: number              // palette index
  bg: number              // palette index
  bold?: boolean          // double-stroke
  blink?: boolean         // flash (teletext)
  mosaic?: boolean        // 2×3 mosaic block graphic
  dh?: "top" | "bottom"   // double-height half
}
type GridBuffer = GridCell[][]
```

## Web Component API

`<gridui-canvas>` attributes: `cols`, `rows`, `cell-size`, `char-width`,
`font`, `palette`, `gridlines`, `square-cells`, `fit-exact`, `fit-container`.
Methods: `setBuffer(buf)`, `clear()`, `refit()`. Events: `cell-click`,
`cell-hover`. Re-fits to its container via `ResizeObserver`.

## Verification

- `vue-tsc --noEmit` — type safety.
- `vitest` — `glyph-atlas`, `render-seed`, `layer-map` suites.
- `pnpm test:golden` — Playwright golden baselines (`glyphs-terminal.png`,
  `glyphs-bedstead.png`).
