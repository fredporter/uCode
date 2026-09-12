---
title: "Part 2: Flow of Control, Loops & Logic"
level: "basic"
relevance: 90
category: "uCode Manual"
description: "Master structured programming in BBC BASIC: conditionals, loops, procedures, functions, and local variables."
---

# Part 2: Flow of Control, Loops & Logic

Modern BBC BASIC is renowned for its elegant structured programming features. Unlike early Dartmouth BASIC dialects that relied heavily on `GOTO`, BBC BASIC provides full structured constructs including `IF..THEN..ELSE`, `FOR..NEXT`, `REPEAT..UNTIL`, `WHILE..ENDWHILE`, and named `PROC`s.

---

## 1. Conditionals: Making Decisions

The `IF` statement evaluates a logical condition. If true, it executes the statements following `THEN`; if false, it skips to `ELSE` (if present).

```bbcbasic
10 INPUT "Enter player health (0-100): ", hp%
20 IF hp% <= 0 THEN
30   PRINT "Player has fallen! Game Over."
40 ELSE
50   PRINT "Player survives with "; hp%; " HP remaining."
60 ENDIF
```

*(Note: In single-line format, `IF condition THEN action ELSE other_action` can also be used without `ENDIF`.)*

### Relational & Logical Operators

| Operator | Meaning | Example |
|---|---|---|
| `=` | Equal to | `IF score% = 100` |
| `<>` | Not equal to | `IF name$ <> ""` |
| `<` / `>` | Less than / Greater than | `IF x% < 0 OR x% > 39` |
| `<=` / `>=` | Less than or equal / Greater or equal | `IF level% >= 5` |
| `AND` | Logical conjunction (both true) | `IF hp% > 0 AND mana% > 10` |
| `OR` | Logical disjunction (either true) | `IF key$ = "Q" OR key$ = "q"` |
| `NOT` | Logical negation | `IF NOT game_over%` |

---

## 2. Counted Loops: `FOR ... NEXT`

When you know in advance how many times a block of code should repeat, use `FOR ... NEXT`:

```bbcbasic
10 REM Print the 7 times table
20 FOR i% = 1 TO 10
30   PRINT i%; " x 7 = "; i% * 7
40 NEXT i%
```

You can specify a custom increment or decrement with `STEP`:

```bbcbasic
10 REM Rocket countdown
20 FOR countdown% = 10 TO 1 STEP -1
30   PRINT countdown%; "..."
40 NEXT countdown%
50 BEEP
60 PRINT "BLAST OFF!"
```

---

## 3. Conditional Loops: `REPEAT` and `WHILE`

### The `REPEAT ... UNTIL` Loop
The statements inside a `REPEAT` block are executed at least once. The loop checks the exit condition at the bottom:

```bbcbasic
10 score% = 0
20 REPEAT
30   INPUT "Enter a number to add (0 to finish): ", num%
40   score% = score% + num%
50   PRINT "Current total: "; score%
60 UNTIL num% = 0
70 PRINT "Final score: "; score%
```

### The `WHILE ... ENDWHILE` Loop
The `WHILE` loop tests its condition at the top before running any code. If the condition is initially false, the loop body never runs:

```bbcbasic
10 power% = 100
20 WHILE power% > 10
30   PRINT "System operational. Power at "; power%; "%"
40   power% = power% - 25
50 ENDWHILE
60 PRINT "Warning: Emergency reserves engaged!"
```

---

## 4. Named Procedures (`PROC`)

Procedures allow you to break your program into modular, reusable blocks. A procedure is defined with `DEF PROC_name` and ended with `ENDPROC`. Call it with `PROC_name`.

```bbcbasic
10 CLS
20 PROC_banner("THE DUNGEON ENTRANCE")
30 PRINT "You stand before a carved obsidian gateway."
40 PROC_banner("CHOOSE YOUR PATH")
50 END
60 
70 DEF PROC_banner(title$)
80 PRINT STRING$(40, "=")
90 PRINT "  "; title$
100 PRINT STRING$(40, "=")
110 ENDPROC
```

### Local Variables with `LOCAL`
To prevent procedures from accidentally modifying variables in the main program, declare variables as `LOCAL`:

```bbcbasic
100 DEF PROC_draw_box(w%, h%)
110 LOCAL row%, col%
120 FOR row% = 1 TO h%
130   FOR col% = 1 TO w%
140     PRINT "#";
150   NEXT col%
160   PRINT
170 NEXT row%
180 ENDPROC
```

---

## 5. Named Functions (`FN`)

Functions are similar to procedures, but they return a value directly. A function definition begins with `DEF FN_name` and returns with an assignment `= result`:

```bbcbasic
10 CLS
20 INPUT "Enter weapon base damage: ", base%
30 INPUT "Enter strength bonus: ", str%
40 total_dmg% = FN_calculate_damage(base%, str%)
50 PRINT "Total inflicted damage: "; total_dmg%
60 END
70 
80 DEF FN_calculate_damage(b%, s%)
90 LOCAL bonus%
100 bonus% = INT(s% * 1.5)
110 = b% + bonus%
```

---

## Summary & Hands-On Exercise

In this part you learned:
- How to branch execution using `IF..THEN..ELSE`.
- How to iterate with `FOR..NEXT`, `REPEAT..UNTIL`, and `WHILE..ENDWHILE`.
- How to structure modular code with `DEF PROC` and `DEF FN`.
- How to protect variable scope using `LOCAL`.

**Exercise 2.1**: Write a "Guess the Number" game. Generate a random secret number (`secret% = RND(100)`). Use a `REPEAT..UNTIL` loop to ask the player for guesses, giving "Too high" or "Too low" feedback, and output the total number of attempts when guessed correctly.
