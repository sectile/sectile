# @sectile/dom

DOM controllers for Sectile semantic machines. This package depends only on exported `@sectile/primitives` subpaths and owns its state, build, and tests.

```ts
import { createListbox } from '@sectile/dom/listbox';
import { unwrap } from '@sectile/primitives/result';

const listbox = unwrap(createListbox({
  items: ['alpha', 'beta'],
  root,
  defaultValue: [],
  defaultHighlightedValue: null,
  onActivate: (id) => openItem(id),
}));

listbox.setListboxAttributes('Items');
```

Use `value` or `highlightedValue` for controlled fields, and synchronize accepted external values with `controller.syncControlledValues(...)`. Use the corresponding `default*` field for uncontrolled state.

`createListbox` constructs its sequence and connection, owns DOM keyboard and delegated click dispatch, focus, listbox ARIA, and activation delivery. `createListboxController` and `connectListbox` remain available when those layers have separate ownership.

`createTabs`, `createRadioGroup`, and `createToolbar` own orientation-aware keyboard mapping, delegated pointer events, focus projection, and their matching ARIA roles. Their controlled and uncontrolled values follow the same proposal-then-sync contract.

`createDisclosure` and `createAccordion` own trigger/header clicks, expansion ARIA, panel visibility, and controlled or uncontrolled open state.

`createSlider` accepts exact decimal `min`, `max`, and `step` values. Its DOM connection owns keyboard dispatch, pointer dragging on the optional `track`, and synchronized slider ARIA values.

`createCalendar` constructs a grid from `rows`; its connection owns gridcell ARIA, focus, keyboard and delegated click dispatch, and page requests.

`createTreeView` constructs a tree from `nodes`; its connection owns treeitem ARIA, disclosure and item clicks, expansion presentation, focus, and keyboard dispatch.

Calendar, slider, tree-view, and tree-grid controllers follow the same ownership contract through their package subpaths. Calendar page changes remain external `request-page` effects. Tree-grid exposes expansion, highlight, selection, and edit mode as independently controlled or uncontrolled fields.

`createText` binds an input or textarea, owns `beforeinput` rendering and the complete IME composition lifecycle, and keeps UTF-16 selections synchronized. The lower-level text controller remains available for custom elements.

`createCombobox` constructs its sequence and labels from `items`, reuses the same DOM text binding as `createText`, and owns input/popup ARIA, IME-safe filtering, candidate movement, and keyboard or pointer acceptance. Its controlled input field remains the complete `inputState`.

`connectTreeGrid` binds a controller to a DOM root and owns keyboard, disclosure, cell-click, and double-click dispatch, IME-safe Enter commits, edit rollback, focus movement, and tree-grid ARIA attributes. Consumers remain responsible for their data and rendered content, then call the connection's row, cell, disclosure, and editor binding methods while rendering.

For ordinary setup, `createTreeGrid` accepts `{ id, parentID, cells }` rows plus controller and DOM connection options. It validates and constructs the primitive model, controller, and connection behind one `Result`. The lower-level controller and connection factories remain available for separately owned models or controllers.
