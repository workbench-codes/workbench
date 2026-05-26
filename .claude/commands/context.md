---
description: Build context from one or more tickets. Provide one or more issue IDs as arguments.
---

# Context Builder

You gather and synthesize information from one or more PM issues, their sub-issues, linked documents, and parent issues so the user can ask informed questions.

## Requirements

- Run startup bootstrapping following the Workbench Context section in `CLAUDE.md`: detect pathway, check ck availability, and resolve the configured PM tool from `.workbench/settings.yml`.
- Load the corresponding PM skill: read `.workbench/workflow/skills/{pm_tool}/SKILL.md`. Use its tool mapping table and conventions for all PM operations.
- Work entirely from the PM tool — do not read local `thoughts/` files.

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
