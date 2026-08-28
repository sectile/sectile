---
title: Vue forms
description: Compose native inputs and Sectile components with the Vue Form parts.
---

# Vue forms

Install Form with the Vue and DOM packages:

```sh
pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
```

Import Form parts from the dedicated entry point:

```ts
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '@sectile/vue/form'
```

## Start with the form structure

`FormRoot` renders the native `<form>`. Put each labelled input in a `FormField`, render field-level feedback with `FormMessage`, and place `FormSummary` near the beginning of the form.

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
  onSubmit: ({ formData }) => updateAccount(formData),
})
</script>

<template>
  <FormRoot v-bind="submission" autocomplete="on">
    <FormSummary />

    <FormField name="email" required>
      <FormLabel>Email address</FormLabel>
      <TextField type="email" autocomplete="email" />
      <FormDescription>We send account notices to this address.</FormDescription>
      <FormMessage />
    </FormField>

    <FormField name="timezone">
      <FormLabel>Timezone</FormLabel>
      <select>
        <option value="Asia/Seoul">Seoul</option>
        <option value="Europe/London">London</option>
      </select>
      <FormMessage />
    </FormField>

    <FormSubmit>Save account</FormSubmit>
  </FormRoot>
</template>
```

The example deliberately mixes a Sectile text field with a native `<select>`. Both contribute to the same `FormData`.

## Parts at a glance

| Part | Use it for |
| --- | --- |
| `FormRoot` | Native form attributes, validation settings, submission, and form state. |
| `FormField` | One labelled value, group, or compound control. |
| `FormLabel` | The visible label or group legend. |
| `FormDescription` | Help text connected to the field. |
| `FormMessage` | The current field error. |
| `FormSummary` | A form-wide error summary. |
| `FormSubmit` | A native submit button. |
| `FormReset` | A native reset button. |

## Read form state in the slot

Use the root slot for UI that depends on the whole form. Inputs continue to own their values.

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, valid, submissionStatus }">
  <!-- fields -->
  <p v-if="dirty">You have unsaved changes.</p>
  <FormSubmit :disabled="submissionStatus === 'submitting'">
    {{ submissionStatus === 'submitting' ? 'Saving…' : 'Save' }}
  </FormSubmit>
</FormRoot>
```

## Attribute precedence

Attributes declared on `FormField` are defaults for the participating control. An attribute written directly on the input wins, which is useful when one control needs an exception.

```vue
<FormField name="nickname" required>
  <TextField :required="false" />
</FormField>
```

Continue with [fields and controls](./fields), then choose [validation](./validation) and [submission](./submission) behavior.
