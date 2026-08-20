---
title: "Grid Algebra & Viewport Architecture — The Unified Rendering Pipeline"
status: draft
last_updated: 2026-06-16
category: specification
tags: [devstudio, architecture, grid-algebra, teletext, terminal, viewport, ucode1, userver]
description: "**Document ID:** UDN-GRID-ARCH-001 — The definitive reference for how Terminal, Teletext, uServer Feed Surface, and proseui/uCode2 all share a single grid algebra data model."
---

# Grid Algebra & Viewport Architecture

**Document ID:** UDN-GRID-ARCH-001  
**Status:** Living Specification  
**Version:** 1.0.0  
**Date:** 2026-06-16  
**Principle:** *The grid is the truth. Views are just lenses.*

---

## Executive Summary

To understand the Dev Agent's architecture, stop thinking of "Terminal" and "Teletext" as separate applications. Instead, they are **rendering engines** — two different `Viewport` classes — that parse the exact same underlying data structure: **uCode1's grid algebra**.

This document defines the complete pipeline:

1. **uCode1 Grid Algebra** — The spatial algebra that defines cells on a Cartesian grid
2. **Terminal Viewport** — Linear, sequential, scroll-based rendering (the CLI)
3. **Teletext Viewport** — Page-based, indexed, non-scrolling rendering (the Information Radiator)
4. **uServer Feed Surface** — The traffic cop that multiplexes data sources into grid coordinates
5. **Doc-Sites / Publishing Pipeline** — How Vault docs and device libraries become Teletext pages
6. **proseui/uCode2 Bridge** — How Dashboard widgets consume the same grid algebra as data

---

## 1. The Common Core: uCode1 & Grid Algebra

### 1.1 What Grid Algebra Is

**uCode1** is not a markup language; it is a **spatial algebra** for defining cells on a Cartesian grid (X, Y, depth, and attribute flags). Every piece of data entering the system — whether a log line, a workflow status, or a Vault document — is reduced to a set of **grid primitives** (tokens, color attributes, blink/reverse flags, and cell coordinates).

### 1.2 The GridCell Primitive

Both the Python (`uCode1/ucode1/grid_algebra/`) and TypeScript (`uConnect/ui/src/surfaces/gridui/grid-algebra/`) implementations define the same core cell type:

```python
# Python (uCode1/ucode1/grid_algebra/grid_cell.py)
@dataclass
class GridCell:
    x: int = 0          # Column position
    y: int = 0          # Row position
    z: int = 0          # Depth/layer
    char: str = ' '     # Single character glyph
    fg: int = 7         # Foreground colour index (0-15)
    bg: int = 0         # Background colour index (0-15)
    bold: bool = False
    italic: bool = False
    underline: bool = False
    blink: bool = False
    reverse: bool = False
    meta: dict = {}     # Arbitrary metadata
```

```typescript
// TypeScript (uConnect/ui/src/surfaces/gridui/grid-algebra/GridCell.ts)
interface GridCell {
  char: string           // Single glyph
  fg: number             // Foreground colour index (0-7 teletext, 0-15 ANSI)
  bg: number             // Background colour index
  bold: boolean
  flash: boolean         // Teletext flash/blink
  doubleHeight: boolean  // Teletext double-height row
  doubleWidth: boolean   // Teletext double-width char
}
```

### 1.3 The GridBuffer

A `GridBuffer` is a 2D array of `GridCell`s — rows × cols (y × x). Neither view stores data; they only store *projections*. The Terminal and Teletext views are passed the same `GridBuffer` object; they just iterate over it differently.

```typescript
type GridBuffer = GridCell[][]  // rows × cols (y × x)
```

### 1.4 Key Design Principle

> **Neither view stores data. They only store projections.**

The Terminal and Teletext views are passed the same `GridBuffer` object; they just iterate over it differently. This means a single data source can be viewed simultaneously as:
- A scrolling terminal line (Terminal mode)
- A static Teletext sub-page (Teletext mode)
- A real-time graph in a Dashboard (proseui mode)

...all without rewriting the data ingestion pipeline.

### 1.5 Grid Transform Operations

The `GridTransform` module provides pure functions for manipulating GridBuffers:

| Operation | Description | File |
|-----------|-------------|------|
| `resize()` | Change grid dimensions | `GridTransform.ts` |
| `overlay()` | Merge one buffer onto another | `GridTransform.ts` |
| `scroll()` | Scroll buffer contents | `GridTransform.ts` |
| `crop()` | Extract a sub-region | `GridTransform.ts` |
| `merge()` | Combine two buffers with conflict resolution | `operations.py` |
| `rotate_90/180()` | Rotate grid contents | `operations.py` |
| `flip_horizontal/vertical()` | Mirror grid | `operations.py` |
| `transpose()` | Swap X and Y axes | `operations.py` |
| `map_cells()` | Apply a function to every cell | `operations.py` |
| `filter_cells()` | Keep only matching cells | `operations.py` |

---

## 2. Terminal Mode (The Retro Computer Terminal)

### 2.1 Rendering Philosophy

**Linear, sequential, scroll-based.** Terminal treats the grid as a **TTY stream**. Incoming data is appended to the bottom of the grid; older data scrolls up and out of the viewport.

### 2.2 Specification

| Property | Value |
|----------|-------|
| **Type** | Grid Viewport |
| **Inspiration** | C64 / PET |
| **Font Pack** | PETME (petme64, petme128) |
| **Renderer** | DOM-based grid (1,920 CELL nodes) |
| **Grid Size** | 80×24 characters (fixed) |
| **Cell Size** | 24×24 pixels (1 CELL) |
| **Total Pixels** | 1,920×576 |
| **Character Sets** | PETSCII, ASCII, Box-drawing |
| **Use Case** | Interactive CLI, coding, retro terminal |

### 2.3 Behavior

- **Input:** Accepts keyboard input and ANSI escape sequences
- **Output:** Appends data to bottom of grid; older data scrolls up
- **Collision:** Last write wins (no overlapping elements)
- **Resolution:** Strictly emulates fixed character-cell resolution (80×24)
- **Use Cases:** Running REPLs, executing uCode2 scripts, tailing logs

### 2.4 Implementation

**File:** `uConnect/ui/src/surfaces/gridui/panels/TerminalPanel.tsx`

The TerminalPanel is a C64 BASIC terminal emulator that uses `grid-algebra` internally. All display operations go through `GridBuffer` and `GridTransform`. It renders via the shared `GridBufferRenderer` component.

**Supported Commands:** `HELP`, `CLS`, `LIST`, `PRINT`, `TIME`, `DATE`, `WHOAMI`, `NEW`, `RUN`, `LOAD`, `SAVE`, `POKE`, `PEEK`, `SYS`, `EXIT`

---

## 3. Teletext Mode (The Ceefax Reader)

### 3.1 Rendering Philosophy

**Page-based, indexed, non-scrolling.** Teletext treats the grid as a **frame buffer** for specific "Pages" (e.g., Page 100, Page 2A). Instead of scrolling, it flips instantly between pre-rendered grid states.

### 3.2 Specification

| Property | Value |
|----------|-------|
| **Type** | Canvas Viewport |
| **Inspiration** | Ceefax / Teletext |
| **Font Pack** | Teletext50 |
| **Renderer** | Canvas 2D (single draw call) |
| **Grid Size** | 80×24 characters (logical) |
| **Cell Size** | 24×24 pixels (scalable) |
| **Total Pixels** | Variable (scaled to container) |
| **Character Sets** | G0-G3 (alphanumeric, mosaic, supplementary, special) |
| **Use Case** | Broadcast, page-based information, mosaic graphics |

### 3.3 Behavior

- **Input:** Accepts numeric keypad inputs (e.g., "100" + "Reveal")
- **Output:** Flips instantly between pre-rendered grid states
- **Refresh:** Entire page refreshes on timed interval (e.g., every 30 seconds)
- **Overlay Advantage:** Supports "sub-pages" and hidden metadata (the "Reveal" button)
- **Multi-source:** Can hold multiple data streams simultaneously on the same page without scrolling — e.g., top-left quadrant shows system logs, bottom-right shows a workflow DAG

### 3.4 Broadcast Features

| Feature | Description |
|---------|-------------|
| **Page Navigation** | 3-digit page numbers (100-899) |
| **Sub-pages** | 0-9 per page |
| **Fasttext** | Coloured shortcut buttons (red, green, yellow, cyan) |
| **Magazine** | Numbering derived from first digit (1-8) |
| **Reveal** | Concealed text (e.g., quiz answers) |
| **Size** | Toggle double-height mode |
| **Flash** | 500ms animation interval |
| **CRT Effects** | Scanlines, glow, vignette |
| **PNG Export** | `toDataURL()` / `toBlob()` |

### 3.5 Teletext Control Codes

| Code | Description |
|------|-------------|
| `ALPHA` | Switch to alphanumeric (G0) |
| `MOSAIC` | Switch to mosaic (G1) |
| `SEPARATED` | S1 — separated mosaic (1px gap) |
| `CONTIGUOUS` | S2 — contiguous mosaic (no gap) |
| `SMOOTH` | S3 — smooth mosaic (anti-aliased) |
| `FLASH` | Start flashing (500ms on/off) |
| `STEADY` | Stop flashing |
| `CONCEAL` | Hide text (reveal via REVEAL) |
| `REVEAL` | Show concealed text |
| `SIZE` | Set size (normal, double-height, double-width, double) |
| `COLOUR` | Set foreground colour (USX 0-31) |
| `BGCOLOUR` | Set background colour (USX 0-31) |
| `HOLD` | Hold page (don't update until released) |
| `UPDATE` | Release hold and update |

### 3.6 Implementation

**File:** `uConnect/ui/src/surfaces/gridui/panels/TeletextPanel.tsx`

The TeletextPanel is a Ceefax-style page viewer using `grid-algebra`. Pages are 40×25 `GridBuffer`s stored in `TeletextPageStore`. It renders via the shared `GridBufferRenderer` component.

**Built-in Pages:** Welcome (100), System Status (101), News (200), Colour Test Card (888)

### 3.7 Teletext Page Server

**File:** `uConnect/teletext/server.ts` (port 5199)

A standalone HTTP server that serves static teletext pages (P100–P999) and proxies surface URLs with fallback to error pages.

**Page Registry:**
| Page | Name | Description |
|------|------|-------------|
| P100 | User Setup | Profile, preferences, workspace config |
| P200 | API Connections | Secrets and API configuration |
| P800 | Service Unavailable | Primary service not responding |
| P801 | Server Not Running | Backend API unreachable |
| P802 | Maintenance Mode | System under maintenance |
| P804 | Service Stopped | Service intentionally stopped |
| P805 | Service Starting | Service in startup sequence |
| P810 | 404 Not Found | Requested page doesn't exist |
| P820 | Network Disconnected | No network connectivity |
| P822 | Connection Refused | Target server refused connection |
| P830 | Database Error | Cannot connect to database |
| P890 | Generic Error | Unclassified error |
| P900 | System Status | Overall health dashboard |
| P904 | Port Usage | Listening ports |
| P910 | Log Viewer | System logs |
| P950 | Teletext Navigator | Page index + quick jump |
| P999 | About | Version, license, credits |

---

## 4. Dual Viewport Comparison

| Feature | Terminal (C64) | Teletext (Ceefax) |
|---------|----------------|-------------------|
| **Renderer** | DOM grid (1,920 nodes) | Canvas (single draw call) |
| **Font** | PETME64/128 | Teletext50 |
| **Character Sets** | PETSCII, ASCII | G0-G3 (alphanumeric, mosaic) |
| **Interaction** | Direct, cursor, input | Page-based, broadcast |
| **Animation** | Sprites/BOBs (20fps) | Flash (2fps), page updates |
| **Collision** | Yes (cell/pixel) | No (canvas only) |
| **CRT Effects** | Optional | Yes (scanlines, glow, vignette) |
| **Export** | DOM screenshot | PNG (toDataURL/toBlob) |
| **Use Case** | Interactive, CLI, coding | Broadcast, information, retro |
| **Data Flow** | Streamed live | Pre-rendered page packs |
| **Refresh** | Continuous scroll | Timed interval (30s) |

### Shared Grid Rules

Both viewports follow the same underlying grid rules:

```yaml
SHARED_RULES:
  grid_size: "80×24 CELLS"
  cell_size: "24×24px base"
  flexible_sizing: "Characters can be 1px-48px"
  color_palette: "USX 32-color"
  block_graphics: "2:3 teletext blocks (2×3 CELLS = 48×72px)"
  sprites: "8×8 to 48×48px, animated"
  bobs: "49×49 to 192×192px, glitter objects"
  coordinates: "uCode L{level}-{gridXY}-{cellXY}-{layer}"
```

---

## 5. uServer: The Traffic Cop & Feed Surface

### 5.1 Architecture

The **uServer** does not push data directly to the views. Instead, it manages a **Feed Surface** — a routing table that maps incoming data streams to grid coordinates.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Data Sources │     │  uServer         │     │  Viewports       │
│              │     │  Feed Surface    │     │                  │
│ WebSocket    │────▶│                  │────▶│ Terminal (CLI)   │
│ File Tailers │     │  Source A →      │     │ Teletext (Pages) │
│ MQTT         │     │    Grid 10-20    │     │ proseui (Widgets)│
│ DB Polls     │     │  Source B →      │     │                  │
│              │     │    Grid 1-5      │     │                  │
└──────────────┘     └──────────────────┘     └──────────────────┘
```

### 5.2 The Feed Surface Configuration

This is a YAML/JSON mapping that defines how incoming data maps to grid coordinates:

```yaml
feed_surface:
  sources:
    - id: "system-logs"
      type: "stream"
      grid_mapping:
        rows: [10, 20]    # Grid Rows 10-20
        cols: [0, 79]     # Columns 0-79
      spool: "clean"
      keep_last: 500

    - id: "workflow-status"
      type: "poll"
      grid_mapping:
        rows: [1, 5]      # Grid Rows 1-5
        cols: [40, 79]    # Columns 40-79
      spool: "archive"
      poll_interval: 30
```

### 5.3 uServer's Job

uServer multiplexes disparate sources into a single unified `GridBuffer` using atomic grid algebra operations (`set cell X,Y to value Z with attribute W`).

### 5.4 The Feed System (uServer/feed/)

**File:** `uServer/feed/core.py`

The feed system provides a universal JSON feed transport. Every event, email, task, and notification becomes a queryable JSON feed entry:

```json
{
  "version": "1.0",
  "type": "feed",
  "source": "system.events",
  "items": [
    {
      "id": "evt-001",
      "timestamp": "2026-04-21T08:00:00Z",
      "type": "event.start",
      "summary": "System booted",
      "payload": { "uptime": "0:00:00", "kernel": "6.8.0" }
    }
  ]
}
```

**Feed Directory Structure:**
```
~/.local/share/udos/feeds/
├── system/     (events, hardware, security)
├── user/       (notify, sessions, preferences)
├── control/    (runtime commands and responses)
├── network/    (family, nas, sync)
└── spool/      (compress, archive, vector)
```

### 5.5 Source Type Split

| Source Type | Terminal Mode | Teletext Mode |
| :--- | :--- | :--- |
| **Vault Docs/Libraries** | Not used (too dense) | **Preconfigured Pages:** Published Vault docs chunked into Teletext pages (e.g., Page 300 = API reference) |
| **System Logs** | Streamed live into main scrollback buffer | Mapped to static sub-page that updates every 10s (e.g., Page 001) |
| **Workflows/Notifications** | Appear as interruptive ANSI alerts | Rendered as persistent status matrix on Page 002 |
| **SonicScrewdriver DB** | Queried via CLI commands (`db.get(id)`) | Pre-published as browsable index (Page 500-599), each device has its own sub-page |

---

## 6. The Doc-Sites / Database Publishing Pipeline

### 6.1 Overview

The `doc-sites/` configuration directory defines **what gets published to Teletext**. When you mark a Vault library or the SonicScrewdriver device library as "published," the uServer converts those structured databases into **static Teletext page packs**.

### 6.2 Publishing Flow

```
Vault Docs (Markdown/XDC)
        │
        ▼
  vault-publish script
  (config/vault-publish)
        │
        ├── mdBook or pandoc → Static HTML
        │
        ▼
  Teletext Page Packs
  (pre-rendered GridBuffer snapshots)
        │
        ▼
  uServer Cache
        │
        ▼
  Teletext Viewport requests Page 504
        │
        ▼
  uServer serves pre-rendered grid algebra from cache
  (no live DB query — instant flipping)
```

### 6.3 The vault-publish Script

**File:** `config/vault-publish`

This script:
1. Reads from the XDC-compliant vault (3-level hierarchy: user / shared / public)
2. Only publishes the "public" level to the web server
3. Uses mdBook (preferred) or pandoc (fallback) for Markdown → HTML conversion
4. Rsyncs to the uServer Linux machine

### 6.4 Teletext Page Numbering

The full page numbering system (specified in `UDN-TELETEXT-001`):

| Range | Category | Example |
|-------|----------|---------|
| P100–P199 | HomeNest — Core & Media | P100 = HomeNest Launcher |
| P200–P299 | HomeNest — Automation & Integrations | P200 = HA Dashboard |
| P300–P399 | HomeNest — Settings & System | P300 = Main Settings |
| P400–P499 | uDOS — Core & Workflow | P400 = uDOS Workspace |
| P500–P599 | uDOS — Binders & Sync / **Device Libraries** | P500 = Binder List, P504 = Sonic Device |
| P600–P699 | uCode — Learning & Projects | P600 = uCode Dashboard |
| P700–P799 | uCode — Labs & Sandbox | P700 = Code Lab |
| P800–P899 | Shared — Errors & Fallbacks | P800 = Service Unavailable |
| P900–P999 | Shared — System & Debug | P900 = System Status |

**Total specified:** 181 pages across all ranges.

---

## 7. The Bridge to proseui / uCode2 (Dashboards)

### 7.1 Architecture

**uCode2** (the proseui layout engine) consumes the **same grid algebra** but uses it as a **data source for widgets**, not as a display itself.

```
GridBuffer (from uServer Feed Surface)
        │
        ├── Terminal Viewport → Renders as scrolling text
        ├── Teletext Viewport → Renders as static page
        └── proseui/uCode2    → Parses grid algebra, strips cell styling,
                                renders underlying data as:
                                ├── Bar charts
                                ├── KPI cards
                                └── Real-time graphs
```

### 7.2 Dashboard Integration

A Dashboard layout can import a Teletext page as a **Panel Item**:

- Teletext Page 002 (Workflow Status) can be dragged into a proseui Dashboard
- It ceases to look like Teletext; the proseui renderer parses the grid algebra, strips the character-cell styling, and renders the underlying numbers as a bar chart or a KPI card

### 7.3 Bidirectional Data Flow

Data can flow **back** to the grid from a Dashboard widget:

```
Dashboard Widget → writes data → GridBuffer → uServer broadcasts → Terminal/Teletext views
```

### 7.4 The GridWidget Component

**File:** `uConnect/ui/src/surfaces/gridui/panels/GridWidget.tsx`

A lightweight React component that renders a `GridBuffer` at any size. Can be embedded in ProseUI, Dashboard, or any other surface:

```typescript
<GridWidget
  buffer={myGridBuffer}
  paletteId="modern"
  width={400}
  height={300}
/>
```

---

## 8. Colour System

### 8.1 Standard 16-Colour Teletext Palette

| Index | Name | Hex | ANSI |
|-------|------|-----|------|
| 0 | Black | `#000000` | 30 |
| 1 | Red | `#FF0000` | 31 |
| 2 | Green | `#00FF00` | 32 |
| 3 | Yellow | `#FFFF00` | 33 |
| 4 | Blue | `#0000FF` | 34 |
| 5 | Magenta | `#FF00FF` | 35 |
| 6 | Cyan | `#00FFFF` | 36 |
| 7 | White | `#FFFFFF` | 37 |
| 8 | Bright Black | `#555555` | 90 |
| 9 | Bright Red | `#FF5555` | 91 |
| 10 | Bright Green | `#55FF55` | 92 |
| 11 | Bright Yellow | `#FFFF55` | 93 |
| 12 | Bright Blue | `#5555FF` | 94 |
| 13 | Bright Magenta | `#FF55FF` | 95 |
| 14 | Bright Cyan | `#55FFFF` | 96 |
| 15 | Bright White | `#FFFFFF` | 97 |

### 8.2 Palette Presets (GridUI)

| Palette | Description |
|---------|-------------|
| `modern` | GitHub Dark-inspired (default) |
| `c64` | Commodore 64 blue theme |
| `teletext` | Classic green-on-black |
| `nes` | NES Classic warm tones |

---

## 9. Implementation Map

### 9.1 Python (uCode1 Core)

| File | Purpose |
|------|---------|
| `ucode1/grid_algebra/grid_cell.py` | GridCell dataclass |
| `ucode1/grid_algebra/grid_transform.py` | Coordinate transformations |
| `ucode1/grid_algebra/colour_palette.py` | 16-colour palette management |
| `ucode1/grid_algebra/spatial_codec.py` | Serialization/deserialization |
| `core_py/grid/models.py` | Grid, GridCell, GridRegion, Coordinate |
| `core_py/grid/operations.py` | Slice, rotate, flip, merge, resize, crop |

### 9.2 TypeScript (uConnect UI)

| File | Purpose |
|------|---------|
| `ui/src/surfaces/gridui/grid-algebra/GridCell.ts` | GridCell interface, GridBuffer type, factory |
| `ui/src/surfaces/gridui/grid-algebra/GridTransform.ts` | Resize, overlay, scroll, crop, merge |
| `ui/src/surfaces/gridui/grid-algebra/ColourPalette.ts` | Palette definitions |
| `ui/src/surfaces/gridui/grid-algebra/TeletextPage.ts` | Teletext page store + builder |
| `ui/src/surfaces/gridui/panels/TerminalPanel.tsx` | C64 BASIC terminal |
| `ui/src/surfaces/gridui/panels/TeletextPanel.tsx` | Ceefax page viewer |
| `ui/src/surfaces/gridui/panels/GridBufferRenderer.tsx` | Shared GridBuffer → DOM renderer |
| `ui/src/surfaces/gridui/panels/GridWidget.tsx` | Embeddable grid renderer |

### 9.3 uServer Feed System

| File | Purpose |
|------|---------|
| `feed/core.py` | Feed types, operations, spool engine |
| `feed/config.py` | Feed source configuration |
| `feed/cli.py` | CLI for feed management |

### 9.4 Teletext Server

| File | Purpose |
|------|---------|
| `uConnect/teletext/server.ts` | HTTP server (port 5199) |
| `uConnect/teletext/pages/` | Static HTML pages (P100–P999) |

---

## 10. Quick Reference

### For the Dev Agent

| Role | Component | What It Is |
|------|-----------|------------|
| **CLI / Debugging** | Terminal | Fast scrolling, immediate REPL feedback |
| **Information Radiator** | Teletext | Curated, glanceable status pages that don't move |
| **ORB (Object Request Broker)** | uServer + Feed Surface | Translates chaotic incoming data into disciplined grid coordinates |
| **BI Tool** | proseui/uCode2 | Visualizes grid coordinates as modern UI widgets |

### The Magic

> **A single grid algebra** allows a system log to be viewed as:
> 1. A scrolling terminal line (Terminal mode)
> 2. A static Teletext sub-page (Teletext mode)
> 3. A real-time graph in a Dashboard (proseui mode)
>
> ...all without rewriting the data ingestion pipeline. The view is just a lens; the grid is the truth.

---

## 11. Related Documents

| Document | Location |
|----------|----------|
| Terminal vs Teletext Viewport Spec | `docs/specs/terminal-vs-teletext-viewport.md` |
| GridUI Surface Spec | `docs/specs/GRIDUI_SPEC.md` |
| Teletext Error & Status Pages | `docs/specs/TELETEXT_PAGES.md` |
| uCode1 + CEETEX Integration | `docs/specs/UCODE1_CEETEX_INTEGRATION.md` |
| Spatial Algebra v1.2 (Locked) | `uConnect/docs/specs/UDOS_SPATIAL_ALGEBRA_LOCKED_v1.2.md` |
| Character Set Spec | `docs/specs/CHARACTER_SETS.md` |
| USX Grid Specification | `uCode1/docs/specs/usx/usx-grid.md` |
| uServer Feed System | `uServer/feed/README.md` |
| Architecture Overview | `ARCHITECTURE.md` |

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-16 | Initial comprehensive architecture document |
