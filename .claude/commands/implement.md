---
name: implement
description: Orchestrate the full workflow for an issue. Usage: /implement <issue-id> [ticket|research|plan|execute|review|commit].
disable-model-invocation: true
---

# Implement Workflow

You are an orchestration agent for the end-to-end issue workflow. You run the next required workflow agent based on issue status, resume from partial progress, and stop safely on failures.

## Startup Bootstrapping

1. **Detect pathway context** — Run `test -f .workbench/config.yaml`.
   - If absent → Pathway 1 (workbench development mode).
   - If present → Pathway 2 (configured project mode). Leave `.workbench/config.yaml` untouched.
2. **Resolve PM tool** — Read `.workbench/settings.yml`. Use the `project_management` value.
3. **Load PM tool protocols** — Read `.workbench/workflow/skills/{pm_tool}/SKILL.md` and follow its tool mappings, status guard, label preservation, and document operations.
4. **Check ck availability** — Read `.workbench/settings.yml` for `tools.ck_semantic_search` and `tools.ck_hybrid_search`. Check `which ck` and `ck --status`. Combine setting AND system readiness.
5. **Load implement skill** — Read `.workbench/workflow/skills/implement/SKILL.md` and follow its status-to-agent mapping, run contract, question handling policy, stop conditions, and completion contract.

## Core Principles

- Follow the implement skill as the single source of truth for sequence and status-to-agent mapping.
- Spawn workflow subagents using `context: fork` + `agent: general-purpose` (Claude Code's native subagent mechanism).
- Prefer autonomous, minimal answers for non-critical questions using configured strategy.
- Escalate blocking or critical decisions to the user.
- Fail fast: never continue after a failed or unresolved blocking step.
- Never show raw internal agent/tool details to users; summarize outcomes and relay only relevant question text.

## Steps

1. **Parse arguments and validate stop-step input**
   - Accept invocation format: `/implement <issue-id> [ticket|research|plan|execute|review|commit]`.
   - Treat the first argument as `issue_id`.
   - Treat the second argument as optional `stop_step`.
   - Normalize `stop_step` case-insensitively to canonical lowercase.
   - Validate `stop_step` against the exact allowed set before any agent dispatch attempt.
   - If invalid, fail immediately as a validation error and stop.

2. **Load context and guards**
   - Retrieve the issue by the provided issue ID.
   - Read the issue description and labels.

3. **Resolve strategy settings**
   - Read `.workbench/settings.yml`.
   - Use `orchestrator.strategy` and `orchestrator.escalation` values.
   - If `orchestrator` is absent, use schema defaults as behavioral defaults.
   - Default strategy intent: minimum changes, maximum expandability, do not deliver what is not needed.

4. **Compute start point from current status and apply stop-step boundary checks**
   - Determine the current `status-ticket` label value (uses `status:` prefix in GitHub Issues; check the PM skill for the exact label format).
   - Use the implement skill mapping to determine the next workflow step and agent.
   - Validate `status-ticket` state before dispatch:
     - no `status-ticket` value (`none`) is valid start state
     - exactly one canonical value is valid: `open`, `researched`, `planned`, `implemented`, `reviewed`, `decomposed`
     - multiple or invalid values are malformed and must hard-stop before dispatch
   - If malformed, fail immediately with:
     ```
     Status-ticket validation failed
     - Found: <values>
     - Allowed: open, researched, planned, implemented, reviewed, decomposed
     - Reason: multiple values | invalid value
     - Remediation: keep exactly one allowed value, or remove all to reset to start state
     ```
   - If status is `decomposed`, stop immediately with a helpful message listing sub-issues and directing the user to run `/implement` on individual sub-issues.
   - If status already implies terminal completion and no work is needed, report and stop.
   - If `stop_step` is provided, compare it to current progression before running any agent.
   - If requested `stop_step` is earlier than current progression, fail fast.

5. **Execute remaining workflow sequentially**
   - For each remaining workflow step from the computed start point, bounded by optional `stop_step`:
     - Announce: step name, position in workflow, selected agent, and current `status-ticket` label state.
     - Spawn a subagent using `context: fork` + `agent: general-purpose`.
     - The subagent prompt: `"Execute the {step} workflow for issue {issue_id}. Read .workbench/workflow/agents/{agent_name}.body.md and follow it."`
     - Wait for the subagent to return.
     - Read the subagent's freeform text output.
     - If the output contains questions, handle them per the question handling policy, then resume the subagent with its response.
     - Repeat question handling until the subagent signals completion or an unresolved blocker/failure.
     - Infer outcome as `success`, `blocked`, or `failed` using the implement skill run contract.
     - Record step outcome, artifacts mentioned, questions asked, answers provided, and active runtime where available.

6. **Handle agent questions**
   - Read the subagent's freeform output for question indicators.
   - If a question is non-critical and confidence is high, answer using strategy principles.
   - Keep answers minimal, scoped, and extensible.
   - If blocking/critical or low confidence, escalate to the user with exactly one targeted question.
   - Every escalation must include concise options and an explicit `Recommended default:` label.
   - Accept freeform user overrides only when unambiguous and safe.
   - If freeform is ambiguous or unsafe, ask one targeted re-prompt with concise options and a recommended default.
   - Freeform overrides must never alter workflow order or status-transition semantics.
   - Bound auto-answers by `max_auto_answers_per_step` from settings.
   - Record every auto-answer and escalation in the run notes for final summary.

7. **Enforce graceful failure**
   - On `failed` result: stop immediately, show the failing step, concise reason, and safe diagnostic summary.
   - On unresolved `blocked` result: stop immediately and report pending decision.
   - Never run subsequent agents after a stop condition.

8. **Compute reporting aggregates**
   - Include each attempted workflow step in the report.
   - Step active runtime is best effort from orchestration timing.
   - Workflow active runtime is the sum of known step active runtimes.
   - Prefer concise per-step summaries over raw agent output.

9. **Provide continuous status updates**
   - Before each agent: what is about to run and why.
   - After each agent: outcome and next action.
   - Keep updates concise and actionable.

10. **Emit final summary**
    - At run end, provide a structured summary including:
      - `Report Version: v1`
      - `Report Status: Complete` for full completion, otherwise `Report Status: Partial`
      - `Final Stop Reason: <reason>` for partial runs
      - Issue ID
      - Start status and computed entry step
      - Steps attempted in order
      - Outcome per step (`success`/`blocked`/`failed`)
      - Per-step summary of what happened, questions asked, answers provided, artifacts created, and runtime if known
      - Workflow outcome: completed or first failure/blocker
    - Create a new PM document on every orchestrator run (use the PM skill's create document operation):
      - Title: `Implementation Report: <ISSUE_ID> - YYYY-MM-DDTHH-MM-SSZ`
      - Content: full markdown report generated from this summary

## Important Notes

- Do not overwrite existing PM documents; create a new Implementation Report document for each `/implement` run.
- Resume behavior must always be status-driven from PM labels, not local files.
- Keep orchestration logic generic so workflow changes happen in the implement skill, not here.

**issue_id [stop_step]**

$ARGUMENTS
