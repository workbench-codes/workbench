---
name: github-issues
description: GitHub Issues project management integration using gh CLI. Provides tool mappings, status protocols, document operations, and workflow patterns for GitHub Issues. Load this skill when the configured project management tool is 'github-issues'.
---

# GitHub Issues Project Management Skill

All project management operations use the `gh` CLI exclusively. This skill maps generic operations to `gh` CLI commands and defines protocol patterns for common workflows on GitHub Issues.

## Critical Rules

1. **The issue body on GitHub is the sole source of truth.** Do not read local `thoughts/` files as inputs — they are convenience copies only.
2. **Never update existing document comments.** Always create new ones for follow-ups. The `<!-- workbench:document:{Type} -->` marker ensures append-only semantics.
3. **Preserve non-status labels** when updating issue status. Never remove labels outside the `status:` prefix group.
4. **Content is literal Markdown.** When creating issue bodies, comments, or document markers, use literal newlines and special characters — do not escape them.

## Tool Mapping

| Generic Operation | GitHub Implementation |
|---|---|
| Retrieve an issue | `gh issue view {number} --repo {owner}/{repo} --json number,title,body,labels,state,url` |
| Retrieve an issue with relations | `gh api graphql -f query='query { repository(owner:\"{o}\", name:\"{r}\") { issue(number:{n}) { subIssues { nodes { number title } } parent { number title } } } }'` |
| Update an issue | `gh issue edit {number} --repo {owner}/{repo} [--title "..."] [--body "..."] [--add-label "..."] [--remove-label "..."]` |
| Overwrite issue description | `gh issue edit {number} --repo {owner}/{repo} --body-file /tmp/body.md` (write body to temp file first) |
| Update issue labels | Compute removals and additions, then: `gh issue edit {number} --repo {owner}/{repo} --remove-label "status:{old}" --add-label "status:{new}"` |
| List documents for an issue | `gh api repos/{owner}/{repo}/issues/{number}/comments` — filter by `<!-- workbench:document:{Type} -->` marker in body |
| Retrieve a document | `gh api repos/{owner}/{repo}/issues/comments/{comment_id}` — read `.body` field |
| Create a document | `gh issue comment {number} --repo {owner}/{repo} --body "..."` — body MUST include `<!-- workbench:document:{Type} -->` marker on its own line |
| Create a sub-issue | Two-step: (a) `gh issue create --repo {owner}/{repo} --title "..." --label "..."` → capture number; (b) `gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues -f sub_issue_id={child_id}` |
| Set issue dependency | Post paired comments: `<!-- workbench:blocked-by:#{n} -->` on blocked issue, `<!-- workbench:blocks:#{n} -->` on blocking issue. Run cycle detection first. |
| Create a label | `gh label create "{name}" --repo {owner}/{repo} --color "{hex}" --description "..."` |
| List labels | `gh label list --repo {owner}/{repo} --search "{name}" --json name,color` |
| List sub-issues | `gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues` — parse `.nodes[].number` and `.nodes[].title` |

**Important**: All `gh` commands that produce structured output should use `--json` with explicit field lists. Use `--jq` for field extraction since it is built into `gh` CLI (not an external dependency).

## Status Management

### Status Values

The status lifecycle follows this order:

```
status:open → status:researched → status:planned → status:implemented → status:reviewed
status:decomposed (terminal — epic has been split; workflow does not continue on this issue)
```

All status labels use the `status:` prefix to avoid namespace collisions in GitHub's flat label system. Type labels (`Epic`, `Feature`, `Improvement`) and metadata labels (`priority:{level}`, `estimate:{n}`) do NOT use the `status:` prefix.

### Status Guard

Before performing a workflow operation, verify the issue has the expected status:

1. Retrieve the issue: `gh issue view {number} --repo {owner}/{repo} --json labels`
2. Filter `labels[]` for entries matching `/^status:/` — extract the portion after `status:`
3. Validate:
   - Zero `status:` labels (`none`) → valid start state
   - Exactly one canonical value (`open`, `researched`, `planned`, `implemented`, `reviewed`, `decomposed`) → valid
   - Multiple `status:` labels → **invalid — hard stop**
   - Non-canonical value (e.g., `status:in-progress`) → **invalid — hard stop**
4. On validation failure, stop immediately with:

```text
Status-ticket validation failed
- Found: <values from status: labels>
- Allowed: open, researched, planned, implemented, reviewed, decomposed
- Reason: multiple values | invalid value
- Remediation: keep exactly one status: label with an allowed value, or remove all status: labels to reset to start state
```

5. If the `status:` label value does not match the expected value (but is valid), surface a warning:
   > "The `status:` label is currently `{status}`, not `{expected}`. {Operation} is intended to run after {previous step}. Do you want to proceed anyway?"
6. Wait for explicit confirmation before continuing if the status is valid-but-not-expected
7. **Explicitly ignore** the GitHub `state` field (`open`/`closed`) — the status guard inspects only labels.

### Label Preservation Protocol

When updating the issue status:

1. Fetch current labels: `gh issue view {number} --repo {owner}/{repo} --json labels --jq '.labels[].name'`
2. Validate current `status:` state using the same Status Guard model:
   - `none` is valid
   - one canonical value is valid
   - multiple values or invalid values must stop immediately
3. On malformed pre-state, fail immediately and do not modify labels:

```text
Status-ticket validation failed
- Found: <values from status: labels>
- Allowed: open, researched, planned, implemented, reviewed, decomposed
- Reason: multiple values | invalid value
- Remediation: keep exactly one status: label with an allowed value, or remove all status: labels to reset to start state
```

4. On valid pre-state, compute `remove_set` = all current labels matching `/^status:/`
5. Compute `add_label` = `"status:{new_status}"`
6. Execute removal for each label in `remove_set`: `gh issue edit {number} --repo {owner}/{repo} --remove-label "{label}"`
7. Execute addition: `gh issue edit {number} --repo {owner}/{repo} --add-label "status:{new_status}"`

**Example**: Issue has labels `["status:researched", "Improvement", "priority:high"]`. Setting status to `"planned"`:
- Remove: `"status:researched"` (current status label only)
- Keep: `"Improvement"`, `"priority:high"` (non-status labels)
- Add: `"status:planned"`
- Command: `gh issue edit 42 --repo o/r --remove-label "status:researched" --add-label "status:planned"`

### Ensure-Label-Exists Protocol

Before applying any label, verify it exists on the repo:

```
gh label list --repo {owner}/{repo} --search "{label_name}" --json name
```

If absent: `gh label create "{label_name}" --repo {owner}/{repo} --color "{hex}" --description "Workbench: {category}"`

Standard label colors:

| Label Group | Color | Hex | Example |
|---|---|---|---|
| Status | Blue | `#3172d9` | `status:researched` |
| Priority | Orange | `#d9730d` | `priority:high` |
| Estimate | Grey | `#6b7280` | `estimate:3` |
| Epic (type) | Purple | `#8250df` | `Epic` |
| Decomposed (status) | Dark grey | `#4a4a4a` | `status:decomposed` |
| Feature/Improvement | Green | `#0e8a16` | `Feature`, `Improvement` |

### Epic Label and Decomposed Status

`Epic` is a **type label** (like `Feature` or `Improvement`), NOT a `status:` label. It is a permanent marker of the issue's nature as an epic — never removed by status transitions.

`status:decomposed` is a **status-ticket label** — the terminal state of a decomposed epic. Once an issue reaches `status:decomposed`, no further workflow steps apply.

**Label preservation interaction**: The label preservation protocol naturally protects `Epic` because `remove_set` only captures labels matching `/^status:/`. `Epic` is a type label and is never part of the removal set. Do not add `Epic` to the removal list.

**Creating labels if absent**: Before applying `status:decomposed` or `Epic`, verify the label exists on the repo. Use the Ensure-Label-Exists Protocol.

**Sub-issue creation pattern**: When creating sub-issues during decomposition, sub-issues start with **no** `status:` **label** — the user begins the workflow on each individually.

## Document Operations

GitHub has no native Document type. Documents are stored as **issue comments** with embedded markers.

### Document Marker Format

Every document comment MUST include exactly one marker on its own line:

```
<!-- workbench:document:{Type} -->
```

Document types and their prefixes:

| Type | Prefix in title | Marker |
|---|---|---|
| Research | `Research:` | `<!-- workbench:document:Research -->` |
| Plan | `Plan:` | `<!-- workbench:document:Plan -->` |
| Execution Notes | `Execution Notes:` | `<!-- workbench:document:ExecutionNotes -->` |
| Implementation Report | `Implementation Report:` | `<!-- workbench:document:ImplementationReport -->` |
| Review | `Review:` | `<!-- workbench:document:Review -->` |
| Original PRD | `Original PRD:` | `<!-- workbench:document:OriginalPRD -->` |

### Creating Documents

```bash
gh issue comment {number} --repo {owner}/{repo} --body "### {Prefix}: {issue_id} - {topic}

{content}

<!-- workbench:document:{Type} -->"
```

The heading `### {Prefix}: {issue_id} - {topic}` is the human-readable title. The marker `<!-- workbench:document:{Type} -->` is the machine-parseable identifier.

Rules:
- Never update existing document comments — always create new ones (Rule 2)
- Follow-up documents use titles like `"### Research: PAP-7019 - Topic (part 2)"`

### Large Document Splitting

Documents exceeding the comment character limit (65536 chars) are split across multiple comments:

- Part 1: `<!-- workbench:document:{Type} part=1/3 -->`
- Part 2: `<!-- workbench:document:{Type} part=2/3 -->`
- Part 3: `<!-- workbench:document:{Type} part=3/3 -->`

All parts share the same `{Type}` but increment `part=N/M`.

### Fetching Documents

1. List all comments: `gh api repos/{owner}/{repo}/issues/{number}/comments --jq '.[] | {id: .id, body: .body[:200]}'`
2. Filter for markers matching `<!-- workbench:document:{Type} -->` (for specific type) or `<!-- workbench:document:` (for all)
3. Retrieve full content: `gh api repos/{owner}/{repo}/issues/comments/{comment_id} --jq '.body'`
4. For split documents, collect all parts sharing the same `{Type}` and assemble in `part` order

## Repo Resolution

Every `gh` CLI command requires `{owner}/{repo}`. Resolution is three-tier:

1. **Invocation input** (primary): The agent receives `owner/repo` from the parent command or user input (e.g., `/implement #45 owner/repo`)
2. **Current repo fallback**: `gh repo view --json nameWithOwner --jq '.nameWithOwner'` — returns the default repo set by `gh repo set-default`
3. **Ask user**: If neither source provides `owner/repo`, surface: "No repo specified. Provide as `{owner}/{repo}` or run `gh repo set-default {owner}/{repo}`"

Agents should resolve once at startup and pass the `{owner}/{repo}` tuple to all subsequent `gh` commands.

## Label Management

### Label Creation and Discovery

Before applying any workbench-managed label, verify existence:

```bash
EXISTING=$(gh label list --repo {owner}/{repo} --search "{label_name}" --json name --jq '.[].name')
if [ -z "$EXISTING" ]; then
    gh label create "{label_name}" --repo {owner}/{repo} --color "{hex}" --description "Workbench: {category}"
fi
```

### Label Categories

| Category | Pattern | Color | Description |
|---|---|---|---|
| Status | `status:{state}` | `#3172d9` (blue) | Workflow state: open, researched, planned, implemented, reviewed, decomposed |
| Priority | `priority:{level}` | `#d9730d` (orange) | Urgency: urgent, high, medium, low |
| Estimate | `estimate:{n}` | `#6b7280` (grey) | Point estimate: any integer |
| Type (Epic) | `Epic` | `#8250df` (purple) | Permanent type marker for epic issues |
| Type (Feature) | `Feature` | `#0e8a16` (green) | Permanent type marker for feature issues |
| Type (Improvement) | `Improvement` | `#0e8a16` (green) | Permanent type marker for improvement issues |

Priority values: `urgent`, `high`, `medium`, `low`. No numeric encoding — human-readable.

## Dependency Management

GitHub Issues has no native blocking relationship. Dependencies are tracked via **paired comments** on the blocked and blocking issues.

### Applying a Dependency

When issue A depends on issue B (#42):

1. **On blocked issue A** — post comment:

   ```
   <!-- workbench:blocked-by:#42 -->
   ```
2. **On blocking issue B** — post comment:

   ```
   <!-- workbench:blocks:#{A_number} -->
   ```

These markers are on their own lines within standard issue comments.

### Cycle Detection

Before applying any dependency relation, detect cycles by walking the existing dependency graph:

1. Collect all `blocked-by` references from the blocked issue's comments
2. Collect all `blocked-by` references from each blocking issue (transitive closure)
3. If the proposed blocking issue appears anywhere in the transitive closure, a cycle exists → **hard stop**:

   ```
   Cycle detected: #{A} → #{B} → ... → #{A}
   Cannot set #{B} as blocker for #{A} — this would create a circular dependency.
   ```

Implementation: `gh api` to fetch comments containing `workbench:blocked-by:` markers, parse numbers, walk the graph with a visited set.

### Reading Dependencies

- **Blockers of issue N**: `gh api repos/{o}/{r}/issues/{n}/comments` → filter `<!-- workbench:blocked-by:# -->` → extract numbers
- **Issues blocked by N**: `gh api repos/{o}/{r}/issues/{n}/comments` → filter `<!-- workbench:blocks:# -->` → extract numbers

## Priority and Estimate

### Priority Labels

Format: `priority:{level}` where level ∈ `{urgent, high, medium, low}`. Color: `#d9730d` (orange).

Reading:
```bash
gh issue view {n} --repo {o}/{r} --json labels --jq '.labels[].name' | grep '^priority:' | cut -d: -f2
```

Setting (ensure label exists → compute old priority label → remove old → add new):
```bash
OLD_PRIORITY=$(gh issue view {n} --repo {o}/{r} --json labels --jq '.labels[].name' | grep '^priority:' || true)
[ -n "$OLD_PRIORITY" ] && gh issue edit {n} --repo {o}/{r} --remove-label "$OLD_PRIORITY"
gh issue edit {n} --repo {o}/{r} --add-label "priority:{level}"
```

### Estimate Labels

Format: `estimate:{n}` where n is any integer. Color: `#6b7280` (grey).

Reading:
```bash
gh issue view {n} --repo {o}/{r} --json labels --jq '.labels[].name' | grep '^estimate:' | cut -d: -f2
```

Setting (same pattern as priority — remove old `estimate:*` label before adding new one):
```bash
OLD_ESTIMATE=$(gh issue view {n} --repo {o}/{r} --json labels --jq '.labels[].name' | grep '^estimate:' || true)
[ -n "$OLD_ESTIMATE" ] && gh issue edit {n} --repo {o}/{r} --remove-label "$OLD_ESTIMATE"
gh issue edit {n} --repo {o}/{r} --add-label "estimate:{n}"
```

## Decomposition Protocol

When the ticketer decomposes an epic into sub-issues:

### Step 1: Preserve Original PRD

Before overwriting the issue body with the epic template, save the original body as a document comment:

```bash
ORIGINAL_BODY=$(gh issue view {number} --repo {o}/{r} --json body --jq '.body')
gh issue comment {number} --repo {o}/{r} --body "### Original PRD: {issue_id}

$ORIGINAL_BODY

<!-- workbench:document:OriginalPRD -->"
```

### Step 2: Overwrite Body with Epic Template

The epic body format:

```markdown
## Purpose
{brief description of the epic's goal}

## Scope
{boundaries — what's in and what's out}

## Sub-Issues

| # | Issue | Depends On |
|---|-------|-----------|
| 1 | {title} | — |
| 2 | {title} | #1 |
| ... | ... | ... |

## Implementation Order
{recommended sequence}

## Notes
{additional context}
```

The `Depends On` column references sub-issue numbers within the epic (not global issue numbers).

### Step 3: Apply Epic + Decomposed Labels

Ensure both labels exist → apply:

```bash
gh issue edit {number} --repo {o}/{r} --add-label "Epic" --add-label "status:decomposed"
```

### Step 4: Create Sub-Issues

For each sub-issue in the table:

1. `gh issue create --repo {o}/{r} --title "{title}"` → captures `{child_number}`
2. Retrieve the child's node ID: `gh issue view {child_number} --repo {o}/{r} --json id --jq '.id'`
3. Link to parent: `gh api repos/{o}/{r}/issues/{parent_number}/sub_issues -f sub_issue_id={child_id}`
4. Sub-issues start with **no** `status:` **label** — the user begins workflow on each individually

### Step 5: Auto-Post Dependency Comments

For each entry in the `Depends On` column of the sub-issues table:

1. Post `<!-- workbench:blocked-by:#{dep} -->` on the dependent sub-issue
2. Post `<!-- workbench:blocks:#{dependent} -->` on the dependency sub-issue

Run cycle detection before each dependency application.

### Step 6: Terminate Ticketer

List all sub-issues:

```
Epic {issue_id} has been decomposed into {N} sub-issues:
- #{child_1}: {title_1}
- #{child_2}: {title_2} (depends on #{child_1})
...
```

The decomposed issue's workflow stops here — it has reached terminal `status:decomposed`.

## Sub-Issue Operations

### API Endpoints

| Operation | Command |
|---|---|
| Create sub-issue link | `gh api repos/{o}/{r}/issues/{parent_number}/sub_issues -f sub_issue_id={child_id}` |
| List sub-issues | `gh api repos/{o}/{r}/issues/{parent_number}/sub_issues --jq '.[].number'` |
| Get parent | `gh api repos/{o}/{r}/issues/{child_number}/parent` (returns parent issue data) |

### Two-Step Sub-Issue Creation

1. Create the issue: `gh issue create --repo {o}/{r} --title "..." --label "..."` → parse output for `{child_number}`
2. Retrieve the child's node ID: `gh issue view {child_number} --repo {o}/{r} --json id --jq '.id'`
3. Link to parent: `gh api repos/{o}/{r}/issues/{parent_number}/sub_issues -f sub_issue_id="{child_id}"`

The issue's `id` (node ID, not number) is needed for the sub-issue API.

### API Error Handling (FR20)

If the sub-issues API returns 404 or 422:

```
Sub-issues API not available for this repo — enable it at https://github.com/{owner}/{repo}/settings/features
```

The error is surfaced with the exact settings link for the repo.

## Startup Validation

At skill load time, agents must perform these checks:

### Authentication Check (FR4)

```bash
gh auth status
```

If exit code is non-zero → **hard stop**:

```
GitHub CLI is not authenticated. Run `gh auth login` first.
```

### GitHub Projects V2 Rejection (FR31)

Validate the target repo uses standard GitHub Issues (not Projects V2):

```bash
gh api repos/{owner}/{repo} --jq '.has_issues'
```

If `has_issues` is `false` (repo uses Projects V2 or has issues disabled) → **hard stop**:

```
GitHub Projects V2 is not supported by the github-issues PM skill.
The target repo '{owner}/{repo}' has GitHub Issues disabled.
Switch to a repo with Issues enabled, or configure a different project management tool.
```

## Issue References

### Issue URL

```
https://github.com/{owner}/{repo}/issues/{number}
```

Use this format when referencing issues in documents or plans.

### Commit Trailer

Format: `Delivers #{number}`

Example:
```

Delivers #42

```

`Delivers` intentionally avoids GitHub's auto-close keywords (`Closes`, `Fixes`, `Resolves`) to preserve the review workflow step — the reviewer agent explicitly closes the issue after verification.

Include this trailer on the first commit only when an issue ID is associated with the changes.

### Branch Format

```
feature/{number}-{slug}
```

No `#` character in branch names — avoids shell and git escaping issues. The `{number}` is the bare issue number (e.g., `42`, not `#42`).

Example: `feature/42-add-github-skill`
