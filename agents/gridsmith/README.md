# GridSmith

Contained world-building agent for the live uCode monorepo.

## Scope

GridSmith is responsible for:

- creating and managing grid worlds under `uCode/workspaces/gridcore`
- importing BASIC and AMOS-oriented world inputs into grid artifacts
- exposing CLI tool contracts that uCore can adapt through owned APIs
- consuming the live `@udos/gridcore` and `@udos/viewport-renderer` packages

It is not a replacement for GridCore or GridUI. It is the orchestration layer for world-building on top of those packages.

## Real local roots

- uCode: `/Users/fredbook/Code/uCode`
- uCore: `/Users/fredbook/Code/uCore`
- GridCore workspace: `/Users/fredbook/Code/uCode/workspaces/gridcore`

## Current scaffold

This initial scaffold provides:

- a minimal CLI entry point
- tool contract definitions aligned with the GridSmith spec
- basic grid and location helpers against the live `@udos/gridcore` package

## Example commands

```bash
npm run build --workspace @udos/gridsmith
node ./agents/gridsmith/dist/cli.js grid create --cols 80 --rows 24
node ./agents/gridsmith/dist/cli.js location latlon-to-ucode --lat -33.8688 --lon 151.2093 --level 340
node ./agents/gridsmith/dist/cli.js location ucode-to-latlon --coord L340-0A0B-0000-0
```
