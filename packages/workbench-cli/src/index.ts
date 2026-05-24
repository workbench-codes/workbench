import { createCliRenderer, TextRenderable, type CliRenderer } from "@opentui/core"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { checkAuth, checkRepoRoot, getCurrentUserLogin } from "./utils/gh.ts"
import { showMainMenu } from "./screens/mainMenu.ts"
import { runInitFlow, executeInit, type InitState, type InitProgress } from "./commands/init.ts"
import { executeInitialise, executeCreateRemote, validateInitialiseState, runInitialiseFlow, type InitialiseState } from "./commands/initialise.ts"
import { executeSync } from "./commands/sync.ts"
import { executeAddHarness, executeRemoveHarness } from "./commands/harness.ts"
import { parseCliArgs, printHelp, type CliArgs } from "./args.ts"
import { buildRepoFromUrl } from "./utils/repo.ts"
import type { Repo } from "./screens/repoSelect.ts"
import { theme, detectMode } from "./theme"

const args = parseCliArgs()

if (args.help || (process.argv.length === 2 && !args.addHarness && !args.removeHarness)) {
  printHelp()
  process.exit(0)
}

if (args.addHarness) {
  void runAddHarness(args)
} else if (args.removeHarness) {
  void runRemoveHarness(args)
} else if (args.sync) {
  void runSync(args)
} else if (args.init) {
  if (args.noTui) {
    void runNonInteractiveInitCmd(args)
  } else {
    void runTuiInitMode(args)
  }
} else if (args.tui) {
  void runTuiMode()
} else {
  void runNonInteractiveInit(args)
}

async function runSync(args: CliArgs): Promise<void> {
  const result = await executeSync()

  if (!result.success) {
    if (result.error) {
      console.error(result.error)
    }
    process.exit(1)
  }

  process.exit(0)
}

async function runAddHarness(args: CliArgs): Promise<void> {
  const result = await executeAddHarness(args.addHarness!)
  if (result.success) {
    console.log(`Harness '${args.addHarness}' added:`)
    result.created?.forEach((path) => console.log(`  ${path}`))
  } else {
    console.error(result.error || `Failed to add harness '${args.addHarness}'`)
    process.exit(1)
  }
  process.exit(0)
}

async function runRemoveHarness(args: CliArgs): Promise<void> {
  const result = await executeRemoveHarness(args.removeHarness!)
  if (result.success) {
    if (result.removed && result.removed.length > 0) {
      console.log(`Harness '${args.removeHarness}' removed:`)
      result.removed.forEach((path) => console.log(`  ${path}`))
    } else {
      console.log(`No harness '${args.removeHarness}' found (nothing to remove)`)
    }
  } else {
    console.error(result.error || `Failed to remove harness '${args.removeHarness}'`)
    process.exit(1)
  }
  process.exit(0)
}

async function runTuiMode(): Promise<void> {
  checkAuth()
  checkRepoRoot()

  await detectMode()
  const renderer: CliRenderer = await createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: ["SIGTERM", "SIGQUIT", "SIGABRT", "SIGHUP"],
    targetFps: 30,
  })

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const { version } = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf-8")
  )

  const versionBadge = new TextRenderable(renderer, {
    id: "version-badge",
    content: `v${version}`,
    fg: theme.tokens.subtitle.fg,
    position: "absolute",
    right: 1,
    bottom: 0,
    zIndex: 1000,
  })
  renderer.root.add(versionBadge)

  let ctrlCTimer: ReturnType<typeof setTimeout> | null = null
  let ctrlCNode: TextRenderable | null = null

  renderer.keyInput.on("keypress", (key) => {
    if (key.ctrl && key.name === "c") {
      if (ctrlCTimer !== null) {
        clearTimeout(ctrlCTimer)
        renderer.destroy()
        process.exit(0)
      } else {
        ctrlCNode = new TextRenderable(renderer, {
          id: "ctrl-c-prompt",
          content: "Press Ctrl+C again to exit",
          fg: theme.tokens.ctrlCPrompt.fg,
        })
        renderer.root.add(ctrlCNode)
        ctrlCTimer = setTimeout(() => {
          if (ctrlCNode) {
            renderer.root.remove(ctrlCNode.id)
            ctrlCNode = null
          }
          ctrlCTimer = null
        }, 3000)
      }
    }
  })

  process.on("uncaughtException", () => {
    renderer.destroy()
    process.exit(1)
  })
  process.on("unhandledRejection", () => {
    renderer.destroy()
    process.exit(1)
  })

  const isInitialized = existsSync(".workbench/config.yaml")

  function launchMainMenu(initialized: boolean): void {
    showMainMenu(renderer, initialized, {
      onInit: () => runInitFlow(renderer, launchMainMenu),
      onExit: () => {
        renderer.destroy()
        process.exit(0)
      },
    })
  }

  launchMainMenu(isInitialized)
}

async function runNonInteractiveInit(args: CliArgs): Promise<void> {
  if (!args.org) {
    console.error("organization is required (--org)")
    process.exit(1)
  }

  const hasRepos = args.codeRepositories.length > 0 || args.resourceRepositories.length > 0
  if (!hasRepos) {
    console.error("at least one repository required")
    process.exit(1)
  }

  if (existsSync(".workbench/config.yaml")) {
    console.error(".workbench/ already exists")
    process.exit(1)
  }

  checkAuth()

  const codeRepos: Repo[] = args.codeRepositories.map((url) =>
    buildRepoFromUrl(url, args.codeBranch)
  )
  const resourceRepos: Repo[] = args.resourceRepositories.map((url) =>
    buildRepoFromUrl(url, args.resourceBranch)
  )

  const branches = new Map<string, string>()
  for (const repo of codeRepos) {
    branches.set(repo.name, args.codeBranch)
  }
  for (const repo of resourceRepos) {
    branches.set(repo.name, args.resourceBranch)
  }

  const state: InitState = {
    selectedOrg: args.org,
    codeRepos,
    resourceRepos,
    branches,
    shouldIndex: args.index,
  }

  const stdoutProgress: InitProgress = {
    onLine: (line, isHeader, isCR) => {
      if (isCR) {
        process.stdout.write(`\r${line}`)
      } else {
        console.log(line)
      }
    },
    startThrottle: () => {},
    stopThrottle: () => {},
  }

  const result = await executeInit(state, stdoutProgress)

  if (!result.success) {
    console.error(result.error?.message || "Initialization failed")
    process.exit(1)
  }

  process.exit(0)
}

async function runNonInteractiveInitCmd(args: CliArgs): Promise<void> {
  const state: InitialiseState = {
    name: args.name,
    source: args.source,
  }

  const validationError = validateInitialiseState(state)
  if (validationError) {
    console.error(validationError)
    process.exit(1)
  }

  const stdoutProgress: InitProgress = {
    onLine: (line, isHeader, isCR) => {
      if (isCR) {
        process.stdout.write(`\r${line}`)
      } else {
        console.log(line)
      }
    },
    startThrottle: () => {},
    stopThrottle: () => {},
  }

  const result = await executeInitialise(state, stdoutProgress)

  if (!result.success) {
    console.error(result.error || "Initialisation failed")
    process.exit(1)
  }

  if (args.remote) {
    const targetOrg = args.org ?? (await getCurrentUserLogin())
    const remoteResult = await executeCreateRemote(targetOrg, args.name, stdoutProgress)
    if (!remoteResult.success) {
      console.error(remoteResult.error || "Remote creation failed")
      process.exit(1)
    }
  }

  const hasRepos = args.codeRepositories.length > 0 || args.resourceRepositories.length > 0
  if (!hasRepos) {
    if (args.remote) {
      console.log(`\nWorkbench initialised and remote configured in ./${state.name}/`)
    } else {
      console.log(`\nWorkbench initialised in ./${state.name}/`)
      console.log("To add a remote: git remote add origin <url>")
    }
    console.log("To set up your workbench, run: workbench --tui")
    process.exit(0)
  }

  if (existsSync(".workbench/config.yaml")) {
    console.error(".workbench/ already exists")
    process.exit(1)
  }

  const targetOrg = args.org ?? (await getCurrentUserLogin())
  const codeRepos: Repo[] = args.codeRepositories.map((url) =>
    buildRepoFromUrl(url, args.codeBranch)
  )
  const resourceRepos: Repo[] = args.resourceRepositories.map((url) =>
    buildRepoFromUrl(url, args.resourceBranch)
  )
  const branches = new Map<string, string>()
  for (const repo of codeRepos) branches.set(repo.name, args.codeBranch)
  for (const repo of resourceRepos) branches.set(repo.name, args.resourceBranch)

  const setupState: InitState = {
    selectedOrg: targetOrg,
    codeRepos,
    resourceRepos,
    branches,
    shouldIndex: args.index,
  }

  const setupResult = await executeInit(setupState, stdoutProgress)

  if (!setupResult.success) {
    console.error(setupResult.error?.message || "Setup failed")
    process.exit(1)
  }

  process.exit(0)
}

async function runTuiInitMode(args: CliArgs): Promise<void> {
  await detectMode()
  const renderer: CliRenderer = await createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: ["SIGTERM", "SIGQUIT", "SIGABRT", "SIGHUP"],
    targetFps: 30,
  })

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const { version } = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf-8")
  )

  const versionBadge = new TextRenderable(renderer, {
    id: "version-badge",
    content: `v${version}`,
    fg: theme.tokens.subtitle.fg,
    position: "absolute",
    right: 1,
    bottom: 0,
    zIndex: 1000,
  })
  renderer.root.add(versionBadge)

  let ctrlCTimer: ReturnType<typeof setTimeout> | null = null
  let ctrlCNode: TextRenderable | null = null

  renderer.keyInput.on("keypress", (key) => {
    if (key.ctrl && key.name === "c") {
      if (ctrlCTimer !== null) {
        clearTimeout(ctrlCTimer)
        renderer.destroy()
        process.exit(0)
      } else {
        ctrlCNode = new TextRenderable(renderer, {
          id: "ctrl-c-prompt",
          content: "Press Ctrl+C again to exit",
          fg: theme.tokens.ctrlCPrompt.fg,
        })
        renderer.root.add(ctrlCNode)
        ctrlCTimer = setTimeout(() => {
          if (ctrlCNode) {
            renderer.root.remove(ctrlCNode.id)
            ctrlCNode = null
          }
          ctrlCTimer = null
        }, 3000)
      }
    }
  })

  process.on("uncaughtException", () => {
    renderer.destroy()
    process.exit(1)
  })
  process.on("unhandledRejection", () => {
    renderer.destroy()
    process.exit(1)
  })

  runInitialiseFlow(renderer, args, () => {
    renderer.destroy()
    process.exit(0)
  })
}
