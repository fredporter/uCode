# uCode Repository Boundary

> **uCode is not an app GUI repo. It is the runtime/algebra/code-delivery layer.**
> It provides render targets/widgets for inspection, but it should not own the full product UI.

## Core Identity

uCode is a self-contained runtime, grid algebra, and code-delivery repo for
uDosGo code surfaces. It is designed to be consumed by host applications such as
uCore **without requiring those hosts to own uCode internals**.

uCode is **not** a full application GUI. It provides:

- Runtime packages
- Grid/code algebra
- Import/export tooling
- CLI/MCP surfaces
- Inspectable render targets (terminal & teletext widgets)

## Lanes: Prose vs GridCore

The system has **two separate lanes**, kept apart on purpose:

| Lane                         | Home                | Styling                     | Role                                  |
| ---------------------------- | ------------------- | --------------------------- | ------------------------------------- |
| **Prose (USX)**              | `uCore` (host app)  | USX style tokens, Prettier  | content/docs browsing, presentation   |
| **GridCore (uCode runtime)** | `uCode` (this repo) | hand-formatted, no Prettier | grid algebra, runtime, cell rendering |

- Prose documents may **embed** GridCore views (TerminalWidget /
  TeletextWidget / `<gridui-canvas>`) — a grid view is a render target, not a
  Prose surface.
- Prettier and USX conventions apply to the Prose lane only. This repo's
  `.prettierignore` excludes the runtime so the lanes never cross-format.

## Repository Boundary

### uCode Owns

| Area                         | Role                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `packages/gridcore`          | Grid algebra, code addressing, cell/layer model        |
| `packages/viewport-renderer` | Browser render surfaces, Terminal/Teletext widgets     |
| `agents/gridsmith`           | CLI/import/export/build tooling                        |
| `runtimes/basic`             | BASIC runtime bridge/package                           |
| `runtimes/amos`              | AMOS runtime bridge/package                            |
| `shared`                     | Cross-runtime support (not host-app-specific)          |
| `config/`                    | Runtime and development configuration                  |
| `docs/`                      | Specs, boundary docs, workflows                        |
| `tests/`                     | Integration tests                                      |

### uCode Does NOT Own

- Full uCore developer GUI
- Product shell/navigation
- User account/session app frame
- Dashboard orchestration
- Long-running command centre
- Application routing

These belong to host applications (e.g., uCore).

## Architecture

```
uCore / host app
    |
    | consumes (packages, CLI, artifacts)
    v
uCode
    |
    | exposes
    v
Runtime + algebra + widgets + CLI
    |
    | renders/inspects through
    v
TerminalWidget / TeletextWidget / TerminalUI
```

More concretely:

```
uCore owns:
  - app shell
  - routes
  - project/workspace management
  - user-facing developer view
  - orchestration UI
  - snackbar daemon
  - external MCP gateway and client configuration
  - Ollama lifecycle management

uCode owns:
  - code/runtime model
  - grid algebra
  - runtime package format
  - BASIC/AMOS bridges
  - GridSmith agent
  - CLI
  - terminal/teletext render surfaces
```

## Render Surface Contract

`TerminalWidget`, `TeletextWidget`, and `TerminalUI` are **inspectors, preview
surfaces, debug views, and runtime output views** — not the main application.

They should:

- Accept a `Grid` and render it
- Be embeddable in host app views
- Be packageable and importable from host apps
- Never assume they are the full application shell

## Package Boundaries

### Export Paths

```typescript
// Host apps consume uCode packages via:
import { ... } from '@udos/gridcore'
import { TerminalWidget, TeletextWidget } from '@udos/viewport-renderer'
import { GridSmith } from '@udos/gridsmith'
```

### Dependency Direction

```
@udos/gridcore          ← no uCode-internal dependencies
@udos/viewport-renderer → depends on @udos/gridcore
@udos/gridsmith         → depends on @udos/gridcore, @udos/viewport-renderer
```

No package should depend on uCore or any host application.

## Development Rule

> **uCode must be installable, buildable, testable, and packageable from this
> repo alone. It must not depend on implementation code from uCore.**

## External Tool Surface

uCode owns deterministic package, CLI, and runtime contracts. uCore may adapt a
bounded subset through its `udos-mcp` gateway. uCode does not implement or
configure an external MCP server.

## Related Documents

- `docs/GRID_ALGEBRA_RELEASE_COLLATION.md`
- `docs/UCODE_RUNTIME_SPEC.md`
