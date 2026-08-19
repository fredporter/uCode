# uCode Skills Framework — Classic Game Adaptation

**Status:** 🔒 LOCKED — Canonical Reference
**Version:** 1.0
**Date:** 2026-07-06

## Overview

The Skills Framework defines automated tools ("Skills") for importing and adapting classic programs into the uCode ecosystem. Each Skill produces a structured output conforming to a specific JSON schema.

## Skill Catalog

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| `Source-Miner` | Scan codebases for integration points | Repository URL or file path | JSON report of LENS-extractable elements |
| `LENS-Craft` | Generate LENS extractor code | Source-Miner report + memory map | Python LENS extractor module |
| `SKIN-Weaver` | Convert original graphics to uCode SKINs | Asset files (.png, .bmp, sprite data) | SKIN manifest + asset files |
| `MCP-Scribe` | Define MCP command interfaces | Source-Miner report + game mechanics spec | MCP command YAML specification |
| `Inspire-Engine` | Generate game design docs for rewrites | Research materials (reviews, wikis) | Structured game design document |
| `uCode-Weaver` | Generate skeleton code from GDD | Inspire-Engine GDD output | BBC BASIC or Python source with LENS/SKIN/MCP hooks |

---

## 1. Source-Miner Schema

**Purpose:** Analyze a codebase and extract LENS-extractable integration points.

### Input

```json
{
  "source": {
    "type": "repository",
    "url": "https://github.com/example/elite-source",
    "branch": "master",
    "language": ["6502", "assembly"]
  },
  "options": {
    "scan_depth": "full",
    "target_patterns": ["*.asm", "*.6502", "*.s"],
    "exclude_patterns": ["test_*.asm", "*.tmp"]
  }
}
```

### Output

```json
{
  "skill": "Source-Miner",
  "version": "1.0",
  "executed_at": "2026-07-06T23:00:00Z",
  "source": "https://github.com/example/elite-source",
  "findings": {
    "memory_map": [
      {
        "label": "ship_status",
        "address": "0x0222",
        "type": "byte",
        "description": "Bitmask: 0=docked, 1=in flight",
        "confidence": 0.95
      },
      {
        "label": "ship_location_x",
        "address": "0x0234",
        "type": "uint16",
        "description": "Current system X coordinate",
        "confidence": 0.90
      },
      {
        "label": "ship_location_y",
        "address": "0x0236",
        "type": "uint16",
        "description": "Current system Y coordinate",
        "confidence": 0.90
      },
      {
        "label": "inventory",
        "address": "0x0240",
        "type": "array",
        "length": 12,
        "element_type": "byte",
        "description": "Commodity quantities (0-255)",
        "confidence": 0.85
      }
    ],
    "functions": [
      {
        "name": "MainLoop",
        "address": "0x0400",
        "description": "Main game loop entry point",
        "parameters": []
      },
      {
        "name": "DockShip",
        "address": "0x1200",
        "description": "Execute docking sequence",
        "parameters": []
      },
      {
        "name": "JumpWarp",
        "address": "0x1500",
        "description": "Execute hyperspace jump",
        "parameters": [
          { "register": "A", "description": "Destination system index" }
        ]
      }
    ],
    "data_structures": [
      {
        "name": "ShipData",
        "size": 64,
        "fields": [
          { "offset": 0, "name": "type", "size": 1 },
          { "offset": 1, "name": "x", "size": 2 },
          { "offset": 3, "name": "y", "size": 2 },
          { "offset": 5, "name": "z", "size": 2 }
        ]
      }
    ],
    "asset_references": [
      {
        "path": "gfx/ships/*.bin",
        "type": "sprite_data",
        "count": 13,
        "description": "Ship wireframe model data"
      },
      {
        "path": "text/*.txt",
        "type": "teletext_pages",
        "count": 24,
        "description": "Teletext planet descriptions"
      }
    ]
  },
  "recommendations": [
    {
      "action": "create_lens_extractor",
      "target": "ship_status",
      "priority": "high",
      "rationale": "Core game state for save/load and telemetry"
    },
    {
      "action": "create_lens_extractor",
      "target": "inventory",
      "priority": "high",
      "rationale": "Commodity trading data for external tools"
    },
    {
      "action": "create_mcp_command",
      "target": "DockShip",
      "priority": "medium",
      "rationale": "Allow external docking trigger"
    }
  ]
}
```

---

## 2. LENS-Craft Schema

**Purpose:** Generate LENS extractor code from a Source-Miner memory map.

### Input

```json
{
  "source_miner_report": "<Source-Miner output>",
  "emulator": {
    "type": "6502",
    "memory_size": 65536,
    "memory_base": "0x0000",
    "endianness": "little"
  },
  "output": {
    "language": "python",
    "module_name": "elite_lens",
    "path": "runtimes/basic/bridge/lens/extractors/elite_lens.py"
  }
}
```

### Output

```json
{
  "skill": "LENS-Craft",
  "version": "1.0",
  "executed_at": "2026-07-06T23:00:00Z",
  "module_path": "runtimes/basic/bridge/lens/extractors/elite_lens.py",
  "extractors": [
    {
      "name": "elite_ship_status",
      "type": "bitmask",
      "address": "0x0222",
      "size": 1,
      "labels": {
        "0": "docked",
        "1": "in_flight",
        "2": "docking",
        "3": "jumping"
      },
      "description": "Current ship docking/flight state"
    },
    {
      "name": "elite_location",
      "type": "struct",
      "address": "0x0234",
      "size": 4,
      "fields": [
        { "name": "x", "offset": 0, "type": "uint16", "description": "System X coordinate" },
        { "name": "y", "offset": 2, "type": "uint16", "description": "System Y coordinate" }
      ],
      "description": "Current star system location"
    },
    {
      "name": "elite_inventory",
      "type": "array",
      "address": "0x0240",
      "size": 12,
      "element_type": "byte",
      "labels": [
        "food", "textiles", "radioactives", "slaves",
        "liquor_wines", "luxuries", "narcotics", "computers",
        "machinery", "alloys", "firearms", "furs"
      ],
      "description": "Cargo hold inventory (tons)"
    },
    {
      "name": "elite_credits",
      "type": "uint32",
      "address": "0x0200",
      "size": 4,
      "description": "Player credit balance (tenths of credit)"
    }
  ]
}
```

### Generated Code Template

```python
# Auto-generated by LENS-Craft v1.0
# Target: Elite (BBC Micro, 6502 emulation)

class EliteLensExtractor:
    def __init__(self, emu):
        self._emu = emu

    @property
    def ship_status(self) -> str:
        val = self._emu.read_byte(0x0222)
        labels = {0: "docked", 1: "in_flight", 2: "docking", 3: "jumping"}
        return labels.get(val, "unknown")

    @property
    def location(self) -> dict:
        x = self._emu.read_uint16(0x0234)
        y = self._emu.read_uint16(0x0236)
        return {"x": x, "y": y}

    @property
    def inventory(self) -> dict:
        items = ["food", "textiles", "radioactives", "slaves",
                 "liquor_wines", "luxuries", "narcotics", "computers",
                 "machinery", "alloys", "firearms", "furs"]
        result = {}
        for i, label in enumerate(items):
            result[label] = self._emu.read_byte(0x0240 + i)
        return result

    @property
    def credits(self) -> int:
        return self._emu.read_uint32(0x0200)

    def capture_all(self) -> dict:
        return {
            "ship_status": self.ship_status,
            "location": self.location,
            "inventory": self.inventory,
            "credits": self.credits,
        }
```

---

## 3. SKIN-Weaver Schema

**Purpose:** Convert original game assets to uCode SKIN formats.

### Input

```json
{
  "source_assets": [
    {
      "path": "gfx/ships/adder.bin",
      "type": "wireframe_model",
      "format": "elite_wireframe",
      "transform": {
        "scale": 2.0,
        "rotation": 0,
        "center": [12, 12]
      }
    }
  ],
  "target": {
    "locale": "teletext_grid",
    "resolution": {"cols": 40, "rows": 25},
    "palette": "bbc_mode7"
  }
}
```

### Output

```json
{
  "skill": "SKIN-Weaver",
  "version": "1.0",
  "executed_at": "2026-07-06T23:00:00Z",
  "skin_name": "elite_classic",
  "manifest": {
    "name": "Elite Classic (Teletext)",
    "version": "1.0",
    "palette": {
      "0": "#000000",
      "1": "#00ff00",
      "2": "#00ff00",
      "3": "#ffff00",
      "4": "#0000ff",
      "5": "#ff00ff",
      "6": "#00ffff",
      "7": "#00ff00"
    },
    "character_mappings": [
      {
        "source": "gfx/ships/adder.bin",
        "target_char": "@",
        "target_fg": 2,
        "target_bg": 0,
        "description": "Adder ship (green)"
      }
    ],
    "teletext_overrides": {
      "header_row": { "fg": 2, "bg": 0, "bold": true },
      "hud_row": { "fg": 3, "bg": 0, "bold": false },
      "alert_row": { "fg": 1, "bg": 0, "bold": true }
    }
  },
  "exported_assets": [
    { "source": "gfx/ships/adder.bin", "output": "skins/elite_classic/chars/adder.json" }
  ]
}
```

---

## 4. MCP-Scribe Schema

**Purpose:** Generate MCP command specifications from game mechanics analysis.

### Input

```json
{
  "program_name": "Elite",
  "program_type": "adapt-source",
  "game_mechanics": {
    "genre": ["space_trading", "combat_sim"],
    "save_system": "manual_dock",
    "input_method": "keyboard",
    "persistence": "save_at_dock"
  },
  "source_miner_report": "<Source-Miner output>"
}
```

### Output

```json
{
  "skill": "MCP-Scribe",
  "version": "1.0",
  "executed_at": "2026-07-06T23:00:00Z",
  "program": "Elite",
  "commands": [
    {
      "name": "elite_save",
      "description": "Save current game state via LENS capture",
      "parameters": {
        "slot": {
          "type": "string",
          "description": "Save slot name",
          "default": "autosave"
        }
      },
      "action": "lens_capture",
      "payload": {
        "target": "variables",
        "scope": "elite_save",
        "keys": ["ship_status", "location", "inventory", "credits"]
      }
    },
    {
      "name": "elite_load",
      "description": "Restore saved game state",
      "parameters": {
        "slot": {
          "type": "string",
          "description": "Save slot to load",
          "default": "autosave"
        }
      },
      "action": "lens_restore",
      "payload": {
        "target": "variables",
        "scope": "elite_save",
        "keys": ["ship_status", "location", "inventory", "credits"]
      }
    },
    {
      "name": "elite_dock",
      "description": "Trigger docking sequence",
      "parameters": {},
      "action": "mcp_inject",
      "payload": {
        "target": "6502_execute",
        "address": "0x1200",
        "description": "Call DockShip routine"
      }
    },
    {
      "name": "elite_jump",
      "description": "Initiate hyperspace jump to system",
      "parameters": {
        "system_index": {
          "type": "number",
          "description": "Target system index (0-255)"
        }
      },
      "action": "mcp_inject",
      "payload": {
        "target": "6502_execute",
        "address": "0x1500",
        "register": "A",
        "value_template": "{{system_index}}"
      }
    },
    {
      "name": "elite_pause",
      "description": "Pause/resume game execution",
      "parameters": {},
      "action": "emulator_control",
      "payload": {
        "command": "toggle_pause"
      }
    },
    {
      "name": "elite_status",
      "description": "Query current game state",
      "parameters": {},
      "action": "lens_query",
      "payload": {
        "extractor": "EliteLensExtractor",
        "method": "capture_all"
      }
    }
  ]
}
```

---

## 5. Inspire-Engine Schema

**Purpose:** Generate game design documents for rewrites by analyzing research materials.

### Input

```json
{
  "target_game": "Knight Orc",
  "approach": "rewrite_inspired_by",
  "research_sources": [
    {
      "type": "mobygames",
      "url": "https://www.mobygames.com/game/knight-orc",
      "reliability": "high"
    },
    {
      "type": "wikipedia",
      "url": "https://en.wikipedia.org/wiki/Knight_Orc",
      "reliability": "high"
    },
    {
      "type": "forum_thread",
      "url": "https://example.com/knight-orc-review",
      "reliability": "medium"
    }
  ],
  "design_constraints": {
    "target_runtime": "bbc_basic_sdl",
    "display_mode": "teletext",
    "max_program_size": "64kb"
  }
}
```

### Output

```json
{
  "skill": "Inspire-Engine",
  "version": "1.0",
  "executed_at": "2026-07-06T23:00:00Z",
  "target_game": "Knight Orc",
  "game_design_document": {
    "title": "Knight Orc (uCode Adaptation)",
    "genre": ["text_adventure", "fantasy"],
    "summary": "You are Grindleguts, an orc seeking revenge in a fantasy/sci-fi world. The game features a real-time NPC schedule system unique to the KAOS engine.",
    "core_mechanics": [
      {
        "name": "text_parser",
        "description": "Standard text adventure parser supporting VERB NOUN grammar",
        "constraints": ["max 2 words per command", "abbreviation support (N=North, X=Examine)"],
        "vocabulary_size": "~200 words (60 verbs, 140 nouns/adjectives)"
      },
      {
        "name": "npc_schedules",
        "description": "NPCs follow daily routines independent of player actions. Time advances with player actions.",
        "implementation": "Tick-based time system. Each NPC has a schedule array: [location, time_start, time_end, action]",
        "constraints": ["Clock resolution: 1 tick per command", "Day/night cycle: 24 ticks (1 tick = 1 in-game hour)"]
      },
      {
        "name": "magic_system",
        "description": "Spell casting with mana cost and component requirements",
        "spells": [
          { "name": "BLAST", "cost": 5, "effect": "damage_target", "learn_location": "wizard_tower" },
          { "name": "HEAL", "cost": 3, "effect": "restore_health", "learn_location": "healer_hut" },
          { "name": "SHIELD", "cost": 4, "effect": "temporary_defense", "learn_location": "wizard_tower" }
        ]
      },
      {
        "name": "world_model",
        "description": "Multi-location world with movable objects and NPCs",
        "locations": [
          { "id": "orc_camp", "name": "Orc Camp", "exits": ["north=dark_forest"] },
          { "id": "dark_forest", "name": "Dark Forest", "exits": ["south=orc_camp", "east=wizard_tower"] },
          { "id": "wizard_tower", "name": "Wizard's Tower", "exits": ["west=dark_forest"] }
        ]
      }
    ],
    "uCode_integration": {
      "lens_extractors": [
        { "target": "player_location", "type": "string", "description": "Current location ID" },
        { "target": "player_inventory", "type": "array", "description": "List of carried item IDs" },
        { "target": "game_time", "type": "uint16", "description": "Current game time in ticks" },
        { "target": "npc_statuses", "type": "array", "description": "Array of {npc_id, location, action} for each NPC" }
      ],
      "skin_themes": [
        { "name": "dark_fantasy", "description": "Dark background with muted colours" },
        { "name": "teletext_classic", "description": "Standard MODE 7 teletext" }
      ],
      "mcp_commands": [
        { "name": "knight_orc_save", "description": "Save game state" },
        { "name": "knight_orc_load", "description": "Load game state" },
        { "name": "knight_orc_time_skip", "description": "Advance game time by N ticks" }
      ]
    }
  },
  "effort_estimate": {
    "total_weeks": 10,
    "breakdown": {
      "core_engine": 3,
      "parser_and_vocabulary": 1,
      "world_building": 2,
      "npc_system": 2,
      "magic_system": 1,
      "testing": 1
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Skill Scaffolding (Week 1-2)

- Define JSON schema validator for each skill (TypeScript, using zod)
- Build `Source-Miner` for 6502 assembly (most common target)
- Create CLI entry points: `gridsmith skill source-miner <url>`

### Phase 2: Core Skills (Week 3-4)

- Build `LENS-Craft` — generates Python extractors
- Build `MCP-Scribe` — generates MCP command YAML
- Test on Elite source (simplest known target)

### Phase 3: Asset Skills (Week 5-6)

- Build `SKIN-Weaver` — converts graphics to teletext/sprite formats
- Build `Inspire-Engine` — game design doc generator
- Test on Repton assets and Knight Orc research

### Phase 4: Integration (Week 7-8)

- Keep skills available through the GridSmith CLI tool registry
- Create end-to-end pipeline: `Source-Miner → LENS-Craft → MCP-Scribe`
- Generate Program.yaml from skills pipeline output
