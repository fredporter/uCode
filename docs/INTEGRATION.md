# uCode Integration Reference

## Boundary

uCode owns the small user coding runtime, GridCore display contracts, viewport
rendering, and GridSmith tooling. uCore hosts its Vue surface and routes governed
AI requests; uFlow owns durable tasks. uCode does not own provider selection,
secrets, task state, or an external IDE configuration.

## Canonical locations

| Concern | Location / owner |
| --- | --- |
| Source | `$UDOS_ROOT/uCode` (normally `~/Code/uCode`) |
| Shared Python environment | `$UDOS_ROOT/.venv` |
| Mutable runtime state | `$UDOS_HOME` (normally `~/Code/.udos`) |
| User documents | `~/Vault` |
| Shared/add-on vaults | `~/Shared` |
| Public read-only editions | `~/Public` |
| Secrets and provider policy | uCore settings and secret store |
| Durable work/task state | uFlow |

No runtime component may recreate `~/.ucore`, `~/.udos`, `.tasker`, `.vscode`,
or `.clinerules`. Editor and external-agent configuration remains external to
the product repositories.

## Runtime integration

- uCore embeds the uCode surface and calls explicit uCode runtime contracts.
- Hivemind decomposes governed task envelopes; it is not a provider or task store.
- The provider router selects Ollama, OpenRouter, or OpenAI according to privacy,
  capability, health, and budget policy.
- GridSmith exposes deterministic CLI/library contracts and an optional MCP
  server. Any external client connects to that server from its own configuration.
- Vault content is referenced through approved workspace roots; API keys never
  belong in a vault or this repository.

## Verification

```bash
cd "$UDOS_ROOT/uCode"
npm test
npm run build
"$UDOS_ROOT/.venv/bin/python" -m pytest -q runtimes/basic/tests
```

Repository development is performed through the uCore Developer surface for
normal internal workflows, or through Codex for ecosystem/add-on development.
GitHub/Copilot may assist with repository-native review and CI.
