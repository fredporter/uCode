# uDos Mapping Specification

Status: Legacy geographic adapter; native editor model superseded by
`../GRID_WORLD_STACK_SPEC.md`
Version: 1.0
Date: 2026-07-31
Legacy alias: uPlace (historical name in older docs)

## 1. Purpose

Define an optional geographic import adapter that converts between WGS84
latitude/longitude and uCode grid coordinates, supports layered world cells,
and feeds both interactive and static renderers.

Primary near-term target:

1. Import into GridCore's native addressed World stack.

Future target:

1. Virtual/3D world mapping and advanced uCode2-profile rendering paths.

## 2. Architectural Position

Current boundary alignment:

1. uCode owns mapping math, grid conversion, layer model, render adapters, and
   packaging.
2. uCore consumes mapping capabilities through package and manifest contracts.
3. Mapping must remain usable offline after initial asset/data hydration.

## 3. Coordinate Model

Format:

`L{level}-{col}-{row}-{layer}`

Components:

1. `level`: Earth zoom hierarchy in L300-L399.
2. `col`: grid column index (hex/base-encoded display string is allowed).
3. `row`: grid row index (hex/base-encoded display string is allowed).
4. `layer`: logical layer index (0-5 baseline).

## 4. Earth Zoom Hierarchy

Baseline operational range:

1. L300-L399 for Earth mapping.
2. Default: L340 for city/metro operations.

Illustrative intent:

1. Lower levels: broader regions.
2. Higher levels: finer local/building precision.

Exact cell spans may vary by implementation calibration and projection tuning,
but level monotonicity is required (higher level -> smaller cell footprint).

## 5. Projection and Conversion

Projection basis:

1. WGS84 input/output.
2. Web Mercator variant for planar grid mapping.

Required conversions:

1. `latlonToUCode(lat, lon, level)`
2. `uCodeToLatLon(coord)`
3. `getCellCenter(coord)`
4. `getNeighbours(coord, radius)`
5. `getParent(coord)`
6. `getChildren(coord)`
7. `getDistance(coordA, coordB)`

Round-trip accuracy target:

1. Coordinate inversion error <= 0.0001 degrees in validation fixtures.

## 6. Layer Model

Grid cell layers (baseline 6):

1. terrain
2. details
3. foreground
4. lighting
5. collision
6. entities

Layer schema must be stable so both Leaflet and SVG pipelines consume identical
cell data contracts.

## 7. Data Providers

Provider priority:

1. Primary: OpenStreetMap/Overpass (no key required).
2. Secondary: GeoNames (POI augmentation).
3. Optional fallback: Google Maps APIs (keyed, optional).

Normalization rule:

1. All provider outputs must normalize to a common GeoJSON-like internal model
   before grid rasterization.

## 8. Rendering Modes

Required dual modes:

1. Interactive renderer (Leaflet tile/grid integration).
2. Static renderer (SVG export, stylized/piri-capable output).

Both must share the same grid/layer data source to avoid visual drift.

## 9. Asset System

Required capabilities:

1. Material Symbols icon repository (self-hostable).
2. Marker generation for both interactive and static renderers.
3. Font system for labels/annotation.
4. Emoji-to-icon mapping with overridable custom mappings.

Offline rule:

1. Runtime works without external network after initial asset hydration.

## 10. API Baseline

Core API surface must support:

1. Coordinate conversion and hierarchy utilities.
2. Provider feature ingestion.
3. Grid cell generation (6 layers).
4. Interactive map rendering.
5. Static SVG rendering.
6. Marker/icon/emoji asset resolution.

## 11. Performance Baselines

Initial goals:

1. 1000 coordinate conversions under 100ms.
2. 100 marker renders under 500ms.
3. 10x10 grid generation under 5s (network/provider dependent).
4. Interactive first paint under 2s on warm cache target.

## 12. Test Baseline

Unit tests:

1. Known city conversion fixtures.
2. Round-trip conversion tolerance.
3. Neighbour/parent/child math.
4. Distance calculation sanity.
5. Emoji/icon mapping resolution.

Integration tests:

1. OSM provider fetch + normalization.
2. Grid generation with all layers present.
3. Leaflet renderer output validity.
4. SVG output validity.

## 13. Delivery Phases

Phase 1:

1. Core engine and tests.

Phase 2:

1. Data providers and normalization.

Phase 3:

1. Asset system and marker/font/emoji support.

Phase 4:

1. Dual rendering pipeline.

Phase 5:

1. Integration, benchmarks, release docs.

## 14. Future Expansion (Not in current implementation scope)

1. Virtual/3D world coordinate bindings.
2. uCode2-profile advanced visual overlays and scene integration.
3. Hybrid geospatial + simulation entities across layered runtime scenes.

These future tracks must preserve compatibility with the GridCore/uCode
foundation defined here.
