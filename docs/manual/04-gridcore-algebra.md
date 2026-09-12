---
title: "Part 4: GridCore Spatial Algebra & Surfaces"
level: "intermediate"
relevance: 85
category: "uCode Manual"
description: "Understand GridCore's character-as-pixel philosophy, multilayer composition, world spaces, and spatial grid algebra."
---

# Part 4: GridCore Spatial Algebra & Surfaces

**GridCore** is the spatial 2D engine behind uCode. It treats every character cell not merely as text, but as a discrete coordinate in a 2D matrix—a concept called **Character-as-Pixel**. By stacking transparent layers, GridCore can compose intricate game worlds, dungeon maps, UI overlays, and particle effects with zero GPU bloat.

---

## 1. The Coordinate Space & Dimensions

Every GridCore canvas operates on a discrete Cartesian grid:
- **Origin (0,0)** is at the top-left corner.
- **X axis (columns)** increases to the right (`0` to `width - 1`).
- **Y axis (rows)** increases downward (`0` to `height - 1`).

Standard viewport sizes include:
- **Teletext / Classic**: 40 columns x 25 rows
- **Terminal / Extended**: 80 columns x 24 or 25 rows
- **Dungeon / NetHack**: 80 columns x 21 rows

---

## 2. Interactive Grid Commands

At the uCode prompt or inside the RuntimeBridge, you can directly inspect and manipulate grid cells:

### Setting a Cell
```text
> GRID SET 10 5 #
Set (10,5) to '#'
```

### Reading a Cell
```text
> GRID GET 10 5
(10,5) = '#'
```

### Rendering the Current Grid
```text
> GRID SHOW
```

---

## 3. Working with GridCore in BBC BASIC

Inside your BASIC programs, you can represent grid levels as 2D integer or string arrays, then project them to the display surface.

### Declaring and Populating a Dungeon Map

```bbcbasic
10 DIM map%(39, 23)
20 CLS: MODE 7
30 
40 REM Populate map with walls and floor
50 FOR y% = 0 TO 23
60   FOR x% = 0 TO 39
70     IF x% = 0 OR x% = 39 OR y% = 0 OR y% = 23 THEN
80       map%(x%, y%) = 35: REM ASCII 35 is '#'
90     ELSE
100      map%(x%, y%) = 46: REM ASCII 46 is '.'
110    ENDIF
120  NEXT x%
130 NEXT y%
140 
150 REM Render map to screen
160 FOR y% = 0 TO 23
170   FOR x% = 0 TO 39
180     PRINT TAB(x%, y%); CHR$(map%(x%, y%));
190   NEXT x%
200 NEXT y%
```

---

## 4. Multilayer Composition

GridCore supports a multi-layer stack:

```
[ Top / Overlay Layer ]  ── HUD, damage counters, floating text
[ Actor / Sprite Layer]  ── Player '@', monsters 'D', items '$'
[ Environment Layer   ]  ── Doors '+', stairs '>', traps '^'
[ Base Terrain Layer  ]  ── Solid walls '#', cavern floors '.'
```

When rendering, cells on higher layers with a space character (`' '`) or null character are completely transparent, allowing the terrain underneath to show through.

### Inspecting Layers
```text
> LAYER LIST
Layers:
  main (80x24)
  fx (80x24)
```

---

## 5. World Spaces

GridCore allows you to maintain multiple independent worlds in memory and switch between them instantly:

- `WORLD LIST` — Show all currently initialized worlds.
- `WORLD NEW <name>` — Create a new world matrix with default layers.
- `WORLD SWITCH <name>` — Switch the active viewport to the designated world.

```text
> WORLD NEW dungeon_level_2
World 'dungeon_level_2' created with 2 layers.
> WORLD LIST
Worlds:
  default (40x25, 2 layers)
  dungeon_level_2 (40x25, 2 layers)
```

---

## Summary & Hands-On Exercise

In this part you learned:
- How GridCore maps characters to a 2D spatial coordinate space.
- How to set and inspect cells with `GRID SET` and `GRID GET`.
- How to model 2D environments in BBC BASIC with `DIM map%(w, h)`.
- How layers and world spaces provide clean separation of terrain, actors, and UI.

**Exercise 4.1**: Create a 20x10 maze in BBC BASIC using a 2D array. Place a player character `@` at `(2, 2)` and an exit stair `>` at `(18, 8)`. Implement a simple collision check that prevents the player from walking into `#` wall cells.
