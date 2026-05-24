---
name: workbench-context
description: Provides pathway detection and ck availability instructions for workbench commands. Load this skill to determine whether the workbench is in development mode (Pathway 1) or configured project mode (Pathway 2), and whether ck semantic search tools are available.
---

# Workbench Context Skill

This skill provides instructions for detecting the workbench's operational mode and checking ck semantic search availability. Load this skill at the start of every command to determine pathway context.

## Pathway Detection

Check for `.workbench/config.yaml` in the repository root using Bash:

```
test -f .workbench/config.yaml
```

- **Present** (exit code 0): Pathway 2 (configured project mode)
- **Absent** (exit code 1): Pathway 1 (workbench development mode)

This is a presence-only check. Do not parse or read `config.yaml`.

## ck Availability Check

ck availability is the logical AND of the centralised setting and the system check.

1. **Read the centralised setting.** Read `.workbench/settings.yml`. For each of `tools.ck_semantic_search` and `tools.ck_hybrid_search`, use the value if present; if the file is missing, if there is no `tools` section, or if the key is absent, default to `true`.
2. **Check the system.** Run `which ck` via Bash. If found, run `ck --status` to verify index readiness. Any failure at this step means `ck_installed_and_ready = false` — warn the user and continue (graceful degradation; never block execution).
3. **Combine.** Compute resolved per-tool availability:
   * `ck_semantic_search_available = tools.ck_semantic_search AND ck_installed_and_ready`
   * `ck_hybrid_search_available = tools.ck_hybrid_search AND ck_installed_and_ready`
4. **Pass downstream.** Report each resolved value separately in the pathway-context block injected into spawned agents (see "Context Passing Format" below). When a tool is unavailable, indicate whether it is suppressed by config or unavailable on the system.

### Variable Storage

After completing pathway detection and ck availability checks, store the following named variables for downstream use:

- `pathway_mode` — either `"workbench"` (Pathway 1) or `"configured"` (Pathway 2)
- `ck_semantic_search_available` — boolean, result of setting AND system check
- `ck_hybrid_search_available` — boolean, result of setting AND system check

When the command involves project management operations, store these additional variables after PM configuration:

- `pm_tool` — the resolved project management tool name (e.g., `"github-issues"`, `"linear"`)
- `repo_owner_repo` — the resolved repository in `owner/repo` format for PM tool operations

## Project Management Configuration

When the command involves project management operations (retrieving issues, updating statuses, creating documents, commit trailers), configure the PM tool:

1. Read `.workbench/settings.yml` to determine the configured project management tool
2. If the file is missing or the `project_management` field is absent, stop with error:
   > "No project management tool configured. Add `project_management: <tool>` to `.workbench/settings.yml`"
3. The field value is the name of the PM skill to load
4. Load the corresponding PM skill: `skill({ name: '<value>' })`
5. The PM skill provides tool mappings, protocols, and workflow patterns for all PM operations:
   - Follow the status guard protocol from the loaded PM skill.
   - Follow the label preservation protocol from the loaded PM skill.
   - Use the PM skill's tool mapping table for all issue and document operations.

#### PM Loading Variants

Two modes are available after loading the PM skill:

**Full operations (default)**:
- Use the PM skill's tool mapping table for all issue, document, and label operations
- Follow the status guard protocol before any status transition
- Follow the label preservation protocol when updating issue status
- Use the PM skill's commit trailer format

**Committer-lite**:
- Use only the PM skill's commit trailer format
- Do not perform status transitions, status guard checks, or label preservation
- The PM skill is loaded to resolve the trailer format only

If the command does not involve project management operations, skip this step.

## Context Passing Format

After detecting pathway and checking ck availability, include the appropriate context block in every spawned agent's prompt.

### Pathway 2 (configured project mode)

```
Pathway context: The workbench is in configured project mode (Pathway 2).
- Primary code scope: projects/ (target project source code)
- Documentation scope: resources/ (supporting docs and metadata)
- Workbench source: packages/ (the workbench CLI itself — search only if the task relates to workbench internals)
- ck_semantic_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
- ck_hybrid_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
- When ck is available, prefer ck_semantic_search and ck_hybrid_search as complements to grep/glob for discovering relevant files
```

### Pathway 1 (workbench development mode)

```
Pathway context: The workbench is in development mode (Pathway 1).
- Primary code scope: packages/ (workbench source code)
- Documentation scope: thoughts/ (research, plans, architecture docs)
- ck_semantic_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
- ck_hybrid_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
```
