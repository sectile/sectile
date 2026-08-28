---
title: Form
description: Build accessible forms with native HTML controls, Sectile components, validation, and typed submissions.
---

# Form

Sectile Form coordinates the behavior that turns separate inputs into one accessible form: field metadata, validation, errors, submission, reset, and the baseline behind `dirty`. Inputs still own their values and markup.

## Try a complete form

Edit a field and watch the form-level state change. A successful save calls `reinitialize()`, so the values on screen become the new baseline and `dirty` returns to `false`.

<FormPackageExample />

This is a real `FormRoot` using Sectile `TextField` and `Select` components. Open the Code tab for a complete Vue example you can copy.

## Choose an integration

- [Vue](./form/vue)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
  ```

- [Direct DOM](./form/dom)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom
  ```

Install `@sectile/form` only when using a Form entry point. Applications without Form do not need it.

## What Form coordinates

| Part | Responsibility |
| --- | --- |
| `FormRoot` | Native form behavior, validation, submission, and form-level state |
| `FormField` | One labelled value, group, or compound control |
| `FormLabel` / `FormDescription` | Accessible field metadata |
| `FormMessage` / `FormSummary` | Field and form-level validation feedback |
| `FormReset` / `FormSubmit` | Native reset and submit actions |

`FormField` supplies shared attributes such as `name`, `required`, `disabled`, and `readonly`. The participating input keeps ownership of its value and can override those defaults when needed.

## Learn by task

| Task | Guide |
| --- | --- |
| Build a form in a Vue template | [Vue forms](./form/vue) |
| Connect an existing HTML form | [DOM forms](./form/dom) |
| Mix native inputs, Sectile components, groups, and nested names | [Fields and controls](./form/fields) |
| Show browser, schema, application, and server errors | [Validation and errors](./form/validation) |
| Handle files, async saves, native navigation, reset, and a new dirty baseline | [Submission, reset, and reinitialization](./form/submission) |
| Make an application component work inside `FormField` | [Custom controls](./form/custom-controls) |
| Render forms on the server without hydration surprises | [SSR and hydration](./form/ssr) |

The [Form API reference](./form/api) lists every Vue component, prop, slot, event, function, and exported type.
