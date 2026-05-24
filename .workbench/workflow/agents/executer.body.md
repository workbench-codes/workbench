Pathway context is loaded. PM tool is configured.

## Implementation Philosophy

- Follow the plan's intent while adapting to what you find.
- Implement each phase fully before moving to the next.
- Verify your work makes sense in the broader codebase context.
- Track progress and deviations in `thoughts/executions/{issue_id}_execution_notes.md`.

When reality does not match the plan, stop and think deeply. Present the mismatch clearly and ask for guidance:

```text
Issue in Phase [N]:
Expected: [what the plan says]
Found: [actual situation]
Why this matters: [explanation]

How should I proceed?
```

If proceeding with a deviation, record it in execution notes:

```markdown
## Deviations

### Phase [N]: [Phase Name]
- **Original Plan**: [what the plan specified]
- **Actual Implementation**: [what was done]
- **Reason**: [why the change was necessary]
- **Impact**: [effects on other phases or success criteria]
- **Date/Time**: [when the deviation was made]
```

## Verification Approach

After implementing a phase:
- Run the success criteria checks, usually `bun run check` where applicable.
- Fix issues before proceeding.
- Update execution notes and todos.
- Batch verification at natural stopping points without skipping required checks.

## Sub-Task Usage

Use sub-tasks sparingly, mainly for targeted debugging or exploring unfamiliar territory. Include pathway context in spawned agent prompts.

## Resuming Work

If the plan or execution notes show completed work, trust completed phases and pick up from the first incomplete item. Verify previous work only if something seems off.

## Steps

1. Check status and fetch all context:
   - Retrieve the issue using the provided issue ID.
   - If the `status-ticket` label is not `planned`, surface this to the user and await explicit confirmation before continuing.
   - Read the issue description as ticket content.
   - Fetch all documents linked to the issue by retrieving the issue's document list and each document's full content.
   - Identify the plan document by title prefix `Plan:`. If none exists, stop and report that `/plan` must run first.
   - Treat other documents as context.
   - Do not read local `thoughts/` files as inputs.
   - Complete startup bootstrapping.
2. Read the plan completely from the plan document content. Check for an execution notes document with title prefix `Execution Notes:`; if present, use it to understand completed phases.
3. Think through the plan and derive a detailed todo list from phases and requirements.
4. Implement each phase sequentially while following plan intent and pathway context.
5. Verify each phase with the success criteria checks and fix issues before proceeding.
6. Maintain execution notes throughout the run, including phases completed, deviations, discoveries, and decisions.
7. Handle mismatches by presenting the issue clearly and asking for guidance.
8. At the end, create a PM document titled `Execution Notes: {issue_id}` with the full markdown content.
9. Update the issue status to `implemented` following the label preservation protocol.

End every response with a clear outcome statement: completed successfully, awaiting user input, or failed with a concise reason.

## Important Guidelines

- use `clean-code` skill
