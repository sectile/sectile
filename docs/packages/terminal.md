# Terminal

`@sectile/terminal` maps normalized terminal input and Unicode-aware rendering to the same component semantics used by other hosts.

```sh
pnpm add @sectile/terminal
```

```ts
import * as checkbox from '@sectile/terminal/checkbox'
```

Terminal adapters own host input and projection, not application styling or persistence.

## Keyboard conventions

The key map follows the shape shown by the terminal interface. Vertical lists use <kbd>↑</kbd>/<kbd>↓</kbd>, horizontal lists use <kbd>←</kbd>/<kbd>→</kbd>, and vertical hierarchies use <kbd>→</kbd> to enter and <kbd>←</kbd> or <kbd>Esc</kbd> to return. <kbd>Home</kbd>/<kbd>End</kbd> stay within the current level. <kbd>Enter</kbd> or <kbd>Space</kbd> opens a branch or activates a command.

Component pages list extra editing, paging, and range shortcuts where applicable.

## Try the terminal adapter

This is a browser-hosted preview of terminal input and output, not a `sectile` CLI command. Its state transitions use the real `@sectile/terminal` checkbox connection. Click the row, or focus the preview and press <kbd>Space</kbd> or <kbd>Enter</kbd>.

<TerminalCheckboxDemo />

Need a complete shell instead of a component preview? Open the [actual Bash playground](/playground/terminal/). It runs Debian `/bin/bash` inside the browser and does not invent a Sectile CLI.

## Factory behavior

Use `create*` to receive a ready connection. Use `tryCreate*` only when invalid setup must be handled as a recoverable `Result`. A host `create*` call never needs an additional `unwrap`.
