# uCode — uDosGo Runtime and Code Delivery

uCode is the base runtime, grid algebra, and code-delivery repo for
uDosGo code surfaces. It is designed to be consumed by host applications such as
[uCore](https://github.com/uDosGo/uCore) without requiring those hosts to own
uCode internals.

**uCode is not a full application GUI.** It provides the foundational runtime
packages, grid/code algebra, import/export tooling, CLI surfaces, and
inspectable render targets such as terminal and teletext widgets.

The advanced runtime layer is now tracked as **uCode2**. uCode2 is reserved for
more advanced spatial or immersive capabilities and should be treated as a later
extension layer, not a current priority while the base uCode stack is still being
stabilized.

Application-specific runtime concerns that belong to HomeNest should live in
**HomeRuntime** rather than in uCode.

---

## Repository Boundary

### uCode Owns

| Area                         | Role                                               |
| ---------------------------- | -------------------------------------------------- |
| `packages/gridcore`          | Grid algebra, code addressing, cell/layer model    |
| `packages/viewport-renderer` | Browser render surfaces, Terminal/Teletext widgets |
| `agents/gridsmith`           | CLI/import/export/build tooling                    |
| `runtimes/basic`             | BASIC runtime bridge/package                       |
| `runtimes/amos`              | AMOS runtime bridge/package                        |
| `shared`                     | Cross-runtime support (not host-app-specific)      |
| `config/`                    | Runtime and development configuration              |
| `docs/`                      | Specs, boundary docs, workflows                    |
| `tests/`                     | Integration tests                                  |

### Host Applications (e.g. uCore) Own

- Product shell and navigation
- Developer dashboard/application GUI
- Workspace orchestration
- User/session/application state
- Long-running command-centre behaviour

uCore and other hosts should consume uCode through **package, CLI, or runtime
artifact boundaries**. External MCP exposure belongs to uCore's canonical
`udos-mcp` gateway.

---

## Structure

```
uCode/
├── packages/
│   ├── gridcore/             Grid algebra and core grid/code primitives
│   └── viewport-renderer/    Terminal/teletext/browser render surfaces
├── agents/
│   └── gridsmith/            CLI and import/export tooling
├── runtimes/
│   ├── basic/                BASIC runtime bridge/package
│   └── amos/                 AMOS runtime bridge/package
├── shared/                   Cross-runtime support
├── config/                   Runtime and development configuration
├── docs/                     Specs, boundary docs, workflows
├── tests/                    Integration tests
└── README.md                 This file
```

Note: Home-specific runtime concerns and application-layer integrations have been
moved to the [HomeNest](https://github.com/uDosGo/HomeNest) repository and its
associated HomeRuntime package.

---

## Quick Start

```bash
# Install and build all packages
npm install
npm run build
npm test

# Shared ecosystem Python environment
python3 -m venv ../.venv  # only when ~/Code/.venv does not yet exist
../.venv/bin/python -m pip install --no-build-isolation -e shared -e runtimes/basic
../.venv/bin/python -m pytest -q runtimes/basic/tests
```

---

## Package Boundaries

uCode packages are published under the `@udos` scope and are independently
versioned:

```typescript
import { ... } from '@udos/gridcore'
import { TerminalWidget, TeletextWidget } from '@udos/viewport-renderer'
import { GridSmith } from '@udos/gridsmith'
```

Dependency direction is strictly one-way:

```
@udos/gridcore          ← no internal deps
@udos/viewport-renderer → depends on @udos/gridcore
@udos/gridsmith         → depends on @udos/gridcore, @udos/viewport-renderer
```

No package depends on uCore or any host application.

---

## Runtime Inspection

uCode can expose runtime output through inspectable surfaces such as terminal
and teletext widgets. These are **render/inspection targets**, not the full
application GUI.

Browser-facing widgets live under:

```
packages/viewport-renderer/
```

Runtime and terminal inspection utilities live under:

```
runtimes/
```

---

## External Tool Integration

GridSmith exposes deterministic package and CLI contracts. uCore invokes those
contracts through its GridSmith bridge and selectively exposes bounded reads
through the canonical `udos-mcp` gateway. uCode does not run an MCP server,
proxy providers, or own client configuration.

## Embedding uCode

uCode provides core functionality as standalone browser-embeddable bundles.

```bash
# Serve embeddables at http://localhost:8000
npm run serve:embed
```

See [`docs/EMBEDDING.md`](docs/EMBEDDING.md) for details.

---

## Development Rule

> **uCode must be installable, buildable, testable, and packageable from this
> repo alone. It must not depend on implementation code from uCore.**

See [`docs/UCODE_REPO_BOUNDARY.md`](docs/UCODE_REPO_BOUNDARY.md) for the full
boundary specification.
