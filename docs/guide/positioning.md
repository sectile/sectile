# Floating positioning

Sectile positions anchored popup content at runtime. Component CSS owns appearance and size; it does not need `position`, `top`, `right`, `bottom`, `left`, or transform-based placement.

Change every shared positioning prop below. The popup reports the resolved `data-side` and `data-align`, so collision flips remain visible rather than inferred.

<FloatingPositionExample />

## Shared contract

- `side` and `align` request the preferred placement.
- `sideOffset` controls the gap from the anchor.
- `collisionBoundary`, `collisionPadding`, and `avoidCollisions` control flip and shift behavior.
- `arrowPadding` keeps the arrow away from content edges.
- `strategy` selects `absolute` or `fixed` positioning.
- `tracking` uses event-driven updates by default or continuous animation-frame tracking when required.
- `hideWhenDetached` hides content when its anchor leaves layout.
- `position=false` disables the engine and leaves placement to normal application layout.

The same contract applies to Popover, Tooltip, Select, Combobox, Cascade Select, Menu Button, and date picker roots. Menu submenus use the same engine with their parent item as the anchor.
