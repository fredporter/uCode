# uCode Classic Program Adaptation Strategy

Status: LOCKED - Canonical Reference
Version: 2.0
Date: 2026-07-31

## Platform Naming Clarification

uCode is one platform with profile modes, not separate product stacks.

1. uCode1 = teletext-first profile (MODE 7 foundation)
2. uCode2 = sprite/BOB-capable profile enabled through AMOS shim compatibility

In GridCore-era architecture, both run inside the same uCode runtime boundary.

## Final Program Adaptation Strategy

| Program | Approach | Why This Approach | uCode Integration |
| ------- | -------- | ----------------- | ----------------- |
| ACS | Rewrite (uCode inspired-by) | Original source unavailable; design is iconic | Native GridCore UI + LENS + SKIN + MCP with Inspire-Engine |
| Eamon | Adapt original source (port) | Applesoft source available and modular | LENS for stats/state, SKIN themes, MCP save/load tooling |
| Apple Panic | Rewrite (uCode inspired-by) | Original source unavailable | Native GridCore character objects, LENS level state, MCP control |
| Elite | Adapt original source | 6502 source available and documented | LENS ship/cargo/location, SKIN wireframe themes, MCP control hooks |
| NetHack | Adapt original source | Open source code available | LENS dungeon/inventory state, teletext/GridCore display bridge |
| Repton | Adapt original source | Source available and documented | LENS map/level state, SKIN teletext/sprite render options |
| Knight Orc | Rewrite (uCode inspired-by) | Original KAOS engine source not readily available | Text parser with GridCore teletext, LENS time/NPC state, MCP time controls |

## Inspired-By Rewrite Specs

### ACS-Inspired Builder

Suggested title: uConstruct (Adventure Forge)

Core behavior:

1. Tile/world builder inspired by ACS, implemented natively in uCode.
2. GridCore map editing and traversal rules.
3. LENS exports map/room/item/creature state.
4. SKIN supports teletext_classic plus modern alternates.
5. MCP supports SAVE/LOAD/EXPORT/DEBUG flows.

Example program manifest:

```yaml
program:
  name: "My uConstruct Adventure"
  version: "1.0"
  type: "ucode"
  entry: "adventure.ucon"

  lens:
    capture: [map, rooms, inventory, creatures]

  skin:
    default: "teletext_classic"
    alternates: ["pixel_art", "paper_retro"]

  mcp:
    commands: ["SAVE", "LOAD", "EXPORT_TAILWIND", "DEBUG"]
```

### Apple Panic-Inspired Rewrite

Suggested title: Block Panic (Ladder Panic)

Core behavior:

1. GridCore-driven ladders/platforms/enemies.
2. Character objects for player/enemy blocks.
3. LENS extracts level/score/lives/enemy state.
4. SKIN profiles for teletext and modern high-contrast modes.
5. MCP reset/skip/pause commands.

### Knight Orc-Inspired Rewrite

Suggested title: Orc Quest (Grindleguts Tale)

Core behavior:

1. BBC BASIC runtime parser with schedule-driven NPC loops.
2. GridCore teletext presentation for narrative and context cues.
3. LENS extracts location/inventory/NPC/time state.
4. SKIN teletext theme sets.
5. MCP save/load/time-control commands.

## Skills Framework for Rewrite Paths

| Skill | Purpose |
| ----- | ------- |
| Inspire-Engine | Generate GDD from known gameplay references when source is missing |
| uCode-Weaver | Generate skeleton code and integration hooks |
| LENS-Craft | Define extractable runtime/game state contracts |
| MCP-Scribe | Define command/control interfaces |
| Skin-Weaver | Build profile-aligned visual themes |

## Revised Effort Estimates

| Program | Approach | Estimated Effort | Key Risk | Mitigation |
| ------- | -------- | ---------------- | -------- | ---------- |
| ACS (uConstruct) | Rewrite | Large (8-12 weeks) | Builder complexity | Start with map editor core, then interactions |
| Eamon | Adapt source | Medium (2-4 weeks) | Applesoft syntax shifts | Use BBC BASIC parity adapters |
| Apple Panic (Block Panic) | Rewrite | Small (1-2 weeks) | Minimal | Generate skeleton via uCode-Weaver |
| Elite | Adapt source | Medium (2-4 weeks) | 6502 complexity | Use existing source/build docs |
| NetHack | Adapt source | Medium (2-4 weeks) | Large codebase | Prioritize display/control bridge |
| Repton | Adapt source | Small (1-2 weeks) | Data format transforms | Leverage known clone/reference datasets |
| Knight Orc (Orc Quest) | Rewrite | Large (8-12 weeks) | NPC/system complexity | Begin with one-NPC simulation slice |

## Locked Delivery Model

| Source Availability | Approach | Tooling |
| ------------------- | -------- | ------- |
| Original source available | Adapt original source | Source-Miner, LENS-Craft, MCP-Scribe |
| Original source unavailable | Inspired-by rewrite | Inspire-Engine, uCode-Weaver, LENS-Craft, MCP-Scribe |
| Source unclear/complex | Inspired-by rewrite | Inspire-Engine, uCode-Weaver, LENS-Craft, MCP-Scribe |

This strategy preserves authenticity where feasible and uses inspired-by
rewrites where source constraints require new implementation, while keeping all
paths unified under the uCode runtime and GridCore-era integration model.