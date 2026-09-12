---
title: "Part 5: Capsule Pods, Polyglot Runtimes & LENS Bridge"
level: "advanced"
relevance: 85
category: "uCode Manual"
description: "Learn how Capsule Pods package foreign engines (C, Amiga, Python) into uCode, output to GridCore, and bridge live memory through LENS."
---

# Part 5: Capsule Pods, Polyglot Runtimes & LENS Bridge

A central philosophy of uCode is **capsulisation**. You do not need to rewrite legendary games or complex simulations in BBC BASIC to use them in your ecosystem. Instead, uCode packages them as **Capsule Pods**.

A Capsule is an isolated, polyglot package containing original source code (C, Amiga 68000 assembly, Python, or Pascal), an execution harness, tile skins, and a memory bridge to GridCore.

---

## 1. The Capsule Architecture

```
┌────────────────────────────────────────────────────────┐
│                      uCode Canvas                      │
│                                                        │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │   BBC BASIC Script    │   │  GridCore 2D Tiles   │  │
│  │   (Logic & HUD)       │   │  (16x16 Amiga Skin)  │  │
│  └──────────┬────────────┘   └──────────▲───────────┘  │
│             │                           │              │
│       CAPSULE.GET                  Tile Buffer         │
│             │                           │              │
│  ┌──────────▼───────────────────────────┴───────────┐  │
│  │                LENS Memory Bridge                 │  │
│  └──────────────────────▲───────────────────────────┘  │
│                         │ (Memory extraction)          │
│  ┌──────────────────────┴───────────────────────────┐  │
│  │              Native Capsule Runtime              │  │
│  │        (e.g., Amiga NetHack / Hack 1.0.3)        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

The native engine executes in its pure original form. The **LENS** memory bridge samples internal memory structures (coordinates, hero stats, dungeon levels) and maps them into GridCore tile representations and BASIC variables.

---

## 2. The Capsule Manifest (`capsule.yaml`)

Every capsule contains a `capsule.yaml` manifest that declares its protocol, entry point, skins, and memory bridge:

```yaml
capsule: "ucode-capsule/1"
id: "nethack"
name: "NetHack Pod (Amiga Hack)"
version: "1.0.3-amiga"
runtime: "polyglot"
languages: ["c", "python"]
entry: "nethack_pod.py"

display:
  surface: "gridcore"
  tile_width: 16
  tile_height: 16
  palette: "amiga_32"
  skin: "skin/amiga_tiles.skin.yaml"

lens:
  enabled: true
  module: "lens/nethack_lens.py"
  registers:
    - name: "hero_x"
      type: "uint8"
    - name: "hero_y"
      type: "uint8"
    - name: "hero_hp"
      type: "int16"
    - name: "dlevel"
      type: "uint8"
```

---

## 3. Extended Capsule Verbs

You can manage and interact with capsules directly from the uCode command prompt or inside your BASIC code:

### Listing Installed Capsules
```text
> CAPSULE.LIST
Registered Capsules:
  nethack     Amiga NetHack Pod (16x16 tiles, LENS bridge)
  repton      Repton Pod (2D tile-based puzzle)
  elite       Elite Wireframe Space Pod
  eamon       Eamon Text & Tile Adventure Pod
  uconstruct  uConstruct Spatial Construction Pod
```

### Reading State via `CAPSULE.GET`
Use `CAPSULE.GET <symbol>` or `CAPSULE.GET <capsule> <symbol>` to read memory symbols extracted by the LENS bridge:

```text
> CAPSULE.GET nethack hero_hp
CAPSULE [nethack] symbol hero_hp = 16
```

### Launching a Capsule via `CAPSULE.RUN`
```text
> CAPSULE.RUN nethack
Launching capsule 'nethack'...
```

---

## 4. Bridging Capsule State into BBC BASIC

Here is how a BBC BASIC program can read live telemetry from a running NetHack pod to render a custom teletext HUD:

```bbcbasic
10 MODE 7: CLS
20 PRINT TAB(0, 0); "=== CEEFAX P550: DUNGEON MONITOR ==="
30 
40 REM Poll the LENS bridge every cycle
50 REPEAT
60   hp% = FN_lens_read("nethack", "hero_hp")
70   dlevel% = FN_lens_read("nethack", "dlevel")
80   
90   COLOUR 2: REM Green
100  PRINT TAB(2, 4); "Dungeon Level: "; dlevel%
110  
120  IF hp% < 5 THEN COLOUR 1 ELSE COLOUR 3: REM Red if low, else Yellow
130  PRINT TAB(2, 6); "Hero Health:   "; hp%; " HP   "
140  
150  WAIT 20: REM 200ms delay
160 UNTIL FALSE
170 END
180 
190 DEF FN_lens_read(cap$, sym$)
200 REM In production, dispatches CAPSULE.GET via the bridge
210 = 16
```

---

## Summary & Hands-On Exercise

In this part you learned:
- How Capsule Pods preserve native engines while integrating into modern surfaces.
- The `capsule.yaml` specification and skin definitions.
- How to list, inspect, and run pods using `CAPSULE.LIST`, `CAPSULE.GET`, and `CAPSULE.RUN`.
- How the LENS bridge allows BBC BASIC to read external game state non-invasively.

**Exercise 5.1**: Inspect the NetHack capsule in `~/Code/uCode/programs/nethack/`. Examine `capsule.yaml` and `skin/amiga_tiles.skin.yaml`. Write a short BASIC program that monitors the hero's level and triggers a `BEEP` alert whenever `dlevel%` increases.
