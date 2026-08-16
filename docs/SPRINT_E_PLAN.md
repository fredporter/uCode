# Sprint E (Expansion) — Teletext Ceefax: unification & polish

> Status: **planned** — expand in the morning.
> Parent work: Sprint A–E (glyph atlas → sextant seeds → layer maps → terminal → teletext Ceefax reader) is complete and pushed.
> Companion doc: `docs/TELETEXT_ARCHITECTURE.md` (the three-implementation reconciliation plan).

## Where we are (baseline)

- The Teletext tab reads **published vault content** over `/api/library/*`
  (Documentation / Global Knowledge / Learning libraries), renders boxed
  double-height titles, separated-graphics bars, and rotating subpages with
  fastext navigation. Backend runs from `~/Code/uCore/backend`:
  `python3 -m app --host 127.0.0.1 --port 8484`.
- Tech debt closed today: workspace task commands fixed, Playwright golden
  harness added (`pnpm test:golden`), Ceefax reconciliation doc written.

## Goal

Turn the working Teletext reader into the **single, unified** Ceefax surface:
one page model, one control-code source, richer pages, and a clean seam to the
Python content store.

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

## Verification

- `pnpm test:golden` — glyph + teletext regressions (update baselines on
  intentional changes).
- `pnpm test` (vitest) — new tests for the extracted module + provider.
- `vue-tsc --noEmit` — type safety across the extraction.
- Manual: page 250 (SNACKS_SKILLS_STATUS_AUDIT), subpage rotation, fastext.

## Open questions (expand in the morning)

1. Which vault sources beyond Documentation / Global Knowledge / Learning?
2. Is the Python `/api/ceefax/*` store the content authority, or the TS
   `TeletextPageProvider`? (Recommendation: TS provider owns *building*, Python
   owns *feed data*.)
3. Subpage hold semantics — hold-on-arrive vs. manual freeze toggle?
4. Logo page: uCode wordmark mosaic, or a BBC-style Test Card F?
5. Should the 48×36 Python buffer be resized to 40×25, or should the reader
   become size-tolerant?

## First actions tomorrow

1. Answer the open questions above.
2. Do **E1** (pure extraction, no behaviour change) with golden + vue-tsc as
   the safety net.
3. Commit E1 before touching E2–E4.
