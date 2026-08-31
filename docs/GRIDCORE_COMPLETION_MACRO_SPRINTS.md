# GridCore Completion Macro-Sprints

**Status:** Active source of truth  
**Started:** 2026-08-27  
**Scope:** finish GridCore and the core uCode surfaces before production legacy
compatibility, stable SKIN/LENS contracts, or uCode 2 implementation.

Execution and evidence are tracked in
`UCODE1_COMPLETION_LONG_SPRINT_2026-08.md`. Software Library infrastructure,
redistributable proof capsules, and honest non-launchable research records may
proceed before this plan's release freeze; they do not constitute production
legacy compatibility.

This plan replaces feature-by-feature micro-sprints. A round should pursue a
whole macro-sprint until its exit gate passes, rather than stop after the next
visible control is wired. Existing detailed specifications remain normative;
this document controls delivery order and completion claims.

## Fixed product decisions

- The lattice is the base spatial unit; cells are square or reading-register
  projections over it.
- Terminal and modern Teletext are 16:9. Terminal/Pixel/Grid use the square
  register; Teletext uses the rectangular reading register. Authentic MODE 7
  remains a compatibility mode.
- Terminal is one automatic shell/BBC BASIC session, never a manual runtime
  selector.
- Keyboard, keypad, mouse, touch, pen and controller bindings resolve to the
  same semantic actions.
- Glyph scope is Western ASCII/Latin-1, authentic Teletext mosaics, curated
  retro-game/software symbols, and modern emoji. Unsupported host-font glyphs
  are compatibility references, not finished artwork.
- A view gets one contextual, scrollable asset library. It has no paging or
  square/reading switch.
- Layer uses six independent buffers: terrain, details, foreground, lighting,
  collision and entities only where a Grid document opts into channels. The
  Layer surface itself edits the addressed stack of fixed flat Grids defined by
  `GRID_WORLD_STACK_SPEC.md`.

## Macro A — Functional creation core

**Outcome:** Pixel, Grid and Layer behave as one dependable editor rather than
three demonstrations.

**Status (2026-08-28): Complete.** Pixel animations and composed Layer projects
have versioned, validated lossless persistence; Grid preserves dimensions and
document state across resize, import and tab changes. Pixel and Grid no longer
reset on remount, Layer preserves six independent buffers and has document-level
undo/redo, and the deliberately blank Grid canvas now presents one clear
character-painting task. GridCore's 146 tests, frontend integration tests,
type-check and production build pass.

- Move shared project/document, selection, history, clipboard and dirty-state
  behavior into tested GridCore modules.
- Finish Pixel draw/erase/fill/pick, zoom/pan, selection transforms, animation,
  onion skin, frame timing and sprite/BOB preview.
- Finish Grid typing, drawing, fill, line/shape/stamp, selection, clipboard,
  zoom/pan, resizing and gridline behavior.
- Finish Layer per-buffer editing, layer CRUD/order/visibility/lock/opacity/
  blend/merge, selection/clipboard, entity placement and map-coordinate data.
- Round-trip one project between Pixel assets, Grid composition and a layered
  scene without flattening or losing metadata.
- Add save/load/import/export and undo-boundary integration tests.

**Exit gate:** the same fixture is created, saved, reloaded and edited across
Pixel, Grid and Layer using both pointer and keyboard; all six layer buffers
survive byte-equivalent round trips; no editor presents a non-working control.

## Macro B — Runtime, reading and character system closure

**Outcome:** Terminal, Teletext and the character/asset system are dependable
enough to support real software and content.

**Status (2026-08-28): In progress.** Terminal now uses the canonical uCore API
origin rather than assuming the frontend origin; visible browser acceptance
executed `printf UCODE_BROWSER_OK` and displayed its real output with no console
errors. Glyphs now render as a scrollable main viewport instead of a fixed first
page, default to the supported Western glyph set, and constrain retro symbols
to box/block and reviewed useful shapes. Broader deterministic emoji and
sprite/BOB artwork curation remains open.

Terminal's core lifecycle is now browser-certified: ordinary zsh commands work,
`basic` enters the packaged BBC BASIC Console without a runtime selector,
`PRINT 6*7` returns `42`, `QUIT` restores the zsh prompt, and another shell
command succeeds. The visible prompt is preserved. uCore may host the API route,
but it delegates to the canonical uCode runtime; the standalone uCode Terminal
is the only graphical command-entry surface. Resize, paste, reconnect and
failure-state certification remain open.

The Glyph browser has since restored the fully rendered atlas viewport with
Terminal and Teletext presentations, while its sidebar supplies the shared
selection catalogue; choosing an entry opens it directly in Pixel. The prior
Layer compositor/GIS UI has been removed from the surface. Layer now browses a
native addressed World stack and hands one fixed flat Grid to the Grid editor,
as locked by `GRID_WORLD_STACK_SPEC.md` and tested by the world-stack suite.

- Certify real shell commands, automatic BBC BASIC entry/exit, resize,
  scrollback, paste, reconnect and failure states through the browser.
- Complete the modern vault-backed Teletext reader, navigation, subpages,
  FASTEXT, semantic links, accessibility and graphics authoring.
- Keep Teletext controls inside the 16:9 viewport. Keyboard page entry, canvas
  links and a touch/pointer keypad must dispatch through the same reader state
  machine; the keypad closes when its third digit resolves so reading remains
  primary.
- Present Teletext graphics tools as a collapsible in-viewport panel grouped by
  Tool, Ink, Edit and Stamps. Never flatten the graphics editor into a long
  toolbar. Preserve large touch targets and collapse to a single column on
  narrow viewports.
- Produce reviewed Ceefax-quality index, article, data, map and graphic pages.
- Keep reader templates within the physical 40×25 budget: seven two-line
  library entries per index page and thirteen body lines per article subpage.
  Convert published Markdown to Teletext-safe text instead of exposing source
  punctuation, front matter, HTML or raw link syntax.
- Finish deterministic Western text, Teletext mosaics, retro symbols, icons,
  sprites/BOBs and a defined core emoji pack; label broader platform emoji
  honestly and preserve complete grapheme sequences.
- Make the same asset move through Pixel, Grid, Layer and Teletext without
  alignment or conversion surprises.

**Exit gate:** shell → BBC BASIC → shell passes in one session; representative
Teletext pages pass desktop/touch goldens and all input paths; core catalogue
assets have reviewed rendering, provenance and licensing metadata.

Current visual coverage includes deterministic 40×25 goldens for the data,
map and graphics showcase compositions plus a narrow-viewport keypad
navigation/dismissal test. Vault article content remains model-tested rather
than golden-bound so published document changes do not invalidate screenshots.

## Macro C — Interface consolidation and visual polish

**Outcome:** all six surfaces look and behave like one finished application.

- Remove duplicated secondary toolbars and duplicate side-panel controls.
- Enforce the editor shell invariant: tab selector, scrollable interactive main
  viewport, and one sidebar containing all applicable controls. Never add a
  secondary toolbar between tabs and viewport. Keep glyph selection as the
  final sidebar section in every editing view.
- Keep runtime/reader controls inside their viewports; keep editor tools in a
  compact contextual rail or panel.
- Establish shared dimensions, spacing, iconography, selected/disabled states,
  scroll behavior, empty/error states and focus treatment.
- Correct glyph ink centring and sizing in square and reading cells.
- Polish desktop, narrow-window and coarse-touch layouts without long
  single-line overflow.
- Complete keyboard navigation, accessible names, live status, reduced motion
  and safe flash behavior.

**Exit gate:** reviewed screenshot matrix for every tab at desktop and touch
sizes; no clipped, duplicated, overflowing or orphaned controls; WCAG-oriented
keyboard/focus checks pass.

## Macro D — Release certification and freeze

**Outcome:** GridCore becomes a stable uCode 1 foundation that later work can
depend on without reopening its fundamentals.

- Consolidate unit, integration, golden and browser acceptance suites.
- Add performance budgets for atlas load/search, painting, composition,
  hit-testing, large maps and animation.
- Test BBC BASIC/MODE 7 compatibility fixtures and representative imported
  retro assets.
- Validate persisted formats, migration behavior and corrupted-input errors.
- Remove obsolete demos, dead controls, stale claims and contradictory specs.
- Publish the supported/unsupported matrix and freeze the GridCore/uCode 1
  contracts needed by the Software Library, capsules and SKIN/LENS.

**Exit gate:** clean install/build/test succeeds; browser acceptance and golden
matrix pass; performance budgets hold; no severity-1/2 GridCore defects remain;
the compatibility and persistence contracts are versioned and documented.

## Work after the freeze

Catalogue infrastructure and redistributable proof capsules may proceed while
Macro D closes. Only after Macro D closes may the programme promote production
legacy compatibility, begin the enhanced emulator-backed vertical slice,
stabilise public SKIN/LENS contracts, or hand frozen state to the separately
rescaffolded uCode 2.
