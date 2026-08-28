---
title: SSR and hydration
description: Keep server-rendered forms stable across hydration, controlled values, and Teleports.
---

# SSR and hydration

`FormRoot`, `FormField`, and the standard Form parts render on the server. Follow normal Vue SSR rules so the first client render matches the HTML produced by the server.

## Keep initial values deterministic

Use the same `defaultValue`, `value`, selected option, and checked state on the server and the first client render. Load client-only preferences after hydration instead of changing the initial tree.

```vue
<FormField name="locale">
  <FormLabel>Locale</FormLabel>
  <select :value="initialLocale">
    <option value="en">English</option>
    <option value="ko">한국어</option>
  </select>
</FormField>
```

When a value is controlled with `v-model`, the application remains its owner before and after hydration.

## Use stable field IDs

Automatic IDs are hydration-safe when the server and client render the same tree. Supply an explicit `id` when a field must also be targeted by tests, external markup, or a persistent URL fragment.

```vue
<FormField id="billing-email" name="email">
  <FormLabel>Billing email</FormLabel>
  <TextField type="email" />
  <FormMessage />
</FormField>
```

## Validation starts in the browser

Server rendering produces the form structure and native attributes. Browser constraint validation, focus movement, user interaction validation, and submission begin after hydration. If the server already knows about errors, pass them through `issues` so the same messages render on both sides.

```vue
<FormRoot :issues="initialIssues" v-bind="submission">…</FormRoot>
```

## Teleports and external controls

Render a stable Teleport target in the server HTML. Keep the same `FormField` ownership and native `form` association when the control is outside the `<form>` element.

```vue
<FormRoot id="profile-form" v-bind="submission">…</FormRoot>
<div id="profile-actions" />

<Teleport to="#profile-actions">
  <FormSubmit form="profile-form">Save profile</FormSubmit>
</Teleport>
```

For a custom teleported input, follow [custom controls](./custom-controls) and use a stable template ref or `shallowRef()` as appropriate.

## Hydration checklist

- The server and first client render use the same field order and conditional branches.
- Controlled values are initialized from the same data.
- Native `name`, `form`, `required`, `disabled`, and `readonly` attributes do not change during hydration.
- Teleport targets exist in the initial document.
- Client-only validation or server requests begin after hydration.

See [Vue forms](./vue) for the basic composition and [submission, reset, and reinitialization](./submission) for controlled-value ownership.
