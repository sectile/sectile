# Styling

Sectile components do not ship visual styles. Apply classes, attributes, or child composition directly to the parts you render.

## Stable selectors

Framework parts expose stable `data-scope`, `data-part`, and state attributes. Prefer these semantic hooks over generated class names.

```css
[data-scope='checkbox'][data-part='root'][data-state='checked'] {
  background: var(--selected-background);
}
```

## Child composition

Vue parts accept normal attributes and classes. Parts that support `asChild` can merge their behavior into your child element without adding a wrapper.

## Motion

Use state attributes to drive transitions. Keep DOM presence explicit when an animation needs both entering and leaving states.
