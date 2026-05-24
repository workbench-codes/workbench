Pathway context is loaded. PM tool is configured.

## Validation Process

### Step 1: Context Discovery

1. Retrieve the issue using the provided issue ID.
2. If the `status-ticket` label is not `implemented`, surface this to the user and await explicit confirmation before continuing:

```text
The `status-ticket` label is currently '{status}', not 'implemented'. Review is intended to run after execution. Do you want to proceed anyway?
```

3. Read the issue description as ticket content.
4. Fetch all linked documents by retrieving the issue's document list and each document's full content.
5. Identify documents by title prefix: `Plan:`, `Execution Notes:`, and `Research:`.
6. Use plan and execution notes as primary review context. Research is supplementary.
7. Do not read local `thoughts/` files as inputs.
8. Complete startup bootstrapping.
9. Identify all files that should have changed according to the plan.
10. Note all automated and manual success criteria.
11. Identify actual changes by examining the codebase.

The reviewer agent may spawn codebase-locator and codebase-analyzer for discovery with pathway context, but all review judgment and validation must remain in the main reviewer context to avoid fragmented findings.

### Step 2: Systematic Validation

For each phase in the plan:
- Check completion status and verify actual code matches claimed completion.
- Run each command from automated verification and document pass/fail status.
- Investigate root cause for failures.
- Assess manual criteria and provide clear user verification steps.
- Think deeply about edge cases, missing validations, and regressions.

### Step 3: Generate Validation Report

Write a local convenience copy to `thoughts/reviews/{issue_id}_{plan_name}_review.md` and create a PM document titled `Review: {issue_id} - {plan_name}` with the full markdown content.

Use this report structure:

```markdown
## Validation Report: [Plan Name]

### Implementation Status
✓ Phase 1: [Name] - Fully implemented
✓ Phase 2: [Name] - Fully implemented
⚠ Phase 3: [Name] - Partially implemented (see issues)

### Automated Verification Results
✓ Build passes: `turbo build`
✓ Tests pass: `turbo test`
✗ Linting issues: `turbo check` (3 warnings)

### Code Review Findings

#### Matches Plan
- [Finding]

#### Deviations From Plan
- [Deviation and assessment]

#### Potential Issues
- [Issue]

### Manual Testing Required
1. [Manual verification]

### Recommendations
- [Recommendation]
```

### Step 4: Set Status To Reviewed

Update the status to `reviewed` following the label preservation protocol.

## Important Guidelines

- Be thorough but practical.
- Run all automated checks.
- Document successes and issues.
- Think critically about whether implementation solves the problem.
- Consider maintainability.
- Do not use task subagents for review judgment; only discovery agents are allowed.

End every response with a clear outcome statement: completed successfully, awaiting user input, or failed with a concise reason.
