# uCode User Manual

## BBC BASIC for SDL 2.0 and AMOS Sprite Programming

**Welcome to uCode. This manual will teach you to program in a language that has inspired generations of programmers. uCode is based on BBC BASIC, the language that powered the BBC Micro — the computer that taught a nation to code. But uCode is not just a museum piece. It has grown up. It now supports sprites, animation, GIFs, and even physics. And it does all of this while keeping the simple, elegant style that made BBC BASIC so beloved.**

---

## 1. Introduction

### What is uCode?

uCode is a modern programming environment built on **BBC BASIC for SDL 2.0 (BBCSDL)** — an open-source re-implementation of the language that ran on the legendary BBC Micro. It gives you two capability profiles:

- **uCode1 profile** — Classic teletext graphics with MODE 7's 40×25 character grid, colours, flashing text, and the warm glow of Ceefax-style displays
- **uCode2 profile** — AMOS-inspired sprite and BOB commands for games, animations, and interactive programs

Both profiles run inside the same uCode runtime. You can start with a colourful text display and add animated sprites without learning a new language. The AMOS shim translates AMOS-style commands into BBCSDL's built-in libraries, so you get the best of both worlds.

### The BBC Micro Legacy

The BBC Micro (1981) was designed by Acorn Computers for the BBC Computer Literacy Project. It taught a whole generation of British children — and adults — to program. BBC BASIC was its heart: simple, structured, and fast. It was the language of school computer rooms, of late-night coding sessions, and of the first games that bedroom coders ever wrote.

uCode keeps that spirit alive. But it has grown up. MODE 7 now lives inside the modern BBCSDL engine. Sprites and BOBs — inspired by AMOS on the Commodore Amiga — give you the tools to build games. And the Vault keeps your programs, assets, and state organised.

### Who This Manual is For

This manual is for **everyone**. If you have never programmed before, start at Section 2 and work through the examples one at a time. Type them in. Change them. Break them. Fix them. If you are an experienced programmer, you can jump to the sections that interest you — sprites, BOBs, the AMOS shim — and use the cheat sheet at the back as a quick reference.

### How This Manual is Organised

| Section                | What You'll Learn                          |
| ---------------------- | ------------------------------------------ |
| 1. Introduction        | What uCode is and why it matters           |
| 2. Getting Started     | Install, run your first program            |
| 3. The Vault           | Where everything lives                     |
| 4. BASIC Fundamentals  | Variables, loops, conditionals, procedures |
| 5. Teletext Graphics   | MODE 7, colours, attributes                |
| 6. Sprites             | Placing and animating sprites              |
| 7. BOBs                | Animated GIF objects                       |
| 8. The AMOS Shim       | AMOS-style commands                        |
| 9. Working with Assets | Loading graphics and sound                 |
| 10. LENS & SKIN        | Capturing and theming your output          |
| 11. Snacks             | Self-contained programs with assets        |
| 12. Advanced Features  | Physics, networking, 3D                    |
| 13. Reference          | Command reference, library registry        |
| Appendix A             | BBC BASIC vs AMOS comparison               |
| Appendix B             | Cheat sheet                                |

---

## 2. Getting Started

### Installing uCode

The uCode runtime installs with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/uDosGo/uCode/main/runtimes/basic/install.sh | bash
```

This installs:

- The BBCSDL engine (`bbcsdl`)
- The Python bridge that connects BBC BASIC to modern tools
- The AMOS shim for sprite and BOB compatibility
- The `ucode` command you use to run programs

Your programs will live in `~/Vault/programs/`, and your assets (sprites, sounds, maps) in `~/Vault/assets/`.

### Your First Program

Open your text editor and type:

```basic
REM My first uCode program
MODE 7
COLOUR 2
PRINT TAB(10,12); "Hello, uCode!"
END
```

Save it as `~/Vault/programs/hello.ucode` and run it:

```bash
ucode run ~/Vault/programs/hello.ucode
```

You should see a black screen with green text saying "Hello, uCode!" positioned in the centre. Congratulations — you have just written and run your first uCode program.

### What Just Happened?

Let's go through each line:

- `REM` — This is a comment. BBC BASIC ignores everything after REM on that line. Use it to explain what your program does.
- `MODE 7` — This switches the display to teletext mode: 40 columns wide, 25 rows of text. MODE 7 is the signature look of uCode1.
- `COLOUR 2` — Sets the text colour to green (colour 2 in BBC BASIC's palette). Numbers range from 0 (black) to 7 (white).
- `PRINT TAB(10,12); "Hello, uCode!"` — Prints text at column 10, row 12. The semicolon before the string tells BBC BASIC to print right after the tab position.
- `END` — Tells the program to stop.

In the original BBC Micro, you would have needed line numbers: `10 REM My first program`, `20 MODE 7`, and so on. uCode does not require line numbers unless you are writing traditional-style programs with `GOTO` or `GOSUB`. We recommend the modern, line-number-optional style for new programs.

### Running Programs

```bash
ucode run myprogram.ucode          # Run a program
ucode run myprogram.ucode --debug  # Run with debug output
ucode                               # Start the REPL interactive shell
```

### Saving Your Work

Programs live in `~/Vault/programs/`. You can organise them into subdirectories:

```bash
~/Vault/programs/
├── hello.ucode
├── games/
│   ├── invaders.ucode
│   └── platformer.ucode
└── experiments/
    └── test.ucode
```

#### Exercise 2.1

Modify the hello program to print your name in a different colour, at a different position on the screen. Try COLOUR 1 (red), COLOUR 6 (cyan), or COLOUR 3 (yellow).

---

## 3. The Vault

### Your Personal Workspace

The Vault is where all your uCode work lives. Think of it as your virtual desk — programs, art, sounds, and saved states are all kept here.

```
~/Vault/
├── programs/          # Your .ucode program files
│   ├── hello.ucode
│   ├── calculator.ucode
│   └── my-game/
│       ├── main.ucode
│       └── levels/
├── snacks/            # Self-contained program bundles
│   ├── adventure.snack
│   └── puzzle.snack
├── assets/            # Sprites, sounds, maps
│   ├── sprites/
│   │   ├── player.chr
│   │   └── enemy.chr
│   ├── bobs/
│   │   └── explosion.gif
│   ├── sounds/
│   │   └── coin.wav
│   └── maps/
│       └── level1.json
└── variables/         # Saved game state
    └── savegame.json
```

### Vault Commands

```bash
ucode vault list programs              # List your programs
ucode vault list snacks                # List installed snacks
ucode vault list assets                # List available assets
ucode vault snapshot save my-save      # Save current variable state
ucode vault snapshot restore my-save   # Restore saved state
```

### What is a Snack?

A **Snack** is a self-contained program that bundles its source code, sprites, sounds, and maps into a single directory. Snacks are portable — you can share them with friends or publish them to the community.

```
my-game.snack/
├── main.ucode
├── manifest.yaml          # Game name, author, engine version
├── sprites/player.chr
├── bobs/explosion.gif
├── sounds/coin.wav
└── maps/level1.json
```

Don't worry if this seems complicated right now. We will cover Snacks in detail in Section 11.

#### Exercise 3.1

Navigate to your Vault directory and list its contents. Create a new subdirectory for your experiments:

```bash
mkdir -p ~/Vault/programs/my-experiments
```

---

## 4. BASIC Fundamentals

This section covers the building blocks of every uCode program: variables, loops, decisions, and procedures. If you are new to programming, type in every example and experiment with the values.

### Variables

BBC BASIC has three main types of variables:

```basic
name$ = "Alice"      REM String variable (ends with $)
age% = 42            REM Integer variable (ends with %)
price = 12.99        REM Float variable (no suffix)
```

The `$` and `%` suffixes tell BBC BASIC — and other programmers — what kind of data the variable holds. This naming convention comes from the BBC Micro, where memory was tight and type information helped the interpreter work faster.

You can also use arrays:

```basic
DIM scores%(10)       REM Array of 11 integers (0 to 10)
scores%(0) = 95
scores%(1) = 87
```

### Input and Output

```basic
INPUT "What is your name? ", name$
PRINT "Hello, "; name$; "!"
PRINT "You are "; age%; " years young."
```

Notice the semicolons between items in the PRINT statement. They tell BBC BASIC to print each item immediately after the previous one with no extra space. Use commas for tabulated output:

```basic
PRINT "Name", "Score", "Level"
PRINT name$, score%, level%
```

### Making Decisions

```basic
IF score% >= 50 THEN
  PRINT "You passed!"
ELSE
  PRINT "Keep trying."
ENDIF
```

BBC BASIC uses `IF...THEN...ELSE...ENDIF` blocks. You can also write single-line conditionals:

```basic
IF lives% = 0 THEN PRINT "Game Over"
```

### Loops

**FOR...NEXT** — When you know how many times to loop:

```basic
FOR i% = 1 TO 10
  PRINT "Count: "; i%
NEXT i%
```

**REPEAT...UNTIL** — Loop until a condition is met:

```basic
REPEAT
  INPUT "Guess a number: ", guess%
UNTIL guess% = 42
PRINT "You got it!"
```

**WHILE...ENDWHILE** — Loop while a condition is true:

```basic
WHILE lives% > 0
  PRINT "You have "; lives%; " lives left."
  lives% = lives% - 1
ENDWHILE
```

### Procedures and Functions

Procedures let you group related commands together. They make your programs easier to read and maintain.

```basic
REM Define a procedure
DEF PROC_greet(name$)
  PRINT "Welcome, "; name$; "!"
ENDPROC

REM Call the procedure
PROC_greet("Alice")

REM Define a function (returns a value)
DEF FN_double(x)
  = x * 2

REM Use the function
PRINT FN_double(21)    REM Prints 42
```

Procedures start with `DEF PROC_`, and functions with `DEF FN_`. Functions return a value using `=` on the first line after the definition.

### A Complete Example

Let's put everything together into a simple guessing game:

```basic
REM Number Guessing Game
MODE 7
COLOUR 3

REM Pick a random number
target% = RND(100)

PRINT TAB(10,10); "GUESSING GAME"
PRINT TAB(10,12); "I am thinking of a number"
PRINT TAB(10,13); "between 1 and 100."

REPEAT
  PRINT
  INPUT "Your guess: ", guess%
  IF guess% < target% THEN PRINT "Higher!"
  IF guess% > target% THEN PRINT "Lower!"
UNTIL guess% = target%

PRINT "You got it! The number was "; target%
END
```

#### Exercise 4.1

Modify the guessing game to count how many guesses the player took, and display the count when they win.

---

## 5. Teletext Graphics (uCode1)

### MODE 7: The Heart of uCode1

MODE 7 is the soul of uCode1. It gives you a grid of 40 columns by 25 rows, where every character can have its own colour. This is identical to the Ceefax and Oracle teletext systems that millions of people used in the 1980s. It is distinctively British, distinctively retro, and beautifully simple.

```basic
MODE 7           REM Enter teletext mode
COLOUR 2         REM Green text
PRINT TAB(5,10); "WELCOME TO uCode"
```

### The Colour Palette

BBC BASIC MODE 7 uses 8 colours:

| Number | Colour  | Use                |
| ------ | ------- | ------------------ |
| 0      | Black   | Background         |
| 1      | Red     | Alerts, enemies    |
| 2      | Green   | Success, health    |
| 3      | Yellow  | Warnings, gold     |
| 4      | Blue    | Water, sky         |
| 5      | Magenta | Magic, power-ups   |
| 6      | Cyan    | Information, water |
| 7      | White   | Default text       |

You can set both the foreground (text) colour and the background colour:

```basic
COLOUR 1          REM Red text
COLOUR 128 + 4    REM Red text on blue background
COLOUR 7          REM Back to white text
```

### Text Positioning with TAB

`TAB(x,y)` places the cursor at column `x` and row `y` before printing:

```basic
PRINT TAB(10,5); "Title"
PRINT TAB(5,7); "Option 1"
PRINT TAB(5,8); "Option 2"
PRINT TAB(5,9); "Option 3"
```

Column numbers go from 0 to 39. Row numbers go from 0 to 24.

### Building a Menu Screen

```basic
MODE 7
COLOUR 3
PRINT TAB(12,3); "uCode ADVENTURE"

COLOUR 7
PRINT TAB(5,6); "1. Start New Game"
PRINT TAB(5,7); "2. Load Saved Game"
PRINT TAB(5,8); "3. Options"
PRINT TAB(5,9); "4. Quit"

COLOUR 6
PRINT TAB(5,12); "Press a number to continue"
```

### Drawing Borders

You can use the teletext graphics characters to draw boxes and borders:

```basic
MODE 7
COLOUR 6

REM Top border
PRINT TAB(10,5); "********************"

REM Sides
FOR row% = 6 TO 15
  PRINT TAB(10,row%); "*"
  PRINT TAB(31,row%); "*"
NEXT row%

REM Bottom border
PRINT TAB(10,16); "********************"

COLOUR 7
PRINT TAB(14,10); "INSIDE THE BOX"
```

### Clearing the Screen

```basic
CLS               REM Clear the entire screen
CLS 7             REM Clear and stay in MODE 7
```

### Teletext Animation

You can create simple animations by printing, waiting, and then printing over:

```basic
MODE 7
FOR pos% = 0 TO 30
  CLS
  COLOUR 2
  PRINT TAB(pos%,12); ">>>"
  WAIT 5          REM Wait 5/100ths of a second
NEXT pos%
```

In the original BBC Micro, this would flicker. BBCSDL renders smoothly, so your animations will look clean.

#### Exercise 5.1

Create a program that draws a coloured box and places a title inside it. Use at least 3 different colours.

#### Exercise 5.2

Write a program that moves a character across the screen from left to right, then bounces it back.

---

## 6. Sprites (uCode2)

Sprites are to uCode2 what MODE 7 is to uCode1. They bring your games to life. Sprite commands are inspired by AMOS, the classic Amiga BASIC that powered a generation of bedroom coders. But in uCode, they run on modern hardware — with a little help from the BBCSDL engine.

### Loading and Displaying a Sprite

```basic
INSTALL @lib$ + "gfxlib"
PROC_gfx_init(640, 480, 32)

REM Load a sprite (character file, width, height)
player% = FN_load_sprite("player.chr", 24, 24)

REM Place the sprite at coordinates (100, 200)
PROC_sprite_place(player%, 100, 200)

WAIT 500
END
```

The sprite file (`player.chr`) should be in your Vault assets directory:

```bash
~/Vault/assets/sprites/player.chr
```

### Moving Sprites

```basic
INSTALL @lib$ + "gfxlib"
PROC_gfx_init(640, 480, 32)

player% = FN_load_sprite("player.chr", 24, 24)
x% = 100
y% = 200

REPEAT
  PROC_sprite_place(player%, x%, y%)

  REM Read keyboard
  IF INKEY(-58) THEN y% = y% - 2   REM Up arrow
  IF INKEY(-42) THEN y% = y% + 2   REM Down arrow
  IF INKEY(-26) THEN x% = x% - 2   REM Left arrow
  IF INKEY(-122) THEN x% = x% + 2  REM Right arrow

  WAIT 2
UNTIL INKEY(-1)   REM ESC to quit
END
```

### Sprite Animation

Sprites can have multiple frames. Load a sprite sheet and cycle through frames:

```basic
INSTALL @lib$ + "gfxlib"
PROC_gfx_init(640, 480, 32)

sprite% = FN_load_sprite("runner.chr", 24, 24)

frame% = 0
REPEAT
  PROC_sprite_animate(sprite%, frame%)
  frame% = (frame% + 1) MOD 4   REM Cycle 0-3
  WAIT 10
UNTIL INKEY(-1)
END
```

### Collision Detection

```basic
IF FN_sprite_bob_collide(player%, enemy%) THEN
  PRINT "Crash!"
  SOUND 1, -15, 200, 10
  lives% = lives% - 1
ENDIF
```

Collision detection checks whether two sprites overlap. In uCode, collisions use rectangular bounding boxes — simple and fast.

### The Sprite Bank

You can manage many sprites at once using a sprite bank:

```basic
INSTALL @lib$ + "gfxlib"
PROC_gfx_init(640, 480, 32)

DIM sprites%(10)

REM Load 10 sprites into the bank
FOR i% = 0 TO 9
  sprites%(i%) = FN_load_sprite("enemy.chr", 24, 24)
  PROC_sprite_place(sprites%(i%), RND(600), RND(440))
NEXT i%

WAIT 300
END
```

#### Exercise 6.1

Load a sprite and move it with the arrow keys. Add a second sprite that follows the first one around the screen.

#### Exercise 6.2

Create a program that shows 20 sprites bouncing off the edges of the screen.

---

## 7. BOBs (uCode2)

### What is a BOB?

In AMOS terminology, a **BOB** (Blitter OBject) is a graphical object that floats above the background and can be animated with GIF files. Unlike sprites, which are typically simple pixel maps, BOBs can be full-colour animated GIFs with transparency.

### Loading and Displaying a BOB

```basic
INSTALL @lib$ + "imglib"

REM Load an animated GIF
bob% = FN_load_gif("explosion.gif")

REM Place the BOB on screen
PROC_bob_create(bob%, 200, 150)

REM Animate: loop endlessly
PROC_bob_animate(bob%, 0, -1)

WAIT 500
END
```

The parameters for `PROC_bob_animate` are:

- `bob%` — The bob identifier
- `0` — Start frame (0 = first frame)
- `-1` — End frame (-1 = loop forever)

### BOB Transparency

BOBs loaded from GIF files automatically preserve transparency. The background shows through wherever the GIF has transparent pixels.

### Combining Sprites and BOBs

```basic
INSTALL @lib$ + "gfxlib"
INSTALL @lib$ + "imglib"
PROC_gfx_init(640, 480, 32)

REM Player sprite
player% = FN_load_sprite("player.chr", 24, 24)

REM Explosion BOB
explosion% = FN_load_gif("explosion.gif")

PROC_sprite_place(player%, 320, 240)

REPEAT
  REM Move player with keyboard
  IF INKEY(-58) THEN y% = y% - 2
  IF INKEY(-42) THEN y% = y% + 2
  IF INKEY(-26) THEN x% = x% - 2
  IF INKEY(-122) THEN x% = x% + 2

  PROC_sprite_place(player%, x%, y%)

  REM Check collision with enemy
  IF FN_sprite_bob_collide(player%, enemy%) THEN
    PROC_bob_create(explosion%, x%, y%)
    PROC_bob_animate(explosion%, 0, -1)
    WAIT 50
    PROC_bob_remove(explosion%)
  ENDIF

  WAIT 2
UNTIL INKEY(-1)
END
```

### BOB Performance Tips

- Keep BOBs small — large animated GIFs use more memory and slow down the frame rate.
- Remove BOBs when they are off-screen with `PROC_bob_remove`.
- Pre-load BOBs at the start of your program rather than during gameplay.

#### Exercise 7.1

Create a program with a sprite that you control. When you press the space bar, spawn an animated BOB at the sprite's position.

---

## 8. The AMOS Shim

The AMOS shim is a compatibility layer that translates AMOS-style sprite and BOB commands into BBCSDL's native `gfxlib` and `imglib` libraries. If you are familiar with AMOS on the Commodore Amiga, these commands will feel like home.

### Loading the Shim

```basic
INSTALL "amos_shim.bbc"
```

This single line activates all the AMOS commands. You only need to do it once, at the top of your program.

### AMOS Command Reference

#### SPRITE — Place a Sprite

```basic
SPRITE 1, 100, 200, 1
```

Places sprite number 1 at x=100, y=200, using image 1.

#### BOB — Place a BOB

```basic
BOB 1, 300, 150, "explosion.gif"
```

Places BOB number 1 at x=300, y=150, using the GIF file.

#### MOVE — Animate Movement

```basic
MOVE 1, 400, 300, 50
```

Moves sprite/BOB 1 smoothly to x=400, y=300 over 50 steps.

#### COLL — Collision Detection

```basic
IF COLL(1, 2) THEN PRINT "Objects 1 and 2 have collided!"
```

Returns TRUE if objects 1 and 2 overlap.

#### SOUND — Play a Sound

```basic
SOUND 1, 100, 200, 50
```

Plays sound on channel 1, frequency 100, duration 200, volume 50.

### Complete AMOS Shim Example

```basic
INSTALL "amos_shim.bbc"

REM Place sprites
SPRITE 1, 100, 100, 1
SPRITE 2, 500, 400, 2

REM Place an animated BOB
BOB 1, 300, 250, "fire.gif"

REPEAT
  REM Move sprite 1 toward sprite 2
  MOVE 1, 500, 400, 20

  REM Check collision
  IF COLL(1, 2) THEN
    SOUND 1, 15, 200, 10
    PRINT TAB(15,20); "COLLISION!"
  ENDIF

  WAIT VBL    REM Wait for vertical blank
UNTIL 0
END
```

### AMOS Shim vs Native Commands

Both styles work in uCode. The table below shows equivalent commands:

| AMOS Shim                | Native BBCSDL                        |
| ------------------------ | ------------------------------------ |
| `SPRITE n, x, y, img`    | `FN_load_sprite + PROC_sprite_place` |
| `BOB n, x, y, "file"`    | `FN_load_gif + PROC_bob_create`      |
| `MOVE n, x, y, steps`    | Manual loop with position updates    |
| `COLL(a, b)`             | `FN_sprite_bob_collide`              |
| `SOUND ch, fq, dur, vol` | `SOUND` built-in                     |

Choose whichever style you find more natural. The AMOS shim is great for quick prototyping and for programmers coming from AMOS. The native BBCSDL commands give you finer control.

#### Exercise 8.1

Rewrite the guessing game from Section 4 using the AMOS shim, adding a sprite that bounces around the screen while you play.

---

## 9. Working with Assets

### The Asset Pipeline

Assets — sprites, BOBs, sounds, maps — live in your Vault:

```bash
~/Vault/assets/
├── sprites/
│   ├── player.chr
│   ├── enemy.chr
│   └── boss.chr
├── bobs/
│   ├── explosion.gif
│   ├── sparkle.gif
│   └── smoke.gif
├── sounds/
│   ├── coin.wav
│   ├── jump.wav
│   └── death.wav
└── maps/
    ├── level1.json
    └── level2.json
```

### Loading Assets in uCode Programs

BBCSDL can load assets from your Vault using the `@lib$` path prefix:

```basic
REM Load a sprite from the Vault
player% = FN_load_sprite("@vault$/assets/sprites/player.chr", 24, 24)

REM Load a BOB
explosion% = FN_load_gif("@vault$/assets/bobs/explosion.gif")

REM Load a sound
coin_sound% = FN_load_sound("@vault$/assets/sounds/coin.wav", 1)
```

The `@vault$` prefix points to your `~/Vault` directory. You can also use direct file paths.

### Sound

BBCSDL handles sound through the `audiolib` library:

```basic
INSTALL @lib$ + "audiolib"

REM Load a sound
coin% = FN_load_sound("coin.wav", 1)

REM Play it
PROC_play_sound(coin%)

REM Play with pan and volume
PROC_play_sound_ex(coin%, 0.5, 1.0)   REM Centre, full volume
```

### Map Files

JSON maps can describe tile layouts for your games:

```json
{
  "width": 40,
  "height": 25,
  "tiles": [
    "#####################",
    "#                   #",
    "#    @     $        #",
    "#                   #",
    "#####################"
  ]
}
```

Load and parse a map in uCode:

```basic
REM BBCSDL includes JSON parsing
map$ = FN_read_file("~/Vault/assets/maps/level1.json")
data$ = FN_json_parse(map$)
width% = FN_json_get_int(data$, "width")
height% = FN_json_get_int(data$, "height")
```

### Organising Your Assets

A well-organised Vault makes game development much easier:

1. **Use consistent naming** — `player_idle.chr`, `player_walk1.chr`, `player_walk2.chr`
2. **Keep sprite sheets small** — 24x24 pixels per frame is a good starting size
3. **Prefer WAV for sounds** — it is lossless and guaranteed to work
4. **Version your maps** — `level1_v2.json` lets you iterate without losing the original

#### Exercise 9.1

Organise your Vault with the directory structure shown above. Create a simple program that loads a sprite, a BOB, and plays a sound when they collide.

---

## 10. LENS & SKIN

### What are LENS and SKIN?

**LENS** captures the current state of your uCode program — what is on screen, where sprites are positioned, what sounds are playing. Think of it as taking a photograph of your running game.

**SKIN** applies a visual theme to your captured LENS data. You can change colours, swap character sets, or apply completely different visual styles without modifying your program.

### Using LENS

```bash
# Capture the current state of a running program
ucode lens capture my-game --output state.json
```

The state file contains all the information needed to recreate the current view:

```json
{
  "mode": 7,
  "cursor": { "x": 10, "y": 5 },
  "sprites": [{ "id": 1, "x": 100, "y": 200, "frame": 3 }],
  "bobs": [{ "id": 1, "x": 300, "y": 250, "frame": 12 }],
  "cells": [
    { "row": 0, "col": 0, "char": "H", "fg": 2, "bg": 0 },
    { "row": 0, "col": 1, "char": "e", "fg": 2, "bg": 0 }
  ]
}
```

### Using SKIN

SKIN themes transform how your program looks without changing how it works:

```bash
# List available themes
ucode skin list

# Apply a theme to a capture
ucode skin apply state.json teletext --output themed.json

# Apply a theme to a running program
ucode skin apply my-game.snack dark_mode
```

### Built-in SKIN Themes

| Theme      | Description                            |
| ---------- | -------------------------------------- |
| `bbc`      | Classic BBC Micro 8-colour palette     |
| `teletext` | 16-colour teletext-compatible display  |
| `inverse`  | All-black monochrome for accessibility |

The LENS/SKIN system is still being developed. Future uCode releases will add more themes and the ability to create custom themes.

### Custom Themes

In a future uCode release, you will be able to define custom themes:

```yaml
# custom-theme.yaml (future format)
name: "pastel"
palette:
  0: "#FFE0E0"
  1: "#E0FFE0"
  2: "#E0E0FF"
```

#### Exercise 10.1

Run a teletext program, capture its state with LENS, and apply the `inverse` SKIN theme. Observe how the colours change without modifying your program.

---

## 11. Snacks

### What is a Snack?

A **Snack** is a self-contained, portable program that bundles everything it needs into one directory. You can share snacks with friends, publish them online, or keep them as complete snapshots of your work.

### Snack Structure

```
my-game.snack/
├── main.ucode            # Entry point (required)
├── manifest.yaml         # Metadata (required)
├── sprites/              # Sprite files
│   ├── player.chr
│   └── enemy.chr
├── bobs/                 # Animated GIFs
│   └── explosion.gif
├── sounds/               # Audio files
│   └── coin.wav
└── maps/                 # Level data
    └── level1.json
```

### manifest.yaml

```yaml
name: "My Awesome Game"
author: "your-username"
version: "1.0.0"
description: "A platform game about collecting coins."
engine: "bbcsdl-1.36a"
entry: "main.ucode"
type: "game"
```

### Creating a Snack

```bash
ucode snack create my-game --template game
```

This creates the directory structure and a template `main.ucode` file. Edit the files, then build:

```bash
ucode snack build my-game
```

### Publishing a Snack

```bash
ucode snack publish my-game.snack
```

This creates a compressed `.snack` file that you can share. Other uCode users can install it with:

```bash
ucode snack install my-game.snack
```

### Running a Snack

```bash
ucode snack run my-game
```

The runtime loads `main.ucode` from the snack directory, makes all assets available, and runs the program.

### Snack Templates

| Template   | Description                                         |
| ---------- | --------------------------------------------------- |
| `game`     | Sprite-based game with keyboard input and collision |
| `teletext` | MODE 7 text-based program (quiz, menu, adventure)   |
| `empty`    | Minimal starter — just a main.ucode file            |

#### Exercise 11.1

Create a snack using the `teletext` template. Make it a simple quiz game with three questions. Build it, run it, and verify it works before sharing.

---

## 12. Advanced Features

### Physics with Box2D

BBCSDL includes the Box2D physics library for realistic movement, gravity, and collisions:

```basic
INSTALL @lib$ + "box2dlib"

REM Create a physics world with gravity
world% = FN_b2_create_world(0, -9.8)

REM Create a dynamic body (affected by gravity)
body% = FN_b2_create_body(world%, 100, 200, "dynamic")

REM Create a static ground
ground% = FN_b2_create_body(world%, 320, 450, "static")

REPEAT
  PROC_b2_step(world%)
  x% = FN_b2_get_x(body%)
  y% = FN_b2_get_y(body%)
  PROC_sprite_place(player%, x%, y%)
  WAIT 2
UNTIL INKEY(-1)
```

### Networking

BBCSDL can open network connections for multiplayer games:

```basic
INSTALL @lib$ + "socklib"

REM Connect to a server
socket% = FN_sock_connect("localhost", 9000)

REM Send data
PROC_sock_send(socket%, "Hello from uCode!")

REM Receive data
message$ = FN_sock_receive(socket%)

PROC_sock_close(socket%)
```

### 3D Graphics (WebGL)

For advanced 3D projects, BBCSDL can use WebGL:

```basic
INSTALL @lib$ + "ogllib"
INSTALL @lib$ + "webgllib"

PROC_gl_init(800, 600)
PROC_gl_clear(0.1, 0.2, 0.3, 1.0)

REM Draw a triangle
PROC_gl_begin("triangles")
PROC_gl_vertex(-0.5, -0.5, 0.0)
PROC_gl_vertex(0.5, -0.5, 0.0)
PROC_gl_vertex(0.0, 0.5, 0.0)
PROC_gl_end()
```

### LENS State Variables

The Variable Manager (Section 10) lets you capture and restore program state:

```basic
INSTALL @lib$ + "listlib"

REM Register variables
PROC_var_register("score", 0, "integer")
PROC_var_register("player_name", "Alice", "string")

REM Save state
PROC_var_snapshot("savegame.json")

REM Load state
PROC_var_restore("savegame.json")
score% = FN_var_get("score")
```

---

## 13. Command Reference

### BBC BASIC Core Commands

| Command                    | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `PRINT`                    | Output text to screen                          |
| `INPUT`                    | Read user input                                |
| `REM`                      | Comment (ignored by interpreter)               |
| `MODE 7`                   | Enter teletext mode (40x25)                    |
| `COLOUR n`                 | Set text colour (0-7, or 128+n for background) |
| `COLOUR n, r, g, b`        | Set palette colour n to RGB values             |
| `CLS`                      | Clear screen                                   |
| `TAB(x,y)`                 | Move cursor to column x, row y                 |
| `END`                      | Stop program execution                         |
| `WAIT n`                   | Wait n/100ths of a second                      |
| `SOUND ch, fq, dur, vol`   | Play a sound                                   |
| `RND(n)`                   | Random integer from 1 to n                     |
| `DIM array%(n)`            | Declare an array                               |
| `IF...THEN...ELSE...ENDIF` | Conditional execution                          |
| `FOR...NEXT`               | Counted loop                                   |
| `REPEAT...UNTIL`           | Conditional loop                               |
| `WHILE...ENDWHILE`         | Conditional loop                               |
| `DEF PROC_...ENDPROC`      | Define a procedure                             |
| `DEF FN_...= value`        | Define a function                              |
| `INKEY(n)`                 | Check keyboard key                             |
| `STR$()`                   | Convert number to string                       |
| `VAL()`                    | Convert string to number                       |
| `LEN()`                    | Length of string                               |
| `MID$()`                   | Substring                                      |
| `ASC()`                    | ASCII code of character                        |
| `CHR$()`                   | Character from ASCII code                      |

### Sprite Commands (gfxlib)

| Command                          | Description                         |
| -------------------------------- | ----------------------------------- |
| `PROC_gfx_init(w, h, depth)`     | Initialise graphics                 |
| `FN_load_sprite(file$, w, h)`    | Load a sprite                       |
| `PROC_sprite_place(id, x, y)`    | Place a sprite                      |
| `PROC_sprite_animate(id, frame)` | Set sprite animation frame          |
| `PROC_sprite_remove(id)`         | Remove a sprite                     |
| `FN_sprite_bob_collide(a, b)`    | Check collision between two objects |

### BOB Commands (imglib)

| Command                            | Description          |
| ---------------------------------- | -------------------- |
| `FN_load_gif(file$)`               | Load an animated GIF |
| `PROC_bob_create(id, x, y)`        | Place a BOB          |
| `PROC_bob_animate(id, start, end)` | Animate a BOB        |
| `PROC_bob_remove(id)`              | Remove a BOB         |

### AMOS Shim Commands

| Command               | Description             |
| --------------------- | ----------------------- |
| `SPRITE n, x, y, img` | Place a sprite          |
| `BOB n, x, y, file$`  | Place a BOB             |
| `MOVE n, x, y, steps` | Smooth movement         |
| `COLL(a, b)`          | Collision check         |
| `WAIT VBL`            | Wait for vertical blank |

### CLI Commands

| Command                                       | Description           |
| --------------------------------------------- | --------------------- |
| `ucode run file.ucode`                        | Run a program         |
| `ucode`                                       | Start the REPL        |
| `ucode lens capture prog --output state.json` | Capture LENS state    |
| `ucode skin apply state.json theme`           | Apply SKIN theme      |
| `ucode skin list`                             | List available themes |
| `ucode snack create name --template t`        | Create a new snack    |
| `ucode snack build name`                      | Build a snack         |
| `ucode snack publish name.snack`              | Publish a snack       |
| `ucode vault list programs`                   | List programs         |
| `ucode vault snapshot save name`              | Save game state       |

### Keyboard Scan Codes

| Key         | INKEY Code         |
| ----------- | ------------------ |
| ESC         | -1                 |
| Space       | -99                |
| Up arrow    | -58                |
| Down arrow  | -42                |
| Left arrow  | -26                |
| Right arrow | -122               |
| Return      | -74                |
| A-Z         | ASC(code) negative |

### Library Registry

| Library         | File                      | Purpose            |
| --------------- | ------------------------- | ------------------ |
| `gfxlib`        | `@lib$ + "gfxlib"`        | Sprite graphics    |
| `imglib`        | `@lib$ + "imglib"`        | GIF/BOB animation  |
| `audiolib`      | `@lib$ + "audiolib"`      | Sound playback     |
| `mode7lib`      | `@lib$ + "mode7lib"`      | Enhanced MODE 7    |
| `stringlib`     | `@lib$ + "stringlib"`     | String utilities   |
| `listlib`       | `@lib$ + "listlib"`       | Linked lists       |
| `box2dlib`      | `@lib$ + "box2dlib"`      | 2D physics         |
| `socklib`       | `@lib$ + "socklib"`       | Network sockets    |
| `ogllib`        | `@lib$ + "ogllib"`        | OpenGL graphics    |
| `webgllib`      | `@lib$ + "webgllib"`      | WebGL rendering    |
| `amos_shim.bbc` | `INSTALL "amos_shim.bbc"` | AMOS compatibility |

---

## Appendix A: BBC BASIC vs AMOS Comparison

| Feature       | BBC BASIC (1981) | AMOS (1990)     | uCode (2026)          |
| ------------- | ---------------- | --------------- | --------------------- |
| Line numbers  | Required         | Optional        | Optional              |
| Graphics mode | MODE 0-7         | Hi-res planar   | MODE 7 + OpenGL       |
| Sprites       | None built-in    | SPRITE command  | Both styles           |
| BOBs          | None             | BOB command     | Animated GIFs         |
| Sound         | SOUND command    | SOUND command   | SOUND + WAV/OGG       |
| Collision     | Manual           | COLL() function | Both styles           |
| IDE           | Built-in ROM     | AMOS Editor     | Your editor + CLI     |
| File format   | .BBC tokens      | .AMOS           | .ucode plain text     |
| Physics       | No               | No              | Box2D library         |
| Networking    | No               | No              | socklib library       |
| 3D            | No               | No              | OpenGL/WebGL          |
| Portable      | No               | Amiga only      | Mac, Linux, Windows   |
| Assets        | Built-in         | IFF format      | Vault directories     |
| State save    | No               | No              | LENS/SKIN + variables |

---

## Appendix B: uCode Cheat Sheet

### Quick Start

```bash
curl .../install.sh | bash      # Install uCode
ucode run hello.ucode            # Run a program
ucode                            # Start REPL
```

### Program Skeleton

```basic
REM My Program
MODE 7
CLS
PRINT "Hello!"
END
```

### Graphics Skeleton

```basic
INSTALL @lib$ + "gfxlib"
PROC_gfx_init(640, 480, 32)
sprite% = FN_load_sprite("player.chr", 24, 24)
PROC_sprite_place(sprite%, 320, 240)
```

### Game Loop

```basic
REPEAT
  REM Read input
  REM Update positions
  REM Draw sprites
  REM Check collisions
  WAIT 2
UNTIL INKEY(-1)   REM ESC to quit
```

### File Paths

```
~/.ucode/                          # Runtime install
~/Vault/programs/                  # Your programs
~/Vault/assets/sprites/            # Sprite files
~/Vault/assets/bobs/               # BOB/GIF files
~/Vault/assets/sounds/             # Sound files
~/Vault/assets/maps/               # Level data
```

### Colour Reference

| 0     | 1   | 2     | 3      | 4    | 5       | 6    | 7     |
| ----- | --- | ----- | ------ | ---- | ------- | ---- | ----- |
| Black | Red | Green | Yellow | Blue | Magenta | Cyan | White |

### Common Patterns

```basic
REM Counted loop
FOR i% = 1 TO 10 : PRINT i% : NEXT i%

REM Conditional
IF score% > 100 THEN PRINT "Winner!"

REM Random number
dice% = RND(6)

REM String manipulation
name$ = "Alice"
greeting$ = "Hello, " + name$

REM Array
DIM enemies%(100)
enemies%(0) = 42
```

---

_"The best way to learn is to type in the examples, change them, break them, and fix them. That is how we all started."_

**uCode — BBC BASIC for SDL 2.0**

_Part of the uDos open-source ecosystem. No cloud. No payment. No tracking._
