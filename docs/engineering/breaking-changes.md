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
| WI-032 | @sectile/tabular | `./data-grid` | `TabularRowSelection declaration closure` | @sectile/tabular/data-grid |
| WI-032 | @sectile/tabular | `./data-table` | `rowSelectionContains`, `TabularRowSelection declaration closure` | @sectile/tabular/data-table |
| WI-032 | @sectile/tabular | `./data-tree-grid` | `TabularRowSelection declaration closure` | @sectile/tabular/data-tree-grid |
| WI-032 | @sectile/tabular | `.` | `TabularRowSelection declaration closure` | @sectile/tabular |
| WI-032 | @sectile/tabular | `./virtual` | `TabularRowSelection declaration closure` | @sectile/tabular/virtual |
| WI-034 | @sectile/virtual | `./layout` | `VirtualPoint, VirtualSize, VirtualRect, and VirtualInsets declaration closure` | @sectile/virtual/layout |
| WI-034 | @sectile/virtual | `./linear-layout` | `Virtual geometry declaration closure` | @sectile/virtual/linear-layout |
| WI-034 | @sectile/virtual | `./masonry-layout` | `Virtual geometry declaration closure` | @sectile/virtual/masonry-layout |
| WI-034 | @sectile/virtual | `./partitioned-track-grid-layout` | `Virtual geometry declaration closure` | @sectile/virtual/partitioned-track-grid-layout |
| WI-034 | @sectile/virtual | `.` | `VirtualPoint, VirtualSize, VirtualRect, and VirtualInsets declaration closure` | @sectile/virtual |
| WI-034 | @sectile/virtual | `./spatial-layout` | `Virtual geometry declaration closure` | @sectile/virtual/spatial-layout |
| WI-034 | @sectile/virtual | `./track-grid-layout` | `Virtual geometry declaration closure` | @sectile/virtual/track-grid-layout |
| WI-037 | @sectile/core | `./color-picker` | `ColorValue is the canonical Rgba8 declaration closure` | @sectile/core/color-picker |
