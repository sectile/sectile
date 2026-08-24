# @sectile/terminal

Terminal bindings for Sectile interaction semantics.

## Responsibility

- Normalize terminal keyboard input and common platform variants
- Own controlled or uncontrolled runtime synchronization
- Preserve grapheme-safe editing and rendered Unicode width
- Provide optional Node TTY integration
- Provide optional semantic appearance, screen layout, caret projection, and partial screen updates

The package does not prescribe an application theme or component markup and does not own application data. Consumers can render connections directly or compose the optional `appearance` and `screen` subpaths into rows, columns, boxes, and text regions.

## Keyboard conventions

Bindings follow the shape rendered by the terminal host:

- Vertical collections use Up and Down.
- Horizontal collections use Left and Right.
- A vertical hierarchy uses Right to open or enter, and Left or Escape to return.
- Home and End move within the current level.
- Enter or Space opens a branch or activates a leaf command.
- Printable text performs typeahead when the connection receives a `textValue` function.

Individual connections document any additional editing, paging, or range keys they own.

## API shape

Direct `createX` factories return ready connections. Matching `tryCreateX` factories expose recoverable construction failure. Every facade provides `state`, `send`, `update`, `subscribe`, and `destroy` alongside host-specific methods. Lower-level controllers remain available for separate ownership.
