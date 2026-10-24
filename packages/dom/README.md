# @sectile/dom

Browser input, focus and ARIA bindings for Sectile semantics.

```sh
pnpm add @sectile/dom
```

Import focused entries such as `@sectile/dom/checkbox` and bind application-owned
elements. Call `destroy()` when a connection's owner ends. Markup, styling and
application data remain yours.

`@sectile/dom/attributes` provides `getAnchorAttributes` for native link metadata
and `guardAnchorActivation` for disabled or cancelled events. Apply the returned
attributes and run the guard before navigation callbacks; these helpers do not
install listeners, choose routes or sanitize destinations.

`connectScrollSpy`, from `@sectile/dom/scroll-spy`, observes headings in an explicit
content element and document or element scroll root. Install `@sectile/virtual`
for this focused entry. Supply a unique `id` and `onChange` callback; snapshots
contain heading hierarchy, every visible section and continuous row coordinates.
Headings use normal block flow, with h2/h3 observed by default. Call `refresh()`
after external layout changes that produce no native notification, and
`disconnect()` at teardown. Generated heading IDs are restored only while still
owned; navigation, focus and rendering remain application-owned.
Use `exclude` for one presentation subtree inside the article, such as its own
table of contents. Its size remains observed, but its headings and internal
mutations do not feed back into the outline.

`connectFullscreen`, from `@sectile/dom/fullscreen`, observes one HTML target.
Its snapshots expose availability, actual fullscreen state and a pending native
operation. Call `enter()` directly from a user activation handler; `exit()`
refuses to exit a different target. Handle the returned Results and call
`disconnect()` at teardown. Disconnect removes observation and finishes pending
calls with `dom.fullscreen-disposed`. It does not cancel a browser request or
implicitly exit fullscreen.

`connectMediaGesture`, from `@sectile/dom/media-gesture`, observes one HTML
surface with native pointer capture. `onStart` admits each contact; `onMove`
receives immutable client-coordinate drag or two-contact pinch facts. The
connection does not calculate zoom or pan. `onEnd` reports completion or
interruption; `cancel()` releases the current contacts and `disconnect()` also
removes observation. Configure the surface's touch policy before interaction
and disconnect when it leaves its owning document. Keyboard controls and media
presentation belong to the composition. Optional `onWheel` receives a
local anchor, measured viewport and normalized vertical displacement; return
true to consume it. Modified wheel input, including browser zoom, is untouched.

Buttons, links, editors and embedded controls decline pointer gestures by default.
Optional `admitPointer` receives the origin, client point, pointer type and
`protectedOrigin`, which reports that default exclusion. Return true to admit a
specific authored media button, for example an origin inside
`button[data-media-drag]`; other protected controls can continue to decline.
With explicit admission, `dragThreshold` defaults to 4 client pixels. Before
that distance, native focus and click activation remain available and `onStart`
has not run. Crossing it asks `onStart` to claim the drag; a second admitted
contact can claim a pinch. Pending admission prevents native image/link drag
from replacing the pointer gesture. A claimed gesture suppresses its pointer
click while preserving keyboard activation. Setting the threshold to 0 requests
immediate capture. Cancellation and disconnect also remove pending observation.
Pointer admission does not override the wheel protection rules.

`readMediaViewport` measures a single non-scrolling HTML box with zero border
and padding, projecting up to four client points while preserving tuple types.
Positive axis-aligned scaling and translation are supported; unknown or rotated,
skewed, reflected or perspective bases return an unavailable Result. Each call
reads the current box without retaining it. Wheel pixels use this local basis;
lines use resolved pixel line-height and pages use viewport height. An unresolved
line-height declines line input rather than assuming a size.

`@sectile/dom/reorder` separates accepted order from interaction preview in
sequence, tree and column layouts. `getInteractionSnapshot()` borrows the current
source ID, input kind, destination, admission and client point. The optional
`onInteractionChange` reports start, preview, commit/cancel and end; commit's
`accepted` flag reports an immediate canonical change. A controlled owner still
receives one `onOrderChange` proposal and may accept it later through `syncOrder`.
`getPreviewState()` explicitly requests a full Core-derived state and reuses it
until the destination changes. It can cost O(n); pointer movement only resolves
the destination and admission, without materializing that full state.

Alt+direction keys continue to move immediately. Opt into `keyboardMode: 'preview'`
to lift with Space, preview with direction/Home/End keys, commit with Enter or
Space, and cancel with Escape. Pointer cancellation, lost capture, window blur,
hidden documents, source removal and accepted external order changes retire the
interaction. Keyboard focus leaving its source also cancels it.
`cancelInteraction()` explicitly retires a preview. For application-owned
auto-scroll, use `clientPoint` and call `refreshDropTarget()` after scrolling;
Reorder owns no auto-scroll timer or frame loop. Disconnect removes all seven
root listeners, the document visibility listener and the window blur listener.
