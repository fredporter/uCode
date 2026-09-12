---
title: "The uCode User Guide — Learn to Code with uCode"
level: "basic"
relevance: 100
category: "uCode Manual"
description: "The complete student guide and reference manual for BBC BASIC, Mode 7 Teletext, GridCore spatial algebra, and native Capsule Pods."
---

# The uCode User Guide
## Learn to Code with uCode & BBC BASIC

*Inspired by the British Broadcasting Corporation Computer Literacy Project*

Welcome to **uCode**, a modern reimagining of the classic microcomputer computing environment. uCode pairs the legendary BBC BASIC programming language with real-time Mode 7 Teletext graphics, GridCore spatial grid algebra, and native Capsule Pods (polyglot runtimes like NetHack and Repton running side-by-side with BASIC).

Whether you are writing your very first line of code or integrating external C game engines through the LENS memory bridge, this manual will guide you step by step.

---

## Course Contents & Syllabus

| Part | Title | Focus & Key Concepts | Level |
|---|---|---|---|
| **[Part 1: First Steps](01-first-steps.md)** | First Steps with uCode & BBC BASIC | Immediate mode, line numbers, variables (`%`, `$`), `PRINT`, `INPUT`, `CLS` | Beginner |
| **[Part 2: Control Flow](02-control-flow.md)** | Flow of Control, Loops & Logic | `IF..THEN..ELSE`, `FOR..NEXT`, `REPEAT..UNTIL`, `PROC` and `FN` procedures | Basic |
| **[Part 3: Mode 7 Teletext](03-teletext-mode7.md)** | Mode 7 & Teletext (Ceefax & GridCore) | 40x25 character grid, 7-color palette, mosaic graphics, `TELETEXT.PAGE` | Intermediate |
| **[Part 4: GridCore Algebra](04-gridcore-algebra.md)** | GridCore Spatial Algebra & Surfaces | `GRID SET/GET`, multilayer composition, coordinate systems, world spaces | Intermediate |
| **[Part 5: Capsules & LENS](05-capsules-and-lens.md)** | Capsule Pods & the LENS Memory Bridge | Polyglot execution, NetHack Amiga pod, `CAPSULE.GET`, state extraction | Advanced |
| **[Part 6: Game Development](06-game-development.md)** | Interactive Game Development & Vault Publishing | Complete game loop, keyboard polling, `VAULT.OPEN`, dungeon crawler project | Advanced |

---

## Quick Reference: Essential Verbs

### Standard BBC BASIC
- `PRINT [expression]` — Output text or numbers to the terminal.
- `INPUT [prompt,] variable` — Read input from the user.
- `FOR var = start TO end [STEP s] ... NEXT` — Counted loop.
- `REPEAT ... UNTIL condition` — Post-condition loop.
- `DEF PROC_name(args) ... ENDPROC` — Define named procedure.
- `DEF FN_name(args) ... = result` — Define named function returning a value.

### Extended uCode Verbs
- `TELETEXT.PAGE <num>` — Jump directly to a Teletext/Ceefax page (e.g. `TELETEXT.PAGE 200`).
- `VAULT.LIST` — Inspect documents, task notes, and keys available in `~/Vault`.
- `VAULT.OPEN <path>` — Open and read a markdown document from the personal vault.
- `CAPSULE.LIST` — Enumerate installed native game and tool pods (`nethack`, `repton`, `elite`).
- `CAPSULE.GET <symbol>` — Read live memory or tile register values from a running capsule pod.
- `CAPSULE.RUN <capsule_id>` — Launch a native polyglot capsule inside the GridCore canvas.
