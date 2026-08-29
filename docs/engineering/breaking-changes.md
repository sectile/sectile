# Breaking changes

> Generated from `verification/breaking-changes/fragments/*.json`.

| Work item | Package | Previous surface | Symbols | Replacement or removal |
|---|---|---|---|---|
| WI-002 | @sectile/terminal | `./alert-dialog` | `Core Result declaration closure` | @sectile/terminal/alert-dialog |
| WI-002 | @sectile/core | `./checkbox` | `Result and machine-update declaration closure` | @sectile/core/checkbox |
| WI-002 | @sectile/dom | `./checkbox` | `Core Result declaration closure` | @sectile/dom/checkbox |
| WI-002 | @sectile/core | `./collection-window` | `Result declaration closure` | @sectile/core/collection-window |
| WI-002 | @sectile/terminal | `./dialog` | `Core Result declaration closure` | @sectile/terminal/dialog |
| WI-002 | @sectile/core | `./disclosure` | `Result and machine-update declaration closure` | @sectile/core/disclosure |
| WI-002 | @sectile/terminal | `./drawer` | `Core Result declaration closure` | @sectile/terminal/drawer |
| WI-002 | @sectile/core | `./editable` | `Result and machine-update declaration closure` | @sectile/core/editable |
| WI-002 | @sectile/form | `./error` | `Core Result declaration closure` | @sectile/form/error |
| WI-002 | @sectile/core | `./feed` | `Result and revision declaration closure` | @sectile/core/feed |
| WI-002 | @sectile/core | `./layer-stack` | `Result declaration closure` | @sectile/core/layer-stack |
| WI-002 | @sectile/core | `./revision` | `createMachineUpdate` | @sectile/core/revision |
| WI-002 | @sectile/form | `./path` | `Core Result declaration closure` | @sectile/form/path |
| WI-002 | @sectile/terminal | `./popover` | `Core Result declaration closure` | @sectile/terminal/popover |
| WI-002 | @sectile/core | `./result` | `okResult`, `failResult` | @sectile/core/result |
| WI-002 | @sectile/core | `./switch` | `Result and machine-update declaration closure` | @sectile/core/switch |
| WI-002 | @sectile/dom | `./switch` | `Core Result declaration closure` | @sectile/dom/switch |
| WI-002 | @sectile/dom | `./toggle-button` | `Core Result declaration closure` | @sectile/dom/toggle-button |
| WI-002 | @sectile/core | `./tooltip` | `Result and machine-update declaration closure` | @sectile/core/tooltip |
| WI-002 | @sectile/terminal | `./tooltip` | `Core Result declaration closure` | @sectile/terminal/tooltip |
| WI-002 | @sectile/form | `./values` | `Core Result declaration closure` | @sectile/form/values |
| WI-009 | @sectile/vue | `./cascade-list` | `stable item-domain reconciliation declaration closure` | @sectile/vue/cascade-list |
| WI-009 | @sectile/vue | `./cascade-select` | `stable item-domain reconciliation declaration closure` | @sectile/vue/cascade-select |
| WI-009 | @sectile/vue | `./checkbox-group` | `CheckboxGroupRootProps.items` | @sectile/vue/checkbox-group |
| WI-009 | @sectile/core | `./adapter-runtime` | `tryReconcileCollectionIdentities` | @sectile/core/adapter-runtime |
| WI-013 | @sectile/terminal | `./checkbox` | `Checkbox controller declaration closure` | @sectile/terminal/checkbox |
| WI-013 | @sectile/dom | `./rating` | `Rating controller declaration closure` | @sectile/dom/rating |
| WI-013 | @sectile/terminal | `./rating` | `Rating controller declaration closure` | @sectile/terminal/rating |
| WI-013 | @sectile/terminal | `./switch` | `Switch controller declaration closure` | @sectile/terminal/switch |
| WI-013 | @sectile/terminal | `./toggle-button` | `Toggle-button controller declaration closure` | @sectile/terminal/toggle-button |
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
| WI-025 | @sectile/vue | `.` | `tabular, temporal, and virtual aggregate declaration closures` | @sectile/vue |
| WI-025 | @sectile/vue | `./tabular` | `all runtime and type exports` | Replaced by the checked data-table, data-grid, and data-tree-grid mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-025 | @sectile/dom | `./temporal` | `all runtime and type exports` | Replaced by the complete checked @sectile/dom/temporal/* mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-025 | @sectile/vue | `./temporal` | `all runtime and type exports` | Replaced by the complete checked @sectile/vue/temporal/* mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-025 | @sectile/vue | `./virtual` | `all runtime and type exports` | Replaced by the complete checked core/list/grid/masonry/spatial mapping in verification/entrypoint-migrations/WI-025.json. |
| WI-027 | @sectile/form | `.` | `typed field-state commands`, `local StandardSchema declaration closure` | @sectile/form |
| WI-027 | @sectile/form | `./state` | `FormEvent update-field`, `FormFieldInput.valid`, `getFormFieldIDsByIssueSource` | @sectile/form/state |
| WI-028 | @sectile/dom | `./form` | `FormConnection.subscribe`, `FormConnection field mutation surface` | @sectile/dom/form |
| WI-029 | @sectile/vue | `./form` | `FormRootSlotProps`, `FormRoot default slot`, `FormSummary default slot`, `FormReset default slot`, `FormSubmit default slot` | @sectile/vue/form |
| WI-030 | @sectile/dom | `./grid` | `GridEditMode`, `GridPolicies`, `GridState`, `GridEvent` | @sectile/dom/grid |
| WI-030 | @sectile/dom | `.` | `GridEditMode`, `GridPolicies`, `GridState`, `GridEvent`, `TextConnection.handleEvent`, `FacadeConnection<TextConnection>.send` | @sectile/dom |
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
| WI-034 | @sectile/virtual | `.` | `VirtualPoint, VirtualSize, VirtualRect, and VirtualInsets declaration closure` | @sectile/virtual |
| WI-036 | @sectile/vue | `./alert-dialog` | `middleware`, `autoUpdate`, `positionChange`, `Floating UI-derived props` | @sectile/dom/position |
| WI-036 | @sectile/dom | `./alert-dialog` | `Floating UI declaration closure`, `PositionOptions` | @sectile/dom/position |
| WI-036 | @sectile/vue | `./dialog` | `middleware`, `autoUpdate`, `positionChange`, `Floating UI-derived props` | @sectile/dom/position |
| WI-036 | @sectile/dom | `./dialog` | `Floating UI declaration closure`, `PositionOptions` | @sectile/dom/position |
| WI-036 | @sectile/vue | `./drawer` | `middleware`, `autoUpdate`, `positionChange`, `Floating UI-derived props` | @sectile/dom/position |
| WI-036 | @sectile/dom | `./drawer` | `Floating UI declaration closure`, `PositionOptions` | @sectile/dom/position |
| WI-036 | @sectile/vue | `./popover` | `middleware`, `autoUpdate`, `positionChange`, `Floating UI-derived props` | @sectile/dom/position |
| WI-036 | @sectile/dom | `./popover` | `middleware`, `autoUpdate`, `onPositionChange`, `Floating UI type re-exports` | @sectile/dom/position |
| WI-036 | @sectile/vue | `./select` | `middleware`, `autoUpdate`, `positionChange`, `Floating UI-derived props` | @sectile/dom/position |
| WI-036 | @sectile/dom | `./select` | `middleware`, `autoUpdate`, `onPositionChange`, `Floating UI declaration closure` | @sectile/dom/position |
| WI-036 | @sectile/vue | `./tooltip` | `middleware`, `autoUpdate`, `positionChange`, `Floating UI-derived props` | @sectile/dom/position |
| WI-036 | @sectile/dom | `./tooltip` | `middleware`, `autoUpdate`, `onPositionChange`, `Floating UI type re-exports` | @sectile/dom/position |
| WI-037 | @sectile/core | `./color-picker` | `ColorValue is the canonical Rgba8 declaration closure` | @sectile/core/color-picker |
| WI-038 | @sectile/form | `./schema` | `StandardSchemaV1 structural declaration` | @sectile/form/schema |
| WI-039 | @sectile/virtual | `./track-grid-layout` | `TrackGridLayoutState.regions readonly array`, `Virtual geometry declaration closure` | @sectile/virtual/track-grid-layout |
| WI-039 | @sectile/virtual | `./partitioned-track-grid-layout` | `PartitionedTrackGridLayoutState.rows and columns readonly arrays`, `Virtual geometry declaration closure` | @sectile/virtual/partitioned-track-grid-layout |
| WI-039 | @sectile/virtual | `./spatial-layout` | `SpatialLayoutState.items readonly array`, `Virtual geometry declaration closure` | @sectile/virtual/spatial-layout |
| WI-046 | @sectile/dom | `./combobox` | `TextInput declaration closure` | @sectile/dom/combobox |
| WI-046 | @sectile/dom | `./text` | `TextConnection.handleEvent`, `FacadeConnection<TextConnection>.send` | @sectile/dom/text |
