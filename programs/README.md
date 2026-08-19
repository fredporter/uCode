# uCode Programs — Classic Game Adaptations

7 classic programs adapted for the uCode platform (BBC BASIC for SDL 2.0 + AMOS Runtime add-on).

## Program Catalog

| Program | Approach | Effort | Est. Weeks | Status |
|---------|----------|--------|------------|--------|
| [Elite](elite/) | Adapt 6502 source (BeebAsm) | Medium | 3 | ✅ Pipeline done, 287-line BBC BASIC |
| [NetHack](nethack/) | Adapt C source → BBC BASIC | Medium | 3 | ✅ Research + 52-line skeleton |
| [Repton](repton/) | Adapt 6502 source + clones | Small | 2 | ✅ Pipeline done, 275-line playable level 1 |
| [Knight Orc](knight-orc/) | Rewrite (inspired by KAOS engine) | Large | 10 | ✅ GDD + 64-line skeleton |
| [Apple Panic](apple-panic/) | Rewrite (inspired by Space Panic) | Small | 2 | ✅ GDD + 281-line skeleton |
| [uConstruct](uconstruct/) | Rewrite (inspired by ACS, 1984) | Large | 10 | ✅ Scaffold + 49-line skeleton |
| [Eamon](eamon/) | Adapt Applesoft BASIC source | Medium | 3 | ✅ Research + 63-line skeleton |

## Program Structure

Each program follows the canonical layout:

```
programs/<name>/
├── program.yaml          # Manifest (required)
├── src/                  # Source code (BBC BASIC, 6502 ASM, etc.)
├── assets/
│   ├── sprites/          # Character/sprite assets
│   └── sounds/           # WAV audio files
├── lens/                 # LENS extractor modules
├── skin/                 # SKIN theme definitions
├── control/              # Control command specifications
└── test/                 # Integration tests
```

## Build Order

1. **Repton** ✅ Pipeline complete, playable level 1
2. **Apple Panic** ✅ BBC BASIC skeleton with digging/trapping
3. **Eamon** ✅ Research done, BBC BASIC skeleton generated
4. **Elite** ✅ Pipeline complete, station economy + flight loop
5. **NetHack** ✅ Research done, BBC BASIC skeleton generated
6. **uConstruct** ✅ Scaffold done, BBC BASIC skeleton generated
7. **Knight Orc** ✅ GDD + BBC BASIC skeleton generated

All 7 programs now have BBC BASIC skeletons via the Skills Framework pipeline.

## Skills Required

| Skill | Used By | Status |
|-------|---------|--------|
| Source-Miner | Elite, Repton | Built (9 tests) |
| LENS-Craft | All 7 | Built (8 tests) |
| Command-Scribe | All 7 | Built (8 tests) |
| SKIN-Weaver | All 7 | Built (8 tests) |
| Inspire-Engine | Knight Orc, Apple Panic, uConstruct | Built (6 tests) |
| uCode-Weaver | All 7 | Built (5 tests) |

## Pipeline

All 6 skills are accessible through the GridSmith CLI or library API. See `docs/learning-pathway/05-skills-framework.md` for tutorial.
