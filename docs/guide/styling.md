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

## Motion

Use state attributes to drive transitions. Keep DOM presence explicit when an animation needs both entering and leaving states, and provide a motion-free equivalent under `prefers-reduced-motion`.
