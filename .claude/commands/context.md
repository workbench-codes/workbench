---
name: context
description: Build context from one or more tickets. Provide one or more issue IDs as arguments.
disable-model-invocation: true
---

# Context Builder

You gather and synthesize information from one or more PM issues, their sub-issues, linked documents, and parent issues so the user can ask informed questions.

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
5. Work entirely from the PM tool — do not read local `thoughts/` files.

## Instructions

### Step 1 — Parse inputs

Extract one or more issue IDs from `$ARGUMENTS` (space-separated). Normalize to uppercase (e.g., `pap-123` → `PAP-123`).

### Step 2 — Fetch all data

For **each** issue ID, in parallel:

1. Retrieve the issue with relations using the PM skill's retrieve an issue with relations operation.
2. From the response, read:
   - `title`, `description`
   - `parent` (if present, fetch the parent issue's `title` and `description` via the PM skill)
   - `children` (sub-issues — for each, fetch `title`, `description`, and `state`)
   - `documents` array (for each, fetch full content via the PM skill's retrieve a document operation)
3. If any sub-issue has its own sub-issues, go one level deep only (do not recurse indefinitely).

### Step 3 — Synthesize

For each ticket, distill the gathered information into a concise understanding covering:
- What the ticket is about (problem/feature)
- Key scope boundaries from the description
- Notable context from linked documents and parent issues
- Sub-issue breakdown (if any)

### Step 4 — Present summary

Output:
```
Context built for {N} ticket(s):

**{ISSUE_ID}** — {title}
{2-3 line summary of what it's about}

**{ISSUE_ID}** — {title}
{2-3 line summary of what it's about}

...
```

Then invite:
```
I'm ready to answer any questions you have about these tickets.
```

### Step 5 — Answer questions

Answer user questions drawing from the built context. If a question touches on something not covered by the fetched data, fetch additional details from the PM tool as needed rather than guessing.

**user_request**

$ARGUMENTS
