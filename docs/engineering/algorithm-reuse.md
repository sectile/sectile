# Algorithm reuse inventory

> Generated from `verification/algorithm-reuse/manifest.json` and all 9 package source trees.

Findings: 449; migration owners: WI-020, WI-027, WI-040.

## Classifications

| Classification | Count |
|---|---:|
| bounded-small | 14 |
| migration-required | 60 |
| result-proportional | 177 |
| reuse | 198 |

## Categories

| Category | Count |
|---|---:|
| controller-connection-rebuild | 36 |
| discarded-canonical-index | 64 |
| measurement-authority | 32 |
| private-algorithm-bypass | 2 |
| raw-full-domain-scan | 267 |
| repeated-immutable-view | 13 |
| whole-domain-validation | 35 |

## Migration-required findings

| Owner | Rule | Source | Detector |
|---|---|---|---|
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/cascade-choice.ts:249` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/menu.ts:22` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-grid.ts:435` | immutable-view-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/construction/path.ts:145` | linear-membership |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:477` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:507` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:555` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:572` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:667` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:917` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:926` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:926` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:951` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:982` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1068` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1333` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1611` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1777` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1795` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1802` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1945` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1946` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2017` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2269` | raw-identity-lookup |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/accordion.ts:165` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/carousel.ts:137` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-list.ts:212` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-select.ts:151` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/checkbox.ts:146` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/color-picker.ts:82` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:208` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:211` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/disclosure.ts:115` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/feed.ts:68` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/grid.ts:178` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/date-picker.ts:439` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/native-field.ts:125` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/popup.ts:307` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/virtual-core.ts:300` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/listbox.ts:315` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/menu.ts:278` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/multi-thumb-slider.ts:153` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/pagination.ts:137` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/quantity-field.ts:92` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/radio-group.ts:132` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:118` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:197` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/select.ts:219` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/slider.ts:236` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/spin-button.ts:170` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/switch.ts:122` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tabs.ts:128` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tags-input.ts:134` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:146` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:191` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-button.ts:83` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-group.ts:116` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toolbar.ts:62` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-grid.ts:184` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-view.ts:164` | controller-rebuild |
