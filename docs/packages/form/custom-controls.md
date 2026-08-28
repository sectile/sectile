---
title: Custom controls
description: Integrate application-specific atomic and composite Vue controls with FormField.
---

# Custom controls

Sectile input components already participate in `FormField`. Use the composables on this page only for an application component that owns its own DOM.

## One native input or textarea

Use `useNativeInputFormControl()` when one native input represents the field. Bind the returned props to that same element.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useNativeInputFormControl } from '@sectile/vue/form'

const input = useTemplateRef<HTMLInputElement>('input')
const participation = useNativeInputFormControl(input)
</script>

<template>
  <input ref="input" v-bind="participation.controlProps.value" />
</template>
```

For a stable native template ref, use Vue 3.5 `useTemplateRef()`. It produces a shallow DOM reference and keeps the element type close to the template.

## Callback, dynamic, or external refs

Use `shallowRef()` when the element arrives through a callback ref, may change type, belongs to a collection, or is supplied by another component.

```ts
import { shallowRef } from 'vue'
import { useNativeInputFormControl } from '@sectile/vue/form'

const input = shallowRef<HTMLInputElement | null>(null)
const participation = useNativeInputFormControl(input)

function setInput(element: Element | null) {
  input.value = element instanceof HTMLInputElement ? element : null
}
```

Do not store DOM elements in a deep reactive `ref()`.

## Composite controls

Use `useCompositeFormControl()` when one answer is represented by several elements. Identify the semantic root, the element that receives focus, and the native elements that submit values.

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import {
  provideFormControlOwner,
  useCompositeFormControl,
} from '@sectile/vue/form'

const value = ref(3)
const root = useTemplateRef<HTMLElement>('root')
const firstButton = useTemplateRef<HTMLButtonElement>('firstButton')
const submission = useTemplateRef<HTMLInputElement>('submission')

const participation = useCompositeFormControl({
  root,
  focusTarget: firstButton,
  submissions: () => [{ element: submission }],
  reset: () => { value.value = 3 },
})

provideFormControlOwner()
</script>

<template>
  <div ref="root" v-bind="participation.controlProps.value">
    <button ref="firstButton" type="button" @click="value = 1">1</button>
    <button type="button" @click="value = 2">2</button>
    <button type="button" @click="value = 3">3</button>
    <input ref="submission" type="hidden" :value="value" />
  </div>
</template>
```

`provideFormControlOwner()` prevents nested buttons or Sectile controls from registering as separate answers for the same `FormField`.

## Usage boundary

These composables do nothing when the component is used outside `FormField`; the component should continue to work normally. This makes a custom control reusable in both form and non-form contexts.

For a low-level control with separate semantic, focus, validation, or multiple named submission elements, use `useFormControl()` and refer to the [Form component API](/components/form) for the complete registration options.
