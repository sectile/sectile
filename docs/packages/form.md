---
title: Form
description: Build accessible forms with native HTML controls, Sectile components, validation, and typed submissions.
---

# Form

Sectile Form coordinates the behavior that turns separate inputs into one accessible form: field metadata, validation, errors, submission, reset, and the baseline behind `dirty`. Inputs still own their values and markup. Choose the host integration that owns the platform-specific API and effects.

## Choose an integration

- [Vue](./form/vue/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
  ```

- [Direct DOM](./form/dom/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom
  ```

Install `@sectile/form` only when using a Form entry point. Applications without Form do not need it.

## What Form coordinates

| Capability | Responsibility |
| --- | --- |
| Fields | Names, metadata, interaction state, and value baselines |
| Validation | Native, schema, application, and server issue lifecycles |
| Submission | Submission progress and failures, kept separate from invalid values |
| Reset and reinitialization | Restore input defaults or adopt current values as the new baseline |
| Accessibility recovery | Associate feedback with fields and recover focus after invalid submission |

The Form domain owns these states and transitions. The Vue and DOM integrations expose different public APIs for composing them and applying browser effects.

## Learn by task

| Task | Guide |
| --- | --- |
| Build a form in a Vue template | [Vue forms](./form/vue/) |
| Connect an existing HTML form | [DOM forms](./form/dom/) |
| Mix native inputs, Sectile components, groups, and nested names in Vue | [Vue fields and controls](./form/vue/fields) |
| Show browser, schema, application, and server errors in Vue | [Vue validation and errors](./form/vue/validation) |
| Handle files, async saves, reset, and a new dirty baseline in Vue | [Vue submission](./form/vue/submission) |
| Connect an application component as a Vue form field | [Vue custom controls](./form/vue/custom-controls) |
| Render Vue forms on the server without hydration surprises | [Vue SSR and hydration](./form/vue/ssr) |

Use the [API reference chooser](./form/api), or open the [Vue API](./form/vue/api) or [DOM API](./form/dom/api) directly. Each reference contains only the selected integration's public surface.
