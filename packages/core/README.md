# @sectile/core

Renderer-neutral interaction semantics with explicit identity, failure, complexity, and resource contracts.

```ts
import { createSequence } from '@sectile/core/sequence';
import { createRange } from '@sectile/core/range';
import { createGrid } from '@sectile/core/grid';
import { createTree } from '@sectile/core/tree';
import { unwrap } from '@sectile/core/result';
import { applyListboxEvent, createListboxState } from '@sectile/core/listbox';
import { applyTabsEvent, createTabsState } from '@sectile/core/tabs';
import { applyRadioGroupEvent, createRadioGroupState } from '@sectile/core/radio-group';
import { applyToolbarEvent, createToolbarState } from '@sectile/core/toolbar';
import { applyAccordionEvent, createAccordionState } from '@sectile/core/accordion';
import { applyDisclosureEvent, createDisclosureState } from '@sectile/core/disclosure';
import { applyCalendarEvent, createCalendarState } from '@sectile/core/calendar';
import { applyComboboxEvent, createComboboxState } from '@sectile/core/combobox';
import { applySliderEvent, createSliderState } from '@sectile/core/slider';
import { applyTreeViewEvent, createTreeViewState } from '@sectile/core/tree-view';
import { applyTreeGridEvent, createTreeGridModel, createTreeGridState } from '@sectile/core/tree-grid';
import { createRevisionSnapshot } from '@sectile/core/revision';
import { applyTextEvent, createTextEditingState } from '@sectile/core/text';
```

The root export contains shared types and has no runtime authority. State primitives are pure: adapters create a valid state, apply semantic events, and own the resulting state. Construction returns a typed `Result`; consumers can narrow it directly or use `unwrap` when failure should throw a detailed `SectileResultError`. Query absence returns `null`; bounded movement reports resource rejection rather than silently choosing a different result.

The text facade owns well-formed UTF-16 replacement, selection, and composition transitions. The combobox facade combines that state with explicit filtering policy, popup navigation, and composition-safe candidate acceptance. Composing text does not become a filter query until commit. The tree-grid facade validates the authoritative mapping between tree rows and grid coordinates before coordinating visible cell navigation, expansion, single selection, and edit mode.

Tabs and radio groups share the proven cursor plus single-selection algebra while exposing role-specific event vocabularies. Toolbars use the cursor-only linear-action algebra, so invocation never invents selection state.

Disclosure exposes a boolean open algebra. Accordion separately owns a keyed open set plus cursor so single/multiple and collapsible policies remain atomic.

Checkbox, switch, and toggle-button share checked transition mechanics while preserving mixed, checked, and pressed public vocabularies.

`createTreeGridModelFromRows` accepts rows shaped as `{ id, parentID, cells }` and validates the tree, grid, and row mapping as one construction boundary. The lower-level tree, grid, and model factories remain available when those structures have separate ownership.

See the [primitive documentation](../../docs/primitives/README.md).
