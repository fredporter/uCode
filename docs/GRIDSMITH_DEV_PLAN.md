# GridSmith Implementation: Developer Execution Plan

**Status:** Implemented baseline; future work is hardening and product integration
**Agent:** GridSmith v1.0
**Workspace:** `~/Code/uCode/agents/gridsmith/`
**Imported:** 2026-07-01

## Architecture

GridSmith is a **Node.js CLI toolkit** for deterministic world building with an
an owned CLI contract for host applications.
It complements the existing GridCore Vue library (display) and `gridsmith_api.py` (Python REST API).

## Component Map

| Capability | Location | Status |
|------------|----------|--------|
| GridCore Vue (display) | `packages/gridcore/` | Exists |
| Viewport renderer | `packages/viewport-renderer/` | Exists |
| Python API bridge | `backend/app/api/gridsmith_api.py` (in uCore) | Exists |
| GridSmith Node agent | `agents/gridsmith/` | Stub only |
| CLI (`gridsmith`) | `agents/gridsmith/src/cli.ts` | Stub only |
| Core GridSmith class | `agents/gridsmith/src/index.ts` | Needs build |
| BASIC importer | Needs creation | Missing |
| AMOS importer | Needs creation | Missing |
| World creation | Needs creation | Missing |
| Cell editing | Needs creation | Missing |
| Layer composition | Needs creation | Missing |
| Pathfinding | Needs creation | Missing |
| UVOX export/import | Needs creation | Missing |

## Build Order

1. Implement `GridSmith` core class in `agents/gridsmith/src/index.ts`
2. Wire CLI commands via `commander` in `cli.ts`
3. Create `BASICParser` and `AMOSParser` importers
4. Build deterministic operations in `src/tools/`
5. Test suite in `tests/`
6. npm link for the `gridsmith` command

## Integration Points

- Python `gridsmith_api.py` endpoints call GridSmith via `gridsmith_bridge.py`
- External MCP reads are registered only by uCore's `udos-mcp` adapter, which
  delegates to the GridSmith CLI/API contract
- Frontend display via GridCore Vue components (existing)
- Workspace at `workspaces/gridcore/` (existing, empty)
