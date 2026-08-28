---
title: Validation and errors
description: Combine browser constraints, application checks, schemas, and server errors with accessible messages.
---

# Validation and errors

Form can present errors from the browser, application code, a Standard Schema, or a server response. Every source uses the same `FormMessage` and `FormSummary` UI.

## Start with browser constraints

Use native attributes whenever they express the rule:

```vue
<FormField name="email" required>
  <FormLabel>Email address</FormLabel>
  <TextField type="email" minlength="6" autocomplete="email" />
  <FormMessage />
</FormField>
```

On an invalid submission, the first invalid field receives focus and `FormSummary` exposes the form-wide result.

```vue
<FormRoot v-bind="submission">
  <FormSummary v-slot="{ state }">
    Please review {{ state.issues.length }} field(s).
  </FormSummary>
  <!-- fields -->
</FormRoot>
```

Native `novalidate` on the form and `formnovalidate` on a submit button keep their normal HTML meaning. Application and schema validation can still run when native validation is skipped.

## Application validation

Use `validate` for rules that involve multiple fields or application data. Return messages with a field path, or omit the path for a form-wide message.

```ts
const validate = (values: Record<string, unknown>) => ({
  issues: values.password === values.confirmPassword
    ? []
    : [{ path: 'confirmPassword', message: 'Passwords do not match.' }],
})
```

```vue
<FormRoot
  v-bind="submission"
  :validate="validate"
  :validate-on="['blur']"
  :revalidate-on="['input']"
>
  …
</FormRoot>
```

`validateOn` controls the first interactive check. `revalidateOn` controls when a field that already has an error is checked again. Submission always performs the complete validation pass.

## Standard Schema validation

Pass any Standard Schema implementation to `defineFormSubmission()`. The schema validates the submitted values and its output type is inferred in `onSubmit`.

```ts
const submission = defineFormSubmission({
  schema: accountSchema,
  onSubmit: ({ values }) => {
    values.accountId // inferred from accountSchema output
    return saveAccount(values)
  },
})
```

Schema issues that contain paths appear in the matching `FormMessage`. Other issues appear in `FormSummary`.

## Server errors

Return field or form errors from a managed submission:

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData }) => {
    const result = await createAccount(formData)
    if (result.ok) return { ok: true }

    return {
      ok: false,
      issues: result.emailTaken
        ? [{ path: 'email', message: 'This email is already registered.' }]
        : [{ message: 'The account could not be created. Try again.' }],
    }
  },
})
```

For errors supplied independently of submission, pass the `issues` prop:

```vue
<FormRoot v-bind="submission" :issues="serverIssues">…</FormRoot>
```

Keep user-facing messages explicit. Use `mapSubmitError` to translate an unexpected rejected promise without exposing service or stack details.
