---
title: "Part 7: Physical Computing & Recycled Robotics"
level: "intermediate"
relevance: 85
category: "uCode Manual"
description: "Controlling motors, sensors, and recycled robotics using BBC BASIC verbs and uCore-Networking."
---

# Part 7: Physical Computing & Recycled Robotics

Computing is most exciting when code steps out of the screen and interacts with the physical world. 

In this chapter, you will learn how to use **uCode and BBC BASIC** to control recycled hardware—stepper motors, LEDs, sensor arrays, and robotic arms—without needing to install raw Python packages or deal with complex Linux driver compilation.

## The Sovereign Physical Stack

1. **Hardware Detection (Sonic Screwdriver)**: Discovers serial ports (`/dev/ttyUSB0`, `/dev/tty.usbserial`) and Bluetooth serial devices.
2. **Transport Link (uCore-Networking)**: Pairs wireless sensors or serial controllers over local mDNS without manual IP configuration.
3. **Control Language (uCode BBC BASIC)**: Direct, readable procedural commands control hardware logic.

## Communicating with Serial Hardware

In BBC BASIC, hardware communication uses the classic stream verbs:

```basic
10 REM Robotic Arm Gripper Controller
20 REM Open serial communication channel at 9600 baud
30 GRIPPER% = OPENUP("SER:9600")
40 IF GRIPPER% = 0 THEN PRINT "Error: Gripper not detected": END
50 
60 PRINT "Calibrating Gripper Servo..."
70 BPUT#GRIPPER%, 180 : REM Send angle 180 degrees
80 WAIT 50
90 
100 REPEAT
110   PRINT "Enter Gripper Angle (0=Closed, 180=Open, -1=Exit): ";
120   INPUT ANGLE%
130   IF ANGLE% >= 0 AND ANGLE% <= 180 THEN
140     BPUT#GRIPPER%, ANGLE%
150     PRINT "Command sent: "; ANGLE%
160   ENDIF
170 UNTIL ANGLE% < 0
180 
190 CLOSE#GRIPPER%
200 PRINT "Gripper disconnected safely."
```

## Integrating GridCore Displays with Physical Sensors

You can mirror physical sensor readings (such as temperature, distance, or light levels) directly onto a Mode 7 Teletext screen or GridCore 2D map:

```basic
10 MODE 7
20 CLS
30 SENSOR% = OPENIN("SER:9600")
40 PRINT TAB(2,1); CHR$(131); "ROBOTIC SENSOR TELEMETRY"
50 
60 REPEAT
70   TEMP% = BGET#SENSOR%
80   DIST% = BGET#SENSOR%
90   PRINT TAB(2,5); CHR$(129); "Distance: "; DIST%; " cm   "
100  PRINT TAB(2,7); CHR$(130); "Temp:     "; TEMP%; " C    "
110  WAIT 20
120 UNTIL FALSE
```

This completes the loop from physical sensors to sovereign visual displays—all running locally the uDos way.
