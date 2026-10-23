# Algorithm reuse inventory

> Generated from `verification/algorithm-reuse/manifest.json` and all 9 package source trees.

Findings: 515; migration owners: WI-020, WI-027, WI-040.

## Classifications

| Classification | Count |
|---|---:|
| bounded-small | 33 |
| migration-required | 65 |
| result-proportional | 187 |
| reuse | 230 |

## Categories

| Category | Count |
|---|---:|
| controller-connection-rebuild | 37 |
| discarded-canonical-index | 64 |
| measurement-authority | 46 |
| private-algorithm-bypass | 4 |
| raw-full-domain-scan | 313 |
| repeated-immutable-view | 13 |
| whole-domain-validation | 38 |

## Migration-required findings

| Owner | Rule | Source | Detector |
|---|---|---|---|
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/cascade-choice.ts:249` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/menu.ts:22` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-grid.ts:435` | immutable-view-construction |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-select.ts:243` | linear-membership |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-select.ts:338` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-selection.ts:119` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/files.ts:78` | linear-membership |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/construction/path.ts:139` | linear-membership |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/create.ts:148` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/create.ts:178` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/create.ts:226` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/projection.ts:12` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/projection.ts:39` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/query.ts:20` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/query.ts:114` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/storage/fields.ts:187` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/storage/fields.ts:188` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/storage/issues.ts:111` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/storage/issues.ts:129` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/storage/issues.ts:136` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:262` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:271` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:271` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:296` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:327` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:413` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:678` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/state/transitions.ts:861` | raw-identity-lookup |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/accordion.ts:178` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/carousel.ts:143` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-list.ts:226` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/checkbox.ts:146` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/color-picker.ts:222` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:335` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:338` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/disclosure.ts:115` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/editable.ts:205` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/editable.ts:212` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/feed.ts:68` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/grid.ts:178` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/input/native-field.ts:253` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/input/native-range-field.ts:241` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/listbox.ts:336` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/multi-thumb-slider.ts:213` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/multi-thumb-slider.ts:273` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/pagination.ts:137` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/quantity-field.ts:164` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/radio-group.ts:154` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:206` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:411` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:415` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/slider.ts:263` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/spin-button.ts:218` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/switch.ts:128` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tabs.ts:144` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tags-input.ts:196` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/temporal/picker.ts:601` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/text.ts:320` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:219` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-button.ts:83` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-group.ts:125` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toolbar.ts:62` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-grid.ts:257` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-view.ts:155` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/virtual/virtual-core.ts:299` | controller-rebuild |
