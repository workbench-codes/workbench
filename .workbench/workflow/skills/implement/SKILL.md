---
name: implement
description: Defines the workflow sequence and resume rules for the /implement orchestrator command.
---
# Skill: implement

# Implement Workflow Skill

This skill defines the workflow sequence and resume rules for the `/implement` orchestrator command. Treat this file as the single source of truth for step ordering, status dispatch, and stop conditions.

Invocation contract:

`/implement <issue-id> [ticket|research|plan|execute|review|commit]`

The optional stop-step input is case-insensitive at input, normalized to lowercase, then validated against the exact allowed set.

## Canonical Workflow

The orchestrated flow is:

`ticket -> research -> plan -> execute -> review -> commit`

Each workflow step runs in a dedicated Task subagent.

## Status-Driven Dispatch

Use the issue's `status-ticket` label to decide where to start.

| Current status-ticket value | Next step | Next agent to spawn |
|---|---|---|
| none (no status label) | `ticket` | `ticketer` |
| `decomposed` | — | None. Hard-stop. Issue has been split into sub-issues. |
| `open` | `research` | `researcher` |
| `researched` | `plan` | `planner` |
| `planned` | `execute` | `executer` |
| `implemented` | `review` | `reviewer` |
| `reviewed` | `commit` | `committer` |

### Notes

- `commit` is terminal for this orchestrator flow.
- `decomposed` is terminal — the issue has been split into sub-issues and no further workflow steps apply. Run `/implement` on individual sub-issues instead.
- `status-ticket` state must be validated before dispatch:
  - `none` (no `status-ticket`) is valid and maps to `ticket`
  - exactly one canonical value is valid: `open`, `researched`, `planned`, `implemented`, `reviewed`, `decomposed`
  - multiple values or invalid values are malformed and must hard-stop before dispatch
- Non-status labels must always be preserved by agents that update status.

## Run Contract Per Step

For each step, the orchestrator must:

1. Announce step start to the user.
2. Spawn the agent via the Task tool (OpenCode) or Agent tool (Claude Code) using `subagent_type` from the dispatch table and a prompt containing the issue ID.
3. Read the agent's freeform text output.
4. If questions are present in the output, handle them per the question handling policy, then resume the agent (via `task_id` in OpenCode, or via SendMessage with the agent ID in Claude Code).
5. Infer outcome as one of:
   - `success` - agent completed without unresolved blockers
   - `blocked` - agent needs a blocking/critical decision that cannot be resolved automatically
   - `failed` - agent errored or could not complete
6. Never expose raw agent output that contains internal tool calls or debugging.
7. Record artifacts mentioned by the agent, questions asked, answers given, and runtime where available.
8. Announce step completion state.

## Question Handling Policy

When a workflow agent asks a question:

- Read the agent's freeform output for question indicators.
- First apply orchestrator strategy from `.workbench/settings.yml`.
- Auto-answer only when confidence is high and the question is non-critical.
- Escalate to the user when the question is blocking, critical, or high-impact.
- Ask one targeted escalation question at a time.
- Provide concise options with each escalation.
- Include an explicit `Recommended default:` label with every escalation.
- Accept freeform overrides only when unambiguous and safe.
- If freeform is ambiguous or unsafe, re-prompt with one targeted question plus concise options and recommended default.
- Freeform overrides must never change workflow order or status-transition semantics.
- Bound auto-answers by `max_auto_answers_per_step` from settings.

Critical/high-impact examples:

- Scope expansion beyond ticket boundaries
- Security, privacy, billing, or data migration decisions
- Destructive or irreversible operations
- Conflicting requirements with no safe default

## Stop Conditions

Stop immediately when any of the following occurs:

- A workflow agent returns `failed`
- A blocking question is escalated and cannot be resolved
- `status-ticket` is `decomposed` (terminal — issue has been split into sub-issues; run `/implement` on individual sub-issues instead)
- `status-ticket` validation fails (multiple values or invalid value)
- Stop-step validation fails because requested step is earlier than current progression

Do not continue to subsequent steps after a stop condition.

## Completion Contract

A successful orchestrator run includes:

- All required remaining steps ran in order from computed start point
- Per-step status updates were shown
- Final summary includes `Report Version: v1`
- Final summary includes `Report Status: Complete|Partial`
- Partial runs include `Final Stop Reason: <reason>`
- Final summary includes per-step outcomes and summaries
- Final summary includes notable artifacts created by agents
- A new PM document is created on every run with title `Implementation Report: <ISSUE_ID> - YYYY-MM-DDTHH-MM-SSZ`
- Document content is the full human-readable markdown implementation report

## Maintenance Guidance

To change workflow behavior:

1. Update the canonical flow and status mapping in this file.
2. Keep mapping values aligned with the PM status lifecycle.
3. Keep `/implement` command logic generic; do not hard-code sequence outside this skill.
