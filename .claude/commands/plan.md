---
name: plan
description: Create an implementation plan from an issue. Provide an issue ID as the argument. Best run in a new session.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run `test -f .workbench/config.yaml`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: `packages/` (workbench source code)
     - Documentation scope: `thoughts/` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source `.workbench/config.yaml` untouched.
2. **Resolve PM tool** — Read `.workbench/settings.yml`. Use the `project_management` value.
3. **Load PM tool protocols** — Read `.workbench/workflow/skills/{pm_tool}/SKILL.md` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read `.workbench/settings.yml` for `tools.ck_semantic_search` and `tools.ck_hybrid_search`. If absent, default to `true`. Check `which ck` and `ck --status`. Combine: `available = setting AND system_ready`.

## Core Instruction

Read `.workbench/workflow/agents/planner.body.md` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
