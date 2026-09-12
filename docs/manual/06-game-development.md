---
title: "Part 6: Interactive Game Development & Vault Publishing"
level: "advanced"
relevance: 90
category: "uCode Manual"
description: "Build a complete real-time dungeon crawler from scratch using BBC BASIC, the GridCore engine, keyboard polling, and Vault persistence."
---

# Part 6: Interactive Game Development & Vault Publishing

In this final part of the uCode User Guide, we bring everything together: structured BBC BASIC, Mode 7 teletext graphics, GridCore spatial matrices, keyboard polling, and Vault persistence. We will build a complete, playable mini-dungeon crawler titled **"The Caverns of uCode"**.

---

## 1. The Real-Time Game Loop

Every interactive game follows a standard cyclic pattern:

```
┌──────────────────────────────────────────────────────────┐
│                        GAME LOOP                         │
│                                                          │
│   1. Poll User Input   (INKEY / non-blocking keyboard)   │
│            │                                             │
│            ▼                                             │
│   2. Update Game State (Player movement, enemy AI)       │
│            │                                             │
│            ▼                                             │
│   3. Resolve Physics   (Wall collisions, combat)         │
│            │                                             │
│            ▼                                             │
│   4. Draw Frame        (GridCore characters & HUD)       │
│            │                                             │
│            ▼                                             │
│   5. Tick Delay        (Regulate frame rate)             │
└──────────────────────────────────────────────────────────┘
```

### Non-Blocking Input with `INKEY`
Unlike `INPUT`, which pauses the whole program waiting for the user to press RETURN, `INKEY(centiseconds)` checks if a key is currently pressed:

```bbcbasic
10 REM Wait up to 5 centiseconds (50ms) for a key
20 key$ = INKEY$(5)
30 IF key$ = "W" OR key$ = "w" THEN PROC_move_up
40 IF key$ = "S" OR key$ = "s" THEN PROC_move_down
50 IF key$ = "A" OR key$ = "a" THEN PROC_move_left
60 IF key$ = "D" OR key$ = "d" THEN PROC_move_right
```

---

## 2. Vault Persistence (`VAULT.OPEN` & `VAULT.LIST`)

uCode games store player saves, quest dialogues, and high scores in your personal vault (`~/Vault`).

### Inspecting Vault Files
```text
> VAULT.LIST
Vault Documents & Keys:
  notes/daily.md
  notes/tasks.md
  ollama_endpoint
  hivemind_api_key
  openrouter_api_key
```

### Loading Quest Content
```text
> VAULT.OPEN quests/dungeon_intro.md
Opened vault document: quests/dungeon_intro.md
```

Inside your code, you can verify vault documents or write high score entries to preserve progress across game sessions.

---

## 3. Complete Project: "The Caverns of uCode"

Here is the complete, runnable code for a 40x20 dungeon crawler with walls, treasure, monster encounters, and a status HUD:

```bbcbasic
10 REM ========================================================
20 REM           THE CAVERNS OF UCODE — MINI CRAWLER
30 REM ========================================================
40 MODE 7: CLS: CURSOR 0
50 
60 REM --- Initialize Variables ---
70 px% = 5: py% = 5: hp% = 20: gold% = 0: alive% = TRUE
80 mx% = 15: my% = 8: mhp% = 8
90 DIM grid%(39, 19)
100 
110 REM --- Generate Dungeon Layout ---
120 PROC_build_dungeon
130 
140 REM --- Main Game Loop ---
150 REPEAT
160   PROC_draw_hud
170   PROC_draw_actors
180   
190   k$ = INKEY$(10)
200   IF k$ <> "" THEN PROC_handle_input(k$)
210   
220   REM Monster movement towards player
230   IF alive% AND (RND(10) > 4) THEN PROC_monster_ai
240 UNTIL NOT alive% OR (hp% <= 0)
250 
260 REM --- Game Over Screen ---
270 CLS
280 COLOUR 1: PRINT TAB(12, 10); "=== GAME OVER ==="
290 COLOUR 7: PRINT TAB(10, 12); "Final Gold Gathered: "; gold%
300 BEEP: END
310 
320 REM --- Procedures ---
330 DEF PROC_build_dungeon
340 LOCAL x%, y%
350 FOR y% = 0 TO 19
360   FOR x% = 0 TO 39
370     IF x% = 0 OR x% = 39 OR y% = 0 OR y% = 19 THEN
380       grid%(x%, y%) = 35: REM '#' Wall
390     ELSE
400       grid%(x%, y%) = 46: REM '.' Floor
410     ENDIF
420   NEXT x%
430 NEXT y%
440 REM Place some inner pillars and gold
450 grid%(10, 10) = 35: grid%(11, 10) = 35: grid%(10, 11) = 35
460 grid%(25, 12) = 36: REM '$' Gold
470 grid%(30, 5)  = 36: REM '$' Gold
480 
490 REM Draw background terrain
500 COLOUR 4: REM Blue walls
510 FOR y% = 0 TO 19
520   FOR x% = 0 TO 39
530     PRINT TAB(x%, y%); CHR$(grid%(x%, y%));
540   NEXT x%
550 NEXT y%
560 ENDPROC
570 
580 DEF PROC_draw_hud
590 COLOUR 7: PRINT TAB(0, 21); STRING$(40, "-");
600 COLOUR 2: PRINT TAB(2, 22); "HP: "; hp%; " ";
610 COLOUR 3: PRINT TAB(15, 22); "GOLD: "; gold%; " ";
620 COLOUR 6: PRINT TAB(28, 22); "KEYS: WASD/Q";
630 ENDPROC
640 
650 DEF PROC_draw_actors
660 REM Draw player
670 COLOUR 7: PRINT TAB(px%, py%); "@";
680 REM Draw monster if alive
690 IF mhp% > 0 THEN
700   COLOUR 1: PRINT TAB(mx%, my%); "D";
710 ENDIF
720 ENDPROC
730 
740 DEF PROC_handle_input(key$)
750 LOCAL nx%, ny%
760 nx% = px%: ny% = py%
770 
780 IF key$ = "W" OR key$ = "w" THEN ny% = ny% - 1
790 IF key$ = "S" OR key$ = "s" THEN ny% = ny% + 1
800 IF key$ = "A" OR key$ = "a" THEN nx% = nx% - 1
810 IF key$ = "D" OR key$ = "d" THEN nx% = nx% + 1
820 IF key$ = "Q" OR key$ = "q" THEN alive% = FALSE: ENDPROC
830 
840 REM Check collision with wall
850 IF grid%(nx%, ny%) = 35 THEN BEEP: ENDPROC
860 
870 REM Check combat with monster
880 IF nx% = mx% AND ny% = my% AND mhp% > 0 THEN
890   mhp% = mhp% - 4
900   BEEP
910   IF mhp% <= 0 THEN
920     REM Monster defeated, clear cell
930     PRINT TAB(mx%, my%); CHR$(grid%(mx%, my%));
940     gold% = gold% + 25
950   ENDIF
960   ENDPROC
970 ENDIF
980 
990 REM Check gold pickup
1000 IF grid%(nx%, ny%) = 36 THEN
1010   gold% = gold% + 10
1020   grid%(nx%, ny%) = 46: REM Replace with floor
1030 ENDIF
1040 
1050 REM Erase old player position and update
1060 PRINT TAB(px%, py%); CHR$(grid%(px%, py%));
1070 px% = nx%: py% = ny%
1080 ENDPROC
1090 
1100 DEF PROC_monster_ai
1110 LOCAL dx%, dy%
1120 IF mhp% <= 0 THEN ENDPROC
1130 dx% = 0: dy% = 0
1140 IF px% > mx% THEN dx% = 1 ELSE IF px% < mx% THEN dx% = -1
1150 IF py% > my% THEN dy% = 1 ELSE IF py% < my% THEN dy% = -1
1160 
1170 REM Attack player if adjacent
1180 IF mx% + dx% = px% AND my% + dy% = py% THEN
1190   hp% = hp% - 2
1200   BEEP
1210   ENDPROC
1220 ENDIF
1230 
1240 REM Move if destination is open floor
1250 IF grid%(mx% + dx%, my% + dy%) = 46 THEN
1260   PRINT TAB(mx%, my%); CHR$(grid%(mx%, my%));
1270   mx% = mx% + dx%: my% = my% + dy%
1280 ENDIF
1290 ENDPROC
```

---

## 4. Packaging Your Creation

To bundle your BASIC game for sharing or publishing:
1. Save your source code into your project directory or vault:
   ```bbcbasic
   SAVE "caverns.bas"
   ```
2. Wrap it with a `snack.yaml` or `capsule.yaml` manifest if adding native tile skins or custom LENS bridge routines.
3. Your game is now directly launchable from the uCode command prompt, Ceefax Software Library (P500), and the uCore surfaces!

---

## Congratulations!

You have completed the **Learn to Code with uCode** curriculum! You are now equipped with the foundations of structured BASIC, retro teletext design, spatial algebra, native polyglot capsules, and real-time game architecture. Welcome to the uCode creator community!
