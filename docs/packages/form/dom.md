---
title: DOM forms
description: Connect Sectile Form behavior to an existing HTML form without Vue.
---

# DOM forms

Install the DOM integration and its optional Form peer:

```sh
pnpm add @sectile/core @sectile/form @sectile/dom
```

## Connect existing markup

Start with ordinary HTML. The form remains usable before JavaScript loads.

```html
<form id="account-form">
  <div id="account-summary"></div>

  <label for="account-email">Email address</label>
  <input id="account-email" name="email" type="email" required>

  <button type="reset">Reset</button>
  <button type="submit">Save account</button>
</form>
```

Create one connection and identify the controls that should receive field errors and focus recovery:

```ts
import { createForm, defineFormSubmission } from '@sectile/dom/form'

const formElement = document.querySelector<HTMLFormElement>('#account-form')!
const summary = document.querySelector<HTMLElement>('#account-summary')!
const email = document.querySelector<HTMLInputElement>('#account-email')!

const submission = defineFormSubmission({
  onSubmit: ({ formData }) => saveAccount(formData),
})

const form = createForm({
  form: formElement,
  summary,
  participants: [{ id: 'email', element: email }],
  ...submission,
})

window.addEventListener('pagehide', () => form.destroy(), { once: true })
```

Named controls that are not listed as participants still appear in native `FormData`. Register a participant when the control also needs field state, error targeting, reset integration, or custom focus behavior.

## Native or managed submission

Omit `onSubmit` when the browser should follow the form's `action`, `method`, `enctype`, `target`, and submit button overrides.

```ts
const form = createForm({ form: formElement })
```

Provide `onSubmit` when JavaScript should save the result. The callback receives the original `SubmitEvent`, native `FormData`, structured `values`, and the submitter.

```ts
const form = createForm({
  form: formElement,
  onSubmit: async ({ formData, submitter }) => {
    await fetch('/account', {
      method: 'POST',
      body: formData,
      headers: submitter?.dataset.intent === 'draft'
        ? { 'X-Save-Mode': 'draft' }
        : undefined,
    })
  },
})
```

## Dynamic controls

Call `registerParticipant()` when a field is added after the connection is created. Keep the returned cleanup function and call it when that field is removed.

```ts
const unregister = form.registerParticipant({
  id: 'phone',
  element: phoneInput,
})

// When the input leaves the page:
unregister()
```

See [validation and errors](./validation) for validation callbacks and [submission and reset](./submission) for async outcomes and server errors.
