---
title: "uCode1 Quick Start Guide"
status: active
last_updated: 2026-06-13
category: guide
tags: [ucode1]
description: "Quick start guide for uCode1 — the Grid/Cell foundation layer of the uDos ecosystem"
---

# uCode1 Quick Start Guide

## Installation

```bash
# Install from PyPI (once published)
pip install ucode1

# Or run from source
git clone https://github.com/uDosGo/uCode1.git
cd uCode1
pip install -e .
```

## First Steps

### 1. Run a BASIC program

```bash
ucode1 run examples/01_hello.bas
```

### 2. Start the REPL

```bash
ucode1 --repl
```

### 3. List available commands

```bash
ucode1 --help
```

## What's Included

- **BBC BASIC interpreter** — Run `.bas` scripts with modern extensions
- **Grid/Cell coordinate system** — Spatial addressing format (`L100-AA10-0317-2`)
- **Teletext/MODE 7 graphics** — Character-based rendering
- **Cell storage** — SQLite-backed cell database
- **5 example programs** — hello.bas, maths.bas, guess.bas, teletext.bas, adventure.bas
- **3 lessons** — Beginner to intermediate

## Next Steps

- Read the [User Guide](UCODE1_USER_GUIDE.md) for comprehensive documentation
- Browse [examples](../examples/) for sample programs
- Try the [lessons](../lessons/) to learn BBC BASIC
