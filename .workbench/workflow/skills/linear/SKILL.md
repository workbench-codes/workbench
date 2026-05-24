---
name: linear
description: Linear project management integration. Provides tool mappings, status protocols, document operations, and workflow patterns for Linear. Load this skill when the configured project management tool is 'linear'.
---

# Linear Project Management Skill

All project management operations use Linear MCP tools. This skill maps generic operations to Linear-specific tool calls and defines protocol patterns for common workflows.

## Critical Rules

1. **The issue description on Linear is the sole source of truth.** Do not read local `thoughts/` files as inputs — they are convenience copies only.
2. **Never update existing documents.** Always create new ones for follow-ups.
3. **Preserve non-status labels** when updating issue status. Never remove labels that are not part of the status-ticket group.
4. **Content is literal Markdown.** When creating documents or updating descriptions, use literal newlines and special characters — do not escape them.

## Tool Mapping

| Generic Operation | Linear Tool Call |
|---|---|
| Retrieve an issue | `linear_get_issue({ id: "{issue_id}" })` |
| Retrieve an issue with relations | `linear_get_issue({ id: "{issue_id}", includeRelations: true })` |
| Update an issue | `linear_save_issue({ id: "{issue_id}", ...fields })` |
| Overwrite issue description | `linear_save_issue({ id: "{issue_id}", description: "{content}" })` |
| Update issue labels | `linear_save_issue({ id: "{issue_id}", labels: ["{label1}", "{label2}"] })` |
| List documents for an issue | Retrieve the issue — the response includes an associated `documents` array with `id` and `title` for each |
| Retrieve a document | `linear_get_document({ id: "{document_id}" })` |
| Create a document | `linear_save_document({ issue: "{issue_id}", title: "{title}", content: "{content}" })` |
| Create a sub-issue (no `id`) | `linear_save_issue({ parentId: "{parent_issue_id}", title: "{title}", labels: ["{label}"], priority: {priority}, team: "{team_key}" })` |
| Set issue dependency | `linear_save_issue({ id: "{issue_id}", blockedBy: ["{blocker_issue_id}"] })` |
| Create a label | `linear_create_issue_label({ name: "{label_name}" })` |
| List labels | `linear_list_issue_labels({ name: "{label_name}" })` |
| List sub-issues | Retrieve the parent issue with relations — the response includes a `children` array with `id` and `title` for each |

## Status Management

### Status Values

The status lifecycle follows this order:

`open → researched → planned → implemented → reviewed`
`decomposed` (terminal — epic has been split; workflow does not continue on this issue)

These values correspond to the `status-ticket` label group in Linear. They are always written in lowercase.

### Status Guard

Before performing a workflow operation, verify the issue has the expected status:

1. Retrieve the issue using the issue ID
2. Inspect the `labels[]` array for the `status-ticket` group value and validate state:
   - no `status-ticket` value (`none`) is valid start state
   - exactly one canonical value is valid: `open`, `researched`, `planned`, `implemented`, `reviewed`, `decomposed`
   - multiple `status-ticket` values are invalid and must stop immediately
   - any non-canonical `status-ticket` value is invalid and must stop immediately
3. If validation fails, stop immediately with:

```text
Status-ticket validation failed
- Found: <values>
- Allowed: open, researched, planned, implemented, reviewed, decomposed
- Reason: multiple values | invalid value
- Remediation: keep exactly one allowed value, or remove all to reset to start state
```

4. If the `status-ticket` label value does not match the expected value (but is valid), surface a warning:
   > "The `status-ticket` label is currently `{status}`, not `{expected}`. {Operation} is intended to run after {previous step}. Do you want to proceed anyway?"
5. Wait for explicit confirmation before continuing if the status is valid-but-not-expected

### Label Preservation Protocol

When updating the issue status:

1. Retrieve the issue to get the current `labels[]` array
2. Validate current `status-ticket` state using the same Status Guard model:
   - `none` is valid
   - one canonical value is valid
   - multiple values or invalid values must stop immediately
3. On malformed pre-state, fail immediately and do not call `linear_save_issue`:

```text
Status-ticket validation failed
- Found: <values>
- Allowed: open, researched, planned, implemented, reviewed, decomposed
- Reason: multiple values | invalid value
- Remediation: keep exactly one allowed value, or remove all to reset to start state
```

4. On valid pre-state, remove any existing `status-ticket` group value (`open`, `researched`, `planned`, `implemented`, `reviewed`, `decomposed`)
5. Append the new status value to the labels array
6. Update the issue: `linear_save_issue({ id: "{issue_id}", labels: ["{preserved_label_1}", "{preserved_label_2}", "{new_status}"] })`

**Example**: Issue has labels `["researched", "Improvement"]`. Setting status to `"planned"`:
- Remove `"researched"` (current status)
- Keep `"Improvement"` (non-status label)
- Append `"planned"`
- Result: `linear_save_issue({ id: "PAP-7018", labels: ["Improvement", "planned"] })`

### Epic Label And Decomposed Status

The `Epic` label is a **type label** (like `Feature` or `Improvement`), NOT a `status-ticket` label. It is a permanent marker of the issue's nature as an epic — never removed by status transitions.

The `decomposed` label is a **status-ticket label** — it is the terminal state of a decomposed epic. Once an issue reaches `decomposed`, no further workflow steps apply.

**Label preservation interaction**: The label preservation protocol naturally protects `Epic` because it only removes `status-ticket` group values. `Epic` is a type label and is never part of the removal set. Do not add `Epic` to the removal list.

**Creating labels if absent**: Before applying `decomposed` or `Epic`, verify the label exists in the workspace. Use `linear_list_issue_labels` with `name` to check. If absent, create via `linear_create_issue_label({ name: "{label_name}" })`.

**Sub-issue creation pattern**: When creating sub-issues, never include a `status-ticket` label. Sub-issues start with no workflow status — the user begins the workflow on each individually via `/implement`. The `parentId` field links the sub-issue to its epic parent.

## Document Operations

### Creating Documents

Use `linear_save_document` with:
- `issue`: the issue ID (e.g., `"PAP-7018"`)
- `title`: the document title (e.g., `"Research: PAP-7018 - Topic Name"`)
- `content`: the full Markdown content — use literal newlines and special characters, not escape sequences
- Do not pass `id` when creating a document. `id` is only for updating an existing document.

Rules:
- Never update existing documents — always create new ones
- Follow-up documents use titles like `"Research: {issue_id} - {topic} (part N)"`

### Fetching Documents

1. Retrieve the issue to get the list of associated documents (the response includes a `documents` array with `id` and `title` for each)
2. For each document, call `linear_get_document` with the document `id` to retrieve full content

Document identification by title prefix:
- `"Research:"` — research documents
- `"Plan:"` — implementation plans
- `"Execution Notes:"` — execution notes
- `"Implementation Report:"` — orchestrator implementation report artifacts
- `"Review:"` — review documents

## Issue References

### Issue URL

Format: `https://linear.app/plan-and-publish/issue/{issue_id}/{slug}`

Use this format when referencing issues in documents or plans.

### Commit Trailer

Format: `Delivers {issue_id}`

Example:
```

Delivers PAP-7018

```

This creates bidirectional links in the Linear UI between the commit and the issue. Include this trailer on the first commit only when an issue ID is associated with the changes.

### Issue ID in Branch Names

Extract the issue ID from the branch name by matching the `{PREFIX}-{NUMBER}` segment.
Example: `feature/pap-7024-desc` → `PAP-7024` (normalised to uppercase).
