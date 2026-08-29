# Breaking changes

> Generated from `verification/breaking-changes/fragments/*.json`.

| Work item | Package | Previous surface | Symbols | Replacement or removal |
|---|---|---|---|---|
| WI-014 | @sectile/core | `./cascade-list` | `Tree declaration closure` | @sectile/core/cascade-list |
| WI-014 | @sectile/core | `./cascade-select` | `Tree declaration closure` | @sectile/core/cascade-select |
| WI-014 | @sectile/core | `./menu-button` | `Tree declaration closure` | @sectile/core/menu-button |
| WI-014 | @sectile/core | `./menu` | `Tree declaration closure` | @sectile/core/menu |
| WI-014 | @sectile/core | `./menubar` | `Tree declaration closure` | @sectile/core/menubar |
| WI-014 | @sectile/core | `./navigation-menu` | `Tree declaration closure` | @sectile/core/navigation-menu |
| WI-014 | @sectile/core | `./reorder` | `Grid declaration closure` | @sectile/core/reorder |
| WI-014 | @sectile/core | `.` | `Grid.domain`, `Tree.subtreeIntervalOf`, `TreeSubtreeInterval` | @sectile/core |
| WI-014 | @sectile/core | `./tree` | `Tree.subtreeIntervalOf`, `TreeSubtreeInterval` | @sectile/core/tree |
| WI-014 | @sectile/core | `./tree-view` | `Tree declaration closure` | @sectile/core/tree-view |
| WI-025 | @sectile/dom | `./virtual` | `module side-effect import @sectile/virtual` | @sectile/dom/virtual |
| WI-025 | @sectile/vue | `./tabular` | `all runtime and type exports` | Replaced by the checked data-table, data-grid, and data-tree-grid mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-025 | @sectile/dom | `./temporal` | `all runtime and type exports` | Replaced by the complete checked @sectile/dom/temporal/* mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-025 | @sectile/vue | `./temporal` | `all runtime and type exports` | Replaced by the complete checked @sectile/vue/temporal/* mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-025 | @sectile/vue | `./virtual` | `all runtime and type exports` | Replaced by the complete checked core/list/grid/masonry/spatial mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-030 | @sectile/dom | `./grid` | `GridEditMode`, `GridPolicies`, `GridState`, `GridEvent` | @sectile/dom/grid |
| WI-030 | @sectile/dom | `.` | `GridEditMode`, `GridPolicies`, `GridState`, `GridEvent` | @sectile/dom |
| WI-030 | @sectile/core | `./grid` | `applyGridEvent`, `createGridState`, `tryCreateGridState`, `GridCommand`, `GridEditMode`, `GridEvent`, `GridPolicies`, `GridState`, `GridStateInput`, `GridUpdate` | @sectile/core/grid-control |
| WI-030 | @sectile/terminal | `./grid` | `GridEditMode`, `GridPolicies`, `GridState`, `GridEvent` | @sectile/terminal/grid |
| WI-030 | @sectile/terminal | `.` | `GridEditMode`, `GridPolicies`, `GridState`, `GridEvent` | @sectile/terminal |
| WI-030 | @sectile/core | `./tree-grid` | `GridControl declaration closure`, `Tree declaration closure` | @sectile/core/grid-control |
| WI-031 | @sectile/core | `./meter-group` | `ExactRatio declaration closure` | @sectile/core/meter-group |
| WI-031 | @sectile/core | `./meter` | `ExactRatio declaration closure` | @sectile/core/meter |
| WI-031 | @sectile/core | `./multi-thumb-slider` | `QuantizedRange declaration closure` | @sectile/core/multi-thumb-slider |
| WI-031 | @sectile/core | `./progress` | `ExactRatio declaration closure` | @sectile/core/progress |
| WI-031 | @sectile/core | `./range` | `ExactRatio`, `bounded ExactRatio algebra` | @sectile/core/range |
| WI-031 | @sectile/core | `./slider` | `QuantizedRange declaration closure` | @sectile/core/slider |
| WI-031 | @sectile/core | `./spin-button` | `QuantizedRange declaration closure` | @sectile/core/spin-button |
| WI-031 | @sectile/core | `./window-splitter` | `QuantizedRange declaration closure` | @sectile/core/window-splitter |
