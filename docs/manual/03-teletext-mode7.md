---
title: "Part 3: Mode 7 & Teletext (Ceefax & GridCore)"
level: "intermediate"
relevance: 90
category: "uCode Manual"
description: "Master the iconic Mode 7 teletext display, 7-color palette, mosaic graphics, and the Ceefax live magazine reader."
---

# Part 3: Mode 7 & Teletext (Ceefax & GridCore)

The BBC Micro’s **MODE 7** was its most distinctive feature, powered by the Mullard SAA5050 teletext character generator. It provides a crisp 40-column by 25-row display that requires only 1 kilobyte of video memory. In uCode, MODE 7 is fully revived as a primary interface for retro applications, data dashboards, and offline vault browsing.

---

## 1. Entering Mode 7 & Colors

To switch to teletext mode in your program:

```bbcbasic
10 MODE 7
20 CLS
```

### The Teletext Color Palette

Teletext supports 8 standard colors (7 foreground colors plus black):

| Code | Foreground Color | Background Code |
|---|---|---|
| `COLOUR 0` | Black | `COLOUR 128` |
| `COLOUR 1` | Red | `COLOUR 129` |
| `COLOUR 2` | Green | `COLOUR 130` |
| `COLOUR 3` | Yellow | `COLOUR 131` |
| `COLOUR 4` | Blue | `COLOUR 132` |
| `COLOUR 5` | Magenta | `COLOUR 133` |
| `COLOUR 6` | Cyan | `COLOUR 134` |
| `COLOUR 7` | White | `COLOUR 135` |

### Setting Foreground and Background

```bbcbasic
10 MODE 7: CLS
20 COLOUR 129: REM Set background to Red
30 COLOUR 7:   REM Set foreground text to White
40 PRINT " ALERT: REACTOR COMPROMISED "
50 COLOUR 128: REM Restore black background
60 COLOUR 2:   REM Green text
70 PRINT "Auxiliary coolers engaged."
```

---

## 2. Cursor Positioning with `TAB`

In MODE 7, the screen coordinates run from column `0` to `39` (horizontal) and row `0` to `24` (vertical). Use `PRINT TAB(col, row);` to place text or symbols at exact screen locations:

```bbcbasic
10 MODE 7: CLS
20 COLOUR 3
30 PRINT TAB(12, 2); "=== STAR DOCK 7 ==="
40 COLOUR 6
50 PRINT TAB(5, 6); "Shields: [100%]"
60 PRINT TAB(5, 8); "Engines: [ONLINE]"
70 PRINT TAB(5, 10); "Photon Torpedoes: 8"
80 COLOUR 7
90 PRINT TAB(10, 22); "Press SPACE to initiate warp."
```

---

## 3. Teletext Mosaic Graphics

Teletext characters can also be displayed as **mosaics**. Each character cell is divided into a 2x3 block grid (6 sub-pixels), enabling bar graphs, retro maps, borders, and decorative icons.

In BBC BASIC teletext mode, control codes between 128 and 159 trigger graphic modes:
- `VDU 145` through `VDU 151` switch the teletext generator into Graphics mode with the corresponding color (1=Red, 2=Green, etc.).
- Characters from ASCII 160 to 255 render 2x3 pixel mosaic patterns.

```bbcbasic
10 MODE 7: CLS
20 REM Draw a graphic separator bar
30 VDU 146: REM Graphics Green
40 FOR x% = 0 TO 38
50   PRINT CHR$(255);
60 NEXT x%
70 PRINT
80 VDU 135: REM Alphanumeric White
90 PRINT "System telemetry active."
```

---

## 4. The Extended Ceefax Reader

uCode includes a full, offline-capable Ceefax reader integrated with your markdown vault (`~/Vault` and `UDOS_HOME`). You can browse pages interactively or jump to pages directly using extended commands:

### Direct Page Navigation
- `CEEFAX` — Launches the teletext magazine starting at Page 100.
- `CEEFAX 300` — Jumps directly to Page 300.
- `TELETEXT.PAGE <num>` — Jump to any page number (100–899) from inside a program or prompt.

```bbcbasic
> TELETEXT.PAGE 200
Loading page 200...
```

### Standard Ceefax Magazine Layout

| Page Range | Topic | Dynamic Data Source |
|---|---|---|
| **P100** | Main Index | System overview & headline navigation |
| **P101** | System Health | Services status, memory, uptime, network |
| **P200** | The Daily Bean | Morning briefing, weather, and AI daily summary |
| **P300** | Household & Budgets | Token usage, cost telemetry, household expenses |
| **P400** | Obsidian Notebooks | Live index of markdown notes from `~/Vault` |
| **P500** | Software Library | Catalog of launchable games, capsules & NetHack |
| **P888** | Teletext Guide | Subtitle & engineering test page |

---

## Summary & Hands-On Exercise

You now understand:
- The 40x25 character grid and 7-color palette of MODE 7.
- How to position text with `TAB(col, row)`.
- How to switch between text and mosaic graphics.
- How to navigate the Ceefax live magazine using `TELETEXT.PAGE`.

**Exercise 3.1**: Build a MODE 7 title screen for a retro science-fiction game. Use a blue background header (`COLOUR 132`), yellow text (`COLOUR 3`), and a green mosaic border (`VDU 146`) to create a 3-choice menu.
