# State ownership

Sectile supports uncontrolled and controlled state where an application may need either ownership model.

## Uncontrolled state

Provide an initial value. The component owns subsequent transitions and emits changes for observation.

## Controlled state

Provide the current value and apply emitted changes in the owner. Controlled state is useful when validation, persistence, or coordination must happen outside the component.

Choose ownership when the controller or component is created and preserve that shape for its lifetime. Switching from controlled to uncontrolled state, or the reverse, is unsupported because it loses authority over pending proposals and revisions. Remount or recreate the connection with an explicit new initial value when ownership must change.

For components with several mutable fields, ownership is independent per field but still fixed at construction. A controlled interaction emits a proposal; state changes only after the owner applies the value through `update`, the component-specific sync method, or Vue's model update. A value that becomes impossible after its domain changes follows the reconciliation exception below.

## Dynamic collection reconciliation

When a Vue collection domain changes, Sectile reconciles identity-bearing state before rebuilding its host connection. This is a public semantic contract rather than a rendering detail.

| State | Reconciliation |
| --- | --- |
| Single or multiple selection | Remove identities outside the new domain and preserve the new domain's order. Single selection keeps at most the first remaining identity. |
| Disabled selected identity | Preserve the selection. Disabled state affects interaction eligibility, not ownership of an existing value. |
| Current or highlighted identity | Retain it when it remains eligible. Otherwise prefer an eligible selected identity, then the first eligible domain identity, then `null`. Components that accept an explicit `null` highlight preserve that absence. |
| Tree expansion | Remove identities that are no longer branches and preserve branch-domain order. |
| Grid editing | Return to navigation when reconciliation leaves no current cell. |

For controlled state, reconciliation emits the corresponding `update:*` proposal. The component projects the reconciled candidate immediately so it never constructs a host controller with stale identities, but ownership remains with the application: the owner must apply the proposal. Uncontrolled state adopts the same candidate internally. Reconciliation never invents a value outside the current domain.

This contract covers Accordion, Calendar, Carousel, Combobox, Grid, Listbox, Radio Group, Select, Tabs, Toggle Group, Toolbar, Tree Grid, and Tree View. Pagination has a separate numeric contract: a controlled page is clamped to the new page count when `total` or `itemsPerPage` changes.

## Disabled and readonly

Disabled components leave the interaction sequence and reject user mutation. Readonly components remain available for focus and reading while rejecting value changes. Host packages project those distinctions through their native conventions.
