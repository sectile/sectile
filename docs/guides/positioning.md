# Floating positioning

Sectile positions anchored popup content at runtime. Component CSS owns appearance and size; it does not need `position`, `top`, `right`, `bottom`, `left`, or transform-based placement.

Change every shared positioning prop below. The popup reports the resolved `data-side` and `data-align`, so collision flips remain visible rather than inferred.

<FloatingPositionExample />

## Shared contract

- `side` and `align` request the preferred placement.
- `sideOffset` controls the gap from the anchor.
- `collisionBoundary` and `collisionPadding` define the space available for collision handling.
- `avoidCollisions` supplies the default for both `flip` and `shift`. Each explicit policy overrides that default independently.
- `arrowPadding` keeps the arrow away from content edges.
- `strategy` selects `absolute` or `fixed` positioning.
- `tracking` uses event-driven updates by default or continuous animation-frame tracking when required.
- `hideWhenDetached` hides content when its anchor leaves layout.
- `position=false` disables the engine and leaves placement to normal application layout.

The same contract applies to Popover, Tooltip, Select, Combobox, Cascade Select, Menu Button, and date picker roots. Menu submenus use the same engine with their parent item as the anchor.

## Keep a dropdown below its anchor

Set `flip` to `false` and `shift` to `true` to keep the requested side while moving the popup along the other axis when space is tight. For `side="bottom"`, the popup keeps its vertical gap and can move horizontally within the boundary.

```vue
<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverContent } from '@sectile/vue/popover';
</script>

<template>
  <PopoverRoot label="Account actions" side="bottom" align="start" :flip="false" :shift="true">
    <PopoverTrigger>Account</PopoverTrigger>
    <PopoverContent class="account-actions">
      <a href="/account">Account settings</a>
    </PopoverContent>
  </PopoverRoot>
</template>
```

Omitted policies inherit `avoidCollisions`, which defaults to `true`.

| Options | Flip | Shift |
| --- | --- | --- |
| All omitted | Enabled | Enabled |
| `avoidCollisions: false` | Disabled | Disabled |
| `flip: false, shift: true` | Disabled | Enabled |
| `avoidCollisions: false, flip: true` | Enabled | Disabled |

## Alignment and content size

Alignment follows the physical cross axis. For top/bottom placement, `start` aligns the left edges and `end` aligns the right edges. For left/right placement, they align the top and bottom edges respectively. `center` aligns the centers. These meanings stay the same in RTL layouts.

Apply available-size limits to the positioned Content part. Its dimensions can then bound an application-owned scroll region:

```css
.account-actions {
  max-width: var(--sectile-position-available-width);
  max-height: var(--sectile-position-available-height);
  overflow: auto;
}
```

Shifting preserves the anchor gap; it does not resize the content. A locked side can have no available height or width. The application owns content sizing, scrolling and the layout used when that space is insufficient.
