# State ownership

Sectile supports uncontrolled and controlled state where an application may need either ownership model.

## Uncontrolled state

Provide an initial value. The component owns subsequent transitions and emits changes for observation.

## Controlled state

Provide the current value and apply emitted changes in the owner. Controlled state is useful when validation, persistence, or coordination must happen outside the component.

Choose ownership when the controller or component is created and preserve that shape for its lifetime. Switching from controlled to uncontrolled state, or the reverse, is unsupported because it loses authority over pending proposals and revisions. Remount or recreate the connection with an explicit new initial value when ownership must change.

For components with several mutable fields, ownership is independent per field but still fixed at construction. A controlled interaction emits a proposal; state changes only after the owner applies the value through `update`, the component-specific sync method, or Vue's model update.

## Disabled and readonly

Disabled components leave the interaction sequence and reject user mutation. Readonly components remain available for focus and reading while rejecting value changes. Host packages project those distinctions through their native conventions.
