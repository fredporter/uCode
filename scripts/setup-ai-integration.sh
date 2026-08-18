#!/usr/bin/env bash
# ============================================================================
# uCode AI Integration Setup — Ollama Local-First Maximiser
# ============================================================================
# This script configures uCode for local-first AI development with JetBrains.
# It sets up:
#   1. Ollama (local LLM inference) — primary provider, free
#   2. JetBrains AI Assistant config (.jetbrains/ + .idea/)
#   3. OpenRouter API key (cloud fallback only)
#   4. Hivemind agent config (local-first routing)
#   5. MCP server definitions
#   6. Shell env vars for local-first defaults
#
# Usage:
#   chmod +x scripts/setup-ai-integration.sh
#   ./scripts/setup-ai-integration.sh
#
# Or run individual steps:
#   ./scripts/setup-ai-integration.sh ollama       # Ollama only
#   ./scripts/setup-ai-integration.sh jetbrains    # JetBrains config only
#   ./scripts/setup-ai-integration.sh openrouter   # OpenRouter only
#   ./scripts/setup-ai-integration.sh config       # Copy config templates
#   ./scripts/setup-ai-integration.sh env          # Shell env setup
#   ./scripts/setup-ai-integration.sh status       # Full status check
# ============================================================================

set -euo pipefail

UCODE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# ──────────────────────────────────────────────────────────────────────────────
# Step 1: Ollama Setup
# ──────────────────────────────────────────────────────────────────────────────
setup_ollama() {
  echo ""
  echo "━━━ Step 1: Ollama ━━━"

  if command -v ollama &>/dev/null; then
    info "Ollama is already installed at $(which ollama)"
  else
    warn "Ollama is not installed."
    warn "Install it via: curl -fsSL https://ollama.com/install.sh | sh"
    warn "Or: brew install ollama"
    warn "Then run: ollama serve"
    warn "And pull a model: ollama pull qwen2.5-coder:3b"
    return
  fi

  # Check if ollama is running
  if curl -sf http://localhost:11434/api/tags &>/dev/null; then
    info "Ollama server is running on http://localhost:11434"

    # Check for recommended models
    local models
    models=$(curl -sf http://localhost:11434/api/tags | python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || echo "")

    if echo "$models" | grep -q "qwen2.5-coder"; then
      info "Recommended model 'qwen2.5-coder' is already pulled"
    else
      warn "Pulling recommended model: qwen2.5-coder:3b (this may take a while)..."
      ollama pull qwen2.5-coder:3b || warn "Pull failed. Check internet and disk space."
    fi
  else
    warn "Ollama server is not running. Start it with: ollama serve"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Step 2: JetBrains AI Assistant Config
# ──────────────────────────────────────────────────────────────────────────────
setup_jetbrains() {
  echo ""
  echo "━━━ Step 2: JetBrains AI Assistant Config ━━━"

  local jetbrains_dir="$UCODE_DIR/.jetbrains"
  local idea_dir="$UCODE_DIR/.idea"

  if [ -f "$jetbrains_dir/ai-assistant.xml" ]; then
    info "JetBrains AI Assistant config found: $jetbrains_dir/ai-assistant.xml"
  else
    warn "JetBrains AI Assistant config not found (should be created by setup)"
  fi

  if [ -f "$idea_dir/aiSettings.xml" ]; then
    info "JetBrains shared AI settings found: $idea_dir/aiSettings.xml"
  else
    warn "JetBrains shared AI settings not found (should be created by setup)"
  fi

  info "JetBrains AI is configured to use Ollama locally:"
  info "  Endpoint: http://localhost:11434/v1"
  info "  Model:    qwen2.5-coder:3b"
  info ""
  info "To verify in PyCharm:"
  info "  Settings → Tools → AI Assistant → AI Providers"
  info "  Check 'Ollama Local (Free)' is default provider"
}

# ──────────────────────────────────────────────────────────────────────────────
# Step 3: Shell Environment Setup
# ──────────────────────────────────────────────────────────────────────────────
setup_env() {
  echo ""
  echo "━━━ Step 3: Shell Environment ━━━"

  local shell_rc="$HOME/.zshrc"
  local marker="# uCode AI local-first config"
  local env_block=""

  read -r -d '' env_block << 'ENVEOF' || true
# uCode AI local-first config
export HIVE_DEFAULT_PROVIDER="ollama"
export HIVE_DEFAULT_MODEL="qwen2.5-coder:3b"
export OLLAMA_BASE_URL="http://localhost:11434"
export OLLAMA_DEFAULT_MODEL="qwen2.5-coder:3b"
ENVEOF

  if grep -q "$marker" "$shell_rc" 2>/dev/null; then
    info "Shell env vars already configured in $shell_rc"
  else
    echo "" >> "$shell_rc"
    echo "$env_block" >> "$shell_rc"
    info "Added local-first AI env vars to $shell_rc"
    info "Run: source $shell_rc"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Step 4: OpenRouter API Key
# ──────────────────────────────────────────────────────────────────────────────
setup_openrouter() {
  echo ""
  echo "━━━ Step 2: OpenRouter API Key ━━━"

  local env_file="$UCODE_DIR/config/hivemind.env"

  if [ ! -f "$env_file" ]; then
    warn "Config file not found: $env_file"
    warn "Re-creating from template..."
    cat > "$env_file" << 'ENVEOF'
# Hivemind MCP — API Keys for uCode
# Copy your keys here and chmod 600 this file

# OpenRouter (cloud models: glm-5.1, claude-opus-4.7, deepseek-v4-flash, qwen3.6-27b)
OPENROUTER_API_KEY="your-openrouter-api-key-here"

# Local Ollama (fallback / dev agent)
OLLAMA_BASE_URL="http://localhost:11434"

# Anthropic Direct (optional)
# ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# OpenAI (optional)
# OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
ENVEOF
    warn "Template created at $env_file"
  fi

  # Check if key is set
  if grep -q "your-openrouter-api-key-here" "$env_file" 2>/dev/null; then
    warn "OpenRouter API key is not configured."
    warn "Edit $env_file and set OPENROUTER_API_KEY."
    warn "Get a key at: https://openrouter.ai/keys"
  else
    info "OpenRouter API key appears to be configured."
  fi

  chmod 600 "$env_file" 2>/dev/null || true
  info "Config file permissions set to 600: $env_file"
}

# ──────────────────────────────────────────────────────────────────────────────
# Step 5: Copy config templates to $UDOS_HOME/config (for uCore integration)
# ──────────────────────────────────────────────────────────────────────────────
setup_ucore_config() {
  echo ""
  echo "━━━ Step 3: uCore Config Sync ━━━"

  local udos_home="${UDOS_HOME:-$HOME/Code/.udos}"
  local ucore_config_dir="$udos_home/config"
  mkdir -p "$ucore_config_dir"

  # Copy openrouter.yaml if it doesn't exist in uCore config
  if [ -f "$UCODE_DIR/config/openrouter.yaml" ]; then
    if [ ! -f "$ucore_config_dir/openrouter.yaml" ]; then
      cp "$UCODE_DIR/config/openrouter.yaml" "$ucore_config_dir/openrouter.yaml"
      info "Copied openrouter.yaml → $ucore_config_dir/openrouter.yaml"
    else
      warn "openrouter.yaml already exists in uCore config (skipped)"
    fi
  fi

  # Copy hivemind.env
  if [ -f "$UCODE_DIR/config/hivemind.env" ]; then
    if [ ! -f "$ucore_config_dir/hivemind.env" ]; then
      cp "$UCODE_DIR/config/hivemind.env" "$ucore_config_dir/hivemind.env"
      info "Copied hivemind.env → $ucore_config_dir/hivemind.env"
    else
      warn "hivemind.env already exists in uCore config (skipped)"
    fi
  fi

  info "uCore config directory: $ucore_config_dir"
}

# ──────────────────────────────────────────────────────────────────────────────
# Step 6: Verify MCP Configuration
# ──────────────────────────────────────────────────────────────────────────────
verify_mcp() {
  echo ""
  echo "━━━ Step 4: MCP Configuration ━━━"

  local mcp_file="$UCODE_DIR/config/mcp_config.json"
  if [ -f "$mcp_file" ]; then
    info "MCP config found: $mcp_file"

    # Validate JSON
    if python3 -c "import json; json.load(open('$mcp_file'))" 2>/dev/null; then
      info "MCP config is valid JSON"
      local server_count
      server_count=$(python3 -c "import json; print(len(json.load(open('$mcp_file')).get('mcpServers',{})))")
      info "Defined MCP servers: $server_count"
    else
      error "MCP config has invalid JSON"
    fi
  else
    warn "No MCP config found at $mcp_file"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  uCode AI Integration Setup — Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  AI Providers (local-first):"
  echo "    PRIMARY:   Ollama (qwen2.5-coder:3b) — FREE"
  echo "    UPGRADE:   Ollama (qwen2.5-coder:7b) — FREE"
  echo "    FALLBACK:  OpenRouter (deepseek-v4-flash) — paid"
  echo ""
  echo "  Config files:"
  echo "    $UCODE_DIR/.jetbrains/ai-assistant.xml"
  echo "    $UCODE_DIR/.idea/aiSettings.xml"
  echo "    $UCODE_DIR/config/hivemind.env"
  echo "    $UCODE_DIR/config/ollama-models.yaml"
  echo "    $UCODE_DIR/config/openrouter.yaml"
  echo "    $UCODE_DIR/config/mcp_config.json"
  echo ""
  echo "  Shell env:"
  echo "    HIVE_DEFAULT_PROVIDER=ollama"
  echo "    HIVE_DEFAULT_MODEL=qwen2.5-coder:3b"
  echo "    OLLAMA_BASE_URL=http://localhost:11434"
  echo ""
  echo "  Integration:"
  echo "    PyCharm AI:   Ollama via http://localhost:11434/v1"
  echo "    uCore MCP:    python3 -m app (port 8484)"
  echo "    GridSmith MCP: node agents/gridsmith/dist/cli.js mcp"
  echo "    Hivemind MCP: python3 -m app.mcp.hivemind_server (port 8490)"
  echo ""
  echo "  Next steps:"
  echo "    1. Start Ollama:     ollama serve"
  echo "    2. Pull a model:     ollama pull qwen2.5-coder:3b"
  echo "    3. Reload shell:     source ~/.zshrc"
  echo "    4. Open PyCharm:     Verify AI Assistant uses Ollama"
  echo "    5. (Optional) Set OPENROUTER_API_KEY for cloud fallback"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
main() {
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║      uCode AI Integration Setup                      ║"
  echo "║      Ollama + OpenRouter + Hivemind                  ║"
  echo "╚══════════════════════════════════════════════════════╝"

  case "${1:-all}" in
    ollama)
      setup_ollama
      ;;
    jetbrains)
      setup_jetbrains
      ;;
    openrouter)
      setup_openrouter
      ;;
    env)
      setup_env
      ;;
    config)
      setup_ucore_config
      verify_mcp
      ;;
    status)
      setup_ollama
      setup_jetbrains
      verify_mcp
      ;;
    all)
      setup_ollama
      setup_jetbrains
      setup_env
      setup_openrouter
      setup_ucore_config
      verify_mcp
      print_summary
      ;;
    *)
      echo "Usage: $0 [ollama|jetbrains|openrouter|env|config|status|all]"
      exit 1
      ;;
  esac
}

main "$@"
