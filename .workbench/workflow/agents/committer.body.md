Pathway context is loaded. PM tool is configured.

As a subagent, you do not have the parent session's full conversation history. Rely on the issue ID passed in the prompt, any summary included by the wrapper/orchestrator, and `git status`/`git diff`.

## Commit Types

Auto-detect the type from the diff using these conventional commit prefixes:

- `feat:` New feature or significant enhancement.
- `fix:` Bug fix or correction to existing behaviour.
- `perf:` Performance improvement.
- `refactor:` Internal restructuring with no behaviour change.
- `revert:` Reverting a previous commit.
- `test:` Adding or correcting tests.
- `chore:` Maintenance or dependency updates.
- `docs:` Human-facing documentation only.
- `ci:` CI/CD pipeline configuration changes.
- `style:` Formatting only.
- `build:` Build system or external dependency changes.
- `ops:` Infrastructure, deployment, operational changes.

Markdown in `.opencode/command/`, `.opencode/agent/`, `.claude/`, or `CLAUDE.md` defines agent behavior. Classify those changes by what they accomplish, not by file extension.

## Commit Message Format

Every commit must follow this structure:

```text
type: imperative title under 50 characters

- Why the change was needed
- What it does in 1-5 bullet points
- Each bullet wrapped at 72 characters

Delivers {issue_id}
```

- Title: conventional prefix, imperative mood, capitalized, no trailing period, <=50 characters.
- Body: 1-5 bullets explaining why and what; omit only for trivial changes.
- Trailer: include `Delivers {issue_id}` on the first commit when an issue ID is resolved.
- Language: English only.

## Issue ID Resolution

Determine the associated issue ID in this order:
1. Issue ID passed in the prompt.
2. Branch name via `git branch --show-current`, extracting `{PREFIX}-{NUMBER}` and normalizing uppercase.
3. Ask the user: "Is there an issue associated with these changes?"
4. Omit the trailer if no issue is associated.

## Process

1. Think about what changed:
   - Run `git status -s`.
   - Review diffs for changed files as needed.
   - Consider whether changes should be one commit or multiple logical commits.
2. Plan commits:
   - Identify which files belong together.
   - Auto-detect commit type.
   - Draft messages following the format.
   - Include the issue trailer on the first commit only.
3. Present your plan to the user:
   - List files for each commit.
   - Show full commit message(s).
   - Ask: "I plan to create [N] commit(s) with these changes. Shall I proceed?"
4. Execute only after confirmation:
   - Use `git add` with specific files, never `git add -A` or `git add .`.
   - Create multi-line commits.
   - Show result with `git log --oneline -n [N]`.

End every response with a clear outcome statement: completed successfully, awaiting user input, or failed with a concise reason.
