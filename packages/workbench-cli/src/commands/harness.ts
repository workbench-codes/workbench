import { existsSync, mkdirSync, writeFileSync, readdirSync, rmdirSync, unlinkSync } from "node:fs"
import { join } from "node:path"

export interface HarnessResult {
  success: boolean
  error?: string
  created?: string[]
  removed?: string[]
}

type WrapperMap = Record<string, string>

const WRAPPERS: WrapperMap = {
  "ticket.md": `---
name: ticket
description: Creates a structured ticket for an issue. Provide an issue ID as the argument.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: \`packages/\` (workbench source code)
     - Documentation scope: \`thoughts/\` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source \`.workbench/config.yaml\` untouched.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use the \`project_management\` value.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read \`.workbench/settings.yml\` for \`tools.ck_semantic_search\` and \`tools.ck_hybrid_search\`. If absent, default to \`true\`. Check \`which ck\` and \`ck --status\`. Combine: \`available = setting AND system_ready\`.

## Core Instruction

Read \`.workbench/workflow/agents/ticketer.body.md\` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
`,

  "research.md": `---
name: research
description: Research an issue. Provide an issue ID as the argument. Best run in a new session.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: \`packages/\` (workbench source code)
     - Documentation scope: \`thoughts/\` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source \`.workbench/config.yaml\` untouched.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use the \`project_management\` value.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read \`.workbench/settings.yml\` for \`tools.ck_semantic_search\` and \`tools.ck_hybrid_search\`. If absent, default to \`true\`. Check \`which ck\` and \`ck --status\`. Combine: \`available = setting AND system_ready\`.

## Core Instruction

Read \`.workbench/workflow/agents/researcher.body.md\` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
`,

  "plan.md": `---
name: plan
description: Create an implementation plan from an issue. Provide an issue ID as the argument. Best run in a new session.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: \`packages/\` (workbench source code)
     - Documentation scope: \`thoughts/\` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source \`.workbench/config.yaml\` untouched.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use the \`project_management\` value.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read \`.workbench/settings.yml\` for \`tools.ck_semantic_search\` and \`tools.ck_hybrid_search\`. If absent, default to \`true\`. Check \`which ck\` and \`ck --status\`. Combine: \`available = setting AND system_ready\`.

## Core Instruction

Read \`.workbench/workflow/agents/planner.body.md\` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
`,

  "execute.md": `---
name: execute
description: Execute an implementation plan from an issue. Provide an issue ID as the argument. Best run in a new session.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: \`packages/\` (workbench source code)
     - Documentation scope: \`thoughts/\` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source \`.workbench/config.yaml\` untouched.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use the \`project_management\` value.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read \`.workbench/settings.yml\` for \`tools.ck_semantic_search\` and \`tools.ck_hybrid_search\`. If absent, default to \`true\`. Check \`which ck\` and \`ck --status\`. Combine: \`available = setting AND system_ready\`.

## Core Instruction

Read \`.workbench/workflow/agents/executer.body.md\` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
`,

  "review.md": `---
name: review
description: Review the execution of an issue's plan. Provide an issue ID as the argument. Best run after execution is complete.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: \`packages/\` (workbench source code)
     - Documentation scope: \`thoughts/\` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source \`.workbench/config.yaml\` untouched.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use the \`project_management\` value.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read \`.workbench/settings.yml\` for \`tools.ck_semantic_search\` and \`tools.ck_hybrid_search\`. If absent, default to \`true\`. Check \`which ck\` and \`ck --status\`. Combine: \`available = setting AND system_ready\`.

## Core Instruction

Read \`.workbench/workflow/agents/reviewer.body.md\` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
`,

  "commit.md": `---
name: commit
description: Commits the local changes in atomic commits. Best run after execution succeeds and before plan review.
disable-model-invocation: true
---

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
   - If absent → Pathway 1 (workbench development mode).
     - Primary code scope: \`packages/\` (workbench source code)
     - Documentation scope: \`thoughts/\` (research, plans, architecture docs)
   - If present → Pathway 2 (configured project mode).
     - Leave the source \`.workbench/config.yaml\` untouched.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use the \`project_management\` value.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\` and follow its tool mappings, status guard, label preservation, document operations, and conventions for all PM operations.
4. **Check ck availability** — Read \`.workbench/settings.yml\` for \`tools.ck_semantic_search\` and \`tools.ck_hybrid_search\`. If absent, default to \`true\`. Check \`which ck\` and \`ck --status\`. Combine: \`available = setting AND system_ready\`.

## Core Instruction

Read \`.workbench/workflow/agents/committer.body.md\` and follow it.

## Argument Forwarding

**issue_id**

$ARGUMENTS
`,

  "implement.md": `---
name: implement
description: Orchestrate the full workflow for an issue. Usage: /implement <issue-id> [ticket|research|plan|execute|review|commit].
disable-model-invocation: true
---

# Implement Workflow

You are an orchestration agent for the end-to-end issue workflow.

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use \`project_management\`.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\`.
4. **Check ck availability** — Read settings + verify \`which ck\`.
5. **Load implement skill** — Read \`.workbench/workflow/skills/implement/SKILL.md\`.

## Core Principles

- Follow implement skill for sequence and status-to-agent mapping.
- Spawn subagents via Claude Code native subagent mechanism.
- Prefer autonomous answers; escalate blocking/critical decisions.
- Fail fast after failures or blockers.

## Steps

1. Parse \`$ARGUMENTS\` as \`issue_id [stop_step]\`.
2. Retrieve the issue; read description and labels.
3. Resolve strategy from \`.workbench/settings.yml\`.
4. Compute start point from current \`status:\` label.
5. Execute remaining workflow sequentially, spawning subagents per step.
6. Handle subagent questions per escalation policy.
7. Enforce graceful failure — stop on fail/blocked.
8. Emit final summary with report and PM document.

**issue_id [stop_step]**

$ARGUMENTS
`,

  "context.md": `---
name: context
description: Build context from one or more tickets. Provide one or more issue IDs as arguments.
disable-model-invocation: true
---

# Context Builder

## Startup Bootstrapping

1. **Detect pathway context** — Run \`test -f .workbench/config.yaml\`.
2. **Resolve PM tool** — Read \`.workbench/settings.yml\`. Use \`project_management\`.
3. **Load PM tool protocols** — Read \`.workbench/workflow/skills/{pm_tool}/SKILL.md\`.
4. **Check ck availability** — Read settings + verify \`which ck\`.
5. Work entirely from the PM tool — do not read local \`thoughts/\` files.

## Instructions

1. Parse issue IDs from \`$ARGUMENTS\` (space-separated).
2. Fetch all data from PM tool (issues, parents, children, documents).
3. Synthesize context covering problem, scope, and sub-issues.
4. Present summary and invite questions.
5. Answer user questions from built context.

**user_request**

$ARGUMENTS
`,
}

const WRAPPER_FILES = Object.keys(WRAPPERS)

export async function executeAddHarness(
  harness: string
): Promise<HarnessResult> {
  if (harness !== "claude-code") {
    return {
      success: false,
      error: `Unsupported harness '${harness}'. Currently supported: claude-code`,
    }
  }

  const commandsDir = join(process.cwd(), ".claude", "commands")

  try {
    mkdirSync(commandsDir, { recursive: true })

    const created: string[] = []
    for (const filename of WRAPPER_FILES) {
      const filePath = join(commandsDir, filename)
      writeFileSync(filePath, WRAPPERS[filename])
      created.push(filePath)
    }

    return { success: true, created }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function executeRemoveHarness(
  harness: string
): Promise<HarnessResult> {
  if (harness !== "claude-code") {
    return {
      success: false,
      error: `Unsupported harness '${harness}'. Currently supported: claude-code`,
    }
  }

  const commandsDir = join(process.cwd(), ".claude", "commands")

  if (!existsSync(commandsDir)) {
    return { success: true, removed: [] }
  }

  try {
    const removed: string[] = []

    // Delete known wrapper files
    for (const filename of WRAPPER_FILES) {
      const filePath = join(commandsDir, filename)
      if (existsSync(filePath)) {
        unlinkSync(filePath)
        removed.push(filePath)
      }
    }

    // Remove commands dir if empty
    const remaining = readdirSync(commandsDir)
    if (remaining.length === 0) {
      rmdirSync(commandsDir)
    }

    // Remove .claude dir if empty
    const claudeDir = join(process.cwd(), ".claude")
    if (existsSync(claudeDir)) {
      const claudeContents = readdirSync(claudeDir)
      if (claudeContents.length === 0) {
        rmdirSync(claudeDir)
      }
    }

    return { success: true, removed }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
