# GridSmith Workspace Plan — Actual Paths and Source Alignment

Date: 2026-06-23
Status: Recommended pathway normalized to real local repos
Purpose: Update the GridSmith workspace and agent specification so it matches the current machine layout, current uCode/uCore package state, and archived source material.

## Summary

The provided GridSmith spec is directionally correct, but some paths and assumptions need to be grounded in the current local environment.

The real source-of-truth layout on this machine is:

- uCore: /Users/fredbook/Code/uCore
- uCode monorepo: /Users/fredbook/Code/uCode
- archived uCode1 snapshot: /Users/fredbook/Code/ARCHIVED/uCode1-2026-06-21
- archived uCode2 snapshot: /Users/fredbook/Code/ARCHIVED/uCode2-2026-06-21

The GridCore and viewport packages already exist inside the live uCode monorepo, so GridSmith should be planned as a new agent/workspace layer on top of those packages rather than as a fresh external stack.

## Actual Local Repo and Package Map

### Live Repos

- uCore root: /Users/fredbook/Code/uCore
- uCode root: /Users/fredbook/Code/uCode

### Existing uCode package layout

- GridCore package: /Users/fredbook/Code/uCode/packages/gridcore
- Viewport renderer package: /Users/fredbook/Code/uCode/packages/viewport-renderer
- BASIC runtime: /Users/fredbook/Code/uCode/runtimes/basic
- AMOS runtime: /Users/fredbook/Code/uCode/runtimes/amos
- Existing workspace file: /Users/fredbook/Code/uCode/ucode.code-workspace

### Archived reference repos

- uCode1 archive: /Users/fredbook/Code/ARCHIVED/uCode1-2026-06-21
- uCode2 archive: /Users/fredbook/Code/ARCHIVED/uCode2-2026-06-21

## Source-of-Truth Documents to Carry Forward

### Current live docs

- uCore extraction brief: /Users/fredbook/Code/uCore/docs/GRIDUI_GRIDCORE_EXTRACTION_PLAN.md
- uCode package collation: /Users/fredbook/Code/uCode/docs/GRID_ALGEBRA_RELEASE_COLLATION.md

These two documents establish the current migration direction:
- GridUI remains a thin wrapper surface in uCore.
- reusable algebra belongs in @udos/gridcore.
- reusable rendering belongs in @udos/viewport-renderer.

### Archived docs that matter for GridSmith

From archived uCode1:

- foundation README: /Users/fredbook/Code/ARCHIVED/uCode1-2026-06-21/README.md
- spatial character integration: /Users/fredbook/Code/ARCHIVED/uCode1-2026-06-21/docs/SPATIAL_CHARACTER_INTEGRATION.md
- sprite/object reference: /Users/fredbook/Code/ARCHIVED/uCode1-2026-06-21/docs/SPRITE_OBJECT_REFERENCE.md

These archived docs add important domain rules the new plan should inherit:
- uCode1 owned the grid/cell coordinate system and teletext rendering model.
- coordinate format was already formalized as `L{level}-{gridXY}-{cellXY}-{layer}`.
- sprite and object semantics were already specified and should inform world/entity layer design.
- spatial anchoring and character metadata were already conceived as cell-attached data, not separate UI-only concepts.

From archived uCode2:

- README: /Users/fredbook/Code/ARCHIVED/uCode2-2026-06-21/README.md

This confirms uCode2 is not the primary source for GridSmith world-building behavior. GridSmith should inherit runtime/grid semantics mostly from uCode1, and package architecture from current uCode/uCore.

## Corrected Path Plan

### Agent location

Recommended live location:

- /Users/fredbook/Code/uCode/agents/gridsmith

This directory does not currently exist, but it should live inside the existing uCode monorepo rather than under a separate `uDosGo` folder.

### Workspace root

Recommended live location:

- /Users/fredbook/Code/uCode/workspaces/gridcore

This directory does not currently exist, but it fits the current monorepo layout and keeps world assets adjacent to runtimes and packages.

### Dedicated VS Code workspace file

Recommended new file:

- /Users/fredbook/Code/uCode/gridsmith.code-workspace

Reason:
- `/Users/fredbook/Code/uCode/ucode.code-workspace` already exists and is broad.
- GridSmith benefits from a narrower workspace focused on world-building, grid packages, relevant runtimes, and uCore integration.

## Corrected Workspace Structure

Planned structure under the live uCode monorepo:

```text
/Users/fredbook/Code/uCode/
  agents/
    gridsmith/
      package.json
      tsconfig.json
      src/
      tools/
      prompts/
      tests/
      README.md

  workspaces/
    gridcore/
      worlds/
        earth/
        dungeons/
        vaults/
        libraries/
      grids/
        templates/
        exports/
        imports/
      layers/
        terrain/
        details/
        foreground/
        lighting/
        collision/
        entities/
      fonts/
        imported/
        generated/
        sprites/
      maps/
        region/
        city/
        dungeon/
      scripts/
        basic/
        amos/
        generated/
```

## Corrected Dependency Story

GridSmith should depend on what already exists locally:

- @udos/gridcore from /Users/fredbook/Code/uCode/packages/gridcore
- @udos/viewport-renderer from /Users/fredbook/Code/uCode/packages/viewport-renderer
- BASIC runtime code from /Users/fredbook/Code/uCode/runtimes/basic
- AMOS runtime code from /Users/fredbook/Code/uCode/runtimes/amos
- uCore API from /Users/fredbook/Code/uCore/backend

It should not be planned as a greenfield stack that installs external `@udos/gridcore` packages first. The live local workspace packages are the development source.

## Design Inheritance Rules

### Inherit from archived uCode1

GridSmith should treat archived uCode1 as the semantic ancestor for:

- cell and grid hierarchy
- uCode coordinate conventions
- teletext and character-grid worldview
- sprite/object entity semantics
- map and grid CLI language

Specifically, the following concepts should be preserved:

- 24x24 cell assumption unless current gridcore has intentionally superseded it
- layered coordinate format with explicit layer suffix
- maps/worlds as compositions of grids and layers
- entity data modeled as cell-attached metadata for sprites and objects

### Inherit from current uCore/uCode docs

GridSmith should treat current live docs as the architectural source for:

- package ownership boundaries
- extraction strategy from GridUI to packages
- renderer separation from algebra
- wrapper-only GridUI direction inside uCore

## Corrected Architecture Statement

GridSmith is not a replacement for GridCore or GridUI.

GridSmith should be defined as:

- a contained world-building agent inside the live uCode monorepo
- using live `@udos/gridcore` for algebra and coordinate transforms
- using live `@udos/viewport-renderer` for DOM/canvas rendering support
- using uCore as the API and MCP exposure layer
- using archived uCode1 docs as semantic inheritance for grid, teletext, sprite, and spatial concepts

## Recommended Implementation Order

### Phase 0: Reality alignment

Before coding GridSmith behavior:

1. create `agents/gridsmith` inside live uCode
2. create `workspaces/gridcore` inside live uCode
3. create a dedicated `gridsmith.code-workspace`
4. document the live-path plan and inherited source docs

### Phase 1: Thin agent scaffold

Inside `/Users/fredbook/Code/uCode/agents/gridsmith`:

- package.json
- tsconfig.json
- src/index.ts
- src/cli.ts
- src/tools/*.ts
- README.md

Initial scope:
- no new algebra implementation
- no duplicated renderer implementation
- consume `@udos/gridcore` and `@udos/viewport-renderer`

### Phase 2: World and asset workspace

Inside `/Users/fredbook/Code/uCode/workspaces/gridcore`:

- create world/grids/layers/fonts/maps/scripts directories
- define canonical file formats for grid exports, layers, and world manifests
- add sample fixtures for one BASIC-derived world and one generated dungeon

### Phase 3: Runtime bridge

Bridge GridSmith to live runtimes:

- BASIC importer from `runtimes/basic`
- AMOS importer from `runtimes/amos`
- initial mapping layer from program constructs to grid/layer/world artifacts

### Phase 4: uCore integration

Expose GridSmith through uCore via:

- MCP tools
- REST endpoints
- optional Developer or uCode surface integration

### Phase 5: UI integration

Connect outputs into:

- uCore GridUI wrapper surface
- uCode-focused workspace UI
- AssistUI or Developer surface controls where useful

## Corrected Workspace File Recommendation

Instead of the draft path:
- `~/Code/uDosGo/GridSmith.code-workspace`

Use:
- `/Users/fredbook/Code/uCode/gridsmith.code-workspace`

Recommended folder set:

```json
{
  "folders": [
    { "path": "/Users/fredbook/Code/uCode", "name": "uCode" },
    { "path": "/Users/fredbook/Code/uCode/agents/gridsmith", "name": "GridSmith" },
    { "path": "/Users/fredbook/Code/uCode/workspaces/gridcore", "name": "GridCore Workspace" },
    { "path": "/Users/fredbook/Code/uCode/packages/gridcore", "name": "@udos/gridcore" },
    { "path": "/Users/fredbook/Code/uCode/packages/viewport-renderer", "name": "@udos/viewport-renderer" },
    { "path": "/Users/fredbook/Code/uCode/runtimes/basic", "name": "BASIC Runtime" },
    { "path": "/Users/fredbook/Code/uCode/runtimes/amos", "name": "AMOS Runtime" },
    { "path": "/Users/fredbook/Code/uCore", "name": "uCore" }
  ]
}
```

## Important Corrections to the Draft Spec

### Replace these draft assumptions

Draft assumption:
- `~/Code/uDosGo/uCode/agents/gridsmith/`

Correct local path:
- `/Users/fredbook/Code/uCode/agents/gridsmith`

Draft assumption:
- `~/Code/uDosGo/uCode/workspaces/gridcore/`

Correct local path:
- `/Users/fredbook/Code/uCode/workspaces/gridcore`

Draft assumption:
- `~/Code/uDosGo/GridSmith.code-workspace`

Correct local path:
- `/Users/fredbook/Code/uCode/gridsmith.code-workspace`

Draft assumption:
- fresh dependency install from package registry first

Correct local development approach:
- consume live monorepo packages in `/Users/fredbook/Code/uCode/packages/*`

Draft assumption:
- GridSmith behavior can be designed from current package stubs alone

Correction:
- inherit semantic rules from archived uCode1 docs plus current extraction/collation docs

## Gaps Still Open

These are not blockers for planning, but should be explicit:

1. Current `@udos/gridcore` is still a scaffold and not yet full parity with all old GridUI/uCode1 transforms.
2. Current `@udos/viewport-renderer` is scaffolded but not yet a hardened end-state renderer.
3. No separate archived GridUI repo was found in `/Users/fredbook/Code/ARCHIVED`; current uCore GridUI plus extraction docs remain the live source.
4. BASIC and AMOS importer mapping rules still need implementation-level decisions beyond the high-level draft.

## Recommended Next Action

The next practical step is not more planning. It is:

1. scaffold `/Users/fredbook/Code/uCode/agents/gridsmith`
2. scaffold `/Users/fredbook/Code/uCode/workspaces/gridcore`
3. create `/Users/fredbook/Code/uCode/gridsmith.code-workspace`
4. seed the scaffold with a minimal CLI and placeholder tool contracts that consume the live `gridcore` and `viewport-renderer` packages

That keeps the build aligned with the current machine and preserves the archived semantics without pretending the package migration is already complete.
