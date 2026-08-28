---
title: Form
description: Coordinate native values, field metadata, validation, submission, and reset across DOM and Vue.
---

# Form

`@sectile/form` is the renderer-neutral owner of field paths, structured native values, issues, validation generations, submission state, and reset commands. It does not own input values or render controls. Native elements and Sectile components remain the value owners.

```sh
pnpm add @sectile/form
```

Install the optional peer only in applications that use a host Form adapter:

```sh
# DOM
pnpm add @sectile/core @sectile/form @sectile/dom

# Vue
pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
```

Ordinary DOM and Vue imports do not require `@sectile/form`. Form support is available only from `@sectile/dom/form` and `@sectile/vue/form`. Terminal intentionally has no Form adapter or dependency.

## Public boundaries

| Import | Responsibility |
| --- | --- |
| `@sectile/form/path` | Safe field paths, relative paths, and native-name encoding. |
| `@sectile/form/values` | Immutable structured values from ordered native entries. |
| `@sectile/form/state` | Field registry, issues, validation/submission generations, transitions, and commands. |
| `@sectile/form/schema` | Standard Schema input/output inference types. |
| `@sectile/form/error` | Package-local construction and transition errors. |
| `@sectile/dom/form` | Native `HTMLFormElement`, `FormData`, validation, focus, submission, and external-participant lifecycle. |
| `@sectile/vue/form` | Static Form parts and custom-control participation for Vue. |

The package root is type-only. Import runtime functions from an explicit subpath.

## Vue composition

Native and Sectile controls can be mixed freely. `FormField` supplies fallback metadata, while attributes written directly on the real control remain authoritative. A named native control outside `FormField` still appears in `FormData`, but it does not gain field state, issue routing, or coordinated focus.

```vue
<script setup lang="ts">
import {
  FormField,
  FormLabel,
  FormRoot,
  FormSubmit,
  defineFormSubmission,
} from '@sectile/vue/form'
import { TextField } from '@sectile/vue/text'

const submission = defineFormSubmission({
  onSubmit: ({ formData }) => {
    console.log([...formData.entries()])
  },
})
</script>

<template>
  <FormRoot v-bind="submission">
    <FormField name="native" required>
      <FormLabel>Native input</FormLabel>
      <input />
    </FormField>

    <FormField :name="['profile', 'displayName']" required>
      <FormLabel>Sectile input</FormLabel>
      <TextField default-value="Mina" />
    </FormField>

    <input name="unwrapped" value="still-submitted" />
    <FormSubmit>Save</FormSubmit>
  </FormRoot>
</template>
```

Use one `FormField` around a native `fieldset`, radio group, or checkbox group. Composite Sectile controls may expose a semantic root, a distinct focus/validation target, and multiple hidden successful controls for repeated, indexed, or range values. An ambiguous set of unrelated controls becomes a recoverable field diagnostic instead of choosing a target arbitrarily.

## Submission typing

`defineFormSubmission()` keeps the schema and handler in one immutable object that can be passed with `v-bind`. Without a schema, `values` is an honest `DOMFormValues`: keys exist at runtime, but their values remain `unknown`. Use `formData` directly or narrow the values in application code.

With any Standard Schema implementation, the handler receives the inferred transformed output:

```ts
import { defineFormSubmission } from '@sectile/vue/form'
import { accountSchema } from './account-schema' // implements Standard Schema

export const accountSubmission = defineFormSubmission({
  schema: accountSchema,
  onSubmit: ({ values }) => {
    values.accountId // inferred from the schema output
  },
})
```

There is no typed component factory. `FormRoot` and `FormField` stay static, and runtime field paths remain honest rather than claiming template-wide schema path inference. Advanced handler and definition types remain exported when an annotation is genuinely useful.

## Participation cases

| Composition | Behavior |
| --- | --- |
| Native only | `input`, `textarea`, `select`, fieldsets, radios, and checkboxes use browser semantics. |
| Sectile only | Each component keeps controlled/uncontrolled value ownership and registers its actual targets. |
| Mixed | All successful controls share the same document-ordered native `FormData`. |
| Direct named control | Submits normally without enhanced field state. |
| Custom atomic control | Register one native element with `useNativeInputFormControl` or `useFormControl`; outside `FormField` the helper is inert. |
| Custom composite | Register root, focus, validation, submissions, relative names, and an optional reset hook; call `provideFormControlOwner()` before rendering nested participating controls. |
| Teleport or external control | Preserve Vue context and use the native `form` association; the DOM adapter observes registered external targets directly. |

For a stable native template ref, prefer Vue 3.5 `useTemplateRef()`. Use `shallowRef()` for callback refs, dynamic/custom elements, collections, or externally supplied DOM handles. DOM nodes should never be stored in a deep reactive `ref`.

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

## Values, validation, submission, and reset

- Native `FormData` is the source of truth. Nested dot/bracket paths, indexed arrays, repeated names, submitter entries, files, disabled/unchecked omission, and document order are preserved.
- Malformed, colliding, or prototype-sensitive paths become safe form-level issues without discarding the original `FormData`.
- Native, custom, schema, application, and server issues coexist by source. Exact and longest-prefix field ownership determine message and focus routing.
- Without `onSubmit`, valid native submission continues with the original action, method, encoding, target, and submitter. Async validation resumes that submission once.
- With `onSubmit`, sync and async JavaScript-managed success/failure is tracked; duplicates are suppressed and reset/unmount invalidates late completion.
- Reset restores native and uncontrolled Sectile defaults, preserves controlled ownership, clears coordinator state, and invokes participant hooks once in document order.

SSR renders stable native semantics. Participant registration begins after mount, and hydration does not duplicate fields or take over controlled values.

## 0.8 migration

| Previous API | New API |
| --- | --- |
| `@sectile/core/form` | `@sectile/form/state`, `@sectile/form/path`, or `@sectile/form/values` as needed |
| DOM root Form exports | `@sectile/dom/form` |
| Vue root Form exports | `@sectile/vue/form` |
| `createTypedForm`, `TypedForm*`, typed-path factories | Static `FormRoot`/`FormField` plus `defineFormSubmission()` |
| Submit handler types as the primary annotation | `defineFormSubmission({ schema?, onSubmit })` |
| Terminal Form APIs | Removed, with no Terminal adapter replacement |

DOM and Vue Form consumers install the optional `@sectile/form` peer explicitly. See the [Form component reference](/components/form) for the complete API.
