# uCode Delivery Sprints — Compatibility to Spatial Handoff

**Status:** Active plan  
**Date:** 2026-08-26

This plan supersedes completion claims based only on generated scaffolds. A
sprint closes when its acceptance evidence passes in a clean environment.

The detailed post-backend frontend sequence and its interaction/character
contracts are defined in `GRIDCORE_INTERACTION_AND_CHARACTER_SPRINTS.md`.
GridCore work is executed and certified through the longer outcome gates in
`GRIDCORE_COMPLETION_MACRO_SPRINTS.md`; delivery advances to the Software
Library under the execution rules in
`UCODE1_COMPLETION_LONG_SPRINT_2026-08.md`. Catalogue infrastructure,
redistributable fixtures, and non-launchable research records may advance
before the GridCore release freeze. Production legacy compatibility claims,
emulator-backed enhancement, stable SKIN/LENS contracts, and the uCode 2
handoff remain gated by that freeze.

## Sprint 0 — Architecture and drift guard

**Goal:** Establish the two-generation, lattice-first source of truth.

- Publish `UCODE_ARCHITECTURE.md`.
- Publish the Software Library and Runtime Capsule contract.
- Align active indexes, runtime, adaptation, manual, and Minecraft documents.
- Mark contradictory uCode1/uCode2/uCode3/uCode4 material as historical.
- Add documentation checks for the non-regression statements.

**Exit:** active docs have one meaning for uCode 1, uCode 2, lattice, AMOS,
Teletext, capsule, LENS, SKIN, control, and `.uvox`.

## Sprint 1 — BBCSDL runtime proof

**Goal:** Run real BBC BASIC through a stable uCode session.

**Status (2026-08-26):** In progress. Canonical engine discovery, process
lifecycle, `ucode-session/1`, host WebSocket registration, BBC BASIC Console
PTY support, and the Terminal runtime selector are implemented with fixture
coverage. A signed macOS
BBCBasic distribution has been located and launches. Its `.bbc` libraries are
tokenised, while existing uCode sources are plain text; the source-loading
adapter is now explicit for SDL and Console Mode can load both formats through
its immediate-mode `LOAD`. Packaging a pinned console executable and the SDL
frame/input bridge remain before this sprint can close.

- Remove obsolete uCode1 bridge paths and correct engine discovery.
- Define `shell` and `bbcsdl` session protocols.
- Run immediate commands and both tokenised and plain-text `.bbc` files through
  an explicit source-loading/bootstrap adapter; do not assume they are the same
  on-disk format.
- Mount configured BBCSDL libraries.
- Forward keyboard, pointer, touch-equivalent, controller, and resize events.
- Add process, stop, timeout, and error integration tests.

**Exit:** uCore launches a BBCSDL fixture, accepts input, and receives
structured output without developer-only wiring.

**Gate:** process launch alone is not acceptance. The real-engine fixture must
write a deterministic marker or expose deterministic display state, and the
Terminal must receive that evidence through `ucode-session/1`.

## Sprint 2 — Terminal completion

**Goal:** Make the square-register 16:9 Terminal a dependable console.

- Present one unified PTY: normal shell commands at the prompt and `basic` /
  `bbcbasic` entering BBC BASIC Console in-process, with `QUIT` returning to
  the shell. Do not expose this as a manual runtime-mode switch.
- Complete navigation/control key handling, history, and scrollback.
- Visible connection state, reconnect, clear, run, stop, and restart.
- Align ANSI/VDU handling with canonical uCode terminal primitives.
- Add terminal WebSocket and visual regression coverage.

## Sprint 3 — Modern Teletext reader and graphics

**Goal:** Complete the 74x25, 16:9 reading-register vault experience.

- Move page state and builders out of the monolithic Vue surface.
- Add semantic lattice regions for mouse, touch, keyboard, and keypad actions.
- Complete FASTEXT, history, subpages, loading, error, and offline states.
- Add mosaic drawing, shapes, templates, reusable mastheads, and image-to-
  mosaic conversion.
- Maintain authentic 40x25 MODE 7 as a runtime compatibility view.
- Add editorial-quality golden pages.

## Sprint 4 — Lattice-first GridCore and `uvox/2`

**Goal:** Make all render and interchange models derive from the lattice.

- Promote lattice, dot, register, free-rectangle, and conversion types.
- Define `uvox/2`, behavior/state references, and the version 1 migration.
- Round-trip mixed square/reading layers, sprites, BOBs, interaction regions,
  assets, provenance, and geography.
- Freeze version 2 only after fixtures pass.

## Sprint 5 — Pixel, Grid, Layer, glyphs, and emoji

**Goal:** Finish the creation workflow over one shared project state.

- Unified searchable glyph/symbol/emoji catalogue and deterministic atlases.
- Pixel selection, transforms, zoom, animation frames, and previews.
- Grid selection, clipboard, region tools, pan, zoom, and gridline controls.
- Real LayerComposer CRUD, order, visibility, locks, opacity, blend, and merge.
- Project persistence, dirty state, undo boundaries, import, and export.

**Reconciliation (2026-08-27):** The searchable Unicode index is useful but is
not a finished visual library. Pixel and Grid consume the same catalogue panel.
Release requires separately versioned, reviewed asset packs for deterministic
icons, emoji, Teletext graphics, sprites and BOBs; host-font fallbacks remain
discoverable but cannot be counted as polished assets.

## Sprint 6 — uCode 1 sprites, BOBs, and AMOS compatibility

**Goal:** Complete the enhanced 2D runtime without forking BBC BASIC.

- Versioned sprite banks, animation clock, collision, clipping, and z-order.
- Background-save/mask behavior for BOBs where required.
- Native BBCSDL examples first; optional AMOS-compatible library aliases.
- Separate CPU, simulation, and presentation timing.
- Keyboard, touch, and controller mappings.

## Sprint 7 — Software Library and first capsule

**Goal:** Let a non-developer discover, verify, configure, and launch a title.

- Catalogue index, title/edition pages, filters, status, and learning links.
- Capsule probe, media verification, install, launch, status, and stop.
- Guided user-supplied media flow with licence/provenance display.
- Original/corrected SKIN toggle and basic LENS status.
- Deliver one redistributable BBC fixture end to end.

**Reconciliation (2026-08-27):** Keep the existing `ucode-library/1` and
`ucode-capsule/1` hierarchy: title → exact edition → capsule + LENS + SKIN +
controls + learning + compatibility evidence. Do not treat generated program
skeletons or the old Snack examples as verified library titles. Seed research
records may cover Eamon, Repton, Elite, NetHack and a later Amiga adapter, but
the first verified vertical slice remains a small redistributable BBC fixture;
proprietary media is user-supplied and checksum-verified through normal UI.

**Implementation checkpoint (2026-08-30):** `library/catalogue.json` is now the
canonical catalogue index. The uCode runtime exposes catalogue and launch-plan
routes, and the GridCore Library tab can browse, select and launch configured
BBC adaptations into the single Terminal surface. Pointer and narrow
touch-equivalent selection are covered by browser acceptance tests. Elite is a
non-launchable research record with a user-supplied-media policy; Repton remains
research. Apple Panic, Eamon, Knight Orc, NetHack and uConstruct are marked
`configured`, not `verified`: their source and console launch paths exist, but
they still require per-title smoke evidence, manifests and connector validation.
At this checkpoint the full lifecycle and verified fixture were still pending;
the following checkpoint supersedes that limitation. Guided install/media
import, edition pages, filters, learning links and snapshot/restore remained.

**Verified vertical slice (2026-08-30):** `basic-lab` is the first `verified`
catalogue-owned capsule. It includes redistributable source, a versioned program
manifest, SHA-256 compatibility evidence and deterministic smoke assertions.
The Library exposes probe and verify actions, then launches the catalogue ID
through `ucode-session/1` into the unified Terminal. The capsule adapter owns
BBC Console prompt negotiation, `LOAD`/`RUN`, start/status/stop and mixed
touch/keyboard-equivalent input. The live probe asserts `HELLO CODEX`,
`2 + 2 = 4` and `CAPSULE_SMOKE_OK`. Remaining Sprint 7 work is guided media
import, edition/learning pages, filtering and per-title evidence for the five
configured adaptations; snapshot/restore begins with the emulator vertical
slice.

## Sprint 8 — Enhanced legacy vertical slice

**Goal:** Prove preservation plus reversible enhancement.

- Add a pinned emulator capsule adapter.
- Select a tractable tile-based title or lawful fixture.
- Version-fingerprint its media and LENS connector.
- Provide original, corrected, and enhanced SKINs.
- Demonstrate save/restore, controls, state inspection, learning mode, and
  deterministic replay.

## Sprint 9 — Elite and Amiga research capsules

**Goal:** Validate harder engines without overclaiming compatibility.

- Elite edition/build selection, emulator choice, memory map, and LENS proof.
- Wireframe/status SKIN experiment with original presentation preserved.
- Amiga emulator/core spike, Kickstart/media policy, input/video/audio probes.
- Publish compatibility and performance results before scheduling production.

## Sprint 10 — SKIN/LENS productisation

**Goal:** Make connectors authorable, testable, and distributable.

- Schemas, SDKs, validators, version matching, fixtures, and diagnostics.
- Connector permissions and resource policies.
- Catalogue packaging and update rules.
- Stable semantic runtime-state export for uCode 2.

## Sprint 11 — uCode 2 handoff

**Goal:** Begin spatial experiments only on frozen uCode 1 contracts.

- Import `uvox/2` and semantic state.
- Prototype height/depth and entity mapping.
- Target Minecraft datapacks first, then schematics and mods as required.
- Keep original runtime execution in the uCode 1 capsule.

The uCode 2 implementation begins with the independent
`uCode2/RESET_AND_RESCAFFOLD_PLAN.md`. Existing uCode4-named and multimedia
prototype code is reference material until audited; it is not an implicit
runtime dependency.

HomeNest is a separate project and is not scheduled in these sprints. Its
documentation reset is tracked independently in
`HomeNest/docs/RESET_AND_RESCAFFOLD_PLAN.md`.

## Program status vocabulary

All classic-program reporting uses:

1. research;
2. manifest/scaffold;
3. generated skeleton;
4. mechanics demonstrator;
5. runtime-integrated;
6. compatibility-tested;
7. playable adaptation;
8. release candidate.
