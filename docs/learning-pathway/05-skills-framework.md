# Skills Framework — Classic Game Adaptation Tutorial

## Overview

The uCode Skills Framework provides 6 automated tools for importing and adapting classic programs. Each skill takes structured input and produces structured output, forming a pipeline from raw source code to playable games.

## The 6 Skills

| # | Skill | Input | Output |
|---|-------|-------|--------|
| 1 | **Source-Miner** | 6502 assembly source | Memory map, functions, assets |
| 2 | **LENS-Craft** | Source-Miner report | Python LENS extractor (.py) |
| 3 | **SKIN-Weaver** | Asset file paths | .skin.yaml manifest |
| 4 | **Command-Scribe** | Source-Miner report | control command specs |
| 5 | **Inspire-Engine** | Game name | Game design document |
| 6 | **uCode-Weaver** | GDD | BBC BASIC skeleton (.bbc) |

## End-to-End Pipeline

### For Assembly Source (Repton, Elite)

```
6502 Assembly (.asm)
  → Source-Miner → memory map + functions + assets
  → LENS-Craft → repton_lens.py (Python extractor)
  → Command-Scribe → repton save/load/status commands
  → SKIN-Weaver → repton_classic.skin.yaml
  → uCode-Weaver → repton.bbc (BBC BASIC skeleton)
```

### For Rewrites (Apple Panic, Knight Orc)

```
Game Name
  → Inspire-Engine → game design document
  → uCode-Weaver → apple_panic.bbc (BBC BASIC skeleton)
```

## Using the CLI

All skills are accessible via the GridSmith CLI:

```bash
# Source-Miner: Scan assembly source
node agents/gridsmith/dist/cli.js skill source-miner --source programs/repton/src/

# LENS-Craft: Generate Python extractor
node agents/gridsmith/dist/cli.js skill lens-craft \
  --miner-report '{"findings":{"memory_map":[...]}}' \
  --module repton_lens --output programs/repton/lens/

# SKIN-Weaver: Generate skin manifest
node agents/gridsmith/dist/cli.js skill skin-weaver \
  --assets '[{"path":"ship.bin","type":"sprite_data"}]' \
  --palette bbc_mode7 --output programs/repton/skin/

# Command-Scribe: Generate command specs
node agents/gridsmith/dist/cli.js skill command-scribe \
  --miner-report '{"findings":{...}}' \
  --program Repton --type adapt-source

# Inspire-Engine: Generate GDD
node agents/gridsmith/dist/cli.js skill inspire-engine \
  --game "Knight Orc" --runtime bbc_basic_sdl

# uCode-Weaver: Generate BBC BASIC skeleton
node agents/gridsmith/dist/cli.js skill ucode-weaver \
  --gdd '{"title":"...","genre":[...]}' \
  --program "Apple Panic"
```

## Program Registration

Generated LENS extractors register in `runtimes/basic/bridge/gridcore_adapter.py`:

```python
_LENS_PROGRAMS: Dict[str, str] = {
    "repton": "repton_lens",
    "elite": "elite_lens",
}
```

Programs can then be queried at runtime:

```
OK> LENS LIST
Registered LENS programs:
  - elite
  - repton

OK> LENS CAPTURE repton
LENS capture: repton state snapshot taken (31 keys).
```

## Building Your First Program

1. Create program scaffold: `programs/<name>/src/`, `lens/`, `mcp/`, `skin/`
2. Run Source-Miner on assembly source (or Inspire-Engine for rewrites)
3. Run LENS-Craft to generate extractor
4. Run Command-Scribe for commands
5. Run SKIN-Weaver for assets
6. Run uCode-Weaver for BBC BASIC skeleton
7. Register extractor in runtime bridge
8. Write game logic in the generated BBC BASIC skeleton

## Reference

- Skills spec: `docs/specs/SKILLS_FRAMEWORK.md`
- Adaptation strategy: `docs/specs/UCODE_ADAPTATION_STRATEGY.md`
- Program registry: `programs/README.md`
- Runtime bridge: `runtimes/basic/bridge/gridcore_adapter.py`