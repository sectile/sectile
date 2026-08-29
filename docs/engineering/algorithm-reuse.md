# Algorithm reuse inventory

> Generated from `verification/algorithm-reuse/manifest.json` and all eight package source trees.

Findings: 430; migration owners: WI-020, WI-021, WI-027, WI-038, WI-039, WI-040.

## Classifications

| Classification | Count |
|---|---:|
| bounded-small | 10 |
| migration-required | 108 |
| result-proportional | 143 |
| reuse | 169 |

## Categories

| Category | Count |
|---|---:|
| controller-connection-rebuild | 34 |
| discarded-canonical-index | 39 |
| measurement-authority | 16 |
| private-algorithm-bypass | 11 |
| raw-full-domain-scan | 286 |
| repeated-immutable-view | 14 |
| whole-domain-validation | 30 |

## Migration-required findings

| Owner | Rule | Source | Detector |
|---|---|---|---|
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/cascade-choice.ts:249` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/grid-control.ts:88` | immutable-view-construction |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/linear-action.ts:172` | linear-membership |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/linear-choice.ts:258` | linear-membership |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/menu.ts:22` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/menu.ts:46` | linear-membership |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-grid.ts:115` | derived-index-construction |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-grid.ts:440` | immutable-view-construction |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-grid.ts:533` | linear-membership |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-view.ts:337` | linear-membership |
| WI-021 | core-text-reorder-local-proof | `packages/core/src/reorder.ts:113` | linear-membership |
| WI-021 | core-text-reorder-local-proof | `packages/core/src/reorder.ts:136` | raw-identity-lookup |
| WI-021 | core-text-reorder-local-proof | `packages/core/src/reorder.ts:140` | raw-identity-lookup |
| WI-021 | core-text-reorder-local-proof | `packages/core/src/reorder.ts:147` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:359` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:472` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:483` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:501` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:531` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:531` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:539` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:548` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:557` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:668` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:696` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:707` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:818` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:860` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:861` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1004` | linear-membership |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/data-table.ts:440` | serialization-signature |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/data-table.ts:444` | serialization-signature |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:266` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:270` | linear-membership |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:385` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:425` | full-materialization |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:426` | derived-index-construction |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:426` | full-materialization |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:427` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:451` | full-materialization |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:454` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:481` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:484` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:485` | linear-membership |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:488` | full-materialization |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:493` | full-materialization |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/internal/grid-profile.ts:493` | raw-identity-lookup |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/source.ts:292` | derived-index-construction |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/source.ts:329` | derived-index-construction |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/source.ts:330` | derived-index-construction |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/source.ts:347` | linear-membership |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/source.ts:509` | derived-index-construction |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/virtual.ts:369` | derived-index-construction |
| WI-038 | tabular-retained-resolution | `packages/tabular/src/virtual.ts:370` | raw-identity-lookup |
| WI-039 | virtual-incremental-index | `packages/virtual/src/partitioned-track-grid-layout.ts:488` | derived-index-construction |
| WI-039 | virtual-incremental-index | `packages/virtual/src/partitioned-track-grid-layout.ts:489` | derived-index-construction |
| WI-039 | virtual-incremental-index | `packages/virtual/src/partitioned-track-grid-layout.ts:524` | derived-index-construction |
| WI-039 | virtual-incremental-index | `packages/virtual/src/partitioned-track-grid-layout.ts:608` | derived-index-construction |
| WI-039 | virtual-incremental-index | `packages/virtual/src/spatial-layout.ts:239` | raw-identity-lookup |
| WI-039 | virtual-incremental-index | `packages/virtual/src/spatial-layout.ts:304` | derived-index-construction |
| WI-039 | virtual-incremental-index | `packages/virtual/src/spatial-layout.ts:304` | full-index-rebuild |
| WI-039 | virtual-incremental-index | `packages/virtual/src/track-grid-layout.ts:382` | derived-index-construction |
| WI-039 | virtual-incremental-index | `packages/virtual/src/track-grid-layout.ts:382` | full-index-rebuild |
| WI-039 | virtual-incremental-index | `packages/virtual/src/track-grid-layout.ts:538` | full-index-rebuild |
| WI-039 | virtual-incremental-index | `packages/virtual/src/track-grid-layout.ts:539` | full-index-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/accordion.ts:158` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/carousel.ts:131` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-list.ts:203` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-select.ts:114` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/checkbox.ts:142` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/color-picker.ts:82` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:142` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:145` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/disclosure.ts:110` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/feed.ts:68` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/grid.ts:112` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/date-picker.ts:411` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/native-field.ts:120` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/popup.ts:331` | controller-rebuild |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/internal/virtual-collection-model.ts:52` | serialization-signature |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/internal/virtual-collection-model.ts:131` | serialization-signature |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/virtual-core.ts:207` | controller-rebuild |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/internal/virtual-list.ts:239` | geometry-measurement |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/internal/virtual-list.ts:355` | geometry-measurement |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/internal/virtual-list.ts:490` | geometry-measurement |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/listbox.ts:209` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/menu.ts:148` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/multi-thumb-slider.ts:153` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/pagination.ts:137` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/quantity-field.ts:92` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/radio-group.ts:127` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:118` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:197` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/select.ts:212` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/switch.ts:123` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tabs.ts:122` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tags-input.ts:131` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:143` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:178` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-button.ts:83` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-group.ts:116` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toolbar.ts:62` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-grid.ts:147` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-view.ts:134` | controller-rebuild |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/virtual-grid.ts:129` | geometry-measurement |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/virtual-grid.ts:147` | geometry-measurement |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/virtual-masonry.ts:126` | geometry-measurement |
| WI-040 | vue-virtual-measurement-and-batching | `packages/vue/src/virtual-spatial.ts:86` | geometry-measurement |
