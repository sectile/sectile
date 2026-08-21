# @sectile/terminal

Terminal controllers for Sectile semantic machines. This package depends only on exported `@sectile/primitives` subpaths and owns its state, build, and tests.

```ts
import { createListbox } from '@sectile/terminal/listbox';
import { unwrap } from '@sectile/primitives/result';

const listbox = unwrap(createListbox({
  items: ['alpha', 'beta'],
  defaultValue: [],
  defaultHighlightedValue: null,
  onActivate: (id) => openItem(id),
}));

listbox.handleKeyboardInput(input);
```

Use `value` or `highlightedValue` for controlled fields, and synchronize accepted external values with `controller.syncControlledValues(...)`. Use the corresponding `default*` field for uncontrolled state.

`createListbox` constructs its sequence and connection, owns terminal key dispatch, and delivers activation. `createListboxController` and `connectListbox` remain available when those layers have separate ownership.

`createTabs`, `createRadioGroup`, and `createToolbar` own terminal key normalization and witness the same semantic transitions as their DOM counterparts without importing DOM behavior.

`createDisclosure` and `createAccordion` own terminal expansion keys and expose the same boolean or keyed-open state algebras.

`createSlider` accepts exact decimal `min`, `max`, and `step` values. Its terminal connection exposes the current rendered value and owns key dispatch.

`createCalendar` constructs a grid from `rows`; its connection owns key dispatch and page requests.

`createTreeView` constructs a tree from `nodes`; its connection owns terminal key dispatch and update delivery.

Calendar, slider, tree-view, and tree-grid controllers follow the same ownership contract through their package subpaths. Calendar page changes remain external `request-page` effects. Tree-grid exposes expansion, highlight, selection, and edit mode as independently controlled or uncontrolled fields.

`createText` owns printable, backspace, and delete key editing with grapheme-safe terminal boundaries. The lower-level controller still accepts explicit insert, replace, and delete ranges.

`createCombobox` constructs its sequence and labels from `items`, reuses grapheme-safe terminal text input, and owns filtering, candidate movement, and acceptance. Its controlled input field remains the complete `inputState`.

Node TTY applications can use `createTTYKeyboard` from `@sectile/terminal/node` instead of parsing escape sequences. It normalizes Alt+Arrow and common Alt+B/F variants into `TerminalKeyboardInput`. `connectTreeGrid` owns tree-grid edit buffering and rollback, while `fitTerminalText` from `@sectile/terminal/layout` clips and pads by rendered Unicode width.

For ordinary setup, `createTreeGrid` accepts `{ id, parentID, cells }` rows plus controller and terminal connection options. It validates and constructs the primitive model, controller, and connection behind one `Result`. The lower-level controller and connection factories remain available when their ownership is separate.
