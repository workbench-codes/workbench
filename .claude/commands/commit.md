---
description: Commits local changes in atomic commits with conventional messages. Optionally provide an issue ID.
---

# Commit Changes

Thin wrapper that bootstraps context and spawns the committer agent.

## Instructions

1. **Parse arguments**
   Extract the optional issue ID from `$ARGUMENTS`. Normalize to uppercase if provided.

2. **Bootstrap context** following the Workbench Context section in `CLAUDE.md`:
   - Detect pathway (check for `.workbench/config.yaml`)
   - Resolve PM tool from `.workbench/settings.yml` (committer-lite mode — trailer format only)

3. **Spawn the committer agent** via the Agent tool:
   - `subagent_type`: `"claude"`
   - Include in the prompt:
     - The resolved pathway context block (see CLAUDE.md "Context Passing Format")
     - `PM tool: {pm_tool} (committer-lite mode: use only for commit trailer format)`
     - `To load a skill, read .workbench/workflow/skills/{name}/SKILL.md.`
     - `Issue ID: {issue_id}` (or omit if not provided)
     - `Read .workbench/workflow/agents/committer.body.md and follow those instructions.`

4. **Relay questions to the user**: if the agent's output contains questions (e.g., asking to confirm the commit plan), relay them exactly. Collect the user's response and resume the agent via SendMessage with the agent ID. Repeat until the agent signals completion.

5. **Report** the agent's final outcome to the user.

**[issue_id]**

$ARGUMENTS
