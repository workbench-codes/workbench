# Workbench

A structured Agentic SDLC environment. Slash commands guide every issue through a defined pipeline powered by dedicated sub-agents:

```
/ticket → /research → /plan → /execute → /review → /commit
```

Use `/implement <issue-id>` to orchestrate all remaining steps automatically.

---

## Claude Code Conventions

### Skill Loading

When instructed to load a skill named `X`, read `.workbench/workflow/skills/X/SKILL.md`.

### Tool Equivalences

| OpenCode | Claude Code |
|----------|-------------|
| Task tool | Agent tool |
| Resume via `task_id` | Resume via SendMessage with the agent ID |

When agent body files say "use the Task tool" or "spawn a Task", use the Agent tool instead.

### Sub-Agent Dispatch Table

When spawning a named workflow agent, use the following `subagent_type` and read the corresponding body file:

| Agent name | `subagent_type` | Body file |
|------------|----------------|-----------|
| ticketer | `claude` | `.workbench/workflow/agents/ticketer.body.md` |
| researcher | `claude` | `.workbench/workflow/agents/researcher.body.md` |
| planner | `claude` | `.workbench/workflow/agents/planner.body.md` |
| executer | `claude` | `.workbench/workflow/agents/executer.body.md` |
| reviewer | `claude` | `.workbench/workflow/agents/reviewer.body.md` |
| committer | `claude` | `.workbench/workflow/agents/committer.body.md` |
| codebase-locator | `Explore` | `.workbench/workflow/agents/codebase-locator.body.md` |
| codebase-analyzer | `Explore` | `.workbench/workflow/agents/codebase-analyzer.body.md` |
| codebase-pattern-finder | `Explore` | `.workbench/workflow/agents/codebase-pattern-finder.body.md` |
| thoughts-locator | `Explore` | `.workbench/workflow/agents/thoughts-locator.body.md` |
| thoughts-analyzer | `Explore` | `.workbench/workflow/agents/thoughts-analyzer.body.md` |
| web-search-researcher | `general-purpose` | `.workbench/workflow/agents/web-search-researcher.body.md` |

---

## Workbench Context

Load this context at the start of every command. Resolve pathway, ck availability, and PM tool before spawning any agent.

### Pathway Detection

Check for `.workbench/config.yaml` in the repository root:

```bash
test -f .workbench/config.yaml
```

- **Present** (exit code 0): **Pathway 2** — configured project mode
- **Absent** (exit code 1): **Pathway 1** — workbench development mode

This is a presence-only check. Do not parse or read `config.yaml`.

Store as `pathway_mode`: `"workbench"` (Pathway 1) or `"configured"` (Pathway 2).

### ck Availability Check

1. Read `.workbench/settings.yml`. For `tools.ck_semantic_search` and `tools.ck_hybrid_search`, use the value if present; default to `true` if the file or key is absent.
2. Run `which ck`. If found, run `ck --status` to verify index readiness. Any failure → `ck_installed_and_ready = false` (warn and continue; never block execution).
3. Compute resolved availability:
   - `ck_semantic_search_available = tools.ck_semantic_search AND ck_installed_and_ready`
   - `ck_hybrid_search_available = tools.ck_hybrid_search AND ck_installed_and_ready`

Store as `ck_semantic_search_available` and `ck_hybrid_search_available`.

### Project Management Configuration

When the command involves PM operations (retrieving issues, updating statuses, creating documents, commit trailers):

1. Read `.workbench/settings.yml` → `project_management` field.
2. If missing, stop with: `"No project management tool configured. Add project_management: <tool> to .workbench/settings.yml"`
3. Load the PM skill: read `.workbench/workflow/skills/<value>/SKILL.md`.
4. Follow its tool mapping, status guard protocol, and label preservation protocol for all PM operations.

Store as `pm_tool` (e.g., `"github-issues"`, `"linear"`).

**Committer-lite mode**: When only the commit trailer format is needed, load the PM skill to resolve the trailer format only — do not perform status transitions or label preservation.

### Context Passing Format

After resolving pathway, ck, and PM tool, include the following block in every spawned agent's prompt:

**Pathway 2 (configured project mode):**
```
Pathway context: The workbench is in configured project mode (Pathway 2).
- Primary code scope: projects/ (target project source code)
- Documentation scope: resources/ (supporting docs and metadata)
- Workbench source: packages/ (search only if the task relates to workbench internals)
- ck_semantic_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
- ck_hybrid_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
- When ck is available, prefer ck_semantic_search and ck_hybrid_search as complements to grep/glob
```

**Pathway 1 (workbench development mode):**
```
Pathway context: The workbench is in development mode (Pathway 1).
- Primary code scope: packages/ (workbench source code)
- Documentation scope: thoughts/ (research, plans, architecture docs)
- ck_semantic_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
- ck_hybrid_search: [available | unavailable (suppressed by config) | unavailable (ck not installed/ready)]
```

Also include in every spawned agent's prompt:
```
PM tool: {pm_tool}
To load a skill, read .workbench/workflow/skills/{name}/SKILL.md.
When body files reference the Task tool, use the Agent tool instead.
```
