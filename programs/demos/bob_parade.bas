10 REM ===================================================
20 REM uCode BBC BASIC Demonstration: BOB Parade
30 REM Standard: 4x4 Dot Lattice Invariant (1 dot = 4x4 px)
40 REM ===================================================
50 MODE 7
60 CLS
70 PRINT "=== uCode BOB Parade (4x4 Dot Lattice) ==="
80 PRINT "Display: 80x50 dots (320x200 device px)"
90 PRINT "BOB 1: Pulse Walker (4x4 dots)"
100 PRINT "BOB 2: Cosmic Orbiter (4x4 dots)"
110 PRINT "Lattice Invariant: 1 dot = 4x4 px"
120 PRINT
130 REM Initial placement of Blitter Objects
140 BOB 1, 10, 15, 0
150 BOB 2, 60, 30, 0
160 PRINT "BOB 1 placed at (10, 15) dots [40, 60 px]"
170 PRINT "BOB 2 placed at (60, 30) dots [240, 120 px]"
180 REM Motion animation steps on dot lattice
190 BOB 1, 14, 17, 1
200 BOB 2, 56, 27, 1
210 BOB 1, 18, 19, 2
220 BOB 2, 52, 24, 2
230 BOB 1, 22, 21, 3
240 BOB 2, 48, 21, 3
250 REM Boundary bounce verification (0..80 dots X, 0..50 dots Y)
260 BOB 1, 76, 46, 0
270 BOB 2, 2, 2, 0
280 PRINT "Boundary test: BOB 1 at edge (76, 46), BOB 2 at (2, 2)"
290 REM Hide BOBs
300 BOB OFF 1
310 BOB OFF 2
320 PRINT "BOB Parade animation completed."
330 END
