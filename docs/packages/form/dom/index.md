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
  onSubmit: async ({ formData, submitter, reinitialize }) => {
    await fetch('/account', {
      method: 'POST',
      body: formData,
      headers: submitter?.dataset.intent === 'draft'
        ? { 'X-Save-Mode': 'draft' }
        : undefined,
    })
    reinitialize()
  },
})
```

The submit payload's `reinitialize()` request is applied only after a successful managed submission. If the handler throws, rejects, or returns `{ ok: false }`, the existing dirty baseline remains.

## Dirty and touched state

Subscribe when application UI depends on form state:

```ts
const unsubscribe = form.subscribe(({ state }) => {
  unsavedBadge.hidden = !state.dirty
  saveButton.disabled = state.submission.status === 'submitting'
})
```

`dirty` means that at least one participant's current value differs from its baseline. It returns to `false` when every value returns to that baseline. `touched` records interaction separately and may stay `true` even when `dirty` is `false`.

Lifecycle metadata is grouped as `state.validation` (`generation`, `status`, `trigger`, and `intent`) and `state.submission` (`generation`, `status`, `count`, and `failure`). A submission `failure` reports a failed save without making the fields invalid. Server `issues` remain the validation channel for rejected values.

A validation callback issue may include `relatedPaths` in addition to its primary `path`. A managed-submission server issue uses the participant IDs `fieldId` and `relatedFieldIds`. In either case, the issue appears once in the summary while all matched participants become invalid. Changing the value of a primary or related participant clears a server issue; changing an unrelated participant does not.

Native inputs, textareas, selects, checkboxes, radios, and file inputs are snapshotted automatically. A custom participant can describe its value and equality rules:

```ts
interface RangeSnapshot {
  readonly start: number
  readonly end: number
}

const isRangeSnapshot = (value: unknown): value is RangeSnapshot => (
  typeof value === 'object'
  && value !== null
  && 'start' in value
  && 'end' in value
)

const unregister = form.registerParticipant({
  id: 'range',
  element: rangeRoot,
  getValue: () => ({ start: range.start, end: range.end }),
  isValueEqual: (current, baseline) => (
    isRangeSnapshot(current)
    && isRangeSnapshot(baseline)
    && current.start === baseline.start
    && current.end === baseline.end
  ),
})
```

Call `refreshParticipant('range')` after a custom control changes outside a native `input` or `change` event.

## Establish a new baseline

`reinitialize()` adopts every participant's current value as its new baseline without changing the controls:

```ts
form.reinitialize()
```

By default it also clears touched, validation, and submission metadata. Preserve selected groups when needed:

```ts
form.reinitialize({
  preserve: {
    touched: true,
    validation: true,
    submission: true,
  },
})
```

Use `reset()` when controls should return to their defaults. Use `reinitialize()` when the current values should stay on screen and count as saved. The [`FormConnection` API](./api#formconnection) lists the preservation options and related state.

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

See the [DOM Form API](./api) for validation options, managed-submission result types, selectors, and the complete `FormConnection` contract.
