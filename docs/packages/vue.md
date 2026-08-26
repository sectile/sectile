# Vue

`@sectile/vue` provides headless Vue components backed by Sectile DOM semantics. It follows Vue's model conventions, renders accessible compound parts, and exposes stable styling boundaries while leaving layout and visual design to the application.

```sh
pnpm add @sectile/vue vue
```

Import components from their public component subpath:

```ts
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
```

## Host defaults

`HostProvider` supplies environment defaults without rendering a wrapper element. Use it once near the application root, then override it in a nested subtree only when that subtree uses a different host boundary.

```vue
<script setup lang="ts">
import { HostProvider } from '@sectile/vue/host-provider'
</script>

<template>
  <HostProvider
    direction="rtl"
    portal-target="#overlays"
  >
    <RouterView />
  </HostProvider>
</template>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `direction` | `'ltr' \| 'rtl'` | inherited, then `'ltr'` | Reading direction used by owned surfaces and horizontal keyboard navigation. |
| `portalTarget` | `string \| HTMLElement` | inherited, then `'body'` | Default target for popup Portal parts. A Portal's own `to` prop takes priority. |
| `createId` | `() => string` | inherited, then Vue `useId()` | Creates the unique suffix shared by related ARIA IDs. Each call must return a unique, SSR-stable value. |

`useHostDirection`, `useHostPortalTarget`, and `useHostId` expose the resolved values to application-owned compound parts. Nested providers inherit each omitted prop independently.

## Basic usage

The root owns interaction state and shares it with its compound parts. `v-model` uses controlled Vue state; `default-value` creates an uncontrolled component.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

const accepted = ref(false)
</script>

<template>
  <form class="terms" @submit.prevent>
    <CheckboxRoot
      v-model="accepted"
      class="terms__control"
      name="terms"
      required
      aria-label="Accept the terms"
    >
      <CheckboxIndicator class="terms__indicator">✓</CheckboxIndicator>
    </CheckboxRoot>
    <span>I accept the terms</span>
  </form>
</template>

<style scoped>
.terms {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.terms__control {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  background: transparent;
}

.terms__control[data-state='checked'] {
  background: currentColor;
}

.terms__indicator {
  color: white;
}
</style>
```

The components include no visual CSS. The example styles are application-owned and can be replaced without changing behavior.

## Controlled and uncontrolled state

Use `v-model` when application state is authoritative:

```vue
<CheckboxRoot v-model="accepted" />
```

Use `default-value` when the component should own subsequent changes:

```vue
<CheckboxRoot :default-value="true" />
```

Do not pass both ownership modes. Controlled components emit their proposed value through `update:modelValue`; the parent decides whether to accept it.

Ownership is fixed for a mounted root. Changing a model prop from `undefined` to a value, or removing a previously supplied model prop, is an error. Remount the root when the application intentionally changes ownership.

## Render ownership

Most public parts accept `as` and `as-child`. `as` chooses the rendered element. `as-child` merges behavior and attributes into the single child so the application can own the element completely.

```vue
<script setup lang="ts">
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@sectile/vue/popover'
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button class="account-button">Account</button>
    </PopoverTrigger>
    <PopoverContent class="account-popover">
      Account settings
    </PopoverContent>
  </PopoverRoot>
</template>
```

The default slot must contain exactly one native element or supported component after transparent fragments and nested arrays are inspected. Comments and whitespace-only text are ignored as candidates but remain in the VNode tree. Visible text, zero elements, and multiple elements are rejected. Sectile path-copies only the fragments leading to the adopted element, preserving keys, scoped-slot metadata, and hydration structure.

Vue performs the child-prop merge once. Existing and Sectile classes and styles compose, both refs remain active, and Sectile owns conflicting roles, ARIA attributes, data attributes, and internal IDs. Child listeners run first. Calling `preventDefault()` prevents the corresponding Sectile listener from applying its semantic action.

A component child may rely on `$el` when it renders one element root. A fragment or multi-root component must forward `$attrs` to the intended element and expose that element explicitly. Otherwise Sectile throws instead of mounting visually correct markup with broken focus, positioning, or collection registration.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { PrimitiveElementExpose } from '@sectile/vue/primitive'

defineOptions({ inheritAttrs: false })
const element = ref<PrimitiveElementExpose['element']>(null)
defineExpose({ element })
</script>

<template>
  <span aria-hidden="true">→</span>
  <button ref="element" v-bind="$attrs"><slot /></button>
</template>
```

Portal parts accept `defer` when their target is rendered by Vue later in the same mount or update tick. It does not wait for a target created in a later tick. Leave it `false` for `body` or an already-mounted target. See Vue's [deferred Teleport documentation](https://vuejs.org/guide/built-ins/teleport.html#deferred-teleport).

## Slot state

Root and part slots expose live semantic state. Use slot props for content that must change with interaction; use data attributes for CSS-only state.

```vue
<CheckboxRoot v-slot="{ isChecked, isIndeterminate }" default-value="indeterminate">
  <span v-if="isIndeterminate">Partially selected</span>
  <span v-else>{{ isChecked ? 'Selected' : 'Not selected' }}</span>
</CheckboxRoot>
```

Slot names and values are component-specific. TypeScript infers them from the imported component.

## Forms and native fields

Form-capable components preserve browser submission semantics. For example, `CheckboxRoot` renders a visually hidden native checkbox when `name`, `form`, or `required` makes one necessary. Its `checked`, `indeterminate`, `required`, `disabled`, and form attributes follow the semantic state.

Text-entry components retain native input, selection, and IME behavior instead of recreating text editing in Vue. Forward ordinary HTML attributes such as `autocomplete`, `inputmode`, and `aria-label` to the public field part.

## Styling boundaries

Every public compound part exposes stable attributes:

```html
<button
  data-scope="checkbox"
  data-part="root"
  data-state="checked"
></button>
```

- `data-scope` identifies the component family.
- `data-part` identifies the public styling boundary.
- `data-state` exposes the current semantic state when the part has one.
- State flags such as `data-disabled`, `data-readonly`, and `data-invalid` appear only when active.

Prefer these selectors over generated component names or internal DOM depth. See [Styling](/guide/styling) for selector and theming guidance.

## DOM semantics and lifecycle

Vue components reuse `@sectile/dom` for ARIA projection, normalized input, focus effects, popup positioning, and native-element behavior. Components create their connection during setup, synchronize controlled props through watchers, and release listeners when their rendered ownership ends.

Vue is a complete public host projection, not an optional example wrapper. Repository completeness checks require every public Core component subpath to have a Vue projection witness. The Vue suite separately covers prop-to-controller mapping, emitted model proposals, dynamic collection reconciliation, native form serialization, SSR-stable IDs, hydration, and Teleport ownership.

Use `@sectile/vue` for Vue templates and compound composition. Use `@sectile/dom` directly when markup is created outside Vue or when a custom renderer must own the connection lifecycle.

`@sectile/vue/reorder` provides `SequenceReorderRoot`/`SequenceReorderItem` and `TreeReorderRoot`/`TreeReorderItem`. They emit `update:items` or `update:nodes` while reusing the DOM keyboard and pointer contract. Feed window requests include a request generation that must be returned with the replacement, and Form submission actions complete only with the generation returned by `submitStarted`.

## Explore components

The [component catalog](/components/) documents each component's examples, public parts, keyboard behavior, accessibility contract, and API. Start with the basic example, then use Anatomy to inspect the exact `data-scope` and `data-part` boundaries exposed for styling.
