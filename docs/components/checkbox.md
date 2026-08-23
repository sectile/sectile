# Checkbox

A checkbox represents whether a value belongs to a set. It supports ordinary checked and unchecked values, plus an indeterminate value for summarizing a partially selected group.

## Basic usage

Use a binary checkbox for a single optional value. The example starts unchecked and owns its state.

<CheckboxDemo />

## Indeterminate state

Use `indeterminate` when a parent checkbox summarizes children that are only partly selected. It is a presentation of aggregate state, not a third user choice that must appear in every checkbox.

<CheckboxIndeterminateDemo />

Core, DOM, and terminal call this value `mixed`. Vue exposes the HTML-facing spelling `indeterminate` and translates it at the package boundary.

## State ownership

Use `defaultValue` when the checkbox owns its state. Use `modelValue` with `v-model` when a parent validates, persists, or coordinates the value. Providing `modelValue` makes the component controlled for its lifetime.

<CheckboxOwnershipDemo />

## Form participation

`name`, `value`, `form`, and `required` project native checkbox submission behavior. A checked root contributes its configured value; an unchecked root contributes no value. The Vue package renders the native input needed for submission.

<CheckboxFormDemo />

## Disabled and readonly

Disabled checkboxes reject interaction, leave the tab sequence, and do not participate in form submission. Readonly checkboxes remain focusable and inspectable while rejecting value changes.

<CheckboxInteractionDemo />

## Anatomy

```vue
<CheckboxRoot>
  <CheckboxIndicator />
</CheckboxRoot>
```

`CheckboxRoot` owns value, interaction, form projection, and state attributes. `CheckboxIndicator` stays mounted and uses `hidden` when the value is false, preserving a stable DOM shape.

## API reference

### Root props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `modelValue` | `boolean \| 'indeterminate'` | — | Controlled value. |
| `defaultValue` | `boolean \| 'indeterminate'` | `false` | Initial uncontrolled value. |
| `disabled` | `boolean` | `false` | Removes user interaction and native form participation. |
| `readonly` | `boolean` | `false` | Preserves focus and reading while rejecting mutation. |
| `required` | `boolean` | `false` | Projects native required form semantics. |
| `name` | `string` | — | Native form field name. |
| `value` | `string` | `'on'` | Submitted form value when checked. |
| `form` | `string` | — | Associates the field with an external form. |
| `as` | `string \| Component` | `'button'` | Rendered element or component. |
| `asChild` | `boolean` | `false` | Merges behavior into the single child. |

### Root event

| Event | Payload | Purpose |
| --- | --- | --- |
| `update:modelValue` | `boolean \| 'indeterminate'` | Reports an accepted value change. |

### Slot props

| Property | Type | Meaning |
| --- | --- | --- |
| `checked` | `boolean \| 'indeterminate'` | Current public value. |
| `isChecked` | `boolean` | True only for the checked value. |
| `isIndeterminate` | `boolean` | True only for the indeterminate value. |
| `disabled` | `boolean` | Current disabled state. |
| `readonly` | `boolean` | Current readonly state. |

`CheckboxIndicator` exposes the same slot properties and supports `as` and `asChild`.

## Data attributes

Change the value and interaction flags, then select Root or Indicator to see which attributes belong to each part.

<CheckboxAttributesDemo />

| Part | Attribute | Values |
| --- | --- | --- |
| Root | `data-scope` | `checkbox` |
| Root | `data-part` | `root` |
| Root | `data-state` | `checked`, `unchecked`, `indeterminate` |
| Root | `data-disabled` | Present when disabled. |
| Root | `data-readonly` | Present when readonly. |
| Indicator | `data-part` | `indicator` |
| Indicator | `data-scope` | `checkbox` |
| Indicator | `data-state` | Mirrors the root state. |

## Keyboard interaction

| Key | Behavior |
| --- | --- |
| <kbd>Space</kbd> | Toggles the value when interaction is enabled. |
| <kbd>Tab</kbd> | Moves focus through the normal document sequence. Disabled roots are excluded. |

Pointer activation follows native button or checkbox behavior through the DOM adapter.

## Accessibility

The root exposes checkbox semantics and `aria-checked="mixed"` for an indeterminate value. Disabled and readonly remain distinct.

See the [WAI-ARIA Checkbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) for the corresponding accessibility pattern.
