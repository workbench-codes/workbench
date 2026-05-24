Pathway context is loaded. PM tool is configured.

## Process Steps

If you ask questions, include them naturally in your output, clearly state that you are awaiting input, and expect the parent command or orchestrator to resume you with `task_id` and the user's response.

### Step 1: Context Gathering And Initial Analysis

1. Retrieve the issue using the provided issue ID.
2. If the `status-ticket` label is not `researched`, surface this to the user and await explicit confirmation before continuing:

```text
The `status-ticket` label is currently '{status}', not 'researched'. Planning is intended to run after research. Do you want to proceed anyway?
```

3. Read the issue `description` field as the ticket content.
4. Fetch all documents linked to the issue by retrieving the issue's document list and then each document's full content.
5. Treat all documents as context, including research and prior artifacts.
6. Do not read local `thoughts/` files as inputs; the project management tool is the source of truth.
7. Complete startup bootstrapping.

Spawn initial research tasks before asking user questions:
- Use codebase-locator to find files related to ticket components.
- Use codebase-analyzer to understand current implementation.
- If relevant, use thoughts-locator to find historical documents.
- Include pathway context in every spawned agent prompt.

After research tasks complete, read all files they identify as relevant fully into context. Cross-reference requirements with actual code, identify discrepancies and assumptions, and determine true scope.

Present informed understanding and focused questions only where code investigation cannot answer them.

### Step 2: Think Through Ticket And Research

- If the user corrects a misunderstanding, verify the correction through new research before accepting it.
- Determine what actually needs to change based on findings.
- Spawn deeper research tasks as needed: codebase-locator, codebase-analyzer, codebase-pattern-finder, thoughts-locator, thoughts-analyzer.
- Wait for all sub-tasks to complete.
- Present findings, current state, design options, and open questions requiring human judgment.

### Step 3: Plan Structure Development

Once aligned on approach, create an initial plan outline:

```markdown
Here's my proposed plan structure:

## Overview
[1-2 sentence summary]

## Implementation Phases:
1. [Phase name] - [what it accomplishes]
2. [Phase name] - [what it accomplishes]
3. [Phase name] - [what it accomplishes]

Does this phasing make sense? Should I adjust the order or granularity?
```

Get feedback before writing detailed plan content.

### Step 4: Detailed Plan Writing

After structure approval:
- Write the plan to `thoughts/plans/{issue_id}_{descriptive_name}.md`.
- Create a PM document titled `Plan: {issue_id} - {descriptive_name}` with the full markdown content.
- Treat the local file as a convenience copy only; downstream commands must not read it as input.

Use this template structure:

```markdown
# [Feature/Task Name] Implementation Plan

## Overview
[Brief description]

## Current State Analysis
[What exists now, what's missing, constraints]

## Desired End State
[Specification and verification]

### Key Discoveries
- [Important finding with file:line reference]

## What We're NOT Doing
[Explicit exclusions]

## Implementation Approach
[High-level strategy]

## Phase 1: [Descriptive Name]

### Overview
[What this phase accomplishes]

### Changes Required

#### 1. [Component/File Group]
**File**: `path/to/file.ext`
**Changes**: [Summary]

### Success Criteria

#### Automated Verification
- [ ] [Command or structural check]

#### Manual Verification
- [ ] [Manual test]
```

Include additional phases, testing strategy, performance considerations, migration notes, and references.

### Step 5: Review

Present the draft plan location and ask for feedback on phase scope, success criteria, technical details, and missing edge cases. Iterate until the user is satisfied.

### Step 6: Set Status To Planned

Update the status to `planned` following the label preservation protocol.

## Important Guidelines

- Be skeptical: question vague requirements and verify with code.
- Be interactive: get buy-in at each major step.
- Be thorough: read identified context files completely and include file references.
- Be practical: prefer incremental, testable changes.
- Track progress with todos.
- Do not write a final plan with unresolved open questions.
- Always separate automated and manual success criteria.
- use `clean-code` skill

End every response with a clear outcome statement: completed successfully, awaiting user input, or failed with a concise reason.
