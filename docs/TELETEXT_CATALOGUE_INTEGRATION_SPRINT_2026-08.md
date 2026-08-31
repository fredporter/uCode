# Teletext Catalogue Integration Sprint

**Status:** Active
**Started:** 2026-08-30
**Owners:** uCode runtime/GridCore, uCore host/UI, uFlow delivery state
**Scope:** Complete and integrate the Teletext import recovery work without
reviving duplicate reader logic or merging unrelated Dev Mode/MCP branches.

## Outcome

The live Teletext surface renders a verified catalogue of published Markdown
documents, using canonical GridCore reader models and a thin uCore host adapter.
It supports page lists, document subpages, FASTEXT/page-entry navigation,
offline/error states, and desktop/narrow acceptance evidence.

## Ownership and infrastructure

| Repository | Owns | Required setup | Exit evidence |
| --- | --- | --- | --- |
| `uCode` | GridCore Teletext model, pagination, interaction, renderer, static provider compatibility | Node 20 or 22; `npm ci` | GridCore build and focused reader tests pass |
| `uCore` | UCode surface, `GET /api/library/search` fetch lifecycle, page allocation, host route adapters, browser goldens | Node 22; pnpm install; `UCORE_UCODE_PATH` resolves the active uCode checkout | type-check, unit, and targeted Playwright tests pass |
| `uFlow` | Durable sprint tasks and review evidence | Python 3.12+; editable install only when task APIs change | task state and branch decisions are recorded under `$UDOS_HOME/flow/tasks` |
| `uKnowledge` | Offline discovery/indexing capability | No required change for this sprint | It is not a direct live-reader dependency until it exposes the library-search contract |

Mutable sprint tasks live under `$UDOS_HOME/flow/tasks/sprints`, never in a
repository-local `.tasker` directory.

## Delivery phases

### 1. Recovery inventory

- Rebase `recovery/2026-08-18-teletext-extraction` on current `main` in an isolated
  worktree.
- Record its SHA, unique commits, changed paths, runtime owner, and focused test
  results before copying any change.
- Split commits by owner: GridCore reader logic in uCode; surface/fetch logic in
  uCore; no shared commit may mix both ownership boundaries.

### 2. Catalogue contract

- [x] Freeze a fixture-backed response contract for `GET /api/library/search`.
- [x] Cover Documentation (`public` plus `doc-sites`), Global Knowledge,
  Learning (`public` plus `learning`), malformed, and unavailable responses.
- [x] Keep `TeletextPageProvider` explicitly static/demo-only; the tested
  uCore catalogue adapter is the live published-catalogue boundary.

### 3. Runtime and host integration

- [x] Keep reader math, 40x25 layout, navigation state, and page rendering in
  `uCode/packages/gridcore`.
- [x] Keep library fetch lifecycle, source/tag filtering, page-range allocation, and
  user-visible loading/error state in the uCore UCode surface.
- [x] Require the uCore runtime adapter to delegate; do not duplicate uCode reader
  or runtime logic in the host.

### 4. Acceptance and release evidence

- [x] Add focused tests for one loaded catalogue list, one multi-page document,
  empty, malformed, and unavailable responses.
- [x] Extend Playwright coverage for loaded catalogue, multi-page reading, narrow
  keypad navigation/dismissal, and error presentation.
- [x] Preserve existing golden images; no visual baseline changed in this task.

### 5. Individual branch review

Every candidate is reviewed from a clean, current-base worktree with a recorded
SHA, diff summary, ownership decision, conflict result, and focused test output.

| Candidate | Decision | Required proof before integration |
| --- | --- | --- |
| `recovery/2026-08-18-teletext-extraction` | Reviewed and rejected as superseded | Its only commit conflicts with the current extracted reader and mixes uCore Vue/fetch state into GridCore |
| `work/2026-08-18-stabilise` | Do not merge into uCode | Review and integrate only in uCore; run its host/CI gates |
| `origin/codex/final-docs-and-devmode-gate` | Cherry-pick only if ownership docs remain current | Documentation review plus relevant uCore checks |
| `origin/codex/mcp-*`, `origin/codex/remove-*`, `origin/codex/retire-*`, `origin/codex/skills-*`, `origin/codex/udos-mcp-gateway` | Leave outside this sprint | Separate owning-repository review; no bulk merge |

`work/2026-08-18-stabilise` was reviewed in uCore at
`fff410889689fc16e2e6e7bbad519868462c11dc`. It diverges from an August base by
27 commits and 206 files across CI, backend, frontend, task state, and legacy
cleanup. It has no path overlap with this sprint's Teletext work, but is too
broad to cherry-pick as a branch. Its smaller commits require a dedicated uCore
consolidation review and focused tests outside this sprint.

## Focused validation matrix

```bash
# uCode
npm run -w @udos/gridcore build
npm run -w @udos/gridcore test -- --run test/page-provider.test.ts test/reader-model.test.ts test/reader-interaction.test.ts test/reader-state.test.ts test/reader-renderer.test.ts

# uCore frontend
pnpm type-check
pnpm test
pnpm test:golden -- golden.spec.ts

# uFlow, only when task infrastructure changes
python -m pytest -q
```

## Completion criteria

1. The recovery branch is reviewed, rebased, split by owner, and either
   cherry-picked with green tests or closed with a documented rejection.
2. The live catalogue contract has fixture coverage for successful and failure
   states and does not rely on static provider data.
3. A user can navigate a loaded list and a multi-page document by keyboard,
   FASTEXT/page entry, and narrow keypad without a duplicated reader state.
4. The uCore host uses the canonical uCode reader/runtime boundary.
5. Each branch decision and test result is recorded in the matching uFlow task.

## Non-goals

- BBC BASIC Console packaging and the wider Runtime gate.
- General MCP/Dev Mode consolidation.
- Direct uKnowledge integration before it owns a compatible library search API.
- Bulk merge of unrelated branches.

## Recovery decision

`recovery/2026-08-18-teletext-extraction` contains one WIP commit,
`c154669`, changing only `packages/gridcore/src/teletext/index.ts` and
`reader-model.ts`. It conflicts with the current active reader implementation.
Its remaining fetch lifecycle and Vue reactive state belong to the uCore host,
not uCode GridCore. No commit is cherry-picked; required reader behaviour is
continued through the catalogue-contract and host-runtime-integration tasks.

## Catalogue contract evidence

uCore's `grid-core/teletext/catalogue.ts` owns library-search payload
normalization and source/tag/Markdown grouping while GridCore retains page
composition. Its focused test covers documentation, knowledge, and learning
page ranges plus malformed-success and unavailable-response failures.

## Host/runtime integration evidence

The uCore adapter test proves Ceefax and BBCSDL registration receives the same
runtime-owned `CeefaxStore`, so BBCSDL-published pages are visible to the reader.
The canonical uCode reader suite passes 31 tests, and the uCore adapter plus
route smoke suite passes 5 tests. Browser acceptance remains a separate open
phase.

## Browser acceptance evidence

The uCore Playwright suite passes 14 tests. Teletext coverage now drives the
live surface through a fixture-backed loaded Documentation shelf, a two-screen
document using `N` subpage navigation, an empty shelf, malformed catalogue
failure, and the existing narrow keypad flow.