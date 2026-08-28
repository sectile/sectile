---
title: Fields and controls
description: Use native inputs, Sectile components, groups, nested names, and external controls in one form.
---

# Fields and controls

A `FormField` represents one user-facing answer. Its child may be a native input, a Sectile component, or a compound group.

## Native and Sectile controls can be mixed

```vue
<FormRoot v-bind="submission">
  <FormField name="fullName" required>
    <FormLabel>Full name</FormLabel>
    <input autocomplete="name" />
    <FormMessage />
  </FormField>

  <FormField name="notifications">
    <FormLabel>Product notifications</FormLabel>
    <SwitchRoot value="enabled"><SwitchThumb /></SwitchRoot>
    <FormMessage />
  </FormField>

  <FormField name="team">
    <FormLabel>Team</FormLabel>
    <SelectRoot :items="teams">
      <SelectTrigger />
      <SelectContent>
        <SelectItem v-for="team in teams" :key="team" :value="team">
          {{ team }}
        </SelectItem>
      </SelectContent>
    </SelectRoot>
    <FormMessage />
  </FormField>
</FormRoot>
```

Sectile controls retain their normal controlled and uncontrolled APIs. Wrapping one in `FormField` adds form metadata and error presentation; it does not replace `v-model` or `defaultValue`.

## Nested field names

Use a segment array when the submitted value should have an object or array shape.

```vue
<FormField :name="['profile', 'displayName']">…</FormField>
<FormField :name="['members', 0, 'email']">…</FormField>
```

| Field path | Native name | Structured value |
| --- | --- | --- |
| `email` | `email` | `values.email` |
| `['profile', 'displayName']` | `profile.displayName` | `values.profile.displayName` |
| `['members', 0, 'email']` | `members[0].email` | `values.members[0].email` |

Use native `FormData` when repeated names or files are the most useful representation. Use `values` after a schema when the application needs a typed object.

## Radio and checkbox groups

Wrap a related native group in one `FormField`. The browser continues to decide which controls are successful.

```vue
<FormField name="plan" required as="fieldset">
  <FormLabel as="legend">Plan</FormLabel>

  <label><input type="radio" value="free" /> Free</label>
  <label><input type="radio" value="pro" /> Pro</label>
  <FormMessage />
</FormField>
```

Use the same pattern for a checkbox group. Put `required` on the individual native checkbox only when that specific choice is required.

## Named controls without `FormField`

A normal named input directly inside `FormRoot` still submits:

```vue
<FormRoot v-bind="submission">
  <input name="search" />
  <FormSubmit>Search</FormSubmit>
</FormRoot>
```

Use `FormField` when you also need connected labels, descriptions, errors, form state, or first-invalid focus.

## Controls outside the form element

Set an `id` on `FormRoot` and use the native `form` attribute for a control rendered elsewhere. Vue Teleports retain Form context, so a teleported Sectile or custom control can use the same approach.

```vue
<FormRoot id="settings-form" v-bind="submission">…</FormRoot>

<Teleport to="#page-actions">
  <FormSubmit form="settings-form">Save settings</FormSubmit>
</Teleport>
```

Continue with [custom controls](./custom-controls) when the field child is an application component that does not already integrate with Sectile Form.
