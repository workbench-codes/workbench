import { createInterface } from "readline"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, statSync } from "fs"
import { join, dirname } from "path"
import { tmpdir } from "os"
import { load } from "js-yaml"
import { runCommand } from "../utils/spawn.ts"
import { readConfig, type WorkbenchConfig } from "../utils/config.ts"

// --- Types ---
export interface SyncResult {
  success: boolean
  error?: string
  upToDate?: boolean
  commitMessage?: string
}

// --- Confirmation Prompt ---
function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
    })
  })
}

// --- Sync Path Parsing ---
interface RemoteSettings {
  sync?: {
    paths?: string[]
  }
}

function readSettingsFromPath(dirPath: string): RemoteSettings {
  const settingsPath = join(dirPath, ".workbench", "settings.yml")
  if (!existsSync(settingsPath)) {
    return {}
  }
  const raw = readFileSync(settingsPath, "utf-8")
  return load(raw) as RemoteSettings
}

// --- File Operations ---
function mergeDirectory(srcDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true })

  const entries = readdirSync(srcDir, { recursive: true })
  for (const entry of entries) {
    const srcPath = join(srcDir, entry)
    const destPath = join(destDir, entry)

    if (statSync(srcPath).isDirectory()) {
      mkdirSync(destPath, { recursive: true })
    } else {
      mkdirSync(dirname(destPath), { recursive: true })
      copyFileSync(srcPath, destPath)
    }
  }
}

function mergeFile(srcPath: string, destPath: string): void {
  mkdirSync(dirname(destPath), { recursive: true })
  copyFileSync(srcPath, destPath)
}

// --- Main Sync Function ---
export async function executeSync(): Promise<SyncResult> {
  // Step 1: Validate location
  if (!existsSync(".workbench/config.yaml")) {
    return {
      success: false,
      error: "Error: No .workbench/config.yaml found. Run `workbench --init` first to initialise a workbench."
    }
  }

  let config: WorkbenchConfig
  try {
    config = readConfig()
  } catch (err) {
    return {
      success: false,
      error: `Error: Failed to read .workbench/config.yaml: ${err}`
    }
  }

  if (!config.source?.repository) {
    return {
      success: false,
      error: "Error: No source.repository found in .workbench/config.yaml. The workbench may have been initialised before this feature was available. Re-initialise to enable syncing."
    }
  }

  const { repository, branch } = config.source
  const sourceUrl = `https://github.com/${repository}.git`

  // Step 2: Check working tree cleanliness
  console.log("Checking working tree status...")
  const statusLines: string[] = []
  try {
    await runCommand("git", ["status", "--porcelain"], (line) => {
      statusLines.push(line)
    })
  } catch (err) {
    return {
      success: false,
      error: "Error: Failed to check git status. Ensure you are in a git repository."
    }
  }

  const isDirty = statusLines.some((line) => line.trim().length > 0)
  if (isDirty) {
    return {
      success: false,
      error: "Error: Working tree is not clean. Please commit or stash your changes before syncing."
    }
  }

  // Step 3: Warn and confirm
  console.log("\n⚠️  WARNING: This will overwrite local managed files with the latest")
  console.log("   version from the source workbench. Any customisations to managed")
  console.log("   paths will be lost.\n")
  console.log(`Source: ${repository} (${branch})`)
  console.log("")

  const confirmed = await confirm("Do you want to continue? [y/N] ")
  if (!confirmed) {
    console.log("Sync aborted.")
    return { success: false }
  }

  // Step 4: Fetch source into temp directory
  let tempDir: string
  try {
    tempDir = mkdtempSync(join(tmpdir(), "workbench-sync-"))
  } catch (err) {
    return {
      success: false,
      error: `Error: Failed to create temporary directory: ${err}`
    }
  }

  const cleanupTempDir = () => {
    try { rmdirSync(tempDir, { recursive: true }) } catch {}
  }

  try {
    console.log(`Fetching source from ${repository} (branch: ${branch})...`)
    await runCommand("git", [
      "clone", "--depth", "1", "--single-branch",
      "--branch", branch, sourceUrl, tempDir
    ], () => {})

    // Step 5: Read remote sync paths
    const remoteSettings = readSettingsFromPath(tempDir)
    const syncPaths = remoteSettings.sync?.paths

    if (!syncPaths || syncPaths.length === 0) {
      return {
        success: false,
        error: "Error: No sync.paths found in the source workbench's .workbench/settings.yml. The source workbench may not support syncing yet."
      }
    }

    console.log(`Syncing ${syncPaths.length} path(s): ${syncPaths.join(", ")}`)

    // Step 6: Apply sync
    for (const syncPath of syncPaths) {
      const srcPath = join(tempDir, syncPath)
      const destPath = join(process.cwd(), syncPath)

      if (!existsSync(srcPath)) {
        console.log(`  ⚠  Source path "${syncPath}" does not exist in the fetched source. Skipping.`)
        continue
      }

      const srcStat = statSync(srcPath)
      if (srcStat.isDirectory()) {
        mergeDirectory(srcPath, destPath)
      } else {
        mergeFile(srcPath, destPath)
      }
    }

    // Step 7: Detect changes
    const diffLines: string[] = []
    await runCommand("git", ["status", "--porcelain"], (line) => {
      diffLines.push(line)
    })

    const hasChanges = diffLines.some((line) => line.trim().length > 0)
    if (!hasChanges) {
      console.log("\n✅ Your workbench is already up to date.")
      cleanupTempDir()
      return { success: true, upToDate: true }
    }

    // Step 8: Get source commit SHA and auto-commit
    const shaOutput: string[] = []
    await runCommand("git", ["-C", tempDir, "rev-parse", "--short", "HEAD"], (line) => {
      shaOutput.push(line)
    })
    const shortSha = shaOutput.join("").trim()

    const commitMessage = `chore: sync workbench from ${repository}@${shortSha}`
    console.log(`\nChanges detected. Committing with message: "${commitMessage}"`)

    await runCommand("git", ["add", "."], () => {})
    await runCommand("git", ["commit", "-m", commitMessage], () => {})

    // Step 9: Clean up
    cleanupTempDir()

    // Step 10: Report
    console.log(`\n✅ Sync complete. Commit created:`)
    console.log(`   ${commitMessage}`)

    return { success: true, commitMessage }

  } catch (err) {
    cleanupTempDir()
    return {
      success: false,
      error: `Error: Sync failed: ${err}`
    }
  }
}
