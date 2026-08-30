---
title: Validation and errors
description: Combine browser constraints, application checks, schemas, and server errors in a Vue form.
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

Native `novalidate` on the form and `formnovalidate` on a submit button keep their normal HTML meaning. Application and schema validation can still run when native validation is skipped.

## Focus after failed validation

After a failed submission, Form focuses the earliest invalid primary field in rendered form order. The order in which a validator returns issues does not affect this choice. If no invalid issue has a registered primary field, Form focuses the earliest related field instead.

When that field contains a fieldset, Form chooses a control inside the group as described in [Radio and checkbox groups](./fields#radio-and-checkbox-groups).

## Present a summary

`FormSummary` exposes each issue once, even when one issue invalidates several fields.

```vue
<FormRoot v-bind="submission">
  <FormSummary v-slot="{ submission, issues, serverIssues, firstIssue }">
    <p v-if="submission.failure">{{ submission.failure.message }}</p>
    <p v-else-if="firstIssue">{{ firstIssue.message }}</p>
    <small v-if="serverIssues.length">The server rejected {{ serverIssues.length }} value(s).</small>
  </FormSummary>
  <!-- fields -->
</FormRoot>
```

The slot also exposes `validation` and `valid`. Without a custom slot, `FormSummary` renders the submission failure followed by one message for each current issue.

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

## One issue related to several fields

Use `relatedPaths` when one message describes a relationship between values. The issue appears once in the summary while every registered field named by `path` or `relatedPaths` becomes invalid.

```ts
const validate = (values: Record<string, unknown>) => ({
  issues: lookupMatches(values.orderNumber, values.email)
    ? []
    : [{
        path: 'orderNumber',
        relatedPaths: ['email'],
        message: 'Check the order number and email.',
      }],
})
```

The field named by `path` owns the message and renders it through `FormMessage`. Fields named by `relatedPaths` also become invalid and reference the summary for accessible error context without repeating the message.

At the state level, `allIssues` is the complete ordered list. The form-level `issues` list contains issues without a registered primary field. Each field's `issues` list contains messages it owns, while `relatedIssues` contains messages owned by another field that also make this field invalid. Use `allIssues` for a complete custom summary instead of combining the field-level lists.

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

Return field-related issues, a form-wide submission failure, or both from a managed submission:

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData }) => {
    const result = await createAccount(formData)
    if (result.ok) return { ok: true }

    if (result.emailTaken) {
      return {
        ok: false,
        issues: [{ path: 'email', message: 'This email is already registered.' }],
      }
    }
    return {
      ok: false,
      failure: { message: 'The account could not be created. Try again.' },
    }
  },
})
```

A `failure` changes `submission.status` to `failed` without making the form or its fields invalid. Server issues do make their primary and related fields invalid. A real value change in any associated field clears that server issue; unrelated input does not. A new submit attempt clears the previous failure and server issues before validating again.

For application issues supplied independently of submission, pass the `issues` prop:

```vue
<FormRoot v-bind="submission" :issues="serverIssues">…</FormRoot>
```

Keep user-facing messages explicit. Use `mapSubmitError` to translate an unexpected rejected promise into a safe `{ message }` failure without exposing service or stack details.
