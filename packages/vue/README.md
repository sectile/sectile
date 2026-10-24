# @sectile/vue

Headless Vue compound components backed by Sectile DOM semantics.

```sh
pnpm add @sectile/vue vue
```

Import focused entries such as `@sectile/vue/checkbox`. Components expose
`data-scope`, `data-part` and state attributes for application-owned styling.
Install the corresponding optional domain package for domain integrations.

Within a `FormField`, compose `SelectRoot` with `SelectTrigger`. `FormLabel`
targets the trigger button, and the hidden native select inherits the field's
submission name and constraints in the initial server HTML. Put `FormLabel`
before the trigger as usual; hydration preserves their generated IDs.
An explicit name, form association, or constraint on `SelectRoot` overrides
the field default. For an explicit trigger ID, supply the matching `for` on
`FormLabel`. A trigger rendered through `as` or `asChild` must resolve to a
native button, matching the Select connection's trigger contract.

Sectile composite controls declare their label semantics so `FormField` can
render group labels and inherited native submission metadata during SSR.
Labels can precede controls, including controls inside native wrappers and
fragments. `FormField` does not execute child component slots to inspect them.
For an opaque wrapper around a Sectile group control, use
`labelMode="labelledby"` on `FormField`; a native field can use `"for"`, and a
fieldset can use `"legend"`. External controls must also register their semantic
and submission targets through the Form hooks or supply their own native IDs,
names and labelling. Explicit label targets and control metadata retain their
precedence. Native event connections, validation, focus recovery, and
reset coordination start after mounting.

`Anchor` from `@sectile/vue/primitive` renders a native link or adopts one native
`<a>` with `asChild`. An enabled link requires a nonempty `href`. Disabled links
remove their destination and tab stop; activation guards run before adopted
navigation callbacks. Router custom slots supply the anchor, destination and
navigation callback. Routing remains application-owned. Ordinary `Primitive`
adoption keeps its existing child-first event order.

`useFullscreen` from `@sectile/vue/fullscreen` observes an HTML template ref and
exposes readonly shallow `snapshot` and `error` refs, plus `enter()`, `exit()` and
`refresh()`. Call `enter()` directly from an activating handler. Native capability
does not guarantee permission or activation; each operation returns its own result.
Observation pauses with the optional `active` ref, inherited host inactivity or
KeepAlive deactivation. Pausing or unmounting settles pending calls as disposed
and removes observation, without cancelling a native request or implicitly exiting
fullscreen. Before mount or while inactive, the snapshot is undefined.

`useMediaGesture` from `@sectile/vue/media-gesture` connects an HTML template ref
to native drag, pinch and optional wheel facts. Supply `onStart` admission and
`onMove`; optional `onEnd` and `onWheel` receive the native owner's notifications.
Stable `measure()` projects up to four client points with tuple types preserved;
`cancel()` ends the current contacts. Inactive measurement returns unavailable.
The readonly shallow `error` reports connection admission, not media state.
Observation follows the `active` ref, inherited host activity and KeepAlive.
Target/activity retirement reports an active gesture's disconnect; terminal
scope disposal is silent. Media state, zoom policy and presentation remain with
their owners.

`admitPointer` can explicitly admit an authored media button using the event
origin and `protectedOrigin`. Its default 4-client-pixel `dragThreshold` preserves
native focus and click activation until a drag is claimed. `onStart` runs at
that claim boundary; ordinary protected controls still decline unless the
predicate admits them. Pending observation follows the same participation and
component lifetime as active contacts.

Retained `DrawerRoot` content can move between `presentation="inline"` and
`"overlay"` with `:unmount-on-exit="false"`. When an action inside the inline
content opens the overlay, accepting a close together with a return to inline
restores that action after exit and rendering finish. A valid internal
`restoreFocusTarget` or compound `DrawerTrigger` takes precedence over the
original focused action. Unavailable targets are skipped, and a newer focus
owner outside the content is preserved. Closing without requesting inline does
not schedule a later focus transfer for an unrelated presentation change.

`SequenceReorderRoot` and `TreeReorderRoot` expose `interaction`,
`getPreviewState()`, `cancelInteraction()` and `refreshDropTarget()` in their
default slot. Accepted `items` or `nodes` stay unchanged during preview, so a
composition can render a lifted item or an insertion marker independently.
`getPreviewState()` returns a Result containing the full proposed Core state;
request it only when that complete order is needed. `interaction.clientPoint`
and `refreshDropTarget()` support application-owned auto-scroll without a second
pointer sensor. The `interaction-change` event reports start, preview,
commit/cancel and end; commit's `accepted` flag distinguishes an immediate canonical update
from a controlled proposal awaiting new props.

Set `keyboardMode="preview"` to lift with Space, preview with direction/Home/End
keys, commit with Enter or Space, and cancel with Escape. Alt+direction keys keep
their immediate behavior. Host suspension and unmount retire the native owner
and its preview; they leave no scrolling task running.

Changing `TextField.multiline` transfers the current text and native selection
to the replacement input/textarea. It restores focus only when the old editor
owned it. An active composition finishes on the original element before the
representation changes. A single-line request waits while the current text has
line breaks, then proceeds when editing removes them. Native undo history belongs
to each browser element and cannot be transferred to a different element.

A `NumberField` component ref exposes `getText()`, `commitValue(string | null)`,
`clear()` and `stepBy(decimalString)`. Edit methods return a Promise of
`NumberFieldEditResult`: accepted with the final value, or rejected with a reason.
They are deliberate edits, separate from model synchronization that preserves a
live draft. `stepBy('0.1')` evaluates the current valid draft and adds an exact
decimal amount; it does not require finite bounds or use JavaScript floating
point. Stepping an empty nullable field starts from zero. Invalid drafts, bounds,
required values, disabled/readonly state and active composition can reject an
edit. A controlled owner may refuse or transform it; settlement then restores
the owner's accepted value. Concurrent edits return `busy`; saved methods become
unavailable after unmount. Core NumberField exposes the corresponding `set-value`
and `step` events through the existing DOM `handleEvent` connection.

`TooltipRoot` accepts `openDelay` and `closeDelay` in milliseconds, both defaulting
to zero. Keyboard focus opens immediately. Share a `createTooltipGroup({ skipDelay:
300 })` token through the `group` prop to skip the hover opening delay while a
peer is open or shortly after an accepted close. Groups are explicit scopes and
retain only timing/count facts. Pending hover work retires on leave, suspension,
reconfiguration and unmount; controlled refusal does not warm the group.

Link branches use the existing `NavigationMenuRoot`, `NavigationMenuTrigger` and
`NavigationMenuContent`. Render leaf `NavigationMenuLink` as an anchor (or borrow
an anchor with `asChild`) so href, modified clicks and browser link semantics stay
native. Branch buttons enter child groups; Escape/logical back closes a submenu
and restores its trigger. For a pointer Back action, the DOM
`createNavigationMenu` connection already accepts `handleEvent('close-submenu')`.
It is unnecessary to substitute a selection listbox or maintain another branch
state machine.

Sectile's modal popup remains the focus/isolation owner. Calling native
`HTMLDialogElement.showModal()` on that same popup is not a supported promotion:
the browser would acquire a second modal/focus owner. Retained inline/overlay
content uses the documented Drawer composition instead. Layer-host placement
and native browser top-layer promotion are separate capabilities.
