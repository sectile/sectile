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
