# uCode Documentation Index

## Top-Level Specs

| File                                                                   | Domain                                    |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [DEV_PLAN.md](DEV_PLAN.md)                                             | Development plan, 6 phases, package order |
| [GRIDSMITH_DEV_PLAN.md](GRIDSMITH_DEV_PLAN.md)                         | GridSmith agent build-out plan            |
| [UCODE_RUNTIME_SPEC.md](UCODE_RUNTIME_SPEC.md)                         | BBC BASIC for SDL 2.0 runtime             |
| [INTEGRATION.md](INTEGRATION.md)                                       | uCore, Hivemind, MCP, Vault, OpenRouter   |
| [GRID_ALGEBRA_RELEASE_COLLATION.md](GRID_ALGEBRA_RELEASE_COLLATION.md) | Grid algebra release notes                |

## specs/ — Canonical Specifications

| File                                                                                 | Content                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [SKILLS_FRAMEWORK.md](specs/SKILLS_FRAMEWORK.md)                                     | 6 Skills Framework skills (all built)                  |
| [UCODE_ADAPTATION_STRATEGY.md](specs/UCODE_ADAPTATION_STRATEGY.md)                   | Classic game adaptation strategy                       |
| [UCODE_USER_MANUAL_DEV_AGENT_PROMPT.md](specs/UCODE_USER_MANUAL_DEV_AGENT_PROMPT.md) | Dev-agent prompt for full uCode user manual generation |
| [UDOS_MAPPING_SPEC.md](specs/UDOS_MAPPING_SPEC.md)                                   | Locked geospatial mapping spec for GridCore/uCode      |
| [UDOS_MAPPING_DEV_AGENT_PROMPT.md](specs/UDOS_MAPPING_DEV_AGENT_PROMPT.md)           | Dev-agent implementation prompt and phase checkpoints  |

## learning-pathway/ — Skills and Tutorials

| File                                                              | Content                                  |
| ----------------------------------------------------------------- | ---------------------------------------- |
| [05-skills-framework.md](learning-pathway/05-skills-framework.md) | Skills Framework tutorial (all 6 skills) |

## programs/ — Adapted Programs

| File                               | Content                                     |
| ---------------------------------- | ------------------------------------------- |
| [README.md](../programs/README.md) | 7 classic programs, pipeline status, skills |

---

## gridcore/ — Grid, GridSmith, and Spatial

| File                                                                                                      | Content                                              |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [GRID_ALGEBRA_COLUMN_SPECS.md](gridcore/GRID_ALGEBRA_COLUMN_SPECS.md)                                     | Grid Algebra column-width system (canonical spec)    |
| [GRID_ALGEBRA_COLUMN_SPECS_DRAFT_2026-07-01.md](gridcore/GRID_ALGEBRA_COLUMN_SPECS_DRAFT_2026-07-01.md)   | Draft: new column algebra with breakpoint tables     |
| [GRIDSMITH_WORKSPACE_ACTUAL_PATHS_PLAN.md](gridcore/GRIDSMITH_WORKSPACE_ACTUAL_PATHS_PLAN.md)             | GridSmith workspace actual paths vs planned          |
| [GRIDUI_GRIDCORE_EXTRACTION_PLAN.md](gridcore/GRIDUI_GRIDCORE_EXTRACTION_PLAN.md)                         | Extracting GridCore library from GridUI surface      |
| [HANDOVER_UCODE_GRIDSMITH_BUILDOUT.md](gridcore/HANDOVER_UCODE_GRIDSMITH_BUILDOUT.md)                     | Handover notes: uCode GridSmith build                |
| [TERMINAL_TELETEXT_GRID_WORK_TAG.md](gridcore/TERMINAL_TELETEXT_GRID_WORK_TAG.md)                         | Terminal teletext grid work tag (Ceefax integration) |
| [12_v2_render_theme_and_gui_pipeline.md](gridcore/12_v2_render_theme_and_gui_pipeline.md)                 | v2 render themes and GUI pipeline                    |
| [13_v2_workflow_automation_runtime_split.md](gridcore/13_v2_workflow_automation_runtime_split.md)         | v2 workflow automation and runtime split             |
| [2026-03-16-core-spatial-vocabulary-planning.md](gridcore/2026-03-16-core-spatial-vocabulary-planning.md) | Core spatial vocabulary planning                     |
| [2026-03-16-wizard-core-grid-v2-specs.md](gridcore/2026-03-16-wizard-core-grid-v2-specs.md)               | Wizard Core Grid v2 specifications                   |

---

## spatial/ — Spatial Algebra and Voxel Mapping

| File                                                                                   | Content                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------- |
| [UDOS_SPATIAL_ALGEBRA_LOCKED_v1.2.md](spatial/UDOS_SPATIAL_ALGEBRA_LOCKED_v1.2.md)     | Spatial Algebra locked spec v1.2          |
| [UDOS_UCELL_VOXEL_MAPPING_v1.md](spatial/UDOS_UCELL_VOXEL_MAPPING_v1.md)               | uCell Voxel mapping spec v1               |
| [GRID_ALGEBRA_ARCHITECTURE.md](spatial/GRID_ALGEBRA_ARCHITECTURE.md)                   | Grid Algebra architecture document        |
| [GRIDUI_SPEC.md](spatial/GRIDUI_SPEC.md)                                               | GridUI canonical specification            |
| [grid-spatial-event-model-candidate.md](spatial/grid-spatial-event-model-candidate.md) | Grid spatial event model candidate design |

---

## basic/ — BASIC Runtime and uCode1

| File                                                                       | Content                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| [UCODE1_USER_GUIDE.md](basic/UCODE1_USER_GUIDE.md)                         | uCode1 BASIC user guide (MODE 7, teletext, graphics) |
| [CHARACTER_SET_REFERENCE.md](basic/CHARACTER_SET_REFERENCE.md)             | Character set / 128 collection reference             |
| [SPATIAL_CHARACTER_INTEGRATION.md](basic/SPATIAL_CHARACTER_INTEGRATION.md) | Spatial character integration                        |
| [SPATIAL_CHARACTER_MAPPING.md](basic/SPATIAL_CHARACTER_MAPPING.md)         | Spatial character mapping                            |
| [SPRITE_OBJECT_REFERENCE.md](basic/SPRITE_OBJECT_REFERENCE.md)             | Sprite and BOB object reference                      |
| [C_LAYER_CHEAT_SHEET.md](basic/C_LAYER_CHEAT_SHEET.md)                     | C-layer cheat sheet (map/layer editor)               |
| [CLI_README.md](basic/CLI_README.md)                                       | CLI overview                                         |
| [CLI_COMMANDS.md](basic/CLI_COMMANDS.md)                                   | CLI command reference                                |
| [QUICK_START.md](basic/QUICK_START.md)                                     | uCode BASIC quick start                              |
| [README.md](basic/README.md)                                               | Runtime docs overview                                |
| [MARKDOWN_STANDARDS.md](basic/MARKDOWN_STANDARDS.md)                       | Markdown formatting standards                        |
| [VAULT_DOCS_TEMPLATE.md](basic/VAULT_DOCS_TEMPLATE.md)                     | Vault documentation template                         |

---

## tutorials/ — Lessons, Demos, Learning

| File                                                                             | Content                          |
| -------------------------------------------------------------------------------- | -------------------------------- |
| [README.md](tutorials/README.md)                                                 | Lessons index                    |
| [lesson_01.md](tutorials/lesson_01.md)                                           | Lesson 1: uCode basics           |
| [lesson_02.md](tutorials/lesson_02.md)                                           | Lesson 2: text and graphics      |
| [lesson-0.5-from-spark-to-ucode.md](tutorials/lesson-0.5-from-spark-to-ucode.md) | Lesson 0.5: from Spark to uCode  |
| [lesson-1-markdown-grimoire.md](tutorials/lesson-1-markdown-grimoire.md)         | Lesson 1: markdown grimoire      |
| [game.md](tutorials/game.md)                                                     | Game demo surface                |
| [demo-surface.md](tutorials/demo-surface.md)                                     | Demo surface example             |
| [ucode-mini-game.md](tutorials/ucode-mini-game.md)                               | uCode mini-game learning pathway |
| [ucode-student-tutorials.md](tutorials/ucode-student-tutorials.md)               | Student tutorials index          |

---

## specs/ — USX, UDO, USXD (Doclang)

### usx/ — USX Surface and Grid Specs

- [README.md](specs/usx/README.md) — USX spec index
- [usx-core.md](specs/usx/usx-core.md) — Core document specification
- [usx-grid.md](specs/usx/usx-grid.md) — Grid layer specification
- [usx-style.md](specs/usx/usx-style.md) — Style/skin system
- [usx-surface.md](specs/usx/usx-surface.md) — Surface plate specification
- [usx-ui.md](specs/usx/usx-ui.md) — UI component specification

### udo/ — UDO Workflow Specifications

- [README.md](specs/usx/README.md) — UDO spec index
- [udo-agent.md](specs/udo/udo-agent.md) — Agent specification
- [udo-core.md](specs/udo/udo-core.md) — Core runtime specification
- [udo-meta.md](specs/udo/udo-meta.md) — Metadata specification
- [udo-publish.md](specs/udo/udo-publish.md) — Publishing workflow
- [udo-skill.md](specs/udo/udo-skill.md) — Skill specification
- [udo-task.md](specs/udo/udo-task.md) — Task specification
- [udo-variable.md](specs/udo/udo-variable.md) — Variable system
- [udo-workflow.md](specs/udo/udo-workflow.md) — Workflow specification

### usxd/ — USXD Doclang (OBF)

- [obf-core.md](specs/usxd/obf-core.md) — OBF core specification
- [obf-agents.md](specs/usxd/obf-agents.md) — OBF agent definitions
- [obf-meta.md](specs/usxd/obf-meta.md) — OBF metadata
- [obf-publish.md](specs/usxd/obf-publish.md) — OBF publishing workflow
- [obf-workflows.md](specs/usxd/obf-workflows.md) — OBF workflow definitions

---

## archive/ — Legacy References

Historical documents preserved for reference. Not actively maintained.

---

_Index updated 2026-07-08 — 4 sprints closed, 6 skills built, 7 programs scaffolded, 85 tasks tracked_
