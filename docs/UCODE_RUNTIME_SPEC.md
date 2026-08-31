# uCode Runtime Specification — BBC BASIC for SDL 2.0

**Status:** Active runtime baseline; architecture naming superseded by
[`UCODE_ARCHITECTURE.md`](UCODE_ARCHITECTURE.md)
**Version:** 2.0
**Imported:** 2026-07-01

> Compatibility rule (2026-08-20): BBCSDL remains the execution authority.
> Sprites, BOBs, and the optional AMOS compatibility shim belong to uCode 1
> (product name: uCode). uCode 2 begins at the experimental 3D/spatial
> handoff. Storage paths in this imported specification are illustrative;
> active code resolves configured Vault roots and `UDOS_HOME`.

## Summary

uCode Runtime is a self-contained, embeddable execution environment based on
BBC BASIC for SDL 2.0 (BBCSDL). Python orchestrates. AMOS shim provides
compatibility.

| Component | Role |
|-----------|------|
| BBCSDL Engine | BASIC interpreter + graphics + sound |
| Python Bridge | Orchestration, LENS extraction, SKIN transformation |
| AMOS Shim | AMOS compatibility layer |
| Snack Container | Self-contained program + assets |
| Vault Integration | User programs, variables, state persistence |

Distribution: Single compressed `.runtime` nugget (~5-8MB).

## Existing Runtime in uCode

- `runtimes/basic/` — Python-based runtime (ucode1 CLI, snack CLI, core_py modules,
  thinui, ceefax, grid, cell, charset, render, m6502 emulator, liquid engine)
- `runtimes/amos/` — AMOS shim (amos_shim.bbc, ucode2 binder)
- `runtimes/basic/snacks/` — Example snack containers
- `runtimes/basic/examples/` — BASIC example programs (hello, teletext, adventure)

## Migration Plan (to v2 spec)

Replace the current `runtimes/basic/` with:
1. BBCSDL engine binary (`runtimes/basic/bbcsdl/`)
2. Python bridge (`runtimes/basic/bridge/`) — bbcsdl_bridge.py, lens.py, skin.py, variables.py
3. AMOS shim (`runtimes/amos/shim/amos_shim.bbc`) — keep, already built
4. Snack container format (keep `runtimes/basic/snacks/`, align with new spec)
5. Configured Vault roots for user programs/assets and `UDOS_HOME` for mutable
   runtime state

### Keep from Current Runtime
- AMOS shim (`runtimes/amos/shim/amos_shim.bbc`)
- Snack containers (adventure_demo, ceetex)
- Font manifest (`runtimes/basic/fonts/`)
- Examples (`runtimes/basic/examples/`)
- Tests (`runtimes/basic/tests/`)
- Docs (`runtimes/basic/docs/`)

### Replace in Current Runtime
- `core_py/` module → `bridge/` (new Python bridge)
- `ucode1/` code → BBCSDL engine
- `ceefax/` → BBCSDL MODE 7

### New to Build
- BBCSDL engine packaging
- `bridge/bbcsdl_bridge.py`
- `bridge/lens.py` (LENS state extraction)
- `bridge/skin.py` (SKIN transformation)
- `bridge/variables.py` (variable management)
- `.runtime` nugget format
- One-line installer
- Marp/Story Forms integration

## Library Registry

Core: gfxlib, imglib, listlib, audiolib, mode7lib, stringlib
Optional: box2dlib, classlib, socklib, ogllib, webgllib, dlglib
Shims: amos_shim.bbc, qbasic_shim.bbc (future)

## Implementation Phases

1. Core (weeks 1-2): Package BBCSDL, write bridge, test execution, runtime nugget format
2. Vault (weeks 2-3): Program/snack loading, variable system, ucode run command
3. LENS/SKIN (weeks 3-4): State capture, visual transformation
4. AMOS Shim (weeks 4-5): Compatibility layer, Story Forms/Marp
5. Distribution (week 5): Platform nuggets, IoT embedding, installers
