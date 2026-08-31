---
title: Custom controls
description: Connect an application-owned control to Form without giving up its value or rendering API.
---

# Custom controls

A custom control keeps its own public value and rendering API. The Form integration only needs a participant contract: stable identity, current value, equality, interaction notifications, and a focus target.

## Vue controls

Use the Form control composables inside a component that may appear under `FormField`. They merge native attributes, report value and interaction changes, and expose field metadata without replacing the component's `v-model` contract. Outside `FormField`, the component should continue to work normally.

See [Vue custom controls](./vue/custom-controls) for native-input, hidden-input, and non-input patterns.

## DOM controls

Register a participant with `registerParticipant()`. Provide `getValue` and, when object identity is not meaningful, `isValueEqual`. Call `refreshParticipant()` after a change that does not emit a native `input` or `change` event, and call the returned cleanup function when the control leaves the page.

See [DOM forms](./dom/) for the complete participant lifecycle and [DOM API](./dom/api) for exact option types.
