# @sectile/terminal

Terminal controllers for Sectile semantic machines. This package depends only on exported `@sectile/primitives` subpaths and owns its state, build, and tests.

```ts
import { createListboxController } from '@sectile/terminal/listbox';
import { unwrap } from '@sectile/primitives/result';

const controller = unwrap(createListboxController({
  domain,
  defaultValue: [],
  defaultHighlightedValue: null,
}));
```

Use `value` or `highlightedValue` for controlled fields, and synchronize accepted external values with `controller.syncControlledValues(...)`. Use the corresponding `default*` field for uncontrolled state.

Calendar, slider, tree-view, and tree-grid controllers follow the same ownership contract through their package subpaths. Calendar page changes remain external `request-page` effects. Tree-grid exposes expansion, highlight, selection, and edit mode as independently controlled or uncontrolled fields.

The text controller maps explicit insert, replace, and delete ranges through `@sectile/terminal/text`. Terminal input has no implicit composition phase; a host that supports one must expose it explicitly before the adapter contract expands.

The combobox controller reuses terminal text normalization for editable filtering and maps candidate movement to terminal highlight effects. Its controlled input field is the complete `inputState`, not a string fragment.

Node TTY applications can use `createTTYKeyboard` from `@sectile/terminal/node` instead of parsing escape sequences. It normalizes Alt+Arrow and common Alt+B/F variants into `TerminalKeyboardInput`. `connectTreeGrid` owns tree-grid edit buffering and rollback, while `fitTerminalText` from `@sectile/terminal/layout` clips and pads by rendered Unicode width.
