# Lesson 4: Grid Worlds & Spatial Algebra

**Level 5: Grid Worlds & Spatial Algebra (10-12 hours)**
**Prerequisites:** Levels 1-4 (BASIC, Teletext, Sprites, Snacks)

---

## What is a Grid World?

A **Grid World** is a layered, spatial environment built on uCode's cell-grid engine. It combines:

- **Layers** — terrain, entities, foreground, collision stacked like transparencies
- **Cells** — individual grid positions with character, color, and data
- **Spatial Algebra** — UVox coordinate system for world addressing
- **Pathfinding** — A* algorithm for NPC movement

---

## World Structure

```
workspaces/gridcore/worlds/demo/city-square.json
```

```json
{
  "id": "demo-city-square",
  "name": "City Square (Demo)",
  "type": "earth",
  "layers": ["terrain", "entities", "foreground", "collision"],
  "viewport": { "cols": 80, "rows": 24, "cellSize": 24 },
  "regions": {
    "market": { "x": 10, "y": 8, "w": 20, "h": 8, "label": "Market Square" },
    "inn": { "x": 35, "y": 2, "w": 10, "h": 6, "label": "The Prancing Pony" }
  }
}
```

---

## Step 1: Load a World

```bash
ucode world load workspaces/gridcore/worlds/demo/city-square.json
```

This loads the world into the runtime. You can now:

```bash
# List all layers
ucode layer list

# Query a specific cell
ucode grid get 10 10

# Compose all layers into one view
ucode layer compose
```

---

## Step 2: Working with Layers

Layers are stacked bottom-to-top. Higher layer numbers appear on top:

```
Layer 0: terrain      (walls, floors, water)
Layer 1: entities     (NPCs, monsters, items)
Layer 2: foreground   (trees, signs, decorations)
Layer 3: collision    (walkable = 0, blocked = 1)
```

### Terrain Layer

```basic
10 REM Read terrain at player position
20 col% = player_x%
30 row% = player_y%
40 tile$ = ucode_grid_get("terrain", col%, row%)
50 IF tile$ = "#" THEN PRINT "You hit a wall!"
60 IF tile$ = "@" THEN PRINT "You're in the market!"
```

### Entity Layer

```basic
10 REM Spawn an NPC
20 ucode_cell_set("entities", 10, 8, "M", 3, 0)  REM Yellow M on black
30 
40 REM Move an NPC (pathfinding)
50 result$ = ucode_path_find("demo-city-square", 5, 5, 10, 8)
60 PRINT "Path found: "; result$
```

---

## Step 3: UVox Spatial Algebra

UVox is uCode's coordinate system. Every cell has a unique address:

```
Format: L{level}-{x}{y}-{depth}-{layer}

Example: L340-0A0F-0000-0
         │      │    │    │
         │      │    │    └─ layer 0
         │      │    └────── depth 0000
         │      └─────────── x=10, y=15 (base-36)
         └────────────────── level 340
```

### Converting Coordinates

```bash
# Latitude/Longitude → uCode
ucode location latlon-to-ucode --lat 35.6762 --lon 139.6503
# Output: L340-0A0F-0000-0

# uCode → Latitude/Longitude
ucode location ucode-to-latlon --coord L340-0A0F-0000-0
# Output: { "lat": 35.6762, "lon": 139.6503 }
```

### Spatial Queries

```bash
# Find all cells within a region
ucode uvox query --region market --layer entities

# Count cells by type
ucode uvox stats --layer terrain --char "#"
```

---

## Step 4: Pathfinding (A*)

GridSmith provides A* pathfinding across any layer:

```bash
# Find path from (5,5) to (30,10) respecting collision layer
ucode path find \
  --grid-id demo-city-square \
  --start-x 5 --start-y 5 \
  --end-x 30 --end-y 10 \
  --layer 3
```

Returns a JSON array of {x, y, layer} nodes.

### Using Pathfinding in BASIC

```basic
10 REM Move NPC toward player using A*
20 path$ = ucode_path_find("demo-city-square", npc_x%, npc_y%, player_x%, player_y%)
30 
40 REM Parse first step
50 next_x% = ucode_json_get_int(path$, "path[0].x")
60 next_y% = ucode_json_get_int(path$, "path[0].y")
70 
80 REM Move NPC one step
90 ucode_cell_clear("entities", npc_x%, npc_y%)
100 ucode_cell_set("entities", next_x%, next_y%, "G", 1, 0)
110 npc_x% = next_x%
120 npc_y% = next_y%
```

---

## Step 5: Export Worlds

```bash
# Export as UVox artifact
ucode uvox export \
  --grid-id demo-city-square \
  --output city-square.uvox

# Export composed layers as ASCII art
ucode layer compose --output city-square.txt

# Export as teletext page
ucode ceefax export city-square.txt --format ansi
```

---

## Exercise 5.1

Load the demo city-square world. Write a program that:
1. Places your player (@) at the North Gate
2. Places 3 NPCs (M, K, H) in different regions
3. Use WASD keys to move, respecting the collision layer
4. When you approach an NPC, display a dialog in the teletext reader

---

## Exercise 5.2

Create your own world:
1. Design a 40×25 dungeon with `WORLD NEW dungeon-2`
2. Add terrain, entities, and collision layers
3. Write a BASIC program that uses pathfinding for enemies
4. Export the completed world as a .uvox artifact

---

## What You've Learned

- Grid world structure: layers, cells, regions
- UVox coordinate system and conversions
- A* pathfinding for NPC movement
- Layer composition and export
- World creation and management via CLI

**Congratulations! You've completed all 5 levels of the uCode Student Pathway.**

---

## Next Steps

- **Contribute** — fix a doc, add an example, write a tutorial
- **Publish** — release your snack to the community
- **Build tools** — extend GridSmith with new deterministic workflow skills
- **Teach** — help new students through the pathway
