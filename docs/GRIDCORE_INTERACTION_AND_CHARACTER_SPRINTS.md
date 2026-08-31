# GridCore Interaction and Character Completion Sprints

**Status:** Active frontend completion plan  
**Date:** 2026-08-26

Delivery is now grouped by `GRIDCORE_COMPLETION_MACRO_SPRINTS.md`. The detailed
requirements below remain normative, but individual sections do not authorize
a product-complete claim until the corresponding macro-sprint exit gate passes.

This plan begins after the unified Terminal backend gate. It modernises the
interaction model without losing Ceefax, BBC BASIC, MODE 7, or retro-software
compatibility.

## Decisions that prevent drift

1. A **lattice** is the base spatial unit. A cell is a derived rectangular or
   square register over one or more lattice units.
2. Terminal and Teletext are both 16:9 surfaces. Terminal uses square cells;
   the modern Teletext reader uses rectangular reading cells. Authentic 40x25
   MODE 7 remains a compatibility view, not the modern reader geometry.
3. Traditional keyboard/keypad operations are bindings, not the interaction
   model. Keyboard, mouse, touch, pen and controller input resolve to the same
   semantic `GridAction` commands.
4. A Unicode code point is not always a visible character. The character
   system stores grapheme sequences and presentation metadata explicitly.
5. Fonts, glyphs, symbols, icons, emoji, Teletext mosaics and sprites are
   related but not interchangeable:
   - **font**: a rendering source and metrics;
   - **glyph**: a deterministic bitmap/vector presentation for a grapheme;
   - **symbol/icon**: a semantic glyph with a stable uCode identifier;
   - **emoji**: a Unicode grapheme sequence with monochrome/pixel/colour forms;
   - **Teletext mosaic**: procedural 2x3 block data with contiguous/separated
     presentation;
   - **sprite/BOB**: a multi-lattice asset with frames, origin and behavior.

## Sprint B0 — Backend and Terminal closure

**Goal:** establish one dependable command surface before frontend expansion.

- One shell PTY and WebSocket; no manual runtime selector.
- Normal shell commands at the prompt.
- `basic` / `bbcbasic` enters BBC BASIC Console; `QUIT` returns to shell.
- Dedicated text-input capture for keyboard, IME, paste and touch keyboards.
- Navigation/control keys, resize, scrollback and disconnect recovery.
- Packaged, pinned Console engine per supported host.
- Browser-level acceptance: click Terminal, type a shell command, enter BASIC,
  execute a BASIC statement, quit, and execute another shell command.

**Exit:** the sequence above passes without developer-only environment wiring.

## Sprint F1 — Shared interaction and character foundation

**Goal:** give every GridCore view one vocabulary for input and visible units.

**Status (2026-08-26):** Complete. Canonical action, lattice-region,
keyboard/keypad/pointer/touch/pen/controller binding, grapheme, glyph-reference,
mosaic and asset-reference types are implemented. Teletext page rows and
FASTEXT links are the first integrated semantic-region consumer; mouse and
document-link navigation have passed visible browser checks. Spatial keyboard
focus, Enter activation, hover focus, accessible region labels, coarse-touch
targets and swipe routing are implemented; the canonical suite and frontend
build gates pass.

- Introduce `GridAction` (`activate`, `back`, `move`, `select`, `paint`, `erase`,
  `pan`, `zoom`, `page`, `subpage`, `fasttext`, `tool`, `context`, `drag`).
- Add input adapters for keyboard/keypad, pointer, touch/pen gestures and
  controller/gamepad.
- Add semantic lattice regions with hit testing, focus order, accessible names,
  selected/disabled state and coarse-pointer target expansion.
- Define `Grapheme`, `GlyphRef`, `GlyphMetrics`, `MosaicPattern`, `AssetRef` and
  sprite-frame types independently of the renderer.
- Replace `charCodeAt(0)` assumptions with code-point/grapheme-safe indexing.
- Make square and reading registers consume the same character catalogue while
  retaining their own metrics and presentation rules.

**Exit:** the same fixture is navigable and activatable with keyboard, mouse,
touch and a synthetic controller; grapheme and mosaic round trips pass.

## Sprint F2 — Modern Teletext reader and graphics

**Goal:** make the Ceefax interpretation a polished vault reader, not a static
demo screen.

**Status (2026-08-27):** Complete. Reader page, subpage, history, partial
three-digit entry and loading/ready/offline/error state now use a tested
GridCore state model. The uCore surface renders pages through the canonical
GridCore page builder, displays pending page entry and connection state in the
screen status row, retries with `R`, and responds to browser connectivity
changes. Semantic page links, FASTEXT, spatial focus, pointer/touch activation
and swipe navigation are already integrated. GridCore now also supplies tested
2x3-dot mosaic paint/erase, line, rectangle, flood-fill and stamp operations,
plus reusable panel and bar-chart primitives. The Teletext tab exposes a first
Reader/Graphics authoring mode with colour selection, clear, pointer/touch/pen
drawing and keyboard tool shortcuts. Graphics strokes and shapes are now
single undoable transactions with redo support, and RGBA images can be
downsampled into full-screen mosaic stamps. Dot-space drag selection, visible
selection feedback, copy, cut and paste-as-stamp are wired for mouse, touch,
pen and standard keyboard shortcuts; line and rectangle tools have live drag
previews. Named built-in and custom stamps, refined empty/error guidance,
canonical composed data/map/graphics pages and deterministic golden-renderer
coverage complete the sprint. Further visual tuning belongs to the shared F5
cross-surface polish gate rather than extending this feature sprint.

- Extract page state, rendering, navigation and vault loading from the large
  Vue surface into tested GridCore modules.
- Make page numbers, links, FASTEXT labels, cards and document regions semantic
  clickable/tappable lattice regions.
- Support keypad/keyboard page entry, mouse/touch selection, swipe/back,
  controller focus and visible focus/pressed states.
- Complete history, subpages, loading, empty, offline, unavailable and retry
  states.
- Add editorial page primitives: mastheads, rules, panels, charts, maps,
  captions, separated/contiguous mosaics, hold/release graphics, double height,
  conceal/reveal and flash policy.
- Add Teletext graphics authoring with paint, line, rectangle, fill, stamp,
  select, copy and image-to-mosaic conversion.
- Produce golden pages based on high-quality Ceefax visual composition while
  linking to uCode vault content.

**Exit:** representative index, article, data, map and graphic pages pass visual
goldens and all supported input paths at desktop and touch breakpoints.

## Sprint F3 — Pixel, Grid and Layer workflow polish

**Goal:** turn the three wired editors into one coherent creation workflow.

**Status (2026-08-27):** Advanced; final polish remains. Pixel and Grid now expose consistent
saved/modified state, undo/redo availability and standard history shortcuts.
Grid typing, paint, erase, fill, clear, seed loading and resize use shared
transactional document state. Layer now uses the canonical composer for real
create, duplicate, delete, reorder, visibility and lock operations over the map
fixtures. Remaining work is selection/clipboard alignment, Pixel transforms
and animation, touch gesture refinement and the final layout/alignment pass.
Grid now has drag selection, visible selection feedback and shared copy/cut/
paste behavior. Layer opacity is rendered with deterministic cell dithering;
Normal, Multiply, Screen and Overlay affect palette composition, and opacity,
blend and merge-down are exposed in the surface. The World fixture now proves
the canonical six-buffer model (terrain, details, foreground, lighting,
collision and entities), and the selected unlocked buffer is directly editable
by pointer/touch drawing and erasing rather than being a flattened preview.
Pixel now shares selection, copy/cut/paste and reversible horizontal/vertical
flip operations. A reusable sprite/BOB frame model supplies frame add,
duplicate, delete and switching, with previous-frame onion-skin rendering in
the Pixel surface. Selection move/rotate transforms, per-frame duration and
real duration-aware playback are wired. Pixel and Grid drag paths now use
pointer events with touch scrolling suppressed only on their editing canvases.
Further responsive visual tuning belongs to the shared F5 cross-surface gate.

- Shared project/document state, selection model, dirty state and undo/redo.
- Shared tool semantics, shortcuts, pointer/touch gestures and context actions.
- Pixel: zoom/pan, selection transforms, animation frames, onion skin and
  sprite/BOB preview.
- Grid: rectangular/free selection, clipboard, stamp/fill/line/shape tools,
  gridline controls and reading/square register preview.
- Layer: real create/delete/duplicate/reorder, visibility, lock, opacity, blend,
  merge and per-layer hit testing.
- Align toolbars, sidebars, spacing, focus, empty states, labels and responsive
  behavior across all three editors.

**Exit:** one project can move from glyph/sprite pixels to grid composition to
layered scene, save/reload, undo/redo, and operate through mouse, touch and
keyboard without state loss.

## Sprint F4 — Glyph, icon, emoji, symbol, mosaic and sprite catalogue

**Goal:** replace the two-font inspector with a searchable asset system.

**Status (2026-08-27):** Reopened for curation. GridCore provides one searchable
catalogue covering Western ASCII/Latin-1 glyphs, curated retro-useful symbols,
UI icons, the platform Extended Pictographic repertoire plus curated joined
sequences, all 128 contiguous/separated Teletext mosaic variants, sprite
stamps and BOB entries. The Glyphs surface uses a scrollable contextual library
(square in Terminal/Pixel/Grid, rectangular in Teletext), selection metadata and direct Pixel, Grid and Layer
handoff without truncating grapheme sequences. Every entry declares its
rendering classification, provenance and licence, and the catalogue supports
validated, versioned JSON interchange. However, catalogue coverage is not the
same as a production asset library: platform-fallback Unicode can render as
blobs or vary by host, and the current sprite/BOB entries use generic previews.
F4 now closes only after curated deterministic icon, emoji, Teletext graphic,
sprite and BOB packs replace placeholders for the supported core set. The
library is integrated into the Pixel and Grid editor sidebars; the standalone
Glyphs view remains the catalogue manager and inspection surface.

- Catalogue tabs/filters for fonts, glyphs, icons, symbols, emoji, Teletext
  mosaics and sprites/BOBs.
- Search by grapheme, Unicode sequence, name, tag, category and uCode ID.
- Full Unicode sequence handling including variation selectors, modifiers and
  joined emoji.
- Deterministic pixel forms for supported assets plus explicit colour/vector
  fallbacks; never silently substitute a host-dependent glyph.
- Render separate contextual libraries in square Terminal and rectangular
  Teletext registers; do not expose paging or register-switch controls.
- Send an asset to Pixel, stamp it into Grid, or add it as a Layer without
  format conversion surprises.
- Versioned import/export, provenance and licensing metadata.

**Exit:** catalogue fixtures cover ASCII, both core fonts, box drawing,
arrows, UI icons, representative emoji sequences, all 64 Teletext mosaic
patterns, and animated sprite/BOB assets. Core UI icons, named emoji and every
built-in sprite/BOB must have reviewed deterministic artwork; platform fallback
entries remain explicitly labelled as uncurated compatibility references.

## Sprint F5 — Cross-surface alignment and release gate

**Status (2026-08-27):** In progress. GridCore now has a shared visible-focus,
disabled-control, coarse-pointer, reduced-motion and forced-colour contract.
Icon-only document actions and editor regions have accessible names, catalogue
register and brush choices expose selection state, and Grid brush input is now
grapheme-safe. The obsolete two-font Glyph snapshots have been replaced with
reviewed 16×12 catalogue baselines for square and reading registers. Remaining
work is the complete desktop/touch screenshot matrix, responsive alignment
review across every tab, screen-reader/live-state refinement and performance
budgets.

- Visual tokens and geometry shared across uCode and all GridCore views.
- Responsive 16:9 behavior, minimum touch targets and keyboard focus visuals.
- Screen-reader labels and reduced-motion/flash handling.
- Golden screenshots at agreed desktop and touch sizes.
- Performance budgets for atlas loading, hit testing, paint and large layers.
- Manual compatibility pass for BBC BASIC, MODE 7 and capsule surfaces.

**Exit:** no surface-specific character or input fork remains without an
explicit compatibility reason and test.
