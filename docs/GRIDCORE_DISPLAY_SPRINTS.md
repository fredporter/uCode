# uCode — Runtime & GridCore/Display Sprint Series

**Status:** Historical implementation record; completion claim superseded by
`GRIDCORE_COMPLETION_MACRO_SPRINTS.md` (2026-08-27)
**Started:** 2026-08-14
**Goal:** Advance uCode from its current state to a fully working runtime and
GridCore/display system, with every tab fully functional and wired up.

## Scope

- **2 display modes:** Terminal, Teletext
- **3 editing tabs:** Pixel, Grid, Layer
- **Runtime:** real (non-mock) BASIC/ucode1 command dispatch over the Python bridge
- **Renderer:** pixel-perfect MODE7/G0 teletext + terminal rendering per
  `docs/GRIDUI_RENDERING_CONTRACT.md`

## Out of scope (notated in uCode2 repo)

- Minecraft / 3D lift / uCode2+ bridge work. Notated at
  `~/Code/uCode2/multimedia/docs/MINECRAFT_BRIDGE_PLAN.md`.

## Sprint sequence

### Sprint 0 — Foundation: unify the grid/cell model

- Reconcile `geometry/Cell` and `buffer/BufferCell` so they share one attribute
  shape (char/fg/bg/bold/flash/doubleHeight/doubleWidth/mosaic/width).
- Add `gridToBuffer` / `bufferToGrid` conversion so the Map-based `Grid`
  (surfaces) and 2D `GridBuffer` (editors) interoperate.
- Acceptance: one attribute contract; conversion round-trip tests; all tests pass.

### Sprint 1 — Runtime bridge: real dispatch

- Wire `RuntimeBridge.loadTeletextPage()` to the Python `teletext_page` RPC.
- Unify in-process / websocket / process modes with clean fallback + session state.
- Acceptance: CEEFAX/GRID/VAULT etc. return real runtime output; bridge tests pass.

### Sprint 2 — Display tab: Terminal

- Real ucode1 dispatch, VDU/ANSI parsing, scrollback, history, role colours,
  double-width/height, blink; pixel-perfect 80x24 / 40x25 zero-gap rendering.
- Acceptance: every dispatcher command maps to real output; terminal tests + demo.

### Sprint 3 — Display tab: Teletext

- G0 bitmap pipeline (Bedstead 12×20, atlas-first), 2x3 mosaic, double-height,
  flash/hold timer, FASTEXT colour links, page stack, sub-pages.
- Acceptance: rendering-contract checklist passes; zero-gap + correct mosaic + flash.

### Sprint 4 — Editing tab: Pixel

- Sub-cell (24x24) pixel editor: brush/eraser, colour picker (MODE7 8-colour),
  fill, undo/redo (GridEditor), live preview.
- Acceptance: draw/undo/redo/pick/render.

### Sprint 5 — Editing tab: Grid

- Character/tile editor: place chars, tile brush, selection + copy/paste/move,
  region fill, grid-line toggle, pan/zoom.
- Acceptance: char placement, selection ops, clipboard, consistent with GridEditor.

### Sprint 6 — Editing tab: Layer

- Layer editor over LayerComposer: 6 baseline layers (terrain, details,
  foreground, lighting, collision, entities), CRUD/reorder/visibility/opacity/
  blend/merge/lock, per-layer buffers, composition preview.
- Acceptance: full layer CRUD + composition renders top-down.

### Sprint 7 — Integration & hardening: the tab host

- Tabbed embeddable host (Terminal, Teletext, Pixel, Grid, Layer), shared store,
  cross-tab wiring (CEEFAX -> Teletext, edit -> live display), keyboard
  shortcuts, localStorage persistence, pixel/Playwright audit, docs round.
- Acceptance: all 5 tabs switch + share state; full build + test pass.

## Conventions

- Sprint files in `.tasker/sprint-YYYY-MM-DD.yaml`; cumulative items in
  `.tasker/dev-flow.yaml`.
- Update `devlog.yaml` each round; archive completed plans to `docs/archive/`;
  bump versions.
- Short ASCII commit messages; focused, test-backed diffs.
