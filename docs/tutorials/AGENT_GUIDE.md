---
title: "DevStudio Agent Guide"
status: draft
last_updated: 2026-06-08T22:32:34+10:00
category: guide
tags: [devstudio, guide]
description: "> **Purpose:** Quick-start guide for agents working in the uDos ecosystem."
---
# DevStudio Agent Guide

> **Purpose:** Quick-start guide for agents working in the uDos ecosystem.
> **Last Updated:** 2026-06-14
> **Version:** 2.0.0 — OkAgentDigital migration complete
> **See also:** [ARCHITECTURE.md](../ARCHITECTURE.md) for the full system architecture


---

## Ecosystem Overview

```
~/Code/
├── DevStudio/              # Orchestration, skills, docs (this repo)
├── uConnect/               # GridUI, Snackbar (Python), chat, surfaces
├── uServer/                # Backend services, secret-server, sse-stream
├── uPlace/                 # Deployment/placement
├── uCode1-4/               # Core runtime, services, apps, UI
├── uScript/                # Scripting
├── uSystem/                # System configs
├── uVector/                # Vector/embeddings
├── Groovebox/              # Music production
├── SonicScrewdriver/       # Linux configs
├── UniversalSurfaceXD/     # USXD — Electron IDE (primary dev env)
├── Vendor/                 # Third-party upstream repos
├── Projects/               # Centralized project configs
│   └── @sandbox/           # Working copies of uCode repos
└── _archived/              # Consolidated archive (moved from repo .archive/)
```

---

## Before Any Feature Work

Run these in order to avoid the "spaghetti tree" problem:

```bash
# 1. Scan for duplicates, dead paths, stale references
./skills/dead-path-detector/run.sh

# 2. Verify surface landscape is coherent
./skills/surface-audit/run.sh

# 3. Check for conflicting docs
./skills/doc-consolidator/run.sh

# 4. Fix critical issues before proceeding
```

---

## Skills Pipeline

Skills live in `skills/` and follow a folder-based lifecycle:

| Tier | Path | Git | Registered |
|------|------|-----|------------|
| 🟡 Draft | `skills/draft/<name>/` | Ignored | No |
| 🟠 Test | `skills/test/<name>/` | Tracked | `tier: test` |
| 🔵 Staged | `skills/staged/<name>/` | Tracked | `tier: staging` |
| ✅ Promoted | `skills/<name>/` | Tracked | `tier: core/extended` |

```bash
# Run a skill (auto-searches all tiers)
./skill-runner.sh my-skill

# Create a draft
mkdir -p skills/draft/my-skill && touch skills/draft/my-skill/run.sh

# Promote through tiers (mv + update tool-catalogue.yaml)
```

See [SKILLS_PIPELINE.md](SKILLS_PIPELINE.md) for full details.

---

## Managed terminal constraints

When running commands through a managed uDos terminal surface:

- **No streaming** — use `--no-stream` flags, avoid `tail -f`, `watch`
- **No pipes/redirects** — use temp files instead of `|`, `>`, `<<`
- **No special characters** — avoid `;`, `&&`, `||` in command strings
- **No interactive prompts** — use `--yes` flags, pre-seed answers
- **Keep commands short** — break long commands into steps
- **🚫 NO background processes** — never use `nohup`, `&`, `disown`, `bg`. Use the governed service manager.
- **🚫 NO long-running commands** — avoid `sleep`, `wait`, infinite loops. Use `--timeout` flags, keep commands under 10 seconds.
- **🚫 NO process spawning** — avoid `nohup`, `setsid`, `daemonize`. Use `launchctl submit` for persistent services.
- **🚫 NO unmanaged dev servers** — use the uCore service controls so
  lifecycle, logs, and quit intent remain observable.

---

## Vendor Absorption Pattern

To bring in a third-party project:

```bash
# 1. Clone to Vendor/
git clone <url> ~/Code/Vendor/<name>/

# 2. Register in VENDOR_MANIFEST.yaml
# 3. Create a snack or skill that wraps it
# 4. If it has a UI, create a USX surface for it
```

See [VENDOR_MANIFEST.yaml](../Vendor/VENDOR_MANIFEST.yaml) for existing entries.

---

## Push Model: Passive (Fire-and-Forget)

With the full automation pipeline in place, **pushing is just a trigger**. CI/CD handles everything:

```bash
gp                    # fire-and-forget push to main
                      # CI runs: dead code finder → docs update → Spark docs → Pages deploy → summary issue

gpl                   # sync to linux-server + push (same passive model)
gps                   # check push status (rarely needed — pipeline reports via issues)
```

**No more manual status checks.** The pipeline reports results via GitHub Issues and PR comments automatically.

---

## GitHub Actions Script Architecture

All CI/CD workflows use **extracted Python scripts** in `.github/scripts/`:

| Script | Purpose |
|--------|---------|
| `check_merge.py` | Merge conflict detection |
| `discovery_agent.py` | Repo discovery and analysis |
| `pr_reviewer.py` | PR review logic |
| `repo_mind.py` | Repository mind indexer |

**Why extracted scripts?** Inline Python in YAML is fragile (YAML parsing issues with colons, quotes, indentation). Extracted scripts can be tested locally, linted, and reused across workflows.

---

## No More Roadmap Prompts

All dev tasks are compiled, actioned, and archived. The system is self-documenting:

- **`docs/DEVSTUDIO_LANE.md`** — Complete feature checklist (all code-complete items ✅)
- **`config/roadmap/`** — Roadmap data committed and archived
- **`docs/archived/global-knowledge/`** — Old vault content preserved but inactive
- **Pipeline handles itself** — Push triggers automation, no manual "update roadmap" needed

**The workflow is now:**
```
You code → gp (fire-and-forget) → CI handles everything → you get notified via issues/PRs
```

---

## Quick Command Reference

```bash
# Diagnostics
./skills/dead-path-detector/run.sh          # Scan for duplicates/dead paths
./skills/surface-audit/run.sh               # Map surface landscape
./skills/system-doctor/doctor.sh            # Health checks
./skills/doc-consolidator/run.sh            # Check doc conflicts

# Push (passive — pipeline handles the rest)
gp                                          # fire-and-forget push to main
gpl                                         # sync linux-server + push
gps                                         # check push status

# Surface Management
./scripts/snackbar-ctl.sh                   # Snackbar surface control
./skills/surface-repair/run.sh              # Diagnose & repair surfaces
uwf status                                  # Workflow engine status

# Project Management
./scripts/devstudio-project.sh checkout <repo>  # Clone to @sandbox
./scripts/devstudio-project.sh publish <repo>   # Sync sandbox → origin

# Release
./scripts/release.sh all v1.0.0             # Tag + push all repos
./scripts/devstudio-app-release.sh patch    # Bump USXD version
```

---

## Key Principles

1. **Skills-first** — always check `skills/` before writing ad-hoc scripts
2. **Dead Path Detector first** — run before any feature work
3. **Vendor over fork** — clone to Vendor/, don't fork unless necessary
4. **Sandbox isolates changes** — origin repos stay clean until publish
5. **uCore Developer is primary** — Codex is the external ecosystem workshop
