# @sectile/primitives

Renderer-neutral canonical interaction structures with explicit identity, failure, complexity, and resource contracts.

```ts
import { createSequence } from '@sectile/primitives/sequence';
import { createRange } from '@sectile/primitives/range';
import { createGrid } from '@sectile/primitives/grid';
import { createTree } from '@sectile/primitives/tree';
import { unwrap } from '@sectile/primitives/result';
import { applyListboxEvent, createListboxState } from '@sectile/primitives/listbox';
import { applyCalendarEvent, createCalendarState } from '@sectile/primitives/calendar';
import { applyComboboxEvent, createComboboxState } from '@sectile/primitives/combobox';
import { applySliderEvent, createSliderState } from '@sectile/primitives/slider';
import { applyTreeViewEvent, createTreeViewState } from '@sectile/primitives/tree-view';
import { applyTreeGridEvent, createTreeGridModel, createTreeGridState } from '@sectile/primitives/tree-grid';
import { createRevisionSnapshot } from '@sectile/primitives/revision';
import { applyTextEvent, createTextEditingState } from '@sectile/primitives/text';
```

The root export contains shared types and has no runtime authority. State primitives are pure: adapters create a valid state, apply semantic events, and own the resulting state. Construction returns a typed `Result`; consumers can narrow it directly or use `unwrap` when failure should throw a detailed `SectileResultError`. Query absence returns `null`; bounded movement reports resource rejection rather than silently choosing a different result.

The text facade owns well-formed UTF-16 replacement, selection, and composition transitions. The combobox facade combines that state with explicit filtering policy, popup navigation, and composition-safe candidate acceptance. Composing text does not become a filter query until commit. The tree-grid facade validates the authoritative mapping between tree rows and grid coordinates before coordinating visible cell navigation, expansion, single selection, and edit mode.

See the [primitive documentation](../../docs/primitives/README.md).
