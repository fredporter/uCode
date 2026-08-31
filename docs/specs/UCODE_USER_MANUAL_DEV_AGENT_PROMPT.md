# Dev Agent Prompt - uCode User Manual

Agent: Cline Dev Agent
Task: Write User Manual for uCode 1 (BBC BASIC for SDL 2.0 + optional AMOS shim)
Style: BBC Micro User Manual (1980s) - clear, educational, example-driven
Audience: Beginners to intermediate programmers, educators, retro computing enthusiasts
Language: uCode (BBC BASIC + AMOS extensions)
Output: Markdown document with code examples in BBC BASIC syntax

## Scope and Naming Clarification

1. Use uCode as the platform name.
2. Follow `docs/UCODE_ARCHITECTURE.md`:
   - uCode 1 (product name: uCode) owns the compatible 2D runtime, Teletext,
     sprites, BOBs, LENS, SKIN, capsules, and the Software Library.
   - uCode 2 begins with experimental 3D/spatial work and is outside this
     introductory runtime manual.
3. Do not use uCode1/uCode2 as capability-profile names.
4. Align examples with GridCore-era uCode architecture and Vault workflows.

## Prompt

Write a comprehensive User Manual for the uCode runtime in the style of the
original BBC Micro User Manual.

The manual must be warm, practical, and progressive, with a learn-by-doing
approach and exercises at the end of each chapter.

### Core Principles

1. No line numbers required by default.
2. MODE 7 teletext is foundational.
3. Sprites and BOBs are uCode 1 capabilities. Teach native BBCSDL libraries
   first and the AMOS shim as an optional compatibility vocabulary.
4. Vault-first workflows:
   - programs in the configured Vault programs collection
   - snacks in ~/Vault/snacks/
   - assets in ~/Vault/assets/
5. BBC lineage with modern integrations (LENS, SKIN, RCP).

### Manual Structure

| Section                               | Content                                                |
| ------------------------------------- | ------------------------------------------------------ |
| 1. Introduction                       | What is uCode? BBC Micro legacy + modern profile model |
| 2. Getting Started                    | Install, first run, first program                      |
| 3. The Vault                          | Programs, snacks, assets, variables                    |
| 4. BASIC Fundamentals                 | Variables, loops, conditionals, procedures/functions   |
| 5. Teletext Graphics                  | Modern reader plus MODE 7 compatibility                 |
| 6. Sprites (uCode 1)                  | Sprite banks, placement, animation, collision            |
| 7. BOBs (uCode 1)                     | Animation, transparency, layered objects                 |
| 8. The AMOS Shim                      | Compatibility layer commands and mapping               |
| 9. Working with Assets                | Loading sprites/GIF/sound from Vault                   |
| 10. LENS and SKIN                     | State extraction and theme application                 |
| 11. Snacks                            | Self-contained program bundles                         |
| 12. Advanced Features                 | Physics/networking/3D (optional profile modules)       |
| 13. Reference                         | Command reference and library registry                 |
| Appendix A                            | BBC BASIC vs AMOS command comparison                   |
| Appendix B                            | uCode cheat sheet                                      |

### Example Style Requirement

Use modern style examples without line numbers, while noting historical forms
when useful.

```ubasic
REM No line numbers required
MODE 7
COLOUR 2
PRINT TAB(10,12); "Hello, uCode!"

INSTALL @lib$ + "gfxlib"
sprite% = FN_load_sprite("player.chr", 24, 24)
PROC_sprite_place(sprite%, 10, 10)
PROC_sprite_animate(sprite%, 1)

WAIT 100
END
```

### Vault References

```bash
<configured-vault>/programs/
~/Vault/snacks/
~/Vault/assets/
```

### Additional Requirements

1. Include comparison tables (BBC BASIC vs AMOS shim commands).
2. Include a practical cheat sheet.
3. Include side-by-side native BBCSDL and optional AMOS-shim examples.
4. Explain AMOS shim as compatibility layer, not separate language.
5. Include GridCore-aware terminology for visual/cell mapping where relevant.

## Deliverable

Single Markdown file: uCode-User-Manual.md
Target length: 10,000-15,000 words
Format: ready for Marp/book-style rendering

The manual should be beginner-friendly while containing enough depth for
building complete projects and retro-inspired games.
