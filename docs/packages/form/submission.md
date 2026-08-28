---
title: Submission and reset
description: Choose native or managed submission, handle FormData and schemas, and reset values predictably.
---

# Submission and reset

Choose between normal browser navigation and a JavaScript-managed save. Both paths use the native form and submitter semantics.

## Managed submission

`defineFormSubmission()` keeps the optional schema and callback together. Pass the result to `FormRoot` with `v-bind`.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData, submitter }) => {
    await saveProfile(formData, {
      mode: submitter?.dataset.intent === 'draft' ? 'draft' : 'publish',
    })
  },
})
```

Without a schema, prefer `formData`. It accurately represents files, repeated names, checkbox and radio omissions, disabled controls, and the clicked submit button.

```ts
const avatar = formData.get('avatar')
if (avatar instanceof File) await uploadAvatar(avatar)

const interests = formData.getAll('interest')
```

## Typed schema output

When a Standard Schema is provided, `values` is the schema's transformed output.

```ts
const submission = defineFormSubmission({
  schema: checkoutSchema,
  onSubmit: ({ values }) => {
    values.quantity // inferred number after schema transformation
    return placeOrder(values)
  },
})
```

This is the typed boundary for a submission. `FormRoot` and `FormField` remain ordinary static Vue components.

## Async state

Read `submissionStatus` from the root slot to present progress and prevent an extra click while a save is running.

```vue
<FormRoot v-bind="submission" v-slot="{ submissionStatus }">
  <!-- fields -->
  <FormSubmit :disabled="submissionStatus === 'submitting'">
    {{ submissionStatus === 'submitting' ? 'Saving…' : 'Save' }}
  </FormSubmit>
</FormRoot>
```

A failed result can return field or form issues. A successful result may return `{ ok: true }` or no value.

## Native submission

Leave out `onSubmit` to let the browser perform its normal navigation:

```vue
<FormRoot action="/checkout" method="post" enctype="multipart/form-data">
  <!-- fields -->
  <FormSubmit>Place order</FormSubmit>
</FormRoot>
```

Submit button overrides such as `formaction`, `formmethod`, `formenctype`, `formtarget`, and `formnovalidate` remain available.

## Reset

`FormReset` renders a native reset button:

```vue
<FormReset>Discard changes</FormReset>
```

Reset restores native controls and uncontrolled Sectile components to their defaults. Controlled components remain owned by the application, so update their `v-model` in `onReset` when the product should reset them too.

```vue
<script setup lang="ts">
const enabled = ref(true)
const resetControlledValues = () => { enabled.value = true }
</script>

<template>
  <FormRoot v-bind="submission" :on-reset="resetControlledValues">
    <FormField name="enabled">
      <SwitchRoot v-model="enabled" value="yes"><SwitchThumb /></SwitchRoot>
    </FormField>
    <FormReset>Reset</FormReset>
  </FormRoot>
</template>
```
