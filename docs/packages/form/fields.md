---
title: Fields and controls
description: Understand field identity, values, metadata, groups, and controls across Form integrations.
---

# Fields and controls

A Form field is one user-facing answer. It may be a native input, a Sectile component, or a compound control. The Form model tracks its identity, interaction state, issues, and value baseline; the control still owns its rendered markup and current value.

## What changes between integrations

| Need | Vue | DOM |
| --- | --- | --- |
| Declare a field | `FormField` | `registerParticipant()` or initial `participants` |
| Connect labels and feedback | `FormLabel`, `FormDescription`, `FormMessage` | Existing HTML and participant elements |
| Read `dirty` and `touched` | Component slots or exposed Form state | `subscribe()` |
| Use a custom value | Form control composables | `getValue` and `isValueEqual` |

See [Vue fields and controls](./vue/fields) for template examples. See [DOM forms](./dom/) for existing HTML and dynamic participants.

## Values remain application-owned

Wrapping a control does not replace `v-model`, a native input value, or your application store. Form compares the current value with its baseline to derive `dirty`. `touched` records interaction separately, so it may stay `true` after the value returns to its baseline.

Named native controls still participate in browser `FormData` even when Form does not track their metadata. Register a field when it also needs Form issues, dirty tracking, or invalid-focus recovery.

## Field paths and groups

Paths such as `email`, `['profile', 'displayName']`, and `['members', 0, 'email']` give validation and structured values a stable identity. Native names and `FormData` continue to follow browser submission rules.

Use one field identity for a radio group or another compound answer. One issue can have a primary field and related fields without being duplicated in the form summary.

Continue with [validation and errors](./validation) or [custom controls](./custom-controls).
