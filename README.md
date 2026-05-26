# workbench

## What is Workbench?
Workbench is a mono-repo template that engineers clone for a consistent, structured development environment. It wires together multiple project repos as git submodules and provides a standard set of slash commands for orchestrating AI coding agents through a defined development workflow.

### Problem 1: Configuration Pollution
In multi-repo team environments, development configuration — editor settings, linter rules, CI pipelines, git hooks, and sub-agent configuration — drifts out of sync across team members. Each engineer maintains their own ad-hoc setup, leading to inconsistent tooling, broken pipelines, and onboarding friction. Workbench solves this by centralizing all configuration in a single mono-repo template. Engineers clone it and get a complete, consistent environment: `.opencode/` commands and skills, `.workbench/` settings, and standardized tooling are all pre-configured.

### Problem 2: Context Loss
AI coding agents lose context between sessions. Without a structured workspace, each new session requires re-explaining the project structure, conventions, and active work — wasting time and producing inconsistent results. Workbench gives AI agents a persistent home. Git submodules keep projects organized, issue tracking integration and slash commands maintain workflow state across sessions, and the `.workbench/` and `.opencode/` directories store project-specific configuration that agents reference automatically.

### Problem 3: Agentic SDLC
Without standardized workflows, each team member interacts with AI coding agents differently — different prompts, different quality gates, different review processes. This leads to uneven code quality and unpredictable delivery. Workbench provides a structured Agentic Software Development Life Cycle (ASDLC) — a pipeline of slash commands (`/ticket`, `/research`, `/plan`, `/execute`, `/review`, `/commit`) that guide every issue through consistent stages, each powered by a dedicated sub-agent with a specific responsibility. The human runs the slash commands; the agents execute the structured workflows.

[![CI](https://github.com/workbench-codes/workbench/actions/workflows/ci-workbench-cli.yml/badge.svg)](https://github.com/workbench-codes/workbench/actions/workflows/ci-workbench-cli.yml)
[![npm](https://img.shields.io/npm/v/@workbench-codes/workbench)](https://www.npmjs.com/package/@workbench-codes/workbench)
[![JSR](https://jsr.io/badges/@workbench-codes/workbench)](https://jsr.io/@workbench-codes/workbench)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Getting Started

### 1. Prerequisites
- [Bun](https://bun.sh) installed
- [gh CLI](https://cli.github.com) installed and authenticated (`gh auth login`)

### 2. Install the CLI

Choose to install the CLI from the package manager or the source code.

#### 2.1 Install from the package manager (recommended)

Install the package from [![npm](https://img.shields.io/npm/v/@workbench-codes/workbench)](https://www.npmjs.com/package/@workbench-codes/workbench) or [![JSR](https://jsr.io/badges/@workbench-codes/workbench)](https://jsr.io/@workbench-codes/workbench).

For example:

```bash
npm install -g @workbench-codes/workbench
```

#### 2.2 Install from the cloned repo

If you have cloned the repo and you don't want to install the package from npm (or other sources) then this is how you install the package.

```bash
cd packages/workbench-cli
bun install
bun link
```
See [packages/workbench-cli/README.md](packages/workbench-cli/README.md) for full CLI documentation.

### 3. Initialize your workbench

> [!IMPORTANT] 
> Run the following command in a folder where workbench folder should be created.

```bash
workbench --init
```
This launches an interactive flow to fork, clone, and wire up your repositories.


## Folder structure

| Folder | Purpose |
|--------|---------|
| `.opencode/` | Slash commands, workflow sub-agents, skills, and MCP configuration |
| `packages/workbench-cli/` | The `workbench` CLI tool (TypeScript, Bun) |
| `projects/` | Git submodules for code repositories |
| `resources/` | Git submodules for documentation/resource repositories |
| `scripts/` | Placeholder for helper scripts |
| `thoughts/` | Planning notes, research, and ticket documentation (Not checked in) |

## Working on issues

Once your workbench is set up, work on issues using the built-in slash commands in either [OpenCode](https://opencode.ai/) or [Claude Code](https://claude.ai/code). Both implement the same structured flow from issue analysis through to review.

### Prerequisites

- [OpenCode](https://opencode.ai/) or [Claude Code](https://claude.ai/code) installed
- A configured project management tool (see [Project Management](#project-management) below)

### The development flow

```
/implement
```

`/implement` is the end-to-end orchestrator. It resumes from the issue's
current status label and runs the remaining commands automatically.
Each `/implement` run also creates a PM document with an implementation report.

Manual flow remains available:

```
/ticket → /research → /plan → /execute → /review → /commit
```

Each command takes an issue ID as its argument and is best run in a fresh OpenCode session:

| Command | What it does |
|---------|-------------|
| `/ticket {issue-id}` | Structures an issue for development |
| `/research {issue-id}` | Researches the codebase in context of the issue |
| `/plan {issue-id}` | Creates a detailed implementation plan |
| `/execute {issue-id}` | Implements the plan |
| `/review {issue-id}` | Reviews the execution against the plan |
| `/implement {issue-id} [ticket\|research\|plan\|execute\|review\|commit]` | Orchestrates all remaining workflow steps, optionally bounded to a stop-step |
| `/commit` | Commits the changes in atomic commits, ready for review |

### How it works

Under the hood, each slash command is powered by a dedicated sub-agent:

- **ticketer** — powered by `/ticket`. Handles interactive Q&A, scope boundary exploration, and ticket writing.
- **researcher** — powered by `/research`. Runs a multi-phase pipeline to locate, pattern-match, and analyze relevant code in the codebase.
- **planner** — powered by `/plan`. Interacts on design decisions and writes detailed phased implementation plans.
- **executer** — powered by `/execute`. Implements phases sequentially, tracks deviations from the plan, and writes execution notes.
- **reviewer** — powered by `/review`. Validates the implementation against plan specifications and writes review reports.
- **committer** — powered by `/commit`. Creates atomic git commits with conventional messages and issue trailers.

`/implement` orchestrates these sub-agents automatically, advancing through the workflow based on the issue's current status label.

### Example

```bash
# Manual flow
/ticket PAP-1234
/research PAP-1234
/plan PAP-1234
/execute PAP-1234
/review PAP-1234
/commit

# Orchestrated flow
/implement PAP-1234

# ONLY for GitHub Issues we also need to pass the {owner}/{repo}
# Thisis needed because GitHub issues are unique in scope of a repository
/implement 54 workbench-codes/workbench
# or up to a stage
/implement 54 plan workbench-codes/workbench

# Orchestrated flow with optional stop-step bound
/implement PAP-1234 research
```

`/implement` accepts an optional stop-step (`ticket|research|plan|execute|review|commit`).
Input is case-insensitive, normalized to lowercase, and must not be earlier than the issue's current status progression.

The commands are defined in [`.opencode/command/`](.opencode/command/) and can be customised for your own workflow.

## Project Management

The workbench supports multiple project management backends. The active backend is configured in [`.workbench/settings.yml`](.workbench/settings.yml) via the `project_management` field:

```yaml
project_management: github-issues
```

Supported PM tools are:
- Linear (`linear`)
- GitHub Issues (`github-issues`)

Authentication and setup instructions vary by backend — refer to the relevant PM tool's documentation for authentication steps.

## Code indexing with ck

The setup wizard optionally indexes your repositories with [ck](https://beaconbay.github.io/ck/) — a hybrid code search tool by [BeaconBay](https://github.com/beaconbay) that fuses lexical (BM25/grep) precision with embedding-based recall, so you can find the right code even when the exact keywords aren't there.


## Syncing Your Workbench

The workbench is periodically updated with improvements to slash commands, skills, schemas, and documentation. To fetch the latest managed files from the source repository, run `workbench --sync` from your workbench root:

```bash
workbench --sync
```

Sync clones the source, applies the configured file paths (`.opencode/`, `.workbench/schemas/`, `README.md`), and auto-commits changes with a chore message. An interactive confirmation prompt lets you review and abort before any files are overwritten.

Sync requires an initialized workbench (created via `workbench --init`) and a clean working tree. Run periodically to stay updated.

See [packages/workbench-cli/README.md](packages/workbench-cli/README.md) for full flag documentation and troubleshooting.


## Development Setup

To set up the workbench CLI for local development:

```bash
cd packages/workbench-cli
bun install
bun tsc --noEmit
```

This installs dependencies and runs the TypeScript type checker. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow, build commands, and PR submission guide.

## Acknowledgements

workbench is inspired by [Cluster444/agentic](https://github.com/Cluster444/agentic), which pioneered the idea of a structured agentic development workflow using slash commands.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, the development workflow, and how to submit a PR.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## License

MIT — see [LICENSE](LICENSE).
