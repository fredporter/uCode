# Eamon — Applesoft BASIC Port Research

## Original Architecture

Eamon is a text adventure system created by Donald Brown in 1980 for the Apple II. It consists of:

1. **Main Hall** (`EAMON ADVENTURE #0`): Character creation, inventory, stats
2. **Adventure Engine**: Text parser, room navigation, combat
3. **Adventure Modules**: ~270 community-authored adventure disks

## Memory Layout (Apple II, 48K)

```
$0800-$1FFF: Main Hall program (6KB)
$2000-$5FFF: Adventure data (16KB)
  $2000: Room descriptions (up to 200 rooms)
  $4000: Artifact data (up to 200 artifacts)
  $4800: Monster data (up to 20 monsters)
$6000-$BFFF: Adventure engine (24KB)
```

## Key Data Structures

### Player Record (stored on disk)
```
Offset  Size  Field
0       16    Name (padded with spaces)
16      2     Hardiness (0-65535)
18      2     Agility (0-65535)
20      2     Charisma (0-65535)
22      1     Gender (0=male, 1=female)
23      4     Gold (BCD)
27      4     Bank Gold (BCD)
31      4     Experience
35      1     Weapon types owned (bitmask)
36      4     Armor expertise
40      4     Spell abilities (4 spells x 1 byte each)
44      8     Weapon names (4 weapons x 2 chars)
52      1     Armor class
```

### Room Record (in-memory, per adventure)
```
Offset  Size  Field
0       1     Room ID
1       8     Room name
9       1     North exit (room ID, 0=none)
10      1     South exit
11      1     East exit
12      1     West exit
13      1     Up exit
14      1     Down exit
15      1     Light (0=dark, 1=lit)
16      1     Room type (0=normal, 1=water, 2=shop, 3=temple)
17      3     Special flags
```

### Monster Record
```
Offset  Size  Field
0       1     Monster ID
1       16    Monster name
17      2     Hardiness (HP)
19      2     Agility (to-hit)
21      1     Armor class
22      1     Weapon damage dice
23      1     Weapon damage sides
24      1     Hostility (0=friendly, 1=neutral, 2=hostile)
25      1     Room ID (current location)
```

## Parser System

Eamon uses a simple two-word parser: `VERB NOUN`
- Commands: `N`, `S`, `E`, `W`, `U`, `D`, `GET`, `DROP`, `INV`, `LOOK`, `ATTACK`, `CAST`, `OPEN`, `READ`, `SAVE`, `LOAD`, `POWER`
- Prepositions and articles are stripped
- Abbreviation matching on first 4 characters

## Commodities (similar to Elite)

Weapons: Axe, Bow, Club, Mace, Spear, Sword
Armor: Leather, Chain, Plate, Shield
Spells: Blast, Heal, Speed, Power

## Porting Strategy (Applesoft BASIC → BBC BASIC)

### Directly Portable
- Text parser (VERB NOUN pattern works identically)
- Room navigation system
- Combat formulas (2d6-based)
- Save/load (but file I/O differs)

### Requires Adaptation
- Apple II `PEEK`/`POKE` memory access → BBC BASIC arrays
- Apple II disk I/O (`PR#6`, `OPEN`) → BBC BASIC file commands
- Apple II character codes → BBC 7-bit ASCII
- Apple II PDL (paddle) input → BBC ADVAL or keyboard

### uCode Integration
- **LENS extractors**: Player HP, room ID, inventory, gold, monster statuses
- **SKIN**: Dark fantasy teletext theme
- **control**: Save, load, status, room_jump

## Estimated Effort: 3 weeks