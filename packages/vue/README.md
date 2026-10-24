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
