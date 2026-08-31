# uCode 1 Completion Long-Running Sprint

**Status:** Active execution  
**Started:** 2026-08-30  
**Scope:** GridCore release closure, dependable BBCSDL runtime, deterministic
assets, Software Library productisation, and one enhanced legacy vertical slice

## Outcome

Deliver a releasable uCode 1 foundation that is functional and polished across
Terminal, Teletext, Pixel, Grid, Layer, Glyphs, and Library. Freeze the contracts
needed by capsules, LENS, SKIN, and the later uCode 2 spatial handoff.

Teletext catalogue recovery, host integration, and branch review are executed
through `TELETEXT_CATALOGUE_INTEGRATION_SPRINT_2026-08.md`; its durable tasks
are owned by uFlow under `$UDOS_HOME/flow/tasks/sprints`.

This is intentionally a long-running sprint. Work continues through the gates
below rather than treating each visible UI change as a completed sprint.

## Non-negotiable product decisions

- There are only two product generations: uCode 1 and uCode 2.
- The lattice is the base unit; square and reading cells are projections.
- Terminal and modern Teletext are 16:9.
- Terminal is one automatic shell/BBC BASIC session, with no runtime selector.
- Traditional keypad bindings and modern keyboard, mouse, touch, pen, and
  controller input resolve to the same semantic actions.
- Every editing view has a tab selector, scrollable interactive viewport, and
  one sidebar. Never add a secondary toolbar below the tabs.
- Applicable editor controls appear above the contextual glyph library, which
  is the final scrollable sidebar section.
- Proprietary legacy media is user supplied and verified; it is never silently
  downloaded or represented as bundled.
- Original program code remains preserved inside its capsule. LENS and SKIN are
  reversible connectors layered around it.
- Elite, Amiga, and uCode 2 remain research/handoff work until their gates pass.
- HomeNest is not part of this sprint.

## Baseline evidence

At sprint creation:

- GridCore: 152 tests passing.
- uCode Python/runtime: 200 passing, 34 skipped.
- Gridcore/uCode browser goldens: 9 passing, including Library keyboard and
  narrow pointer/touch-equivalent flows.
- uCore backend route checks: 3 passing.
- `basic-lab` is the first verified `ucode-capsule/1` vertical slice.
- Library catalogue, search, readiness filter, title detail, learning/source/
  evidence panels, probe, verify, and Terminal launch are implemented.

These results are a baseline, not the final release gate.

## Workstream 1 — Runtime and Terminal closure

**Priority:** P0; begins immediately and may run alongside UI curation.

- [ ] Pin and package BBC BASIC Console executables for each supported host.
- [ ] Verify engine discovery without developer-only paths or environment
      configuration.
- [ ] Run immediate commands and plain-text and tokenised `.bbc` programs.
- [ ] Mount the supported BBCSDL library set and publish its compatibility
      boundary.
- [ ] Complete the SDL frame/display bridge.
- [ ] Forward keyboard, IME, paste, pointer, touch-equivalent, controller, and
      resize events through `ucode-session/1`.
- [ ] Certify long scrollback, navigation/control keys, resize, reconnect,
      stop, restart, timeout, and backend-failure recovery.
- [ ] Preserve the sequence shell → `basic`/`bbcbasic` → BBC BASIC → `QUIT` →
      shell without a manual runtime switch.
- [x] Add backend build/version visibility so a stale daemon cannot silently
      serve an older API surface.
- [ ] Add clean-install browser acceptance for the entire sequence.

**Gate R:** A packaged clean environment executes a deterministic BBC fixture,
accepts all required input classes, returns structured/display evidence through
`ucode-session/1`, recovers from disconnect, and returns to a working shell.

## Workstream 2 — Deterministic character and asset library

**Priority:** P0; required for GridCore freeze.

- [ ] Define the exact shipped core packs: Western ASCII/Latin-1, Teletext
      mosaics, retro symbols, UI icons, modern emoji, sprites, and BOBs.
- [ ] Replace unrendered blobs and host-font-dependent core entries with
      reviewed deterministic artwork.
- [ ] Complete authentic contiguous and separated Teletext graphics.
- [x] Curate a bounded modern emoji set including representative variation,
      modifier, and joined sequences.
- [x] Replace generic sprite/BOB previews with deterministic static and animated
      assets.
- [ ] Correct optical centring, baseline, ink scale, and clipping in square and
      rectangular reading registers.
- [x] Verify selection from Glyphs opens the Pixel Cell Editor.
- [ ] Verify lossless handoff into Pixel, Grid, Layer, and Teletext.
- [x] Record stable IDs, version, provenance, licence, tags, metrics, and
      fallback classification for every shipped asset.
- [x] Keep broader platform Unicode visible only as explicitly uncurated
      compatibility references.
- [x] Add import/export and deterministic atlas snapshot tests.

**Gate A:** Every core built-in has reviewed deterministic rendering and
metadata across both register formats; no core asset silently becomes a host
font blob.

## Workstream 3 — Cross-surface interface consolidation

**Priority:** P0; executed continuously while Workstreams 1 and 2 land.

- [ ] Inspect all seven tabs at desktop, narrow-window, and coarse-touch sizes.
- [ ] Remove remaining secondary toolbars, duplicate side-panel controls,
      orphaned actions, and long single-line control rows.
- [ ] Keep Terminal and Teletext controls inside their 16:9 viewports.
- [ ] Keep all Pixel, Grid, and Layer controls in the unified sidebar, with the
      glyph selector last.
- [ ] Ensure the main viewport and glyph viewport scroll independently where
      appropriate.
- [ ] Align dimensions, spacing, icons, labels, focus, selected/disabled states,
      loading, empty, offline, and error presentation.
- [ ] Refine Pixel, Grid, and Layer workflow clarity without exposing internal
      data complexity as UI controls.
- [ ] Verify Grid remains one flat collection of cells and Layer remains the
      addressed stack/world collection of fixed-size flat Grids.
- [ ] Complete keyboard order, screen-reader names/live state, reduced motion,
      safe flash, minimum touch targets, and controller focus.
- [ ] Capture and review a golden screenshot matrix for every tab and primary
      state.

**Gate UI:** No clipped, duplicated, overflowing, unexplained, or non-working
controls remain; all primary flows work through keyboard and pointer/touch at
the agreed desktop and narrow sizes.

## Workstream 4 — Persistence, compatibility, and performance freeze

**Priority:** P1; begins as soon as related UI/data contracts stabilise.

- [ ] Round-trip a project from Pixel asset through Grid composition into a
      Layer world without flattening metadata.
- [ ] Validate project, animation, layer-stack, catalogue, and `uvox/2`
      persistence and migration fixtures.
- [ ] Add corrupted, unsupported-version, partial, and oversized input errors.
- [x] Reject malformed and oversized Layer project documents before allocation.
- [ ] Test representative BBC BASIC, MODE 7, Teletext, sprite, and imported
      retro assets.
- [ ] Establish budgets for atlas load/search, paint latency, hit testing,
      layer composition, large maps, and animation timing.
- [ ] Remove obsolete demonstrations, dead controls, stale compatibility claims,
      and contradictory active specifications.
- [ ] Publish the supported/unsupported platform, runtime, input, format, and
      asset matrix.
- [ ] Freeze GridCore, `uvox/2`, session, action, asset, and persistence
      contracts required by Library, LENS, and SKIN.

**Gate F:** Clean install/build/test and the full browser/golden matrix pass;
budgets hold; migrations and errors are verified; no severity-1 or severity-2
GridCore defects remain.

## Workstream 5 — Software Library productisation

**Priority:** P1. Infrastructure and redistributable fixtures may proceed
before Gate F; production compatibility claims may not.

- [x] Canonical `ucode-library/1` catalogue.
- [x] Search, readiness filters, title selection, details, source, learning,
      evidence, and media-policy display.
- [x] Probe, verify, and catalogue-owned Terminal launch.
- [x] Require successful compatibility verification for both launch plans and
      direct capsule session starts.
- [x] First verified redistributable capsule: `basic-lab`.
- [ ] Add title/edition navigation where a title has multiple exact builds.
- [ ] Implement guided user-supplied media selection/import in normal UI.
- [ ] Verify extension, size, cryptographic hash, edition, provenance, and
      storage destination before installation.
- [ ] Never expose arbitrary host paths to catalogue/runtime clients.
- [ ] Add install, uninstall/remove, start, pause, resume, reset, stop, status,
      snapshot, and restore UI according to each capsule's capabilities.
- [ ] Display runtime, media, control, LENS, and SKIN health separately.
- [ ] Add original/corrected/enhanced SKIN selection with reversible defaults.
- [ ] Add compatibility evidence and deterministic smoke fixtures for Apple
      Panic, Eamon, Knight Orc, NetHack, and uConstruct before promoting them
      beyond `configured`.
- [ ] Keep Repton and Elite at `research` until exact editions and runtime
      evidence exist.
- [ ] Add end-to-end keyboard, mouse, touch-equivalent, refresh, missing-media,
      invalid-media, offline, and stale-backend acceptance tests.

**Gate L:** A non-developer can discover, understand, configure, verify, launch,
control, stop, and revisit a supported title without dev mode. Every visible
status is backed by edition-specific evidence.

## Workstream 6 — Enhanced legacy vertical slice

**Priority:** P2; starts only after Gate F and the media lifecycle portion of
Gate L pass.

- [ ] Select a lawful redistributable fixture or tractable tile-based title.
- [ ] Pin its emulator/core and exact software build.
- [ ] Fingerprint all media and required system dependencies.
- [ ] Implement snapshot/restore and deterministic replay.
- [ ] Map keyboard, pointer/touch-equivalent, and controller controls.
- [ ] Implement a version-matched LENS connector with observable semantic state.
- [ ] Provide reversible original, corrected, and enhanced SKINs.
- [ ] Add a learning view showing how the preserved software, state connector,
      and presentation enhancements relate.
- [ ] Publish compatibility, performance, limitations, and provenance evidence.

**Gate E:** One preserved program runs from its verified capsule with original
presentation intact, reversible enhancement, save/restore, semantic inspection,
modern controls, and deterministic acceptance evidence.

## Deferred follow-on sprints

The following are explicitly not hidden inside this sprint:

1. **Elite and Amiga research capsules:** edition/build selection, emulator
   choice, memory/state proof, presentation experiment, and media policy.
2. **SKIN/LENS productisation:** public schemas, SDKs, validators, permissions,
   packaging, connector diagnostics, and semantic state export.
3. **uCode 2 handoff:** clean rescaffold and Minecraft/spatial experiments only
   after frozen uCode 1 contracts exist.

Research notes may be improved during this sprint, but none of these may be
reported as implemented compatibility.

## Execution order

1. Run Workstreams 1, 2, and 3 as the primary continuous development loop.
2. Begin Workstream 4 as each contract stabilises; close Gate F before legacy
   emulator production work.
3. Continue the lawful Library infrastructure in Workstream 5, but require
   Gate F before promoting legacy compatibility claims.
4. Close Gate L with one additional evidence-backed configured BBC adaptation.
5. Execute Workstream 6 and close Gate E.
6. Triage every discovered defect back into the owning workstream; do not create
   disconnected UI micro-sprints.

## Definition of done

This sprint is complete only when Gates R, A, UI, F, L, and E all pass and the
evidence is recorded in this document. Passing unit tests alone is insufficient.
Each completed checkbox must point to code, a fixture, a test, a screenshot, or
a compatibility record in the closing evidence section.

## Closing evidence

To be populated continuously during execution:

| Gate | Status | Evidence |
| --- | --- | --- |
| R — Runtime/Terminal | Open | Baseline shell/BASIC lifecycle passes; packaging and recovery matrix remain. |
| A — Assets | Open | Western/Teletext coverage exists; deterministic icon/emoji/sprite curation remains. |
| UI — Interface | Open | Focused goldens pass; full tab/state/device matrix remains. |
| F — GridCore freeze | Open | Core suites pass; performance, migration, compatibility matrix, and freeze remain. |
| L — Library | Open | `basic-lab` verified; media import and configured-title evidence remain. |
| E — Enhanced legacy | Blocked by F/L | Emulator-backed reversible enhancement not yet selected. |

### 2026-08-30 — Opening execution evidence

- Added `/api/ucode/info` with the `ucode-runtime/1` revision, loaded provider,
  session protocols, and feature capabilities. The Library now diagnoses a
  stale backend explicitly instead of reducing a missing contract to a generic
  title or catalogue 404.
- The normal backend on port 8484 reports revision `2026-08-30.1` from the
  active uCode checkout.
- Both Terminal WebSocket senders now treat a browser refresh, network loss, or
  host shutdown between closed-check and transport write as a normal disconnect.
- Added real PTY resize evidence: 40×25 → 74×25 is observed through
  `TIOCGWINSZ`. Runtime/session focused suite: 19 passing; capability and
  Library focused suite: 23 passing; uCore route checks: 3 passing.
- Live browser execution through the normal Terminal produced
  `SPRINT_RUNTIME_OK` from zsh and restored the prompt.
- Catalogue metadata now connects the 17 baked core emoji/icon forms to stable
  bitmap IDs and deterministic project provenance. Unbaked complex emoji remain
  labelled `platform-fallback`. Character/emoji focused suite: 10 passing.
- A 430×760 browser sweep across Terminal, Teletext, Pixel, Grid, Layer, Glyphs,
  and Library found zero body/main horizontal overflow and zero secondary
  editor toolbars. This is initial responsive evidence, not the final golden
  matrix.
- Frontend Vue type-check passes.
- Full post-change regression: GridCore 153 passing, viewport renderer 5
  passing, GridSmith 75 passing, Python/runtime 204 passing with 34 intentional
  skips, and all 9 browser/golden tests passing.

### 2026-08-30 — Terminal recovery and first sprite/BOB pack

- Terminal now reconnects automatically while its tab remains active using a
  bounded 500ms–8s backoff. Intentional tab or session changes cancel recovery.
- Browser acceptance drops the active WebSocket, queues paste-equivalent text
  during the outage, observes a replacement connection, and verifies the text
  is flushed after reconnect.
- The same acceptance streams 36 output lines and verifies PageUp/PageDown move
  between historical and live output.
- Sprite entries now carry their real built-in mosaic pixel data. BOB entries
  carry the original and a deterministic mirrored second animation frame; the
  shared catalogue sidebars render those pixels instead of `▣`/`⬚` placeholders.
- Selecting a BOB in Glyphs opens a centred editable Pixel document and creates
  both animation frames. Live inspection verified Arrow BOB as 20×20 ink within
  the 24×24 cell with frames 1 and 2.
- Post-change regression: GridCore 153, viewport renderer 5, GridSmith 75,
  Python/runtime 204 with 34 intentional skips, Vue type-check, and 11 browser/
  golden tests all pass.

### 2026-08-30 — Library launch integrity

- Library launch plans now require matching edition-specific compatibility
      evidence. A missing or tampered entry checksum returns a non-launchable plan;
      configured titles remain discoverable but cannot start until verified.
- Focused Library coverage includes a temporary tampered capsule fixture and
      asserts that its launch plan is refused.

### 2026-08-30 — Layer persistence safety

- Layer project deserialization now rejects unsupported versions, malformed
      rows and cells, and documents exceeding the 1,000,000-cell total budget
      before any GridCore buffers are allocated.
- Focused coverage verifies version, partial-row, and oversized-document
      rejections without constructing a large cell matrix.

### 2026-08-30 — Bounded emoji curation

- The modern emoji catalogue is a reviewed 103-entry set rather than a sweep
      of Unicode pictographs. It includes variation-selector, skin-tone modifier,
      and joined-sequence representatives.
- All 17 entries from the deterministic uCode Pixel Emoji atlas are explicitly
      curated; broader pictographs remain absent from the core picker.

### 2026-08-30 — Asset metadata contract

- Every generated core catalogue entry now carries `version: 1` alongside its
      stable ID, provenance, licence, tags, metrics, supported registers, and
      rendering or fallback classification.
- Character catalogue import rejects an entry missing any required metadata;
      focused catalogue coverage passes with the bounded emoji set and deterministic
      atlas provenance.

### 2026-08-30 — Deterministic emoji atlas snapshot

- Emoji atlas coverage now compares the generated TypeScript payload directly
      with its JSON reference and validates every glyph as a 12×12 palette-index
      buffer.
- Character catalogue import/export now deep-copies sprite and BOB bitmap/frame
      payloads, preserves them through a JSON boundary, and rejects malformed pixel
      lengths, values, or frame dimensions.

### 2026-08-30 — Pixel animation persistence safety

- Pixel animation import now validates versions, safe dimensions, every frame,
      and a 1,000,000-pixel aggregate budget before allocating a pixel buffer.
- Focused coverage rejects unsupported versions, partial frames, oversized
      dimensions, and oversized frame collections. The broader corrupted-input
      gate remains open for the remaining persisted formats.

### 2026-08-30 — Symbol map persistence safety

- Symbol-map import now rejects invalid formats, non-scalar Unicode keys,
      malformed or out-of-range palette buffers, and maps exceeding 4,096 glyphs
      before any pixel buffers are allocated.
- Focused coverage retains JSON round-trip behavior and exercises unsupported,
      malformed, and oversized imports. The broader corrupted-input gate remains
      open for the remaining persisted formats.

### 2026-08-30 — Native world-stack persistence

- `ucode-world-stack-v1` now serializes and restores through a strict,
  deep-copying boundary. It validates fixed grid dimensions, canonical native
  addresses, active membership, unique identities, metadata, cell shape, and
  a 1,000-grid document budget.
- Focused coverage verifies JSON round trips and rejects unsupported versions,
  inconsistent active addresses, partial buffers, and oversized records.
  Migration fixtures and the remaining persisted formats are still open.

### Next execution order

1. Close the remaining Runtime gate only with pinned, reviewable per-host BBC
      BASIC Console artifacts and a clean-install acceptance run; no environment
      path may be treated as packaging evidence.
2. Complete deterministic asset metadata and the lossless cross-surface
      handoff, then add atlas import/export snapshot coverage.
3. Extend the persistence input boundary from Layer projects to the remaining
      project and `uvox/2` formats, followed by performance budgets.
4. Keep configured Library titles discoverable but non-launchable until their
      edition-specific compatibility evidence and smoke fixtures exist.

### Commit and integration plan

The current `main` worktree is the active uCode 1 sprint batch. Before any
branch integration, commit it as reviewed slices and rerun the associated
checks:

1. Commit GridCore editor, asset, and persistence contracts with the complete
      `packages/gridcore/test` suite.
2. Commit the uCode runtime/session/Library changes with the focused runtime
      acceptance modules. The real BBC BASIC Console check remains an explicit
      environment-dependent acceptance gate, not a passing default test.
3. Commit the sprint specifications and closing evidence only after the code
      slices they describe are committed and verified.
4. Push `main` after each reviewed commit sequence is green.

Do not bulk-merge the outstanding branches. They are independent workstreams
and must be reviewed as individual cherry-pick candidates after `main` is
clean:

| Branch | Integration decision |
| --- | --- |
| `recovery/2026-08-18-teletext-import` | Leave unmerged: explicitly WIP import recovery. Rebase and complete its reader tests before review. |
| `work/2026-08-18-stabilise` | Leave unmerged in uCode: it changes uCore host, CI, and Dev Mode surfaces. Integrate in its owning host repository. |
| `origin/codex/final-docs-and-devmode-gate` | Cherry-pick only after reconciling its developer-baseline docs with current uCore ownership. |
| `origin/codex/mcp-*`, `origin/codex/remove-*`, `origin/codex/retire-*`, `origin/codex/skills-*`, `origin/codex/udos-mcp-gateway` | Leave unmerged pending an owning-repository review. These are independent MCP/Dev Mode changes, not GridCore release work. |

No branch may be merged solely because it is unmerged: each candidate requires
a clean worktree, a current-base rebase or cherry-pick, conflict review, and
its focused test suite before it can reach `main`.
