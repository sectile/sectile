# Core module DAG

> Generated from `verification/core-layers/manifest.json` and Core source imports.

Modules: 119; edges: 482; public subpaths: 70; cycles: 0; upward edges: 0.

## Layers

| Layer | Modules |
|---|---:|
| composites | 11 |
| editing | 2 |
| foundation | 3 |
| kernel | 6 |
| public | 57 |
| reference | 24 |
| runtime | 1 |
| state | 5 |
| structures | 10 |

## Highest public blast radius

| Module | Transitive dependents | Public subpaths |
|---|---:|---:|
| `src/error-code.ts` | 113 | 66 |
| `src/shared.ts` | 112 | 66 |
| `src/result.ts` | 102 | 65 |
| `src/internal/kernel/foundation.ts` | 108 | 64 |
| `src/internal/kernel/machine.ts` | 75 | 45 |
| `src/internal/kernel/indexed-sequence.ts` | 56 | 30 |
| `src/structures/sequence.ts` | 55 | 30 |
| `src/internal/state/cursor.ts` | 46 | 23 |
| `src/internal/state/selection.ts` | 27 | 14 |
| `src/internal/kernel/decimal.ts` | 18 | 12 |
| `src/structures/tree.ts` | 20 | 11 |
| `src/internal/kernel/exact-ratio.ts` | 15 | 9 |
| `src/structures/range.ts` | 13 | 9 |
| `src/internal/composites/linear-choice.ts` | 6 | 5 |
| `src/internal/editing/text.ts` | 8 | 5 |
| `src/internal/composites/menu.ts` | 5 | 4 |
| `src/internal/composites/slider.ts` | 6 | 4 |
| `src/menu.ts` | 3 | 4 |
| `src/text.ts` | 3 | 4 |
| `src/collection-window.ts` | 3 | 3 |

## Public subpaths

| Subpath | Source | Layer | Direct facade targets |
|---|---|---|---|
| `.` | `src/index.ts` | public | `src/cascade-list.ts`, `src/cascade-select.ts`, `src/collection-window.ts`, `src/editable.ts`, `src/error-code.ts`, `src/interaction.ts`, `src/layer-stack.ts`, `src/number-field.ts`, `src/pin-input.ts`, `src/quantity-field.ts`, `src/reorder.ts`, `src/selection.ts`, `src/shared.ts`, `src/shared.ts`, `src/spin-button.ts`, `src/structures/sequence.ts`, `src/tags-input.ts`, `src/units.ts` |
| `./accordion` | `src/accordion.ts` | public | `src/internal/composites/linear-action.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/internal/state/cursor.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./adapter-runtime` | `src/adapter-runtime.ts` | public | `src/error-code.ts`, `src/interaction.ts`, `src/revision.ts`, `src/shared.ts` |
| `./alert-dialog` | `src/alert-dialog.ts` | public | none |
| `./anchored-layout` | `src/structures/anchored-layout.ts` | structures | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/geometry.ts` |
| `./carousel` | `src/carousel.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/internal/state/cursor.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./cascade-list` | `src/cascade-list.ts` | public | `src/internal/composites/cascade-choice.ts`, `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/tree.ts` |
| `./cascade-select` | `src/cascade-select.ts` | public | `src/internal/composites/cascade-choice.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/tree.ts` |
| `./checkbox` | `src/checkbox.ts` | public | `src/internal/state/checked.ts`, `src/internal/state/checked.ts` |
| `./checkbox-group` | `src/checkbox-group.ts` | public | `src/internal/composites/listbox.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./collection-window` | `src/collection-window.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts` |
| `./color` | `src/structures/color.ts` | structures | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./color-picker` | `src/color-picker.ts` | public | `src/editing/color-text.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/color.ts` |
| `./color-text` | `src/editing/color-text.ts` | editing | `src/internal/kernel/foundation.ts`, `src/shared.ts`, `src/structures/color.ts` |
| `./combobox` | `src/combobox.ts` | public | `src/internal/composites/combobox.ts`, `src/internal/editing/text.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./dialog` | `src/dialog.ts` | public | none |
| `./disclosure` | `src/disclosure.ts` | public | `src/internal/state/open-state.ts`, `src/internal/state/open-state.ts` |
| `./drawer` | `src/drawer.ts` | public | `src/internal/composites/popup.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts` |
| `./editable` | `src/editable.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts` |
| `./feed` | `src/feed.ts` | public | `src/collection-window.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/internal/state/cursor.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./geometry` | `src/structures/geometry.ts` | structures | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./grid` | `src/structures/grid.ts` | structures | `src/internal/kernel/foundation.ts`, `src/internal/kernel/indexed-sequence.ts`, `src/result.ts`, `src/shared.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./grid-control` | `src/grid-control.ts` | public | `src/internal/composites/grid-control.ts`, `src/shared.ts`, `src/structures/grid.ts` |
| `./index-span` | `src/structures/index-span.ts` | structures | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./interaction` | `src/interaction.ts` | public | `src/result.ts`, `src/shared.ts` |
| `./layer-stack` | `src/layer-stack.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./listbox` | `src/listbox.ts` | public | `src/internal/composites/listbox.ts`, `src/internal/composites/listbox.ts` |
| `./menu` | `src/menu.ts` | public | `src/internal/composites/menu.ts`, `src/internal/composites/menu.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/tree.ts` |
| `./menu-button` | `src/menu-button.ts` | public | `src/internal/composites/menu.ts`, `src/internal/composites/menu.ts`, `src/menu.ts`, `src/menu.ts` |
| `./menubar` | `src/menubar.ts` | public | `src/internal/composites/menu.ts`, `src/internal/composites/menu.ts`, `src/menu.ts`, `src/menu.ts` |
| `./meter` | `src/meter.ts` | public | `src/internal/kernel/bounded-scalar.ts`, `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/range.ts` |
| `./meter-group` | `src/meter-group.ts` | public | `src/internal/kernel/bounded-scalar.ts`, `src/internal/kernel/foundation.ts`, `src/meter.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/range.ts` |
| `./metric-index` | `src/structures/metric-index.ts` | structures | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./multi-thumb-slider` | `src/multi-thumb-slider.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/internal/state/cursor.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/range.ts`, `src/structures/sequence.ts` |
| `./navigation-menu` | `src/navigation-menu.ts` | public | `src/internal/composites/menu.ts`, `src/internal/composites/menu.ts`, `src/menu.ts`, `src/menu.ts`, `src/structures/tree.ts` |
| `./number-field` | `src/number-field.ts` | public | `src/internal/kernel/decimal.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/text.ts` |
| `./package.json` | package metadata | metadata | none |
| `./pagination` | `src/pagination.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts` |
| `./pin-input` | `src/pin-input.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts` |
| `./popover` | `src/popover.ts` | public | none |
| `./progress` | `src/progress.ts` | public | `src/internal/kernel/bounded-scalar.ts`, `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/range.ts` |
| `./quantity-field` | `src/quantity-field.ts` | public | `src/internal/kernel/decimal.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/number-field.ts`, `src/result.ts`, `src/shared.ts`, `src/text.ts`, `src/units.ts` |
| `./radio-group` | `src/radio-group.ts` | public | `src/internal/composites/linear-choice.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./range` | `src/structures/range.ts` | structures | `src/internal/kernel/decimal.ts`, `src/internal/kernel/exact-ratio.ts`, `src/internal/kernel/exact-ratio.ts`, `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/shared.ts` |
| `./rating` | `src/rating.ts` | public | `src/internal/kernel/machine.ts`, `src/internal/state/selection.ts`, `src/radio-group.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./reorder` | `src/reorder.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts`, `src/structures/tree.ts` |
| `./result` | `src/result.ts` | foundation | `src/error-code.ts`, `src/error-code.ts`, `src/shared.ts`, `src/shared.ts` |
| `./revision` | `src/revision.ts` | public | `src/internal/runtime/revision.ts`, `src/internal/runtime/revision.ts` |
| `./select` | `src/select.ts` | public | `src/internal/composites/linear-choice.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./selection` | `src/selection.ts` | public | `src/internal/state/selection.ts`, `src/shared.ts` |
| `./selection-expression` | `src/structures/selection-expression.ts` | structures | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./sequence` | `src/structures/sequence.ts` | structures | `src/internal/kernel/foundation.ts`, `src/internal/kernel/indexed-sequence.ts`, `src/result.ts`, `src/shared.ts`, `src/shared.ts` |
| `./slider` | `src/slider.ts` | public | `src/internal/composites/slider.ts`, `src/internal/composites/slider.ts` |
| `./spin-button` | `src/spin-button.ts` | public | `src/internal/composites/slider.ts`, `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/range.ts` |
| `./stepper` | `src/stepper.ts` | public | `src/internal/composites/linear-choice.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./switch` | `src/switch.ts` | public | `src/internal/state/checked.ts`, `src/result.ts`, `src/shared.ts` |
| `./tabs` | `src/tabs.ts` | public | `src/internal/composites/linear-choice.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./tags-input` | `src/tags-input.ts` | public | `src/internal/kernel/foundation.ts`, `src/internal/kernel/machine.ts`, `src/result.ts`, `src/shared.ts` |
| `./text` | `src/text.ts` | public | `src/internal/editing/text.ts`, `src/internal/editing/text.ts`, `src/internal/editing/text.ts` |
| `./timer` | `src/timer.ts` | public | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./toast` | `src/toast.ts` | public | `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./toggle-button` | `src/toggle-button.ts` | public | `src/internal/state/checked.ts`, `src/result.ts`, `src/shared.ts` |
| `./toggle-group` | `src/toggle-group.ts` | public | `src/internal/composites/listbox.ts`, `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./toolbar` | `src/toolbar.ts` | public | `src/internal/composites/linear-action.ts`, `src/internal/composites/linear-action.ts` |
| `./tooltip` | `src/tooltip.ts` | public | `src/internal/state/open-state.ts` |
| `./tree` | `src/structures/tree.ts` | structures | `src/internal/kernel/foundation.ts`, `src/internal/kernel/indexed-sequence.ts`, `src/result.ts`, `src/shared.ts`, `src/shared.ts`, `src/structures/sequence.ts` |
| `./tree-grid` | `src/tree-grid.ts` | public | `src/internal/composites/tree-grid.ts`, `src/internal/composites/tree-grid.ts`, `src/internal/composites/tree-grid.ts`, `src/internal/composites/tree-grid.ts`, `src/result.ts`, `src/shared.ts`, `src/structures/grid.ts`, `src/structures/tree.ts` |
| `./tree-view` | `src/tree-view.ts` | public | `src/internal/composites/tree-view.ts`, `src/internal/composites/tree-view.ts` |
| `./units` | `src/units.ts` | public | `src/internal/kernel/decimal.ts`, `src/internal/kernel/foundation.ts`, `src/result.ts`, `src/shared.ts` |
| `./window-splitter` | `src/window-splitter.ts` | public | `src/internal/composites/slider.ts`, `src/internal/composites/slider.ts` |
