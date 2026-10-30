# Styling

Sectile components do not ship visual styles. They expose stable parts and states so one product design system can style every component and complex virtualized surface consistently.

## Name roles before values

Prefer semantic roles such as `surface-interactive`, `surface-selected`, `content-secondary`, `feedback-critical`, and `focus-ring`. A role describes why a value is used. Themes can replace the value without changing the meaning of a state.

The component catalog and virtualized product examples in these docs share the same interaction roles for hover, selection, disabled controls, feedback, and keyboard focus.

## Stable selectors

Framework parts expose stable `data-scope`, `data-part`, and state attributes. Prefer these semantic hooks over generated class names.

```css
[data-scope='checkbox'][data-part='root'][data-state='checked'] {
  color: var(--content-on-accent);
  background: var(--surface-selected);
}
```

`data-state='checked'` means selected, not blue. This distinction keeps component behavior legible across themes and high-contrast modes.

## Child composition

Vue parts accept normal attributes and classes. Parts that support `asChild` can merge their behavior into your child element without adding a wrapper.

The child must resolve to one Element. A slot Fragment containing one element, comments and whitespace is supported, including nested Sectile triggers. A component with one native element root can use that root directly.

A custom component that renders a Fragment or changes its root should expose its current element and forward attributes to that element:

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue';

defineOptions({ inheritAttrs: false });
const element = useTemplateRef<HTMLButtonElement>('element');
defineExpose({ element });
</script>

<template>
  <button ref="element" v-bind="$attrs"><slot /></button>
</template>
```

The exposed value is an Element or `null` while unavailable. Sectile follows that reference when it changes. `Primitive` also exposes its adopted element as a readonly `element`, cleared on unmount. A Fragment with multiple candidates, or an ambiguous component root without an explicit element, is rejected.

## Motion

Use public state attributes to drive transitions and keyframes. Popup content can remain present through its exit animation, Drawer exposes swipe progress, and checked or expanded parts expose stable state hooks.

See [Motion](/guides/motion) for copyable popup enter/exit, expansion indicator, checked-state, Drawer swipe, and `prefers-reduced-motion` patterns.
