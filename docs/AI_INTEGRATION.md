# AI Integration — Ollama Local-First + Hivemind/OpenRouter

uCode is configured for **local-first AI**: Ollama does the heavy lifting for
free, with OpenRouter as a paid fallback only when Ollama is unavailable or the
user explicitly requests a premium model.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         JETBRAINS PYCHARM                       │
│  AI Assistant ───→ Ollama (http://localhost:11434/v1) ←── FREE  │
│       │                                                         │
│       └──→ OpenRouter (cloud fallback, paid) ←── only if needed │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         UCODE CLI / MCP                          │
│  GridSmith MCP ──→ uCore Snackbar (port 8484) ──→ LiteLLM      │
│       │                    │                                     │
│       │                    ├── Ollama (local, free) ←── PRIMARY  │
│       │                    └── OpenRouter (cloud)  ←── FALLBACK  │
│       └── Ollama direct (bypass uCore)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Provider Routing (Local-First)

| Priority | Provider             | Models                       | Cost      | Use Case                            |
| -------- | -------------------- | ---------------------------- | --------- | ----------------------------------- |
| **1**    | **Ollama (local)**   | `qwen2.5-coder:3b`           | **$0.00** | **Default — code gen, chat, edits** |
| **2**    | **Ollama (local)**   | `qwen2.5-coder:7b`           | **$0.00** | **Complex reasoning, review**       |
| **3**    | **Ollama (local)**   | `llama3.2:3b`                | **$0.00** | **Lightweight fast completions**    |
| 4        | OpenRouter (cloud)   | `qwen/qwen3.6-27b`           | $0.02/M   | Budget cloud fallback               |
| 5        | OpenRouter (cloud)   | `deepseek/deepseek-v4-flash` | $0.05/M   | Cloud code gen                      |
| opt-in   | OpenRouter (premium) | `anthropic/claude-opus-4.7`  | $15.00/M  | Premium reasoning                   |

**Key principle:** All local models are free. Cloud is only used when:

- Ollama is not running
- Required model is not pulled
- User explicitly requests a cloud model

## Setup

### 1. Install Ollama (Local LLM)

```bash
# Install
brew install ollama

# Start server
ollama serve

# Pull a model
ollama pull qwen2.5-coder:3b

# Verify
curl http://localhost:11434/api/tags
```

### 2. JetBrains PyCharm AI Assistant Setup

JetBrains AI Assistant auto-detects the project config in `.jetbrains/ai-assistant.xml`
and `.idea/aiSettings.xml`. These files point to Ollama as default provider.

To verify in PyCharm:

1. Open **Settings → Tools → AI Assistant**
2. Check **AI Providers**: should show `Ollama Local (Free)` as default
3. Check **Custom OpenAI-compatible** endpoint is set to `http://localhost:11434/v1`
4. Model should be `qwen2.5-coder:3b`

To manually configure via UI:

1. **Settings → Tools → AI Assistant → AI Providers**
2. Click **+** → **Custom OpenAI-compatible**
3. Endpoint: `http://localhost:11434/v1`
4. Model: `qwen2.5-coder:3b`
5. Set as default

### 3. Configure OpenRouter (Optional — Cloud Fallback Only)

```bash
./scripts/setup-ai-integration.sh
```

Or manually:

```bash
mkdir -p "${UDOS_HOME:-$HOME/Code/.udos}/config"
cp config/hivemind.env "${UDOS_HOME:-$HOME/Code/.udos}/config/hivemind.env"
cp config/openrouter.yaml "${UDOS_HOME:-$HOME/Code/.udos}/config/openrouter.yaml"
```

### 4. Start uCore Snackbar

```bash
cd ../uCore
python3 -m backend.app --host 127.0.0.1 --port 8484
```

## Verification

### Check Ollama is running

```bash
curl -s http://localhost:11434/api/tags | python3 -m json.tool
```

### Check uCore snackbar health

```bash
curl -s http://localhost:8484/api/health | python3 -m json.tool
```

### List available providers

```bash
curl -s http://localhost:8484/api/mcp/providers | python3 -m json.tool
```

### Test chat completion

```bash
curl -s http://localhost:8484/api/mcp/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what model are you?", "provider": "ollama"}' \
  | python3 -m json.tool
```

## Configuration Files

| File                     | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `config/hivemind.env`    | API keys and endpoint URLs                          |
| `config/openrouter.yaml` | Model routing tiers, costs, and budgets             |
| `config/mcp_config.json` | MCP server definitions (GridSmith, uCore, Hivemind) |
| `config/vault.yaml`      | Secret store paths and variables                    |

## JetBrains Recommended Skills

These skills optimise JetBrains AI for uCode development:

| Skill           | Model                       | Purpose                              |
| --------------- | --------------------------- | ------------------------------------ |
| Code generation | `qwen2.5-coder:3b` (Ollama) | Daily coding, refactoring, tests     |
| Code review     | `qwen2.5-coder:7b` (Ollama) | Deeper analysis, architecture review |
| Documentation   | `qwen2.5-coder:3b` (Ollama) | Docstrings, README, devlogs          |
| Commit messages | `qwen2.5-coder:3b` (Ollama) | Conventional commit generation       |
| Test generation | `qwen2.5-coder:3b` (Ollama) | Unit/integration test writing        |
| Debugging       | `qwen2.5-coder:3b` (Ollama) | Error analysis, stack trace reading  |

Configure these in **Settings → Tools → AI Assistant → Skills**.

To add a new skill:

```bash
# Skills are configured per-task in PyCharm AI Assistant UI.
# Or use the project-level config: .jetbrains/ai-assistant.xml
```

## Cost Tracking (Zero-Cost by Default)

With local-first mode, **all daily development costs $0.00**.

```
Ollama inference: $0.00/1K tokens  ← everything runs locally
OpenRouter:       $0.00             ← only used if Ollama unavailable
```

When cloud fallback is used, costs are tracked in:

```
~/.local/share/udos/costs/openrouter-usage.yaml
```

Budget limits in `config/openrouter.yaml`:

- Alert threshold: $2.00 USD
- Hard limit: $10.00 USD
- Per-model cost tracking

## PyCharm Run Configs

| Config                    | Description                                                    |
| ------------------------- | -------------------------------------------------------------- |
| `uCode: self-check`       | Full repo health check (npm install/build/test + Python check) |
| `uCode: inspect widgets`  | Lists widget/viewport files in viewport-renderer               |
| `uCode: inspect terminal` | Lists terminal/teletext/renderer files                         |

## Troubleshooting

| Symptom                                  | Likely Cause                         | Fix                                                                               |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| `Connection refused` on :11434           | Ollama not running                   | `ollama serve`                                                                    |
| JetBrains AI says "Provider unavailable" | Ollama not running or wrong endpoint | Check `http://localhost:11434/v1` is reachable; verify in Settings → AI Providers |
| JetBrains AI uses wrong model            | Config not picked up                 | Restart PyCharm; check `.jetbrains/ai-assistant.xml` is valid                     |
| `401 Unauthorized` from OpenRouter       | Missing/expired API key              | Update `config/hivemind.env`                                                      |
| `Model not found` errors                 | Model not pulled                     | `ollama pull qwen2.5-coder:3b`                                                    |
| uCore snackbar not responding            | uCore not started                    | `python3 -m backend.app --port 8484`                                              |
| High RAM usage                           | Too many Ollama models loaded        | `ollama stop <model>` to unload; use 3B models on <16GB machines                  |
| Slow responses                           | Wrong model for task                 | Switch to `qwen2.5-coder:3b` for quick tasks, `7b` for complex ones               |
