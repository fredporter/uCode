# uCode Development Plan — JetBrains + Ollama Local-First

> **Goal:** Productive uCode development using PyCharm + JetBrains AI with
> Ollama as the primary (free, local) AI provider and OpenRouter as a paid
> fallback only when needed.

---

## 1. Daily Dev Flow

### Morning Start

```bash
# 1. Start Ollama (if not auto-started by PyCharm)
ollama serve &

# 2. Pull models if first time
ollama pull qwen2.5-coder:3b
ollama pull qwen2.5-coder:7b

# 3. Open PyCharm with uCode project
open -a "PyCharm" /Users/fredbook/Code/uCode

# 4. Activate Python environment
source .venv/bin/activate
```

### During Development

```
1. Edit code in PyCharm
2. Use JetBrains AI Chat (Cmd+Shift+I) — routes to Ollama via local endpoint
3. Run build:    PyCharm Run Config → "uCode: build"
4. Run tests:    PyCharm Run Config → "uCode: test"
5. Git commit:  JetBrains AI generates commit messages via Ollama
```

### End of Day

```bash
# Self-check before commit
./scripts/setup-ai-integration.sh config

# Or use PyCharm Run Config → "uCode: self-check"
```

---

## 2. Package Development Order

### Phase 1: Core Stability (COMPLETE)

```
Priority: gridcore → viewport-renderer → gridsmith
```

| Package                   | Task                                           | Check                                                 |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `@udos/gridcore`          | Maintain grid algebra purity                   | `npm run -ws test` from `packages/gridcore`           |
| `@udos/viewport-renderer` | Export TerminalWidget + TeletextWidget cleanly | `npm run -ws build` from `packages/viewport-renderer` |
| `@udos/gridsmith`         | Flesh out CLI/MCP tools (16 tools, 75 tests)   | `node agents/gridsmith/dist/cli.js --help`            |

### Phase 2: Runtime Packaging

```
Priority: basic runtime → amos runtime → shared
```

| Runtime          | Task                             | Check                                                        | Status (2026-07-08 audit)                                                                                                                                                                    |
| ---------------- | -------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtimes/basic` | Fix Python 3.14 dataclass compat | `pip install -e runtimes/basic && python -c "import ucode1"` | Complete in isolated venv (`.venv-amos-check`) after dataclass cleanup and split-import fixes                                                                                                |
| `runtimes/amos`  | Verify editable install          | `pip install -e runtimes/amos && python -c "import ucode2"`  | Complete in isolated venv (`.venv-amos-check`)                                                                                                                                               |
| `shared/`        | Extract common runtime support   | Review existing cross-references                             | Complete — `udos_shared` is now the canonical superset (grid models + coords); all runtime grid/editor/render modules import it; local `models.py`/`coords.py` removed; 24 shared tests pass |

### Phase 3: Integration (COMPLETE)

```
uCode packages → GridSmith MCP → uCore consumption
```

- GridSmith CLI works standalone (16 tools)
- GridSmith MCP tools registered with uCore (JSON-RPC on port 8670)
- uCore can import `@udos/viewport-renderer` widgets
- LENS program registry wired (Repton + Elite + NetHack + Eamon)

### Phase 4: Program Adaptation (sprint.2026-07-10)

```
Priority: Repton → Elite → Apple Panic → NetHack → uConstruct → Eamon → Knight Orc
```

| Program     | Pipeline | BBC BASIC | Status                                                     |
| ----------- | :------: | :-------: | ---------------------------------------------------------- |
| Repton      |   Full   | 275 lines | Enemy patrol AI, traps, and Reptol logic implemented       |
| Elite       |   Full   | 287 lines | NPC ship movement/combat and galaxy navigation implemented |
| Apple Panic |   GDD    | 281 lines | Digging/trapping mechanics                                 |
| NetHack     | Research | 52 lines  | Research + skeleton + LENS extractor implemented           |
| uConstruct  | Scaffold | 49 lines  | Scaffold complete; tile editor still design-phase          |
| Eamon       | Research | 63 lines  | Research + skeleton + LENS extractor implemented           |
| Knight Orc  |   GDD    | 64 lines  | Text adventure skeleton                                    |

### Phase 5: Viewport Demo and Runtime Testing (sprint.2026-07-10)

| Task                           | File                                                                                      | Status                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| TerminalWidget dispatch demo   | `packages/viewport-renderer/demo/index.html`                                              | Complete                                                                              |
| TeletextWidget CEEFAX loader   | `packages/viewport-renderer/demo/index.html`                                              | Complete                                                                              |
| Mock emulator for LENS testing | `runtimes/basic/tests/test_lens_capture.py`                                               | Complete                                                                              |
| End-to-end LENS CAPTURE test   | `runtimes/basic/tests/test_lens_capture.py` + `runtimes/basic/bridge/gridcore_adapter.py` | Complete (runtime extractor import wiring and capture paths validated; 18 tests pass) |

### Phase 6: Learning Resources and Documentation (sprint.2026-07-10)

| Task                                 | File                             | Status   |
| ------------------------------------ | -------------------------------- | -------- |
| Skills Framework tutorial            | `docs/learning-pathway/`         | Complete |
| Program archive / library registry   | `programs/README.md`             | Complete |
| DEV_PLAN.md update (phases 4-6)      | `docs/DEV_PLAN.md`               | Complete |
| 6 Skills Framework skills documented | `docs/specs/SKILLS_FRAMEWORK.md` | Complete |

---

## 3. JetBrains AI Assistant Workflow

### Configured Providers (in order)

| Provider             | Endpoint                    | Model                        | Cost    | When                |
| -------------------- | --------------------------- | ---------------------------- | ------- | ------------------- |
| **Ollama (Primary)** | `http://localhost:11434/v1` | `qwen2.5-coder:3b`           | Free    | All daily work      |
| **Ollama (Upgrade)** | `http://localhost:11434/v1` | `qwen2.5-coder:7b`           | Free    | Complex reasoning   |
| **OpenRouter**       | openrouter.ai               | `qwen/qwen3.6-27b`           | $0.02/M | When Ollama offline |
| **OpenRouter**       | openrouter.ai               | `deepseek/deepseek-v4-flash` | $0.05/M | Premium fallback    |

### JetBrains AI Skills Usage

| Skill              | How to invoke                      | Model              |
| ------------------ | ---------------------------------- | ------------------ |
| Code completion    | Auto (typing)                      | `qwen2.5-coder:3b` |
| Chat (Cmd+Shift+I) | Manual                             | `qwen2.5-coder:3b` |
| Code review        | Right-click → AI Actions → Review  | `qwen2.5-coder:7b` |
| Generate tests     | Right-click → Generate → Tests     | `qwen2.5-coder:3b` |
| Generate docs      | Alt+Enter → Generate Documentation | `qwen2.5-coder:3b` |
| Commit message     | VCS Commit → Generate Message      | `qwen2.5-coder:3b` |
| Explain code       | Select code → AI Actions → Explain | `qwen2.5-coder:3b` |
| Find problems      | Code → Analyze → AI Inspection     | `qwen2.5-coder:7b` |

### Switching Models in PyCharm

1. **AI Chat**: Click model name in chat input → select from dropdown
2. **Default**: Settings → Tools → AI Assistant → Model
3. **Per-skill**: Settings → Tools → AI Assistant → Skills → select skill → set model

---

## 4. Ollama Local Maximiser Strategy

### Model Selection Guide

| RAM   | Recommended Model   | Use Case                     | Quality |
| ----- | ------------------- | ---------------------------- | ------- |
| 8GB+  | `qwen2.5-coder:3b`  | Daily driver — fast code gen | Good    |
| 16GB+ | `qwen2.5-coder:7b`  | Complex reasoning            | Better  |
| 24GB+ | `qwen2.5-coder:14b` | Architecture, deep analysis  | Best    |
| Any   | `llama3.2:3b`       | Lightweight alternative      | Good    |

### Keep Costs at $0

```bash
# Set Ollama as default everywhere
export HIVE_DEFAULT_PROVIDER="ollama"
export HIVE_DEFAULT_MODEL="qwen2.5-coder:3b"

# Never touch cloud unless you explicitly need it
# Remove OPENROUTER_API_KEY from hivemind.env to force local-only mode
```

### Memory Management

```bash
# Check running models
ollama ps

# Stop a model to free RAM
ollama stop qwen2.5-coder:7b

# Keep only active model in RAM
ollama run qwen2.5-coder:3b  # runs and keeps in memory

# Keep Ollama pre-loaded
ollama serve &
ollama run qwen2.5-coder:3b --keep-alive 30m
```

### Speed Optimisation

```bash
# Use smaller context for faster responses
# (configured via JetBrains AI Assistant settings)

# Keep model warm with keep-alive
ollama run qwen2.5-coder:3b --keep-alive -1  # keep forever

# Use flash attention (Ollama 0.5+)
# Already enabled by default for supported models
```

---

## 5. Configuration Reference

### Config Files

| File                          | What it configures                             |
| ----------------------------- | ---------------------------------------------- |
| `.jetbrains/ai-assistant.xml` | JetBrains AI Assistant provider/model settings |
| `.idea/aiSettings.xml`        | Shared PyCharm AI settings (checked into VCS)  |
| `config/ollama-models.yaml`   | Ollama model tiers, routing, costs             |
| `config/openrouter.yaml`      | OpenRouter model tiers, fallback chain         |
| `config/hivemind.env`         | API keys, default provider/model               |
| `config/mcp_config.json`      | MCP server definitions                         |

### Env Variables

```bash
# Set these in your shell profile (~/.zshrc) for persistence
export HIVE_DEFAULT_PROVIDER="ollama"
export HIVE_DEFAULT_MODEL="qwen2.5-coder:3b"
export OLLAMA_BASE_URL="http://localhost:11434"
```

### PyCharm Run Configs

| Config                    | Shortcut | Action              |
| ------------------------- | -------- | ------------------- |
| `uCode: install`          | —        | `npm install`       |
| `uCode: build`            | Cmd+F9   | Build all packages  |
| `uCode: test`             | Ctrl+F5  | Run all tests       |
| `uCode: self-check`       | —        | Full health check   |
| `uCode: inspect widgets`  | —        | List widget files   |
| `uCode: inspect terminal` | —        | List terminal files |

---

## 6. Python Runtime Compatibility

| Python | Runtime Compat | Notes                                     |
| ------ | -------------- | ----------------------------------------- |
| 3.12   | ✅ Full        | Recommended for dev                       |
| 3.13   | ✅ Mostly      | Some edge cases                           |
| 3.14   | ⚠️ Partial     | Dataclass ordering issue in BASIC runtime |

```bash
# Create venv with Python 3.12 for full compatibility
python3.12 -m venv .venv312
source .venv312/bin/activate
pip install -e runtimes/basic -e runtimes/amos
```

---

## 7. Quick Reference

```bash
# ── Daily ──────────────────────────────────────────────────────
ollama serve                          # Start local AI
source .venv/bin/activate             # Python env
npm run build                         # Build all packages
npm test                              # Test all packages

# ── Ollama ─────────────────────────────────────────────────────
ollama pull qwen2.5-coder:3b          # Pull model
ollama list                           # Show pulled models
ollama ps                             # Show running models
ollama stop qwen2.5-coder:7b          # Free RAM
ollama rm qwen2.5-coder:14b           # Delete model

# ── Config ─────────────────────────────────────────────────────
cp config/hivemind.env ~/.ucore/config/
./scripts/setup-ai-integration.sh     # Full AI setup

# ── Health ──────────────────────────────────────────────────────
curl http://localhost:11434/api/tags  # Ollama health
curl http://localhost:8484/api/health # uCore health
```
