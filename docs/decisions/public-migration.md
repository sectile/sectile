# Public migration

The migration was intentionally breaking because the package was not a stable public release. Compatibility aliases were not retained in that migration transaction.

| Previous surface | Canonical surface | Decision |
|---|---|---|
| `collection` | `sequence` | Replace the broad name with the strict-total-order theory. |
| `matrix-navigation` | `grid` | Make absolute logical coordinates and gaps observable. |
| `tree-collection` | `tree` | Make ordered roots, siblings, and parenthood canonical. |
| previous range helpers | `range` | Replace floating authority with exact integer ticks. |

This document records the migration result, not a permanent package blacklist. Routine verification checks the canonical surfaces that current consumers require, but it does not fail merely because a former name or another additional export is introduced later. Such an addition is evaluated as a new public API decision at that time.

Stateful runtime services, implicit subscriptions, internal selection utilities, and host-text helpers were removed from the public migration. They do not belong to the four structure authorities and require their own promotion evidence.

## Form package extraction in 0.8.0

Form is now an optional renderer-neutral package with explicit DOM and Vue adapters. Applications using those adapters install `@sectile/form` themselves; ordinary DOM and Vue imports remain peer-free. Terminal has no Form adapter.

| Previous surface | Canonical surface | Decision |
|---|---|---|
| `@sectile/core/form` | `@sectile/form/state`, `@sectile/form/path`, or `@sectile/form/values` | Move renderer-neutral runtime authority into the dedicated package and keep imports capability-specific. |
| Form types from `@sectile/core` | Explicit `@sectile/form/*`, `@sectile/dom/form`, or `@sectile/vue/form` type exports | Remove implicit root coupling. |
| Form APIs from `@sectile/dom` | `@sectile/dom/form` | Load the optional integration only through its explicit subpath. |
| Form parts from `@sectile/vue` | `@sectile/vue/form` | Keep ordinary Vue imports independent of the optional peer. |
| `createTypedForm`, `TypedForm*`, and typed-path component factories | Static `FormRoot`/`FormField` plus `defineFormSubmission()` | Infer schema output at the honest submission boundary instead of claiming template-wide path safety. |
| Primary use of `FormSubmitHandler` or `FormSchemaSubmitHandler` annotations | `defineFormSubmission({ schema?, onSubmit })` | Keep schema and callback inference together; advanced exported types remain available for genuine annotation needs. |
| `@sectile/terminal/form` or Terminal root Form exports | Removed with no Terminal adapter replacement | Terminal cannot preserve browser-native form semantics. Applications may compose `@sectile/form/state` as application-owned workflow state. |

See the [Form package guide](/packages/form) for installation and complete native, Sectile, mixed, custom-control, lifecycle, and SSR examples.
