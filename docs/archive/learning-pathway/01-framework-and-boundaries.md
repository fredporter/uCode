# Lesson 01 - Framework And Boundaries

Sonic is the universal Sonic Screwdriver framework for the repo family.

## What Sonic Does

Sonic is responsible for:

- planning deployments
- generating manifests
- staging and applying reviewed hardware changes
- exposing CLI, API, MCP, and UI surfaces for those workflows

It is **not** responsible for owning every runtime it can install.

## The Family Architecture

Sonic operates within a three-part family structure:

| Repo | Responsibility | Example |
|------|---|---|
| **uDOS-core / uDOS-shell / uDOS-wizard** | Shared runtime, shell, and assist surfaces | Contracts, interaction patterns, provider-backed workflows |
| **sonic-screwdriver** | Deployment planning, hardware bootstrap, provisioning execution | Planning USB deployments, applying to real hardware, rescue workflows |
| **uHOME-server** | Canonical uHOME runtime, bundle contracts, install-plan ownership | Runtime environment, package bundles, post-deployment configuration |

## The Key Educational Habit: Boundary Clarity

The core concept is **knowing where Sonic stops**:

- **Plan in Python and structured data** — Sonic generates review-ready manifests
- **Apply destructive steps through explicit Linux-side scripts** — Nothing magical happens
- **Hand off runtime ownership to the correct sibling repo** — Sonic doesn't own the post-deployment lifecycle

This matters because **unclear boundaries cause operational chaos**. You need to know:
- Who does deployment?
- Who owns the runtime after deployment?
- Where do you escalate if something fails between system boundaries?

---

## Real Scenario: Typical Sonic Deployment

To make this concrete, here's a typical scenario:

### The Scenario
Your team needs to deploy a reproducible Kodi media center on a USB drive for testing. The device needs:
- Linux base system (Arch)
- Kodi runtime installed
- Specific plugins configured
- USB-based persistent storage

### Where Each System Plays a Role

**Planning Phase (uDOS-core + Sonic)**:
- `uDOS-core` provides the deterministic contract and target runtime semantics
- Sonic reads the profile and generates a deployment plan
- Result: A manifest you can review and version control

**USB Preparation** (Sonic):
- Sonic stages the Linux base system to USB
- Sonic prepares boot configuration and partition layout
- Result: A bootable USB device with Kodi ready to run

**Post-Deployment Configuration** (uHOME + Sonic handoff):
- Sonic hands off to `uHOME-server` for runtime setup
- `uHOME-server` installs Kodi packages and plugins
- `uHOME-server` manages the persistent configuration

**Ongoing Runtime** (uHOME):
- `uHOME-server` owns Kodi updates, plugin management, backups
- If Kodi fails, you contact the `uHOME` team, not Sonic

### What Sonic *Didn't* Do
- Didn't define the runtime contract or execution semantics (that's `uDOS-core`)
- Didn't configure Kodi plugins (that's `uHOME-server`)
- Didn't own the post-deployment runtime (that's `uHOME-server`)

This is the boundary clarity in action.

---

## Deeper Dive: Architecture Details

For more on how the family works together:
- **Archived system architecture**: See [docs/v1/specs/sonic-screwdriver.md](../../../docs/v1/specs/sonic-screwdriver.md)
- **Archived integration reference**: See [docs/v1/integration-spec.md](../../../docs/v1/integration-spec.md)
- **uHOME handoff contracts**: See `uHOME-server` repo documentation

---

## Checkpoint: Do You Understand the Boundaries?

Before moving to Lesson 02, check your understanding:

**Question 1**: If a user reports "Kodi won't start after USB deployment," which repo team should handle the issue?
- A) uDOS-core / uDOS-wizard
- B) sonic-screwdriver (deployment)
- C) uHOME-server (runtime)
- **Answer**: C — The runtime is uHOME-server's responsibility

**Question 2**: You're planning a deployment for a new device. What part of that should Sonic own?
- A) Designing the hardware target
- B) Generating the deployment plan and staging USB
- C) Installing and configuring the runtime after deployment
- **Answer**: B — Planning and staging are Sonic's job

**Question 3**: A USB deployment partially fails. Where do you look for logs?
- A) Sonic logs in `memory/sonic/logs/`
- B) uHOME runtime logs (managed by uHOME-server)
- C) Both—Sonic logs for the planning/apply phase, uHOME logs for runtime failures
- **Answer**: C — Each system owns its own phase

---

## Key Takeaway

**Sonic is one lane in a multi-lane system.** Its job is:
- Take a profile → Generate a deploy plan → Apply to hardware → Hand off to runtime

Everything before and after is someone else's job. Knowing that prevents confusion when things go wrong.
