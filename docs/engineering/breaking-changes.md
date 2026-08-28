# Breaking changes

> Generated from `verification/breaking-changes/fragments/*.json`.

| Work item | Package | Previous surface | Symbols | Replacement or removal |
|---|---|---|---|---|
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
| WI-030 | @sectile/core | `./tree-grid` | `GridControl declaration closure` | @sectile/core/grid-control |
