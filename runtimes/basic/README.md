# uCode BASIC Runtime

The BASIC runtime is uCode's local execution and bridge package for BBC BASIC
programs, teletext rendering, snacks, and internal runtime control.

## Ownership

This package owns:

- BASIC runtime and bridge code;
- teletext and terminal-compatible output;
- LENS state capture, SKIN presentation, and Spool persistence;
- the internal Runtime Control Protocol (RCP) bridge;
- snack manifests and execution support.

It does not own provider routing, external agents, GitHub integration, or Model
Context Protocol. Those are host responsibilities. uCore exposes the ecosystem's
bounded external tools through its canonical `udos-mcp` gateway.

## Development

Use the ecosystem Python environment and keep mutable state under `UDOS_HOME`:

```bash
cd "$UDOS_ROOT/uCode"
"$UDOS_ROOT/.venv/bin/python" -m pytest -q \
  runtimes/basic/tests shared/tests runtimes/amos/tests
```

The repository-wide JavaScript build and test gate is:

```bash
npm run build
npm test
```

The project is pre-release. Current supported behavior is defined by executable
code, tests, the root README, and `docs/UCODE_REPO_BOUNDARY.md`.
