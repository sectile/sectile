# @sectile/dom

DOM controllers for Sectile semantic machines. This package depends only on exported `@sectile/primitives` subpaths and owns its state, build, and tests.

```ts
import { createListboxController } from '@sectile/dom/listbox';

const result = createListboxController({
  domain,
  defaultValue: [],
  defaultHighlightedValue: null,
});

if (!result.ok) throw new Error(result.error.message);
const controller = result.value;
```

Use `value` or `highlightedValue` for controlled fields, and synchronize accepted external values with `controller.syncControlledValues(...)`. Use the corresponding `default*` field for uncontrolled state.

Calendar, slider, and tree-view controllers follow the same ownership contract through their package subpaths. Calendar page changes remain external `request-page` effects.

The text controller maps explicit `beforeinput` ranges and composition phases through `@sectile/dom/text`. It controls or owns the complete editing state so an active IME composition remains atomic.

The combobox controller witnesses candidate acceptance only; connecting text input, filtering, and popup navigation to combobox remains separate work.
