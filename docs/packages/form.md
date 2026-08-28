---
title: Form
description: Build accessible forms with native HTML controls, Sectile components, validation, and typed submissions.
---

# Form

Sectile Form connects labels, descriptions, errors, validation, submission, and reset behavior across native HTML controls and Sectile components. Use it when a screen needs more than a standalone input and the fields should behave as one accessible form.

## Choose your integration

| Application | Install | Start here |
| --- | --- | --- |
| Vue | `pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue` | [Vue forms](./form/vue) |
| Browser without Vue | `pnpm add @sectile/core @sectile/form @sectile/dom` | [DOM forms](./form/dom) |

`@sectile/form` is an optional peer of the DOM and Vue packages. Applications that do not import a Form entry point do not need to install it.

## A complete Vue form

```vue
<script setup lang="ts">
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '@sectile/vue/form'
import { TextField } from '@sectile/vue/text'

const submission = defineFormSubmission({
  onSubmit: async ({ formData }) => {
    await saveProfile(formData)
  },
})
</script>

<template>
  <FormRoot v-bind="submission">
    <FormSummary />

    <FormField name="displayName" required>
      <FormLabel>Display name</FormLabel>
      <TextField autocomplete="name" />
      <FormDescription>Shown to other workspace members.</FormDescription>
      <FormMessage />
    </FormField>

    <FormSubmit>Save profile</FormSubmit>
  </FormRoot>
</template>
```

`FormField` supplies shared field attributes, but the input keeps ownership of its value. Native inputs, Sectile inputs, and both together use the same form.

## Learn by task

| Task | Guide |
| --- | --- |
| Build a form in a Vue template | [Vue forms](./form/vue) |
| Connect an existing HTML form | [DOM forms](./form/dom) |
| Mix native inputs, Sectile components, groups, and nested names | [Fields and controls](./form/fields) |
| Show browser, schema, application, and server errors | [Validation and errors](./form/validation) |
| Handle files, async saves, native navigation, and reset | [Submission and reset](./form/submission) |
| Make an application component work inside `FormField` | [Custom controls](./form/custom-controls) |
| Render forms on the server without hydration surprises | [SSR and hydration](./form/ssr) |

## HTML remains the foundation

Form preserves native `name`, `form`, `required`, `disabled`, `readonly`, file, checkbox, radio, submitter, action, method, encoding, and reset behavior. Prefer a native control when HTML already provides the interaction. Use a Sectile component when you need a richer accessible interaction, and compose both when that best fits the screen.

The [Form component reference](/components/form) lists every Vue part, prop, slot, and exported type.
