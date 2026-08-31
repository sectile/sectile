---
title: Form
description: Build accessible forms with native HTML controls, Sectile components, validation, and typed submissions.
---

# Form

`@sectile/form` is the renderer-neutral form model shared by the Vue and DOM integrations. It coordinates field identity, validation, errors, submission, reset, and the baseline behind `dirty`. Your inputs still own their values and markup.

## Connect Form to your application

- [Vue](./form/vue/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
  ```

- [Direct DOM](./form/dom/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom
  ```

Vue and DOM are connection methods, not separate Form products. Install `@sectile/form` only when using one of these Form entry points; other Sectile components do not require it.

## What Form coordinates

| Capability | Responsibility |
| --- | --- |
| Fields | Names, metadata, interaction state, and value baselines |
| Validation | Native, schema, application, and server issue lifecycles |
| Submission | Submission progress and failures, kept separate from invalid values |
| Reset and reinitialization | Restore input defaults or adopt current values as the new baseline |
| Accessibility recovery | Associate feedback with fields and recover focus after invalid submission |

The Form domain owns these states and transitions. Vue renders components and applies framework lifecycle effects. DOM connects the same model to existing HTML. Styling, input values, data persistence, and product-specific rules remain in your application.

## Learn by task

| Task | Guide |
| --- | --- |
| Build a form in a Vue template | [Vue forms](./form/vue/) |
| Connect an existing HTML form | [DOM forms](./form/dom/) |
| Understand native inputs, Sectile controls, groups, and field identity | [Fields and controls](./form/fields) |
| Combine browser, schema, application, and server errors | [Validation and errors](./form/validation) |
| Handle files, async saves, reset, and a new dirty baseline | [Submission and reinitialization](./form/submission) |
| Connect an application-owned control | [Custom controls](./form/custom-controls) |
| Render a Vue form on the server without hydration surprises | [SSR and hydration](./form/ssr) |

The guides explain the shared behavior first and point to host-specific code where it differs. For exact exports, use the [API reference chooser](./form/api), [Vue API](./form/vue/api), or [DOM API](./form/dom/api).
