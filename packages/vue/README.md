# @sectile/vue

Headless Vue compound components backed by Sectile DOM semantics.

```sh
pnpm add @sectile/vue vue
```

Import focused entries such as `@sectile/vue/checkbox`. Components expose
`data-scope`, `data-part` and state attributes for application-owned styling.
Install the corresponding optional domain package for domain integrations.

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
