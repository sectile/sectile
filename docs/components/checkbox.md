# Checkbox

A checkbox represents inclusion in a set. Its value can be `true`, `false`, or `indeterminate` when a parent summarizes partially selected children.

<CheckboxDemo />

## Features

- Controlled and uncontrolled value ownership.
- Binary and indeterminate values.
- Native form submission through `name`, `value`, `form`, and `required`.
- Disabled and readonly interaction states.
- Stable root and indicator parts for styling.
- DOM and terminal projections backed by the same core transition model.

## Installation

The renderer-neutral and host packages are published independently:

```sh
pnpm add @sectile/core @sectile/dom
```

::: warning Vue workspace preview
`@sectile/vue` is not published yet. Vue examples describe the current workspace API while it stabilizes.
:::

## Anatomy

```vue
<CheckboxRoot>
  <CheckboxIndicator />
</CheckboxRoot>
```

`CheckboxRoot` owns value, interaction, form projection, and state attributes. `CheckboxIndicator` stays mounted and uses `hidden` when the value is false, matching normal HTML presence more closely than conditional mounting.

## Vue usage

```vue
<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
import { ref } from 'vue'

const checked = ref<boolean | 'indeterminate'>('indeterminate')
</script>

<template>
  <CheckboxRoot v-model="checked" name="analytics" v-slot="{ isIndeterminate }">
    <CheckboxIndicator>
      {{ isIndeterminate ? '−' : '✓' }}
    </CheckboxIndicator>
    Include analytics
  </CheckboxRoot>
</template>
```

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

### Default slot

| Property | Type | Meaning |
| --- | --- | --- |
| `checked` | `boolean \| 'indeterminate'` | Current public value. |
| `isChecked` | `boolean` | True only for the checked value. |
| `isIndeterminate` | `boolean` | True only for the indeterminate value. |
| `disabled` | `boolean` | Current disabled state. |
| `readonly` | `boolean` | Current readonly state. |

`CheckboxIndicator` exposes the same slot properties and supports `as` and `asChild`.

## State ownership

Use `defaultValue` when the checkbox can own its state. Use `v-model` when the parent must validate, persist, or coordinate the value.

```vue
<CheckboxRoot default-value="indeterminate" />

<CheckboxRoot v-model="checked" />
```

Do not provide both ownership forms. A `modelValue` makes the component controlled for its lifetime.

## Core and host APIs

::: code-group

```ts [Core]
import {
  applyCheckboxEvent,
  createCheckboxState,
} from '@sectile/core/checkbox'

const initial = createCheckboxState('mixed')
if (!initial.ok) throw new TypeError(initial.error.message)

const update = applyCheckboxEvent(initial.value, 'toggle')
```

```ts [DOM]
import { createCheckbox } from '@sectile/dom/checkbox'

const connection = createCheckbox({
  element: document.querySelector('[role="checkbox"]')!,
  defaultValue: 'mixed',
  onValueChange(value) {
    console.log(value)
  },
})
```

```ts [Terminal]
import { createCheckbox } from '@sectile/terminal/checkbox'

const connection = createCheckbox({
  defaultValue: 'mixed',
  onValueChange(value) {
    render(value)
  },
})
```

:::

The core and host values use `'mixed'`. Vue exposes the HTML-facing spelling `'indeterminate'` and translates at its package boundary.

## Data attributes

| Part | Attribute | Values |
| --- | --- | --- |
| Root | `data-scope` | `checkbox` |
| Root | `data-part` | `root` |
| Root | `data-state` | `checked`, `unchecked`, `indeterminate` |
| Root | `data-disabled` | Present when disabled. |
| Root | `data-readonly` | Present when readonly. |
| Indicator | `data-part` | `indicator` |
| Indicator | `data-state` | Mirrors the root state. |

## Keyboard interaction

| Key | Behavior |
| --- | --- |
| <kbd>Space</kbd> | Toggles the value when interaction is enabled. |
| <kbd>Tab</kbd> | Moves focus through the normal document sequence. Disabled roots are excluded. |

Pointer activation follows native button or checkbox behavior through the DOM adapter.

## Accessibility

The root exposes checkbox semantics and `aria-checked="mixed"` for an indeterminate value. Disabled and readonly remain distinct. When form props are present, Vue also renders the native checkbox input used for submission.

See the [WAI-ARIA Checkbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) for the corresponding accessibility pattern.
