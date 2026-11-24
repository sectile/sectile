---
title: Vue
description: Compose Sectile interaction behavior with headless Vue components, Vue state, forms, portals, and optional domain packages.
---

# Vue

`@sectile/vue` provides headless Vue components for Sectile interaction behavior. Components follow Vue state and event conventions, render the accessibility and interaction structure their pattern requires, and expose public styling hooks without imposing a visual theme.

Use the Vue package when Vue owns the rendered tree and component lifecycle. Use [`@sectile/dom`](/packages/dom) instead when application markup is created outside Vue or another renderer must own the browser connection directly.

## Install

```sh
pnpm add @sectile/vue vue
```

Import each component family from its focused public path:

```ts
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@sectile/vue/popover'
```

The [Vue API reference](/api/vue) is the canonical list of public import paths. Form, Temporal, Virtual, Tabular, and Chart integrations use optional peer packages only when those features are imported.

## Build a controlled component

Roots own the interaction state shared by their compound parts. Use `v-model` when application state is authoritative. This Checkbox also participates in native form submission because it has a `name` and `required` state.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

const accepted = ref(false)

function save() {
  if (!accepted.value) return
  console.log('terms accepted')
}
</script>

<template>
  <form class="terms" @submit.prevent="save">
    <div class="terms__row">
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
    </div>

    <button type="submit" :disabled="!accepted">Continue</button>
  </form>
</template>

<style scoped>
.terms {
  display: grid;
  gap: 1rem;
  justify-items: start;
}

.terms__row {
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

The component owns keyboard and pointer interaction plus its accessibility projection. The application owns the `accepted` ref, the surrounding form flow, and the visual styles.

## Choose controlled or uncontrolled ownership

Use `v-model` when the parent accepts and stores every proposed value:

```vue
<CheckboxRoot v-model="accepted" />
```

Use `default-value` when the mounted root should own subsequent changes:

```vue
<CheckboxRoot :default-value="true" />
```

Do not switch a mounted root between controlled and uncontrolled ownership. Remount the root when the application intentionally changes that ownership boundary.

For content that changes with interaction, use the slot state exposed by the component. For CSS-only changes, prefer public data attributes:

```vue
<CheckboxRoot v-slot="{ isChecked, isIndeterminate }" default-value="indeterminate">
  <span v-if="isIndeterminate">Partially selected</span>
  <span v-else>{{ isChecked ? 'Selected' : 'Not selected' }}</span>
</CheckboxRoot>
```

Slot contracts are component-specific and remain typed from the imported component.

## Set the date and time editing format

`DateTimePickerRoot` and `DateTimeRangePickerRoot` accept `precision="minute"` for values that have no seconds or milliseconds. With a `TemporalProvider`, this uses the provider's locale. Without a provider, the combined value uses an ISO-style date, a `T` separator, and a 24-hour clock.

Pass an explicit Temporal format to choose the literals as well as the precision.

```ts
import { createDateFieldFormat } from '@sectile/temporal/date-field'
import { createDateTimeFieldFormat } from '@sectile/temporal/date-time-field'
import { createTimeFieldFormat } from '@sectile/temporal/time-field'

const time = createTimeFieldFormat({ precision: 'minute', literals: ['', '·', ''] })
const format = createDateTimeFieldFormat({
  date: createDateFieldFormat({ order: ['year', 'month', 'day'] }),
  time,
  separator: ' @ ',
})
```

Bind `:format="format"` to either picker root. The range picker's combined start and end inputs are read-only displays. Use its separate date and time inputs for editing or compose its calendar and endpoint time choices for selection.

Use the same `format` on `DateTimeField` and `DateTimeRangeFieldRoot`. Pass `time` to `TimeField`, `TimeRangeFieldRoot`, or `TimePickerRoot`. An explicit format takes precedence over `precision` and the provider. With `native` on a scalar field, the browser owns its ISO value and localized display. TimePicker uses its accepted format for both the input and the choice columns. A live change that would lose precision rejects and retains the current input and value.

Set `:editing-formats="{ date: format.date, time: { minute: time }, dateTime: { minute: format } }"` on `TemporalProvider` to share these formats. A nested provider can override one domain or precision and inherit the others. A field's explicit format takes precedence. Time and date-time fields look up the configured precision, or millisecond precision when omitted. Locale and time zone continue to govern calendar labels and reference dates.

## Show a TreeSelect selection beside its query

`TreeSelectValue` displays the label for the accepted selection while the TreeSelect is closed and idle. Provide a `selectedLabel` function that accepts all selected IDs. In single-select mode it receives one ID. In multiple-select mode you can join the names or display a count. Returning `null` or an empty string hides the label.

```vue
<script setup lang="ts">
import { useId } from 'vue'
import { TreeSelectContent, TreeSelectInput, TreeSelectItem, TreeSelectRoot, TreeSelectValue } from '@sectile/vue/tree-select'

const nodes = [{ id: 'oak', parentID: null }, { id: 'birch', parentID: null }] as const
const names = { oak: 'Oak', birch: 'Birch' }
const queryHelp = useId()
const selection = useId()
</script>

<template>
  <TreeSelectRoot
    :nodes="nodes"
    :default-value="['oak']"
    :selected-label="ids => ids.map(id => names[id]).join(', ')"
    selection-mode="multiple"
    label="Trees"
    name="trees"
  >
    <div class="tree-select-input">
      <TreeSelectInput :aria-describedby="`${queryHelp} ${selection}`" />
      <TreeSelectValue :id="selection" class="tree-select-value" />
    </div>
    <small :id="queryHelp">Type to search or press Down Arrow to open.</small>
    <TreeSelectContent>
      <TreeSelectItem v-for="node in nodes" :key="node.id" :value="node.id">
        {{ names[node.id] }}
      </TreeSelectItem>
    </TreeSelectContent>
  </TreeSelectRoot>
</template>

<style scoped>
.tree-select-input { display: grid; }
.tree-select-input > * { grid-area: 1 / 1; padding-inline: 0.5rem; }
.tree-select-input > [data-display='selection'] { color: transparent; }
.tree-select-value { align-self: center; pointer-events: none; }
</style>
```

The input keeps its native query and caret when the label is visible. Focus, typing, or reopening reveals the query. The form submits the selected IDs under `trees`. The input's name is `Trees`, and its description references both the existing help and the selected value.

## Compose multi-part surfaces

Compound components keep related behavior together without requiring one fixed HTML structure. Popover, Dialog, Select, Menu, Combobox, and similar families expose focused Root, Trigger, Content, and supporting parts.

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

`as-child` lets the application-owned child become the interactive element while receiving the Sectile behavior and attributes. Use it with one element-owning child; ordinary `as` can select another rendered element when full child adoption is unnecessary.

Popup Portal parts render to `body` by default. Supply a shared target with `HostProvider` when an application keeps overlays in another container.

## Set shared host defaults

`HostProvider` supplies reading direction, a default portal target, and optional ID generation to its subtree without adding a wrapper element.

```vue
<script setup lang="ts">
import { HostProvider } from '@sectile/vue/host-provider'
</script>

<template>
  <HostProvider direction="rtl" portal-target="#overlays">
    <RouterView />
  </HostProvider>
</template>
```

Nested providers inherit omitted values. A component-specific portal target still takes priority over the provider default. Without a custom ID generator, Vue's `useId()` provides the host ID source.

## Match slider input to the track

Set `direction="rtl"` on a horizontal `SliderRoot` or `MultiThumbSliderRoot` whose minimum is at the right edge. Pointer input and the horizontal arrow keys follow the same direction. Use logical positioning such as `inset-inline-start` with RTL styles on the track. The input direction defaults to `ltr`.

## Preserve position while prepending feed items

Pass the scrolling element as `:scrollport` to `FeedRoot`. When accepting an earlier window, update the items and revision and pass back the request generation. If the anchor remains in the list, Feed compensates for its movement after Vue renders the new items. The scrollport's own adjustment takes precedence when the browser or application has already moved it.

## Move selected items together

Pass `getSourceIDs` to a `SequenceReorderRoot` or `TreeReorderRoot` to supply the current selection for a lift. Return the selected IDs when the lifted item belongs to the selection. The interaction exposes the normalized group in `sourceIDs` and keeps the lifted item in `sourceID`. With `keyboard-mode="preview"`, use Space to lift, arrows to preview, and Enter to commit. Escape cancels the move. Tree selection moves a selected ancestor with its descendants once.

## Style state and motion through public hooks

Sectile Vue components do not ship a visual theme. Compound parts expose stable `data-scope` and `data-part` boundaries, and stateful parts expose attributes such as `data-state`, `data-disabled`, `data-readonly`, or `data-invalid` when applicable.

```css
[data-scope='checkbox'][data-part='root'] {
  border: 1px solid var(--control-border);
}

[data-scope='checkbox'][data-part='root'][data-state='checked'] {
  background: var(--control-accent);
}
```

Use slot props when rendered content must change with state and data attributes when CSS is sufficient. [Styling](/guides/styling) documents the shared selector conventions, while [Motion](/guides/motion) covers state- and presence-driven transitions, including reduced-motion handling.

## Keep native browser behavior where it matters

Form-capable controls preserve native submission semantics. For example, `CheckboxRoot` adds a hidden native checkbox when its form participation requires one. Text-entry components retain browser input, selection, and IME behavior instead of recreating text editing in Vue.

Ordinary HTML attributes such as `autocomplete`, `inputmode`, `name`, `form`, and accessible labeling stay on the relevant public field or root part. Native inputs and Sectile components can therefore participate in the same form.

For form-wide validation, errors, reset, and submission coordination, install the optional Form package and use [`@sectile/vue/form`](/packages/form/vue/).

## Add domain packages only when needed

The base Vue package depends on Core and DOM. Larger domains are optional peers and are installed only when their Vue integration is used.

| Need | Additional package | Vue entry point | Guide |
| --- | --- | --- | --- |
| Form validation and submission | `@sectile/form` | `@sectile/vue/form` | [Vue forms](/packages/form/vue/) |
| Dates, times, calendars, pickers | `@sectile/temporal` | e.g. `@sectile/vue/temporal/date-picker` | [Temporal](/packages/temporal) |
| Virtualized surfaces | `@sectile/virtual` | `@sectile/vue/virtual/list`, `grid`, `masonry`, `spatial` | [Virtual Vue connection](/packages/virtual/vue) |
| Tables and grids | `@sectile/tabular` | `@sectile/vue/data-table`, `data-grid`, `data-tree-grid` | [Tabular with Vue](/packages/tabular/vue) |
| Charts | `@sectile/chart` | `@sectile/vue/chart` | [Vue charts](/packages/chart/vue) |

Each domain package continues to own its renderer-neutral rules. The Vue layer maps those rules to components, refs, slots, events, browser effects, and Vue lifecycle.

## Render consistently with SSR and hydration

Vue components support server rendering without acquiring browser-only resources during the server render. Keep controlled values, default state, reading direction, IDs, and other inputs that affect the initial structure consistent between the server and the first client render.

Use `HostProvider` when the application needs deterministic shared host defaults. Temporal controls can use `TemporalProvider` or an explicit `referenceDate` when their first calendar view must be deterministic. Virtual surfaces that need server-rendered items should provide the deterministic initial viewport required by their Virtual guide.

Portal parts follow Vue Teleport behavior. Use their `defer` option only when the target is created later in the same Vue mount or update tick; an already available target needs no deferral.

## Let Vue own component cleanup

Sectile Vue components create their browser/domain connections with component setup and release their connection-owned listeners, observers, subscriptions, and rendering resources when their rendered ownership ends. Application resources created outside those components remain application-owned and should be disposed in the same Vue lifecycle that created them.

Use `@sectile/vue` when Vue owns the tree. Reach for lower-level `@sectile/dom` or renderer-neutral package APIs only when the application intentionally needs a different ownership boundary.

## Continue by task

- Browse [Components](/components/) for interactive examples and Vue usage code for individual controls.
- Use [State ownership](/guides/state-ownership) for the shared controlled/uncontrolled model.
- Use [Styling](/guides/styling) and [Motion](/guides/motion) for public state hooks and transitions.
- Use the [Vue API reference](/api/vue) for exact public package paths.
