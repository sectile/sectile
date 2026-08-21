# @sectile/dom

DOM controllers for Sectile semantic machines. This package depends only on exported `@sectile/primitives` subpaths and owns its state, build, and tests.

```ts
import { createListboxController } from '@sectile/dom/listbox';
import { unwrap } from '@sectile/primitives/result';

const controller = unwrap(createListboxController({
  domain,
  defaultValue: [],
  defaultHighlightedValue: null,
}));
```

Use `value` or `highlightedValue` for controlled fields, and synchronize accepted external values with `controller.syncControlledValues(...)`. Use the corresponding `default*` field for uncontrolled state.

Calendar, slider, tree-view, and tree-grid controllers follow the same ownership contract through their package subpaths. Calendar page changes remain external `request-page` effects. Tree-grid exposes expansion, highlight, selection, and edit mode as independently controlled or uncontrolled fields.

The text controller maps explicit `beforeinput` ranges and composition phases through `@sectile/dom/text`. It controls or owns the complete editing state so an active IME composition remains atomic.

The combobox controller reuses the same DOM text normalization for editable filtering, keeps IME phases explicit, and maps candidate movement to active-descendant effects. Its controlled input field is the complete `inputState`, not a string fragment.

`connectTreeGrid` binds a controller to a DOM root and owns keyboard dispatch, IME-safe Enter commits, edit rollback, focus movement, and tree-grid ARIA attributes. Consumers remain responsible for their data and rendered content, then call the connection's row, cell, and editor binding methods while rendering.
