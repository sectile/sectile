# State ownership

Sectile supports uncontrolled and controlled state where an application may need either ownership model.

## Uncontrolled state

Provide an initial value. The component owns subsequent transitions and emits changes for observation.

## Controlled state

Provide the current value and apply emitted changes in the owner. Controlled state is useful when validation, persistence, or coordination must happen outside the component.

## Disabled and readonly

Disabled components leave the interaction sequence and reject user mutation. Readonly components remain available for focus and reading while rejecting value changes. Host packages project those distinctions through their native conventions.
