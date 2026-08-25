# Terminal

`@sectile/terminal` maps normalized terminal input and Unicode-aware rendering to the same component semantics used by other hosts.

```sh
pnpm add @sectile/terminal
```

```ts
import * as checkbox from '@sectile/terminal/checkbox'
```

Terminal adapters own host input and projection, not application styling or persistence.

## Build a complete screen

The optional screen layer turns a layout tree into a fixed terminal frame. Rows, columns, boxes, padding, gaps, clipping, and fill sizing are composed the same way across components. Application code still decides the visual structure.

```ts
import { createTerminalAppearance } from '@sectile/terminal/appearance'
import { createTerminalScreenWriter } from '@sectile/terminal/node'
import {
  renderTerminalScreen,
  terminalBox,
  terminalColumn,
  terminalRow,
  terminalText,
} from '@sectile/terminal/screen'

const appearance = createTerminalAppearance({
  theme: {
    accent: { foreground: 'bright-cyan', bold: true },
    current: { foreground: 'black', background: 'bright-cyan' },
  },
})

const view = terminalBox(
  terminalColumn([
    terminalText('Project settings', { style: 'accent' }),
    terminalRow([
      terminalText('Navigation', { width: 24 }),
      terminalText('Editor', { width: 'fill' }),
    ], { gap: 2, height: 'fill' }),
  ], { gap: 1, width: 'fill', height: 'fill' }),
  { title: 'Sectile', padding: 1, width: 'fill', height: 'fill' },
)

const writer = createTerminalScreenWriter(process.stdout, {
  appearance,
  alternateScreen: true,
})

writer.render(renderTerminalScreen(view, {
  columns: process.stdout.columns,
  rows: process.stdout.rows,
  appearance,
}))
```

Use semantic theme roles for reusable styling and pass a style object only for a local exception. Color automatically falls back from truecolor to 256 colors, 16 colors, or plain text according to terminal capability.

## Caret and screen cursor

Editable text keeps its logical caret as a UTF-16 offset. Attach it to the text node and the renderer projects it through grapheme clusters, double-width characters, wrapping, padding, and clipping.

```ts
terminalText(input, {
  cursor: {
    codeUnitOffset: selection.focusCodeUnitOffset,
    shape: 'bar',
  },
})
```

The Node writer updates only changed rows after the first frame. It positions the real TTY cursor at the projected cell, applies its shape and visibility, and restores terminal state when closed. This avoids clearing and repainting the entire screen on every keypress.

## Keyboard conventions

The key map follows the shape shown by the terminal interface. Vertical lists use <kbd>↑</kbd>/<kbd>↓</kbd>, horizontal lists use <kbd>←</kbd>/<kbd>→</kbd>, and vertical hierarchies use <kbd>→</kbd> to enter and <kbd>←</kbd> or <kbd>Esc</kbd> to return. <kbd>Home</kbd>/<kbd>End</kbd> stay within the current level; keyboards without those keys can use <kbd>Fn</kbd>+<kbd>←</kbd>/<kbd>→</kbd> or <kbd>Ctrl</kbd>+<kbd>A</kbd>/<kbd>E</kbd>. <kbd>Fn</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> is accepted as <kbd>Page Up</kbd>/<kbd>Page Down</kbd>. <kbd>Enter</kbd> or <kbd>Space</kbd> opens a branch or activates a command.

Component pages list extra editing, paging, and range shortcuts where applicable.

`@sectile/terminal/reorder` exposes `move-up`, `move-down`, `move-start`, `move-end`, `indent`, and `outdent` as explicit sequence/tree movement keys. `@sectile/terminal/layer-stack` creates an application-owned layer scope so mixed terminal popups share topmost dismissal and descendant close order.

## Try the terminal adapter

This is a browser-hosted preview of terminal input and output, not a `sectile` CLI command. Its state transitions use the real `@sectile/terminal` checkbox connection. Click the row, or focus the preview and press <kbd>Space</kbd> or <kbd>Enter</kbd>.

<TerminalCheckboxDemo />

## Try Bash in the browser

Start an isolated Debian `/bin/bash`, then type commands at the prompt. The VM demonstrates the shell environment available to a browser-hosted terminal application; it cannot access files or shells on your computer. The first start downloads the runtime and streamed disk blocks.

<BashTerminal />

## Factory behavior

Use `create*` to receive a ready connection. Use `tryCreate*` only when invalid setup must be handled as a recoverable `Result`. A host `create*` call never needs an additional `unwrap`.
