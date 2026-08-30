# DOM

`@sectile/dom` connects Sectile's interaction semantics to real browser elements. It handles keyboard and pointer input, focus, composition, forms, ARIA projection, and element lifecycle without choosing markup or visual styles for the application.

```sh
pnpm add @sectile/dom
```

Import from a component subpath so the dependency stays explicit:

```ts
import { createCheckbox } from '@sectile/dom/checkbox'
```

## Connect an existing element

Create the markup your application needs, then pass the interactive element to a DOM factory.

```html
<button id="newsletter" type="button">
  Receive product updates: <span id="newsletter-state"></span>
</button>
```

```ts
import { createCheckbox } from '@sectile/dom/checkbox'

const element = document.querySelector<HTMLElement>('#newsletter')
const stateLabel = document.querySelector<HTMLElement>('#newsletter-state')

if (element === null || stateLabel === null) {
  throw new Error('Checkbox markup is missing.')
}

const checkbox = createCheckbox({
  element,
  defaultValue: false,
  onValueChange(value) {
    console.log('newsletter', value)
  },
})

const render = () => {
  stateLabel.textContent = checkbox.state.checked ? 'on' : 'off'
}

const unsubscribe = checkbox.subscribe(render)
render()

window.addEventListener('pagehide', () => {
  unsubscribe()
  checkbox.destroy()
}, { once: true })
```

The factory registers the required listeners and immediately projects semantic state to the element. The checkbox above receives `role`, `aria-checked`, `data-state`, disabled state, and read-only state as they change.

## Connection contract

Every direct `create*` factory returns a ready connection with the same small lifecycle surface:

| Member | Purpose |
| --- | --- |
| `state` | Read the current semantic state. |
| `send(input)` | Send the component's normalized interaction input. |
| `update(value)` | Synchronize an externally owned value when the component supports controlled state. |
| `subscribe(listener)` | Observe accepted updates and receive an unsubscribe function. |
| `destroy()` | Remove DOM listeners and release connection-owned resources. |

Component-specific methods remain available on the same object. Use them when a component exposes richer operations such as focus movement, collection updates, or popup positioning.

## State ownership

Pass `defaultValue` when the connection should own its current value. Pass `value` with `onValueChange` when application state owns it.

```ts
const checkbox = createCheckbox({
  element,
  value: settings.newsletter,
  onValueChange(nextValue) {
    settings.newsletter = nextValue
    checkbox.update(nextValue)
  },
})
```

Controlled interactions report the proposed value without silently replacing application state. Calling `update` reconciles the connection after the owner accepts that value. See [State ownership](/guide/state-ownership) for the shared model.

## Controllers and attribute projection

Use a `create*Controller` when state ownership and rendering have separate lifecycles. Controllers do not require an element. Pair them with `get*Attributes` to project a snapshot into any DOM structure.

```ts
import {
  createCheckboxController,
  getCheckboxAttributes,
} from '@sectile/dom/checkbox'

const result = createCheckboxController({ defaultValue: 'mixed' })
if (!result.ok) throw new TypeError(result.error.message)

const snapshot = result.value.getSnapshot()
const attributes = getCheckboxAttributes(snapshot.state, { required: true })
```

Complex components also expose component-specific event translators and effect projectors. These lower-level APIs are useful for custom renderers, delegated event systems, and hosts that cannot let a direct connection own the element.

## Native browser behavior

The DOM package preserves native behavior where HTML already has the right semantics:

- Text fields keep native editing, selection, and IME composition.
- Form controls project `name`, `value`, `required`, `disabled`, and form ownership where supported.
- Keyboard handling avoids replacing browser behavior that belongs to the focused element.
- Focus effects target real elements instead of simulating a separate focus model.

Use the component's native element when possible. Choose a non-native host only when the product requires a different structure, then apply the returned ARIA and data attributes completely.

## Floating surfaces

Popover and tooltip connections use Floating UI for offset, collision flipping, shifting, available-size data, arrow placement, detached-anchor hiding, and open-only automatic updates. Boundary, padding, strategy, observers, and middleware remain configurable. Floating UI middleware is re-exported from the relevant component subpaths for custom positioning.

Every trigger-owned popup also joins one layer stack per document. Mixed nesting across dialogs, popovers, selects, comboboxes, menus, cascade selects, and date pickers therefore shares topmost Escape handling, outside dismissal, descendant close propagation, and focus restoration.

## Reorder

`@sectile/dom/reorder` maps sequence and tree reorder semantics onto Alt-modified movement keys and pointer placement. Pointer capture and hit-testing stay in the DOM adapter; Core receives only stable identities and semantic before/after or parent placement.

## Date and time controls

Install `@sectile/temporal` when browser elements need date fields, time fields, calendars, or pickers. Each adapter family has a granular optional entry point, so consumers load only the selected family.

```sh
pnpm add @sectile/core @sectile/temporal @sectile/dom
```

```ts
import { createCalendar } from '@sectile/dom/temporal/calendar'
import { createDateField } from '@sectile/dom/temporal/date-field'
import { createDatePicker } from '@sectile/dom/temporal/date-picker'
```

## Form coordination

Install the optional `@sectile/form` peer when an existing HTML form needs accessible errors, validation, managed submission, or coordinated reset. Ordinary `@sectile/dom` component imports do not require it.

```sh
pnpm add @sectile/core @sectile/form @sectile/dom
```

```ts
import { createForm } from '@sectile/dom/form'
```

`createForm()` works with native inputs, Sectile controls, and both together while preserving browser form behavior. Follow the [DOM forms guide](/packages/form/dom/) for a complete example, dynamic fields, native navigation, and cleanup.

## Virtualization host

`@sectile/dom/virtual` connects any `@sectile/virtual` layout strategy to a scroll element. The connection owns browser scheduling, not the logical collection or application markup.

```sh
pnpm add @sectile/core @sectile/virtual @sectile/dom
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
} from '@sectile/dom/virtual'
import { linearLayoutStrategy } from '@sectile/virtual/linear-layout'

const virtualizer = createVirtualizer({
  root: scrollElement,
  state: linearState,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(state) {
    linearState = state
  },
  onPlanChange(plan, connection) {
    Object.assign(contentElement.style, virtualContentStyle(plan))
    reconcileItems(plan.placements, (element, placement) => {
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      return connection.registerItem(element, placement.id)
    })
  },
})
```

Scroll and resize notifications are coalesced into one animation frame. Item rectangles are read as one batch, the strategy applies one measurement generation, anchor correction is written, and the next plan is then published. `measure()` accepts explicit strategy measurements for track grids and other layouts whose geometry is not one rectangle per item. `mutate()` applies domain or geometry changes through the same anchor-preserving path, while `scrollTo()` requests an identity even when it is currently outside the render window.

`createAxisMeasurementResolver()` reads the physical border-box rectangle with `getBoundingClientRect()`, matching the physical coordinates in a layout plan. A custom resolver receives the originating `ResizeObserverEntry` when content-box, device-pixel, or writing-mode-aware measurements are required. Reassigning a recycled element to another identity discards any observation queued for its previous identity.

The default viewport uses non-negative physical `scrollLeft` and `scrollTop`. Pass `readViewport` and `writeScroll` when an RTL scroller or custom surface uses another coordinate model.

## Styling hooks

DOM connections provide behavior, not a theme. Style the element through your own classes and the projected state attributes.

```css
#newsletter {
  border: 1px solid var(--control-border);
  border-radius: 0.5rem;
}

#newsletter[data-state='checked'] {
  background: var(--control-accent);
  color: var(--control-on-accent);
}

#newsletter[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}
```

Attribute helpers for compound components additionally expose stable `data-scope` and `data-part` boundaries. See [Styling](/guide/styling) for the complete convention.

## Factory failures

Use `create*` during normal application setup. It returns a ready connection and throws a typed Sectile error when configuration is invalid. Use the matching `tryCreate*` factory when construction failure must remain a recoverable `Result`.

```ts
import { createCheckbox, tryCreateCheckbox } from '@sectile/dom/checkbox'

const connection = createCheckbox(options)
const recoverable = tryCreateCheckbox(options)
```

No `unwrap` is needed around a host `create*` call.
