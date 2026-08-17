# Teletext-Style Vault Reader — Architecture

**Status**: current (2026-08-17)
**Purpose**: The Teletext tab is uCode's **own Ceefax-inspired teletext-style
view** for published vault content. It does **not** repurpose BBC Ceefax pages —
it renders vault libraries/docs in a teletext visual language (double-height
titles, separated-graphics bars, 2×3 mosaics, fastext, rotating subpages).

## Implementation

Single active implementation lives in
`uCore/frontend-vue/src/surfaces/ucode/UCodeSurface.vue` (Sprint E deliverable):

- Fetches vault content over `/api/library/*` (Documentation / Global
  Knowledge / Learning libraries).
- Builds pages client-side: index `100`, news `101`, sub-index `199`,
  help `888`, and doc list/content pages (`200+`, `300+`, `400+`).
- Renders through `<gridui-canvas>` with the Bedstead (SAA5050) font,
  74×25 native cells at 16:9 (`fit-exact`).

### Page anatomy

- **Row 0** — header bar (blue; page, channel, clock).
- **Row 1** — flashing NEWFLASH banner or a separated-graphics colour bar.
- **Rows 2–5** — boxed double-height title (2×3 sextant edges).
- **Rows 6+** — body lines (vault content, doc titles/previews).
- **Row −2** — fastext (4 colour-coded F1–F4 links).
- **Row −1** — status bar (page, channel, subpage, clock).

### Controls

- Number keys `0–9` — page entry.
- `F1–F4` — fastext shortcuts.
- `ESC` / `B` — back.
- Subpages auto-rotate (~4 s); multi-screen docs paginate into subpages.

## Font

Bedstead (SAA5050, CC0, bjh21.me.uk/bedstead) is the **sole** Teletext face.

- BDF vendored at `uCore/frontend-vue/public/fonts/bedstead-20.bdf` (12×20).
- Baked to `glyph-atlas.bedstead.json` (298 glyphs) by
  `uCode/scripts/bake-bedstead-atlas.mjs`: ASCII + box-drawing (U+2500–257F) +
  block elements (U+2580–259F) + 2×3 sextants (U+1FB00–1FB3B).
- MODE7GX3 is removed.

## Deprecated / deferred

- The Python `/api/ceefax/*` store (`uCode/ucode_runtime/ceefax.py`) is no
  longer the content path — vault libraries via `/api/library/*` are.
- `packages/gridcore/src/teletext/` (canonical TypeScript page model) is not
  yet consumed by the frontend; convergence is deferred.

## Verification

- `vue-tsc --noEmit` — type safety.
- `vitest` — `glyph-atlas`, `render-seed`, `layer-map` suites.
- `pnpm test:golden` — Playwright golden baselines (`glyphs-terminal.png`,
  `glyphs-bedstead.png`).
