# uConstruct — Tile Editor Scaffold

## Architecture

Tile-based construction game inspired by ACS (Adventure Construction Set, 1984).

### Tile Types (16 total)
WALL, FLOOR, DOOR, WATER, GRASS, ROAD, WINDOW, STAIRS_UP, STAIRS_DOWN, BRIDGE, GATE, TOWER, ROOF, CHEST, TABLE, EMPTY

### Resource System
- Stone: 500 start, wall=2, floor=1
- Wood: 300 start, door=3, table=2, chest=4
- Gold: 100 start, earned from room scoring
- Food: 200 start, consumed by workers

### Room Types
- Requirements: min 4x4 tiles, at least 1 door
- Types: BEDROOM, KITCHEN, ARMORY, THRONE, DUNGEON, LIBRARY, STORAGE
- Scoring: +10 per room, bonus for variety, defensive walls add multiplier

### uCode Integration
- LENS: stone, wood, gold, food, room_count, castle_score
- SKIN: repton_classic (warm earth tones)
- control: save, load, export_map, import_blueprint

## Grid Specification
- 64 columns x 48 rows
- 16 tile types, 2-bit encoding per tile
- Undo/Redo stack: 20 levels

## Estimated Effort: 10 weeks