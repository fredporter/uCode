# Learning Paths: Choose Your Route

**Updated**: 2026-03-10  
**Course**: Universal Sonic Screwdriver  
**Status**: Multiple learning paths available

---

## Choose Your Path

Different people have different backgrounds and goals. Choose the path that matches your situation:

- [**Standard Path** (90 min)](#standard-path-for-most-learners) — Full course with hands-on project
- [**Fast-Track Path** (30 min)](#fast-track-path-for-experienced-operators) — Quick reference + essential hands-on
- [**Developer Path** (60 min)](#developer-path-for-extension-developers) — Architecture + integration focus
- [**Troubleshooting Path** (30 min)](#troubleshooting-path-for-when-things-break) — Fix issues + recovery
- [**Learning Lab Path** (120+ min)](#learning-lab-path-for-deep-understanding) — Extended exploration + experiments

---

## Standard Path (For Most Learners)

**Time**: ~90 minutes  
**Goal**: Complete understanding of Sonic deployment workflow  
**Best for**: First-time users, operators, system administrators

### Roadmap

1. **Setup** (5 min)
   - [ ] Read [Overview](overview.md)
   - [ ] Check [Prerequisites](prerequisites.md)
   - [ ] Skim [Objectives](objectives.md)

2. **Foundation** (15 min)
   - [ ] Read [Lesson 01 - Framework and Boundaries](lessons/01-framework-and-boundaries.md)
   - [ ] Key insight: "plan → inspect → dry-run → apply → handoff"
   - [ ] Understand: Sonic boundaries with uDOS and uHOME

3. **Planning & Safety** (30 min)
   - [ ] Read [Lesson 02 - Layout, Manifest, Dry-Run](lessons/02-layout-manifest-and-dry-run.md)
   - [ ] Understand: How planning works
   - [ ] Understand: Why dry-run matters

4. **Hands-On: Phase 1** (30 min)
   - [ ] Complete [Project - Phase 1](project/PHASES.md#phase-1-planning--inspection-lesson-2--project-p1)
   - [ ] Generate your first manifest
   - [ ] Inspect and understand the output

5. **Execution & Recovery** (15 min)
   - [ ] Read [Lesson 03 - Apply, Rescue, Handoff](lessons/03-apply-rescue-and-handoff.md)
   - [ ] Understand: Apply workflow and recovery

6. **Hands-On: Phase 2-3** (45 min+, optional)
   - [ ] Complete [Project - Phase 2](project/PHASES.md#phase-2-dry-run-safety-lesson-2--project-p2) (dry-run practice)
   - [ ] Complete [Project - Phase 3](project/PHASES.md#phase-3-apply--recovery-lesson-3--project-p3) (if you have test hardware)

### You're Ready For

After this path, you can:
- Plan safe deployments
- Use dry-run before applying
- Understand Sonic's role in the repo family
- Deploy Sonic to a USB device
- Recover if something goes wrong

### Next Steps

- **Need to troubleshoot?** → [Troubleshooting Path](#troubleshooting-path-for-when-things-break)
- **Want to extend Sonic?** → [Developer Path](#developer-path-for-extension-developers)
- **Done for now?** → Share your project and get feedback!

---

## Fast-Track Path (For Experienced Operators)

**Time**: ~30 minutes  
**Goal**: Quick reference + essential hands-on verification  
**Best for**: Experienced system admins, DevOps, infrastructure teams

### Roadmap

1. **Quick Mental Model** (5 min)
   - [ ] Read the TL;DR here ↓
   - View: Sonic mental model = `plan → inspect → dry-run → apply → handoff`
   - Remember: Sonic owns deployment; uHOME and uDOS own rest

2. **Reference: Lesson Planning** (10 min)
   - [ ] Skim [Lesson 02 - Layout, Manifest, Dry-Run](lessons/02-layout-manifest-and-dry-run.md) (sections: "Configuration Walkthrough", "Understanding the Manifest")
   - [ ] Focus: `sonic plan` command, manifest output format

3. **Hands-On: Quick Deploy** (15 min)
   - [ ] Complete [Project - Phase 1](project/PHASES.md#phase-1-planning--inspection-lesson-2--project-p1) (Tasks P1.1-P1.2 only)
   - [ ] Generate manifest with one command
   - [ ] Verify: "I know how to plan safely"

### You're Ready For

After this path, you can:
- Generate a deployment plan in < 1 minute
- Understand manifest output format
- Deploy Sonic via CLI in familiar territory

### Quick Reference Card

```
# Generate a plan
sonic plan --usb-device /dev/sdb --out manifest.json

# Dry-run apply (safe, no changes)
sonic-stick.sh --manifest manifest.json --dry-run

# Real apply (destructive)
sonic-stick.sh --manifest manifest.json

# Check device status
sonic status /dev/sdb
```

### When You Need More

- **Full understanding?** → [Standard Path](#standard-path-for-most-learners)
- **Something broke?** → [Troubleshooting Path](#troubleshooting-path-for-when-things-break)

---

## Developer Path (For Extension Developers)

**Time**: ~60 minutes  
**Goal**: Understand Sonic architecture for customization/integration  
**Best for**: Software developers, DevOps tooling builders, integrators

### Roadmap

1. **Boundaries** (10 min)
   - [ ] Read [Lesson 01 - Framework and Boundaries](lessons/01-framework-and-boundaries.md)
   - [ ] Focus: "Where does Sonic stop?"
   - [ ] Understand: uDOS, uHOME-server integration points

2. **Architecture Deep Dive** (20 min)
   - [ ] Read [Lesson 02 - Layout, Manifest, Dry-Run](lessons/02-layout-manifest-and-dry-run.md)
   - [ ] Reference architecture: `docs/architecture/services-*.md` (TBD - in development)
   - [ ] Understand: Planning service interface, manifest contract

3. **Service Layer Exploration** (20 min)
   - [ ] Explore `services/` in repo root
   - [ ] Review: `services/mcp_server.py`, `services/runtime_service.py`
   - [ ] Understand: How Sonic exposes MCP interfaces

4. **Hands-On: API Test** (10 min)
   - [ ] Start `sonic-api` or `sonic-mcp` locally
   - [ ] Make a test request (e.g., `sonic plan` via API)
   - [ ] Verify: API responds correctly

### You're Ready For

After this path, you can:
- Understand Sonic's service-oriented architecture
- Write integrations that call Sonic APIs
- Extend Sonic with custom build engines or planners
- Contribute to the Sonic codebase

### Key Concepts

- **Planning service**: Takes layout → outputs manifest
- **Build service**: Executes manifest operations
- **Catalog service**: Device and profile database
- **MCP facade**: Turns services into Claude protocol

### When You Need More

- **How to extend Sonic?** → Look for `docs/howto/custom-extension.md` (in development)
- **API reference?** → `docs/v1/specs/sonic-screwdriver.md`
- **Service contracts?** → `services/` docstrings and type hints

---

## Troubleshooting Path (For When Things Break)

**Time**: ~30 minutes  
**Goal**: Diagnose and recover from deployment failures  
**Best for**: Troubleshooters, operators on-call, recovery specialists

### Roadmap

1. **Know When to Stop** (5 min)
   - [ ] Read [Lesson 03 - Apply, Rescue, Handoff](lessons/03-apply-rescue-and-handoff.md) (section: "Recovery Procedures")
   - [ ] Key: When to attempt recovery vs. escalate

2. **Diagnosis** (10 min)
   - [ ] Reference: `docs/v1/howto/dry-run.md` (run tests safely first)
   - [ ] Read: Lesson 04 - Troubleshooting (under development, check back)
   - [ ] Understand: Common failure modes and diagnostic steps

3. **Recovery** (10 min)
   - [ ] Review: Your `contingency-plan.md` from project
   - [ ] Execute: Appropriate recovery procedure
   - [ ] Validate: Device state after recovery

4. **Documentation** (5 min)
   - [ ] Log: What broke, what you tried, what worked
   - [ ] Share: With team for future reference

### Common Issues

| Problem | Diagnosis | Recovery |
|---------|-----------|----------|
| "USB not recognized" | Check `/dev/` device name | Reseat cable, try different port |
| "Manifest validation failed" | Review config.sonix-layout.json | Verify layout against device specs |
| "Apply stopped mid-way" | Check logs for last successful step | Use `sonic resume` (if available) or restart |
| "Device won't boot" | Check bootloader configuration | Boot into recovery, verify partition layout |

### Escalation Path

If you can't resolve:
1. Document: What you tried and results
2. Compile: Logs and manifests
3. Escalate: With full context to senior operator/developer
4. Follow: Recovery procedure from Lesson 03

### When You're Stuck

- **Specific error message?** → Search `docs/` for error text
- **Device won't boot?** → Lesson 03 - Recovery procedures
- **Need expert help?** → Contact your team lead with full logs

---

## Learning Lab Path (For Deep Understanding)

**Time**: 120+ minutes (self-paced)  
**Goal**: Thorough comprehension and hands-on experimentation  
**Best for**: Students, learners, educators, contribut

ors

### Roadmap

1. **All of Standard Path** (90 min)
   - [ ] Complete every step (see above)

2. **Deeper Dives** (30+ min)
   - [ ] Read: [Sonic Structure Assessment](../../docs/v1/sonic-structure-assessment-2026-03-08.md)
   - [ ] Explore: `docs/v1/specs/sonic-screwdriver.md`
   - [ ] Understand: Repo architecture and boundaries

3. **Experiments** (30+ min)
   - [ ] Try: Modify layout config and see how manifest changes
   - [ ] Test: What happens if you interrupt dry-run?
   - [ ] Explore: Inspect manifest JSON structure in detail
   - [ ] Question: What does Sonic NOT do? (boundary testing)

4. **Integration Study** (30+ min)
   - [ ] Read: `docs/v1/integration-spec.md`
   - [ ] Understand: How Sonic integrates with uDOS and uHOME
   - [ ] Question: What happens at each boundary?

5. **Contributing** (optional, ongoing)
   - [ ] Identify: What could be improved in Sonic?
   - [ ] Propose: Changes in a GitHub issue
   - [ ] Contribute: A fix, feature, or doc improvement

### Learning Questions

As you explore, try to answer:

1. **Mental Model**: Can you draw the `plan → inspect → dry-run → apply → handoff` flow?
2. **Boundaries**: Where exactly does Sonic hand off to uDOS? To uHOME-server?
3. **Why Dry-Run?**: What bad things could happen without dry-run?
4. **Manifest Format**: What does each section of the manifest represent?
5. **Rescue**: If a deployment fails at 50%, what can you do?
6. **Architecture**: How would you explain Sonic to someone who's never used it?

### Project Extensions

Beyond the three phases, consider:

- [ ] **Compare**: Two different deployment scenarios (different hardware, different profiles)
- [ ] **Troubleshoot**: Intentionally break something and fix it
- [ ] **Automate**: Write a script that automates multiple deployments
- [ ] **Document**: Create a deployment runbook for your team
- [ ] **Extend**: Propose a custom module for Sonic (e.g., post-deploy validation)

### You're Ready For

After this path, you can:
- Explain Sonic to others with confidence
- Design deployment solutions for complex scenarios
- Troubleshoot advanced issues
- Contribute to Sonic or related projects
- Lead deployment efforts in your organization

### Continue Learning

- **Next course**: Deployment Patterns (under development)
- **Troubleshooting depth**: Lesson 04 - Troubleshooting (under development)
- **Contributing**: See `CONTRIBUTING.md` in repo root

---

## Path Comparison Quick Reference

| Path | Time | Audience | Outcome |
|------|------|----------|---------|
| **Standard** | 90 min | Most learners | Can deploy safely |
| **Fast-Track** | 30 min | Experienced ops | Quick reference ready |
| **Developer** | 60 min | Integrators/devs | Can extend Sonic |
| **Troubleshooting** | 30 min | On-call teams | Can fix issues |
| **Learning Lab** | 120+ min | Students/contributors | Expert understanding |

---

## Next Steps

1. **Choose your path** above
2. **Work through it** at your own pace
3. **Ask questions** if stuck (refer to resources in each path)
4. **Share your project** when done
5. **Continue learning** with advanced topics (in development)

---

## Still Have Questions?

- **"Where's Lesson 4 on troubleshooting?"** → Under development as part of v1.6; check back
- **"I'm lost!"** → Re-read [Overview](overview.md) and [Prerequisites](prerequisites.md)
- **"I want to practice more"** → Repeat the project with different hardware/configs
- **"I want to contribute"** → See `CONTRIBUTING.md` in repo root

---

**Happy learning! You've got this.** 🚀
