# uCode + GridSmith Buildout Handover

Date: 2026-06-23
Audience: Cline and DevAgent
Status: Current state assessment plus next-build handover

## Scope

This handover covers the live `uCode` surface in `uCore`, the new `GridSmith` world-building scaffold inside the sibling `uCode` monorepo, and the immediate follow-on work required to turn the current scaffold into a real GridCore workspace experience.

## Repos and Real Paths

### Live repos
- uCore: `/Users/fredbook/Code/uCore`
- uCode: `/Users/fredbook/Code/uCode`

### Live GridSmith paths
- Agent root: `/Users/fredbook/Code/uCode/agents/gridsmith`
- Workspace root: `/Users/fredbook/Code/uCode/workspaces/gridcore`
- Dedicated workspace file: `/Users/fredbook/Code/uCode/gridsmith.code-workspace`

### Live frontend surface
- `uCode` surface: `/Users/fredbook/Code/uCore/frontend/src/surfaces/ucode/UCodeSurface.tsx`
- Grid tool metadata: `/Users/fredbook/Code/uCore/frontend/src/surfaces/ucode/gridToolset.ts`
- surface styles: `/Users/fredbook/Code/uCore/frontend/src/styles/surfaces/ucode.css`

### Live backend bridge and APIs
- GridSmith bridge: `/Users/fredbook/Code/uCore/backend/app/services/gridsmith_bridge.py`
- GridSmith REST API: `/Users/fredbook/Code/uCore/backend/app/api/gridsmith_api.py`
- MCP exposure: `/Users/fredbook/Code/uCore/backend/app/api/mcp.py`
- route registration: `/Users/fredbook/Code/uCore/backend/app/api/routes.py`
- agent config: `/Users/fredbook/Code/uCore/backend/config/agents.yaml`

## What Exists Right Now

## 1. uCode surface

`UCodeSurface` is currently a split layout:
- left/main viewport: Terminal or Teletext
- right dashboard: Grid toolset cards and detail views

It already includes:
- Terminal and Teletext toggle
- sidebar navigation for grid tools
- a GridSmith dashboard entry
- a GridSmith BASIC import form
- a dedicated detached GridSmith bubble and right-side chat panel

Important UI behavior change already made:
- the generic floating AssistUI bubble/panel is now hidden on `/ucode`
- only the dedicated GridSmith detached bubble should remain on this surface

That suppression lives in:
- `/Users/fredbook/Code/uCore/frontend/src/main.tsx`

## 2. GridSmith agent scaffold

The live GridSmith package builds successfully and currently provides:
- tool contract definitions
- grid creation helper
- `latlon -> uCode`
- `uCode -> latlon`
- BASIC import command

Key files:
- `/Users/fredbook/Code/uCode/agents/gridsmith/src/index.ts`
- `/Users/fredbook/Code/uCode/agents/gridsmith/src/cli.ts`
- `/Users/fredbook/Code/uCode/agents/gridsmith/src/tools/basic.ts`

## 3. BASIC import path

BASIC import is now functional through all layers:
- CLI
- uCore bridge
- REST
- MCP
- UCode surface form

Current behavior:
- accepts inline BASIC or a file path
- parses lines into a simple structure
- classifies statements like `PRINT`, `DATA`, `GOTO`, `GOSUB`, `REM`
- writes output into the live GridCore workspace:
  - `scripts/basic/*.bas`
  - `worlds/libraries/*.json`
  - `grids/imports/*.json`

This is a real pipeline, but still an early importer, not yet a semantic world compiler.

## 4. GridSmith specialized agent

A dedicated world-building agent exists in:
- `/Users/fredbook/Code/uCore/backend/config/agents.yaml`

Current agent id:
- `gridsmith-dev`

Current routing key:
- `worldbuild`

The UCode surface uses this route through:
- `POST /api/agents/spec/route`

## 5. Tests

Focused coverage exists for the new GridSmith integration:
- `/Users/fredbook/Code/uCore/backend/tests/test_api_gridsmith.py`
- `/Users/fredbook/Code/uCore/backend/tests/test_api_mcp.py`

Validated already:
- GridSmith package build
- frontend build
- GridSmith API tests
- GridSmith MCP discovery/call tests

## What Is Still Missing

## 1. World rendering loop is not complete

The current importer creates manifests and preview artifacts, but it does not yet:
- project imported BASIC semantics onto layered `gridcore` data structures
- push imported worlds into a live rendered grid view
- open imported worlds directly in Terminal or Teletext as world scenes

The UCode surface has controls, but no end-to-end “import then render world” path yet.

## 2. AMOS importer is not implemented

The current scaffold supports BASIC only.

Missing:
- AMOS parsing/import logic
- AMOS-specific mapping rules for screens, sprites, map commands, and scene data
- REST/MCP/UI exposure for AMOS import

## 3. GridSmith chat is routed through generic agent-spec route only

The detached GridSmith panel works, but it currently behaves as a thin front-end over the agent routing endpoint.

Missing:
- structured world-building prompts
- prompt templates for layers, maps, entities, spatial conversions
- tool-assisted responses that combine agent planning with live GridSmith tool calls
- conversation persistence or world context persistence

## 4. No persistent world browser inside UCode surface

The UCode surface can import a world, but it cannot yet:
- browse existing world manifests
- open existing imported BASIC worlds
- inspect generated import artifacts
- select a world and render it in the viewport

## 5. No viewport-to-world binding

Current viewport is still generic `TerminalPanel` / `TeletextGrid`.

Missing:
- binding a selected GridSmith world to the viewport
- layer toggles
- map selection
- entity overlays
- world status and current manifest display

## 6. No actual editor flows

Grid tool cards still mostly describe capability. They do not yet provide:
- live grid editing canvas for the selected world
- layer stack editor
- sprite/object inspector
- font/sprite import workflow
- save/export flows for edited grids

## 7. No write-back integration with runtime semantics

Current importer stores files, but there is no return path from edited world assets back into:
- BASIC runtime structures
- AMOS runtime structures
- runtime execution previews

## Recommended Build Split

## Cline: surface and orchestration work

Cline should own:
- UCode surface evolution
- GridSmith panel UX
- world browser in the right dashboard
- viewport/world selection and status wiring
- REST and MCP integration paths
- end-to-end validation and UX hardening

Concrete Cline tasks:
1. add a world manifest browser to `UCodeSurface`
2. add current-world state and bind it to imported manifests
3. add a lightweight “open imported world” action after BASIC import
4. replace static tool-detail copy with live status cards where possible
5. wire the detached GridSmith chat panel to tool actions, not just freeform prompt routing
6. hide any remaining generic chat affordances from the uCode/GridCore surface

## DevAgent: data model and package logic

DevAgent should own:
- GridSmith world/file formats
- importer semantics
- gridcore-layer mapping logic
- AMOS import
- export formats and transformation utilities

Concrete DevAgent tasks:
1. evolve `basic.ts` from line classifier to semantic importer
2. add `amos.ts` importer scaffold and CLI command
3. define canonical world manifest schema
4. define canonical import artifact schema for BASIC and AMOS
5. add grid composition helpers for terrain/details/collision/entities
6. add a renderer-ready projection format for viewport consumption

## Suggested Build Order

### Phase A: make imported worlds visible
1. add `GET /api/gridsmith/worlds` to list manifests
2. add `GET /api/gridsmith/worlds/{id}` to fetch a manifest
3. show imported worlds in UCode surface
4. let user pick a world in the dashboard

### Phase B: make a world renderable
1. define one renderer-friendly world payload
2. bind selected world to `TerminalPanel` or `TeletextGrid`
3. show at least one imported BASIC world in the viewport

### Phase C: deepen the importer
1. map `PRINT` to teletext/text layers
2. map `DATA` to entity/detail payloads
3. map `GOTO` / `GOSUB` to navigation metadata
4. produce layered grid cells rather than summary JSON only

### Phase D: AMOS support
1. add AMOS importer
2. expose via CLI/REST/MCP/UI
3. map sprite/screen semantics into GridSmith layers

## Current Risk Notes

1. `@udos/gridcore` and `@udos/viewport-renderer` are still partially scaffolded packages, not complete parity replacements.
2. The UCode surface is currently stronger as a control and planning surface than as a finished world editor.
3. The current GridSmith chat experience is useful for orchestration, but it is not yet coupled to tool execution strongly enough to feel like a full agent IDE.
4. The importer currently writes files into the workspace but does not update any live viewport state.

## Immediate Next Best Task

The highest-leverage next step is:

1. implement a world manifest listing API in uCore
2. add a world browser in `UCodeSurface`
3. bind selected world state into the existing viewport area

That would convert the current scaffold from “import and plan” into “import, select, and see”.

## Validation Baseline Already Achieved

Already validated in current local workspace:
- GridSmith package builds in live `uCode`
- UCode frontend builds in live `uCore`
- GridSmith REST tests pass
- GridSmith MCP tests pass
- BASIC import works through the shared bridge and writes a manifest into the live workspace

## One-line Summary

The `uCode` surface now has a dedicated GridSmith entry point and detached GridSmith agent UI, and the generic ChatUI bubble is hidden there. What remains is the actual world-browser/render/editor loop: list worlds, select one, bind it to the viewport, deepen BASIC import semantics, and then add AMOS parity.
