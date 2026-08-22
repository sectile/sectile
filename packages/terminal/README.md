# @sectile/terminal

Terminal bindings for Sectile interaction semantics.

## Responsibility

- Normalize terminal keyboard input and common platform variants
- Own controlled or uncontrolled runtime synchronization
- Preserve grapheme-safe editing and rendered Unicode width
- Provide optional Node TTY integration

The package does not provide a terminal component framework, visual theme, screen layout, or application data. Consumers render their own interface from connection state and effects.

## API shape

Direct `createX` factories return ready connections. Matching `tryCreateX` factories expose recoverable construction failure. Every facade provides `state`, `send`, `update`, `subscribe`, and `destroy` alongside host-specific methods. Lower-level controllers remain available for separate ownership.
