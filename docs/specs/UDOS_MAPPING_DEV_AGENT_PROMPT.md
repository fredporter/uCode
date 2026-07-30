# Dev Agent Prompt - uDos Mapping System

Agent: Cline Dev Agent
Task: Implement uDos mapping system for uCode/GridCore first, with future 3D
      expansion compatibility.
Status: Active Prompt

## Context

Build a mapping system that:

1. Converts between WGS84 lat/lon and uCode coordinates.
2. Pulls geodata from free providers (OSM primary, GeoNames secondary).
3. Generates layered grid cells.
4. Renders in interactive and static modes from the same data source.
5. Supports self-hosted icon/font/emoji marker assets.

Current platform priority:

1. Works now with GridCore/uCode 2D runtime.
2. Future-compatible with virtual/3D worlds and advanced uCode2-profile
   render modes.

## Non-Negotiables

1. Core conversion engine first.
2. Mercator-based conversion consistency.
3. Stable coordinate format: `L{level}-{col}-{row}-{layer}`.
4. Six baseline layers: terrain/details/foreground/lighting/collision/entities.
5. Common normalized feature model before rendering.
6. Offline-friendly behavior after initial asset hydration.

## Delivery Phases

Phase 1 - Core Engine

1. Implement conversion and hierarchy math.
2. Add unit tests with known cities.
3. Add distance and neighbourhood utilities.

Phase 2 - Data Integration

1. Implement OSM provider.
2. Add GeoNames enrichment.
3. Normalize provider outputs.

Phase 3 - Asset System

1. Build Material Symbols repository.
2. Add marker generation for Leaflet and SVG.
3. Add emoji-to-icon mapping.

Phase 4 - Rendering

1. Build interactive Leaflet layer.
2. Build static SVG export path.
3. Keep output consistent between renderers.

Phase 5 - Hardening

1. End-to-end tests.
2. Benchmarks and perf checks.
3. Release docs and examples.

## Review Checkpoints

Checkpoint A - Core Math

1. Conversion functions complete.
2. Round-trip tolerance <= 0.0001 degrees.
3. 1000 conversions < 100ms target.

Checkpoint B - Provider Reliability

1. OSM fetch/normalize pass.
2. GeoNames enrichment pass.
3. Grid cells generated with all 6 layers.

Checkpoint C - Asset Pipeline

1. Icons load and resolve.
2. Marker generation works in both renderers.
3. Emoji resolver supports defaults + overrides.

Checkpoint D - Rendering

1. Leaflet grid render works.
2. SVG export valid.
3. Shared data source parity confirmed.

Checkpoint E - Final Integration

1. Unit/integration/perf test reports attached.
2. API docs and examples complete.
3. Offline readiness validated.

## File/Module Direction

Suggested top-level module layout:

1. core (engine/math/constants)
2. providers (OSM/GeoNames/optional fallback)
3. grid (cell generator/layer model)
4. assets (icons/fonts/emojis/markers)
5. renderers (Leaflet/SVG)
6. tests (unit/integration/performance)

## Constraints

1. Browser + Node compatibility where practical.
2. Avoid unnecessary heavy dependencies in core math.
3. Keep security posture CSP-friendly and self-host-capable.
4. Preserve clean package boundaries with uCode repo ownership.

## Output Requirement

Provide:

1. Working implementation.
2. Passing tests and benchmark outputs.
3. Documentation suitable for onboarding future dev rounds.
