import {
  SelectRenderable,
  SelectRenderableEvents,
  TextRenderable,
  BoxRenderable,
  type CliRenderer,
} from "@opentui/core"
import { theme } from "../theme"

const SCREEN_ID = "harness-prompt-screen"

export function showHarnessPrompt(
  renderer: CliRenderer,
  onAnswer: (shouldAddHarness: boolean) => void
): void {
  const existing = renderer.root.getRenderable(SCREEN_ID)
  if (existing) {
    renderer.root.remove(SCREEN_ID)
  }

  const container = new BoxRenderable(renderer, {
    id: SCREEN_ID,
    flexDirection: "column",
    padding: 1,
  })

  const title = new TextRenderable(renderer, {
    id: "harness-prompt-title",
    content: "Add Claude Code harness support?",
    fg: theme.tokens.title.fg,
  })
  container.add(title)

  const hint = new TextRenderable(renderer, {
    id: "harness-prompt-hint",
    content: "Creates .claude/commands/ wrappers to run workbench workflows from Claude Code",
    fg: theme.tokens.subtitle.fg,
  })
  container.add(hint)

  const options = [
    { name: "yes", description: "Create Claude Code command wrappers", value: "yes" },
    { name: "no", description: "Add later with workbench --add-harness claude-code", value: "no" },
  ]

  const select = new SelectRenderable(renderer, {
    id: "harness-prompt-select",
    width: 40,
    height: 4,
    options,
    selectedIndex: 0,
  })

  select.on(
    SelectRenderableEvents.ITEM_SELECTED,
    (_index: number, option: { value: string }) => {
      container.visible = false
      onAnswer(option.value === "yes")
    }
  )

  container.add(select)
  renderer.root.add(container)
  select.focus()
}
