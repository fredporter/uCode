# uCode Architecture — Two Generations, One Compatibility Line

**Status:** LOCKED — canonical architecture decision  
**Version:** 1.0  
**Date:** 2026-08-20

This document resolves naming and scope conflicts across earlier uCode1,
uCode2, ProseUI, GridCore, AMOS, and spatial planning documents. When an active
document disagrees with this decision, this document wins until that document
is aligned. Archived documents remain historical references only.

## Product generations

There are exactly two uCode generations.

### uCode 1 (product name: uCode)

uCode is the compatible 2D foundation:

- BBC BASIC for SDL 2.0 (BBCSDL) is the execution authority.
- Standard BBC BASIC syntax and BBCSDL libraries remain the compatibility
  baseline; line numbers are optional where BBCSDL supports that style.
- The AMOS shim is an optional BBC BASIC library compatibility layer, not a
  separate language or product generation.
- Terminal, Teletext, Pixel, Grid, Layer, glyphs, 2D sprites, BOBs, animation,
  collision, LENS, SKIN, program capsules, and the Software Library belong to
  uCode 1.
- uCode 1 produces versioned lattice/world/state artifacts for uCode 2.

New language grammar must not be added merely to expose a feature. Prefer, in
order: native BBCSDL behavior, an ordinary BBC BASIC library, an optional
compatibility shim, then a host protocol for capabilities that cannot live
sensibly in BASIC.

### uCode 2

uCode 2 is the experimental spatial generation. It begins at the stable uCode
1 artifact and capsule boundaries and may explore:

- 2D-to-3D and voxel lifting;
- Minecraft datapacks, worlds, schematics, plugins, and mods;
- richer physics, entities, networking, and spatial presentation;
- future 3D products beyond Minecraft.

uCode 2 consumes structured uCode 1 artifacts. It does not need to parse or
execute arbitrary BBC BASIC or AMOS source. Behavior required downstream is
exported by uCode 1 as a versioned, declarative behavior/state contract.

There are no uCode3 or uCode4 product generations. Earlier material using
those names must be reassigned to uCode 2 or marked historical.

## Lattice-first GridCore

### Product and host boundary

GridCore's complete interactive experience is a standalone **uCode** product.
It is deliberately weighty enough to own the Terminal, Teletext, Pixel, Grid,
World Stack and Glyph views rather than reproducing those editors inside
uCore.

uCore integration is contract-level only:

- a Prose document or another uCore surface may embed a uCode/GridCore
  viewport;
- uCore may call the uCode runtime through its backend/API adapter;
- the uCode Terminal is the sole graphical command-entry surface;
- command entry outside the graphical application belongs to uCode CLI mode;
- uCore must not add a parallel shell input, editor toolbar or private copy of
  GridCore state.

Every full editing view follows one invariant layout: **tab selector + main
viewport + sidebar**. The main viewport is scrollable and interactive. All
editing controls live in the sidebar; controls that do not apply to the active
view are hidden. The glyph catalogue is always the final sidebar section. Do
not place a secondary toolbar or button row between the tab selector and the
viewport.

The lattice precedes every cell.

- A **lattice** is the common coordinate space.
- A **dot** is one lattice unit, currently a 4x4 reference-pixel unit.
- A **cell register** groups dots for a display or editing purpose.
- The **square register** is 2x2 dots and is the default for terminal, gaming,
  maps, and character-scale sprites.
- The **reading register** is 3x5 dots and is the default for Teletext and
  vault reading.
- Sprites and BOBs occupy free lattice rectangles and may move at pixel
  resolution without redefining the cell registers.

Both Terminal and Teletext use their settled 16:9 presentations. The modern
Teletext vault reader is 74x25 reading-register cells. Authentic 40x25 MODE 7
is a runtime compatibility mode, not the default reader geometry.

## Execution paths

uCode 1 supports two replaceable execution paths behind one capsule contract:

1. **Native capsule:** BBCSDL program plus optional BBC/AMOS libraries.
2. **Legacy capsule:** an emulator or compatibility core plus original media.

Both paths expose the same durable boundaries:

`control -> capsule -> runtime events/state -> LENS -> GridCore -> SKIN`

Original software remains unchanged inside a legacy capsule. Enhancements are
reversible connectors around it: display correction, palettes, presentation
timing, controls, accessibility, learning tools, state inspection, saves, and
alternative SKINs. CPU speed, simulation rate, and presentation refresh must
be separate controls so an enhancement cannot silently break game logic.

## LENS, SKIN, and controls

- **LENS** observes and translates runtime state into a versioned semantic
  model. Title-specific memory maps are tied to exact software builds.
- **SKIN** presents runtime state without changing authoritative game logic.
  It may offer original, corrected, enhanced, reinterpreted, and uCode 2
  spatial presentations.
- **Control** is a neutral program command/input contract. uCore may expose an
  approved subset through its canonical MCP gateway; programs and capsules do
  not own MCP servers.

## Repository ownership

- **uCode** owns GridCore algebra, render/runtime packages, capsules, software
  manifests, BBCSDL/AMOS integration, LENS/SKIN contracts, and export formats.
- **uCore** owns application chrome, user-facing launch and management UI,
  host policy, container lifecycle orchestration, and thin runtime adapters.
- **uCode 2** consumes frozen uCode 1 interchange contracts for spatial work.

User-authored documents and programs live in configured Vault roots. Mutable
runtime state resolves through `UDOS_HOME`. Documentation must not require a
hard-coded home-directory layout.

## Interchange rule

The existing `uvox/1.0` cell exporter is a compatibility format, not the final
handoff. A lattice-first `uvox/2` must describe registers, layers, sprites,
BOBs, Teletext pages and interaction regions, runtime metadata, assets,
provenance, geography, and behavior/state references. uCode continues to read
version 1 and provides an explicit migration. Version 2 is frozen before the
uCode 2 importer is implemented.

## Non-regression statements

New active documentation must not claim that:

- GridCell is the GridCore primitive;
- Teletext defaults to 40x25;
- sprites or BOBs are deferred to uCode 2;
- uCode 2 is ProseUI;
- there are active uCode3 or uCode4 generations;
- arbitrary BASIC is translated directly into Minecraft commands;
- `uvox/1.0` is a frozen, lossless uCode 2 handoff;
- programs own MCP servers;
- runtime or Vault paths are fixed under a particular user's home directory.
