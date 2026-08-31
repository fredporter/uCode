# uCode Software Library and Runtime Capsule Specification

**Status:** Active implementation contract  
**Version:** 0.2  
**Date:** 2026-08-30

## Purpose

The Software Library lets users launch supported modern and legacy software
without developer-mode wiring. A catalogue title references one or more
preconfigured Runtime Capsules, LENS connectors, SKINs, controls, learning
material, and compatibility results.

The catalogue may distribute open and licensed assets. Proprietary ROMs,
system files, disk images, and game media remain user supplied unless explicit
redistribution rights exist. A catalogue entry may describe and verify such
media without bundling it.

## Library model

```text
Software Library
  -> Title
      -> Edition / exact build
          -> Runtime Capsule
          -> LENS connector(s)
          -> SKIN package(s)
          -> Control profile(s)
          -> learning and technical notes
          -> compatibility fixtures
```

A title may offer three treatments:

- **authentic:** original software in a legacy capsule;
- **enhanced:** original software plus reversible LENS/SKIN enhancements;
- **adapted:** a BBCSDL/uCode implementation designed for modification.

## Catalogue record

```yaml
format: ucode-library/1
id: elite
title: Elite
summary: Space trading and combat
tags: [space, simulation, learning]
editions:
  - id: elite-bbc-example
    treatment: enhanced
    capsule: capsules/elite-bbc.capsule.yaml
    lens: [lens/elite-bbc-v1.lens.yaml]
    skins: [original, corrected, enhanced-wireframe]
    controls: [bbc-keyboard, modern-gamepad]
    media:
      distribution: user-supplied
      verification: checksums/elite-bbc.json
    compatibility: compatibility/elite-bbc.yaml
    learning: learning/elite-bbc.md
```

## Capsule record

```yaml
format: ucode-capsule/1
id: elite-bbc-example
treatment: enhanced

runtime:
  type: legacy
  engine: bbc-emulator
  engine_version: pinned
  machine: bbc-model-b
  entry: media/elite.ssd

media:
  policy: user-supplied
  verification: checksums/elite-bbc.json

display:
  source: framebuffer
  register: square
  aspect: 16:9
  compatibility_viewport: [320, 256]

input:
  profile: bbc-keyboard
  pointer: optional
  gamepad: optional

lens:
  connector: lens/elite-bbc-v1.lens.yaml
  coverage: state-observed

skin:
  default: corrected
  available: [original, corrected, enhanced-wireframe]

storage:
  saves: program-state

resources:
  network: disabled
  cpu_profile: authentic
  memory_limit: runtime-defined

provenance:
  source: external-user-media
  redistribution: prohibited
```

## Required lifecycle

Capsule engines implement:

- `probe` — report engine and dependency availability;
- `verify` — validate media and connector compatibility;
- `install` — prepare catalogue-owned, redistributable dependencies;
- `start` — launch an isolated session;
- `input` — accept keyboard, pointer, touch-equivalent, and controller events;
- `pause`, `resume`, `reset`, and `stop`;
- `snapshot` and `restore` where supported;
- `status` — report runtime, LENS, SKIN, and media health.

Installation never silently downloads proprietary software. Missing media is
reported in the normal library UI with a guided, non-developer setup flow.

The Library may implement catalogue browsing and redistributable proof
capsules before the GridCore release freeze. A legacy title cannot be promoted
to verified production compatibility until the exact edition, media policy,
runtime, controls, persistence behavior, and connector evidence pass the frozen
GridCore contracts.

## Connector contracts

### LENS coverage

Every edition declares the strongest verified coverage:

1. `framebuffer-only`
2. `input-aware`
3. `state-observed`
4. `world-extracted`
5. `fully-semantic`

LENS connectors identify the exact compatible edition using hashes, version
metadata, symbols, or other deterministic fingerprints.

### SKIN levels

1. `original` — unmodified presentation.
2. `corrected` — accurate scaling, aspect, palette, and latency.
3. `enhanced` — accessibility, typography, colour, controls, audio, and UI.
4. `reinterpreted` — GridCore or modern Teletext presentation from LENS state.
5. `spatial` — uCode 2 presentation from exported semantic state.

All enhancements are opt-in and reversible. The original presentation remains
available whenever the engine can expose it.

## Compatibility evidence

An edition is catalogue-ready only when it records:

- exact engine and software build;
- media/licence policy and provenance;
- required ROMs, libraries, and assets;
- deterministic verification hashes where lawful;
- boot and smoke-test procedure;
- expected screenshots or state assertions;
- input, audio, save, LENS, and SKIN results;
- known limitations and supported platforms.

Library status uses: `research`, `configured`, `verified`, `enhanced`, and
`release`. A generated program skeleton is not a verified or playable title.

## First vertical slice

The first capsule proves the contract with a small redistributable BBC program
or test fixture. Repton-class tile software follows because its map and entity
state make LENS verification tractable. Elite follows after memory/version
fingerprinting, save-state, presentation timing, and connector tests are
proven. An Amiga engine is a later uCode 1 capsule adapter, before any uCode 2
spatial interpretation.
