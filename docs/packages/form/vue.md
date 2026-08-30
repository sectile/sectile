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
<FormRoot v-bind="submission" v-slot="{ dirty, touched, valid, validation, submission }">
  <!-- fields -->
  <p v-if="dirty">You have unsaved changes.</p>
  <p v-if="touched && !dirty">The form was reviewed without changing its values.</p>
  <FormSubmit :disabled="submission.status === 'submitting'">
    {{ submission.status === 'submitting' ? 'Saving…' : 'Save' }}
  </FormSubmit>
</FormRoot>
```

`dirty` compares the current participant values with the form's baseline. It becomes `true` after a real value change and returns to `false` when the value returns to that baseline. `touched` records interaction independently, so it can remain `true` after `dirty` becomes `false`.

`validation` contains `generation`, `status`, `trigger`, and `intent`. `submission` contains `generation`, `status`, `count`, and `failure`. Read these grouped snapshots when UI depends on a lifecycle; `submitted` and `submitCount` remain root-slot conveniences derived from `submission.count`.

## Compose a custom summary

`FormSummary` renders submission failure and issue messages by default. Its slot exposes the same lifecycle snapshots plus canonical issue projections, so a dialog description or another summary layout can consume Form state directly.

```vue
<FormSummary v-slot="{ validation, submission, issues, serverIssues, firstIssue, valid }">
  <p v-if="submission.failure">{{ submission.failure.message }}</p>
  <p v-else-if="firstIssue">{{ firstIssue.message }}</p>
  <small v-if="!valid && validation.status === 'invalid'">
    {{ issues.length }} issue(s), {{ serverIssues.length }} from the server
  </small>
</FormSummary>
```

One issue may name a primary `path` and several `relatedPaths`. It appears once in `issues`; the primary field exposes it through `issues`, while the other invalid fields expose it through `relatedIssues` and reference the summary in their ARIA metadata.

## Establish a new baseline

Call `reinitialize()` when the values currently on screen should count as the new starting values. It does not mutate inputs.

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, reinitialize }">
  <!-- fields -->
  <p v-if="dirty">You have unsaved changes.</p>
  <button type="button" @click="reinitialize()">Accept current values</button>
</FormRoot>
```

`FormRoot` also exposes `reinitialize()` through its component ref:

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const form = useTemplateRef('form')
const acceptCurrentValues = () => form.value?.reinitialize()
</script>

<template>
  <FormRoot ref="form" v-bind="submission">
    <!-- fields -->
  </FormRoot>
  <button type="button" @click="acceptCurrentValues">Accept current values</button>
</template>
```

For the usual save flow, call the submission event's `reinitialize()` instead. It is committed only after the managed submission succeeds:

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData, reinitialize }) => {
    await saveProfile(formData)
    reinitialize()
  },
})
```

See [submission, reset, and reinitialization](./submission) for preservation options and the distinction from native reset.

## Unsaved-change warnings and drafts

Form reports whether values differ through `dirty`; the application decides what to do with that information.

- Use it in a router leave guard for client-side navigation.
- Use it in a `beforeunload` listener for refresh, tab close, or browser exit. Browsers control the prompt text.
- Persist drafts in the application's chosen storage, then restore those values through the controls that own them.
- After a save or restored draft is accepted, call `reinitialize()` to make those current values the new baseline.

Form does not install global navigation listeners or choose a storage policy, because both depend on the application's router, data sensitivity, expiry rules, and multi-tab behavior.

## Attribute precedence

Attributes declared on `FormField` are defaults for the participating control. An attribute written directly on the input wins, which is useful when one control needs an exception.

```vue
<FormField name="nickname" required>
  <TextField :required="false" />
</FormField>
```

Continue with [fields and controls](./fields), then choose [validation](./validation) and [submission](./submission) behavior.
