# NetHack — C to BBC BASIC Port Research

## Original Architecture

NetHack 3.6.7 source is approximately 300K lines of C across 700+ files.

## Porting Strategy

### Direct BBC BASIC Patterns
- Turn-based dungeon exploration maps directly to grid-based display
- Character creation uses text menus
- Inventory is a simple array of item IDs
- Combat formula: d20-style with AC and damage dice

### Key Data Structures
- Dungeon grid: 80x24 character map (perfect for teletext)
- Player: HP, AC, XP, STR, DEX, CON, INT, WIS, CHA
- Inventory: array of 52 items with type, enchantment, BUC status
- Monster table: name, symbol, HP, AC, damage, speed, abilities

### uCode Integration
- LENS: player stats, dungeon level, inventory, HP, turn count
- SKIN: dark fantasy teletext with ASCII roguelike characters
- control: save, load, status, level_teleport

## Estimated Effort: 3 weeks