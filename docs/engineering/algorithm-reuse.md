# Algorithm reuse inventory

> Generated from `verification/algorithm-reuse/manifest.json` and all 9 package source trees.

Findings: 456; migration owners: WI-020, WI-027, WI-040.

## Classifications

| Classification | Count |
|---|---:|
| bounded-small | 14 |
| migration-required | 60 |
| result-proportional | 172 |
| reuse | 210 |

## Categories

| Category | Count |
|---|---:|
| controller-connection-rebuild | 36 |
| discarded-canonical-index | 58 |
| measurement-authority | 30 |
| private-algorithm-bypass | 2 |
| raw-full-domain-scan | 282 |
| repeated-immutable-view | 13 |
| whole-domain-validation | 35 |

## Migration-required findings

| Owner | Rule | Source | Detector |
|---|---|---|---|
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/cascade-choice.ts:249` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/menu.ts:22` | raw-identity-lookup |
| WI-020 | core-composite-derived-views | `packages/core/src/internal/composites/tree-grid.ts:435` | immutable-view-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:738` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:768` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:816` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:833` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:881` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1121` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1130` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1130` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1155` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1181` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1256` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1511` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1724` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1888` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1906` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:1913` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2052` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2053` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2122` | derived-index-construction |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2374` | raw-identity-lookup |
| WI-027 | form-indexed-field-state | `packages/form/src/internal/form.ts:2614` | linear-membership |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/accordion.ts:158` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/carousel.ts:131` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-list.ts:203` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/cascade-select.ts:147` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/checkbox.ts:141` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/color-picker.ts:82` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:179` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/combobox.ts:182` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/disclosure.ts:110` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/feed.ts:68` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/grid.ts:130` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/date-picker.ts:407` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/native-field.ts:120` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/popup.ts:304` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/internal/virtual-core.ts:277` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/listbox.ts:222` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/menu.ts:222` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/multi-thumb-slider.ts:153` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/pagination.ts:137` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/quantity-field.ts:92` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/radio-group.ts:127` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:118` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/reorder.ts:197` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/select.ts:205` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/slider.ts:236` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/spin-button.ts:170` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/switch.ts:122` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tabs.ts:123` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tags-input.ts:134` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:146` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toast.ts:191` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-button.ts:83` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toggle-group.ts:116` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/toolbar.ts:62` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-grid.ts:172` | controller-rebuild |
| WI-040 | vue-controller-reconfiguration | `packages/vue/src/tree-view.ts:159` | controller-rebuild |
