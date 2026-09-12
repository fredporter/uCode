---
title: "Part 1: First Steps with uCode & BBC BASIC"
level: "basic"
relevance: 95
category: "uCode Manual"
description: "Learn the fundamentals of BBC BASIC: the prompt, immediate mode, line numbers, variables, and input/output."
---

# Part 1: First Steps with uCode & BBC BASIC

## 1. The Welcome Screen & Prompt

When you start uCode or connect via the web terminal, you are greeted with the classic microcomputer prompt:

```text
uCode BBC BASIC (SDL 2.0)
Starting 32K memory space
> 
```

The cursor `>` indicates that uCode is ready for your instructions. There are two primary ways to interact with BBC BASIC:
1. **Immediate Mode**: Commands typed without a line number are executed instantly as soon as you press **RETURN**.
2. **Program Mode**: Commands preceded by a line number are stored into memory as sequential lines of a program.

---

## 2. Immediate Mode

Try typing the following command at the prompt and press **RETURN**:

```bbcbasic
PRINT "Welcome to uCode!"
```

The computer immediately responds:
```text
Welcome to uCode!
>
```

You can also use `PRINT` as an interactive calculator:

```bbcbasic
PRINT 2 + 2
PRINT (100 * 5) / 4
PRINT SQR(144)
```

To sound a short bell or alert tone, use `BEEP`:
```bbcbasic
BEEP
```

To clear the current display, use `CLS`:
```bbcbasic
CLS
```

---

## 3. Entering a Stored Program

Programs in BBC BASIC consist of numbered lines. Lines are executed in numerical order, not in the order you type them. It is good practice to number lines in steps of 10 (`10`, `20`, `30`...) so you can insert new lines later if needed.

Type the following program into the terminal:

```bbcbasic
10 CLS
20 PRINT "=============================="
30 PRINT "  MY FIRST UCODE PROGRAM"
40 PRINT "=============================="
50 PRINT
60 PRINT "Learning to code is fun!"
```

### Essential Program Management Commands

- `LIST` — Displays the entire program currently stored in memory.
  ```bbcbasic
  LIST
  ```
  You can also list specific line ranges, such as `LIST 20-40`.

- `RUN` — Executes the program from the lowest line number:
  ```bbcbasic
  RUN
  ```

- `NEW` — Erases the current program from memory so you can start fresh:
  ```bbcbasic
  NEW
  ```

- `RENUM` — Renumbers all lines automatically in steps of 10:
  ```bbcbasic
  RENUM
  ```

---

## 4. Variables and Data Types

BBC BASIC supports three main variable types indicated by their suffix:

| Type | Suffix | Example | Description | Range |
|---|---|---|---|---|
| **Integer** | `%` | `age%`, `score%`, `lives%` | 32-bit signed whole numbers | -2,147,483,648 to 2,147,483,647 |
| **String** | `$` | `name$`, `title$`, `key$` | Text characters (up to 255 chars) | Text strings |
| **Real / Float** | *(none)* | `speed`, `ratio`, `distance` | Floating point numbers | 5-byte high precision decimal |

### Example: Setting and Printing Variables

```bbcbasic
10 name$ = "Arthur Dent"
20 age% = 42
30 credits = 150.75
40 PRINT "Name:    "; name$
50 PRINT "Age:     "; age%; " Earth years"
60 PRINT "Balance: $"; credits
```

Output:
```text
Name:    Arthur Dent
Age:     42 Earth years
Balance: $150.75
```

Notice the punctuation in `PRINT`:
- Semicolon `;` prints the next item immediately adjacent with no extra space.
- Comma `,` tabs to the next column tab stop.

---

## 5. Getting User Input

To make programs interactive, use the `INPUT` statement. It can optionally display a prompt string before waiting for the user to type:

```bbcbasic
10 CLS
20 INPUT "What is your callsign? ", callsign$
30 INPUT "Enter security clearance (1-5): ", level%
40 PRINT
50 PRINT "Access granted, Commander "; callsign$
60 PRINT "Clearance level verified: "; level%
```

---

## Summary & Hands-On Exercise

You now know how to:
1. Issue immediate commands and clear the screen.
2. Enter, list, run, and clear stored programs.
3. Declare integers, strings, and floats.
4. Prompt the user for input and display personalized greetings.

**Exercise 1.1**: Write a program that asks the user for their birth year, calculates their approximate age in years and days, and prints a decorative summary box.
