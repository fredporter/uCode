# Sprint E (Expansion) — Teletext-style Vault Reader

> Status: **complete** (2026-08-17).
> Parent work: Sprint A–E (glyph atlas → sextant seeds → layer maps → terminal → teletext) is complete and pushed.
> Companion doc: `docs/TELETEXT_ARCHITECTURE.md` (teletext-style vault reader).
> Direction: uCode builds its **own** Ceefax-inspired teletext view for
> published vault content — not a repurposing of BBC Ceefax pages.

## Where we are (baseline)

- The Teletext tab reads **published vault content** over `/api/library/*`
  (Documentation / Global Knowledge / Learning libraries), renders boxed
  double-height titles, separated-graphics bars, and rotating subpages with
  fastext navigation. Backend runs from `~/Code/uCore/backend`:
  `python3 -m app --host 127.0.0.1 --port 8484`.
- Tech debt closed today: workspace task commands fixed, Playwright golden
  harness added (`pnpm test:golden`), Ceefax reconciliation doc written.

## Goal

Ship the Teletext tab as a **teletext-style viewer for uCode's own vault
content**: Bedstead (SAA5050) rendering at 16:9, double-height titles,
separated-graphics bars, fastext and subpage rotation — driven by
`/api/library/*` vault libraries rather than external Ceefax content.

## Workstreams

### 1. Unification (from `TELETEXT_ARCHITECTURE.md`)

- [ ] **E1** — Extract the Vue teletext page model + helpers from
      `UCodeSurface.vue` into `frontend-vue/src/grid-core/teletext/` with
      identical behaviour (`TeletextPage`, `TeletextBuilder`, control-code
      writers). Verify: golden + vue-tsc + manual page 250.
- [ ] **E2** — Re-point those types/helpers at the canonical
      `@udos/gridcore` teletext package; delete the local duplicates.
- [ ] **E3** — Adopt the shared page JSON schema (rows × cols cells with
      char/fg/bg/doubleHeight/mosaic) in Python `/api/ceefax/*`.
- [ ] **E4** — Add a vault-doc `TeletextPageProvider` in gridcore and feed the
      Vue shell from it.

### 2. Reader polish

- [ ] Subpage **hold** (freeze auto-rotation; resume on demand).
- [ ] **Search page** — type a title, jump to the matching doc page.
- [ ] Direct **page-number entry** (3-digit, Ceefax-style).
- [ ] Fastext labels on every page (not just index/help).

### 3. Content richness

- [ ] **Mosaic logo / Test Card F** (sextant graphics on a dedicated page,
      e.g. page 199 or a uCode logo page).
- [ ] More vault sources/sections (decide which in the morning — see open
      questions).
- [ ] **Feed-backed pages** from `/api/ceefax/feed/latest` (Python store),
      rendered through the shared page JSON.

### 4. Rendering polish

- [ ] Flash/steady animation timing (currently static).
- [ ] Colour-coded section headers per library.
- [ ] Double-height split + mosaic verification across all pages.

### 5. Font fidelity (Bedstead)

MODE7GX3 removed; Bedstead (12×20, true SAA5050, CC0) is now the sole
Teletext face.

- [x] Obtain Bedstead (BDF bitmap + OTF outline from bjh21.me.uk/bedstead);
      vendored at `uCore/frontend-vue/public/fonts/bedstead-20.bdf` and
      `bedstead.otf`.
- [x] Add a **12×20** Bedstead bake: `uCode/scripts/bake-bedstead-atlas.mjs`
      reads the BDF directly (pixel-perfect, no FontForge needed) → writes
      `glyph-atlas.bedstead.json` (12×20, cell 24×40 @2×). Bakes ASCII +
      box-drawing (U+2500–257F) + block elements (U+2580–259F) + 2×3 sextants
      (U+1FB00–1FB3B) so the teletext view renders the same symbols/blocks as
      Terminal.
- [x] Add a renderer for 12×20 (`bedsteadRenderer`, mosaic + atlas) in
      `gridui-canvas` + the Pixel Editor; `renderHalf` 10/10 split confirmed,
      mosaic `subH = glyphH/3` ≈ 6.67 rows.
- [x] Remove MODE7GX3: deleted `MODE7GX3.TTF`, `glyph-atlas.teletext.json`,
      `bake-teletext-atlas.mjs`, the `G0Renderer` class, and all
      `mode7gx3`/`teletextFont` references. Teletext, Grid, Layer and the
      Pixel Editor now use Bedstead; the Glyphs tab has Terminal + Bedstead.
- [x] Regenerate golden baselines (default teletext face changed to Bedstead).

## Verification

- `pnpm test:golden` — glyph + teletext regressions (update baselines on
  intentional changes).
- `pnpm test` (vitest) — new tests for the extracted module + provider.
- `vue-tsc --noEmit` — type safety across the extraction.
- Manual: page 250 (SNACKS_SKILLS_STATUS_AUDIT), subpage rotation, fastext.

## Decisions (resolved 2026-08-17)

1. **Content** — uCode's own vault content (Documentation / Global Knowledge /
   Learning) rendered in a teletext style; not BBC Ceefax pages.
2. **Content authority** — the Vue reader builds pages client-side from
   `/api/library/*`; the Python `/api/ceefax/*` store is deprecated for this
   surface.
3. **Font** — Bedstead (SAA5050) is the default and sole Teletext face;
   MODE7GX3 removed.
4. **Layout** — 74×25 native 12×20 cells at 16:9 (`fit-exact`), no stretching.
5. **Unification (E1–E4)** — deferred; the inline reader is the single
   implementation for now.

## Next steps (optional polish)

- Subpage hold, search page, and 3-digit page entry.
- Mosaic logo page (uCode wordmark or a Test Card F style page).
- Flash timing and colour-coded section headers.
