---
title: Submission, reset, and reinitialization
description: Choose native or managed submission, handle FormData and schemas, and establish a new value baseline after saving.
---

# Submission, reset, and reinitialization

Choose between normal browser navigation and a JavaScript-managed save. Both paths use the native form and submitter semantics.

## Managed submission

`defineFormSubmission()` keeps the optional schema and callback together. Pass the result to `FormRoot` with `v-bind`.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData, submitter, reinitialize }) => {
    await saveProfile(formData, {
      mode: submitter?.dataset.intent === 'draft' ? 'draft' : 'publish',
    })
    reinitialize()
  },
})
```

Calling `reinitialize()` inside the handler makes the values that were just saved the new dirty baseline. The request is applied only if the managed submission succeeds. A thrown error or `{ ok: false }` leaves the existing baseline and dirty state intact.

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

## Adopt the current values as the new baseline

Call `reinitialize()` when the current values should become the form's new starting point without changing those values. It clears `dirty` and resets touched, validation, and submission metadata by default.

The action is available from the `FormRoot` slot as well as the exposed component ref:

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, reinitialize }">
  <!-- fields -->
  <p v-if="dirty">You have unsaved changes.</p>
  <button type="button" @click="reinitialize()">
    Accept current values
  </button>
</FormRoot>
```

Pass preservation options when part of the existing state should remain:

```ts
reinitialize({
  preserve: {
    touched: true,
    validation: true,
    submission: true,
  },
})
```

| Option | Preserves |
| --- | --- |
| `touched` | Field interaction history. |
| `validation` | Browser, callback, and schema validation state and issues. |
| `submission` | Submission status, attempt count, submitted state, and server issues. |

Configured form and field issues remain in either case. `dirty` always becomes `false` because the current participant values are captured as the new baseline.

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

After the reset callbacks finish, the resulting values become the dirty baseline.

## Reset or reinitialize?

| Goal | Use | Values | State |
| --- | --- | --- | --- |
| Discard edits and restore control defaults | `reset()` or `FormReset` | Native and uncontrolled values return to their defaults; the application must update controlled values. | Form state is cleared and the reset values become the baseline. |
| Keep the values currently on screen and treat them as saved | `reinitialize()` | Unchanged. | `dirty` clears; touched, validation, and submission state reset unless preserved. |

Unsaved-change prompts for browser refreshes or client-side navigation, and draft persistence in storage, belong to the application. Use `dirty` to decide when to warn and call `reinitialize()` after the application has successfully saved or restored a draft.
