# workbench CLI

[![CI](https://github.com/workbench-codes/workbench/actions/workflows/ci-workbench-cli.yml/badge.svg)](https://github.com/workbench-codes/workbench/actions/workflows/ci-workbench-cli.yml)
[![npm](https://img.shields.io/npm/v/@workbench-codes/workbench)](https://www.npmjs.com/package/@workbench-codes/workbench)
[![JSR](https://jsr.io/badges/@workbench-codes/workbench)](https://jsr.io/@workbench-codes/workbench)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

## What is Workbench?
Workbench is a mono-repo template for agentic engineering — it gives teams a consistent environment with structured slash-command workflows for working with AI coding agents.

[Learn more →](https://github.com/workbench-codes/workbench/blob/main/README.md#what-is-workbench)

## Prerequisites

- [Bun](https://bun.sh) installed
- [gh CLI](https://cli.github.com) installed and authenticated (`gh auth login`)

## Installation

```bash
cd packages/workbench-cli
bun install
bun link
```

After linking, the `workbench` command is available globally.

## Run without installing

```bash
bun run src/index.ts
```

## Quick start

### Interactive (TUI)

```bash
workbench --init
```

Launches an interactive flow: enter source repository and name, clone the template repo, optionally create a private remote, then optionally run the setup wizard.

### Non-interactive

```bash
workbench --init --no-tui --name my-project
```

### Init + setup in one command

```bash
workbench --init --no-tui --name my-project --org myorg --code-repository https://github.com/myorg/api
```

### Existing repo

If you already have a workbench repo cloned:

```bash
workbench --tui
```

## Init flags

| Flag | Description | Default |
|------|-------------|---------|
| `--init` | Initialize a new workbench (clone) | `false` |
| `--name <name>` | Name for the local folder | `workbench` |
| `--source <repo>` | Source repository to clone from | `workbench-codes/workbench` |
| `--remote` | Create a private GitHub repo and set as origin | `false` |
| `--no-tui` | Skip TUI, use defaults or provided values | `false` |

## Setup flags

These flags work with both `--init` and standalone usage:

| Flag | Description | Default |
|------|-------------|---------|
| `--org <name>` | GitHub organization name | personal account |
| `--code-repository <url>` | Code repository URL (can be repeated) | — |
| `--resource-repository <url>` | Resource repository URL (can be repeated) | — |
| `--code-branch <name>` | Branch for all code repositories | `main` |
| `--resource-branch <name>` | Branch for all resource repositories | `main` |
| `--index <on\|off>` | Run [ck](https://beaconbay.github.io/ck/) indexing after init | `on` |
| `--tui` | Launch interactive TUI mode | `false` |

> **What is ck?** [ck](https://beaconbay.github.io/ck/) is a hybrid code search tool by [BeaconBay](https://github.com/beaconbay) that fuses lexical (BM25/grep) precision with embedding-based recall, so you can find the right code even when the exact keywords aren't there.


## Sync

Fetches managed workbench files from the source repository and merges them into your local workbench. Sync clones the source, reads the configured `sync.paths`, prompts for confirmation, and auto-commits any changes. This keeps your workbench up to date with upstream improvements without manual file tracking.

| Flag | Description | Default |
|------|-------------|---------|
| `--sync` | Sync workbench files (`.opencode/`, `.workbench/schemas/`, `README.md`) from the source repository | `false` |

Sync requires an initialized workbench and a clean working tree. Run `workbench --sync` from your workbench root.

## Examples

```bash
# Interactive init
workbench --init

# Non-interactive init with custom name
workbench --init --no-tui --name my-project

# Clone from a custom source
workbench --init --no-tui --name my-project --source myorg/custom-workbench

# Create a private remote repository
workbench --init --no-tui --name my-project --remote --org myorg

# Init + remote + setup in one command
workbench --init --no-tui --name my-project --remote --org myorg --code-repository https://github.com/myorg/api

# Standalone setup (existing repo)
workbench --org myorg --code-repository https://github.com/myorg/backend

# Interactive setup (existing repo)
workbench --tui
# Sync managed files from the source workbench
workbench --sync
```

## What the setup wizard does

Running init walks through:

1. Enter source repository and name.
2. Select code repositories — added as submodules under `projects/`.
3. Select resource repositories — added as submodules under `resources/`.
4. Configure the target branch per repository.
5. Optionally index with [ck](https://beaconbay.github.io/ck/).

Afterwards, `.workbench/config.yaml` is written with the selected configuration.

## Error scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `A folder named "X" already exists in the current directory` | Local folder conflict | Remove or rename the folder, or choose a different name |
| `Remote creation failed` | `gh repo create` failed | Check `gh auth login` and org permissions |
| `gh CLI is not authenticated` | `gh auth` not set up | Run `gh auth login` |
| `Invalid name "X"` | Bad characters in name | Use only alphanumeric, `-`, `.`, `_` |
| `No .workbench/config.yaml found` | Workbench not initialized | Run `workbench --init` first |
| `No source.repository found in config` | Config predates sync feature | Re-initialize workbench |
| `Working tree is not clean` | Uncommitted changes present | Commit or stash changes first |
| `No sync.paths found in source` | Source workbench doesn't support sync | Contact source maintainer |

## Development

```bash
# Type-check
bun tsc --noEmit

# Build
bun run build

# Smoke test the built output
./dist/index.js --help
```

Source lives in `src/`. The entry point is `src/index.ts`.

## Releases

Releases are tag-driven and publish to both npm and JSR automatically. Maintainers run:

```bash
npm run release:patch   # 0.1.x
npm run release:minor   # 0.x.0
npm run release:major   # x.0.0
```

See [GitHub Releases](https://github.com/workbench-codes/workbench/releases) for the version history.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full guide.

## License

MIT — see [LICENSE](../../LICENSE).
