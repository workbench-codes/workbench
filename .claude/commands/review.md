---
description: Reviews the implementation of an issue against its plan. Provide an issue ID as the argument.
---

# Review Implementation

Thin wrapper that bootstraps context and spawns the reviewer agent.

## Instructions

1. **Parse arguments**
   Extract the issue ID from `$ARGUMENTS`. Normalize to uppercase (e.g., `pap-123` → `PAP-123`).

2. **Bootstrap context** following the Workbench Context section in `CLAUDE.md`:
   - Detect pathway (check for `.workbench/config.yaml`)
   - Check ck availability
   - Resolve PM tool from `.workbench/settings.yml`

3. **Spawn the reviewer agent** via the Agent tool:
   - `subagent_type`: `"claude"`
   - Include in the prompt:
     - The resolved pathway context block (see CLAUDE.md "Context Passing Format")
     - `PM tool: {pm_tool}`
     - `To load a skill, read .workbench/workflow/skills/{name}/SKILL.md.`
     - `When body files reference the Task tool, use the Agent tool instead.`
     - `When spawning sub-agents (codebase-locator, codebase-analyzer), use the Agent tool with subagent_type "Explore" and include the body file path in the prompt.`
     - `Read .workbench/workflow/agents/reviewer.body.md and follow those instructions for issue {issue_id}.`

4. **Relay questions to the user**: if the agent's output contains questions, relay them exactly. Collect the user's response and resume the agent via SendMessage with the agent ID. Repeat until the agent signals completion.

5. **Report** the agent's final outcome to the user.

**issue_id**

$ARGUMENTS
