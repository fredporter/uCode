# Grid and World Stack Contract

**Status:** Active clarification  
**Date:** 2026-08-28

This contract resolves older documents that used “layer” for a render channel,
depth plane, geographic zoom, and whole local map.

## Grid

A Grid is one flat, fixed-size collection of Cells. The uCode 1 world format
uses a maximum and default map size of **40×25 Cells**. Grid editing changes
only this buffer; it does not silently create terrain/entity/render layers.

## World stack

The Layer surface is a world-stack editor. It orders and groups fixed-size Grid
documents at discrete scale levels. A stack entry is identified by a native
address such as `L200-AA33`:

- `L200` is the discrete scale level;
- `AA` is the base-36 Grid column;
- `33` is the base-36 Grid row.

Levels advance in fixed 100-unit steps. Each parent Grid divides into exactly
four children (2×2) at the next level. This integer relationship is the
fractal/zoom contract; arbitrary continuous zoom is presentation only and does
not change stored coordinates.

The native editor and persisted format contain no latitude/longitude. External
geographic sources may be imported through an adapter which resolves them to a
world address, but geographic projection is not GridCore's source of truth.

## Vocabulary

- **Lattice:** atomic spatial unit.
- **Cell:** square or reading-register projection over lattice units.
- **Grid:** one fixed flat Cell buffer.
- **World stack:** ordered/grouped collection of addressed Grids.
- **Channel:** optional terrain, detail, foreground, lighting, collision or
  entity data inside a Grid document. A channel is not a zoom level.
- **Presentation zoom:** viewport magnification with no coordinate effect.

## Compatibility

Older strings such as `L100-AA10-0317-2` and WGS84 conversion APIs are legacy
or import-adapter formats. They must not dictate the Layer editor UI or the
native `ucode-world-stack-v1` document.

