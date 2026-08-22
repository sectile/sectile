# Composite proof plan

Sectile does not equate an accessibility pattern with a new primitive. A host role may
need its own adapter facade while sharing the same renderer-neutral state machine with
other roles. A new `@sectile/core/*` subpath is promoted only when it owns a
distinct invariant or event algebra.

## Promotion gate

Every candidate passes these gates in order:

1. Identify each authoritative fact: structure, cursor, selection, expansion, text,
   checked value, popup state, edit mode, revision, and constrained numeric value.
2. Separate pure state from policy and host capability. Geometry, timers, focus scopes,
   scrolling, announcements, and network access remain adapter capabilities or commands.
3. Produce counterexamples showing whether the candidate is reducible to an existing
   machine. Patterns with the same state and event algebra share one primitive machine.
4. Specify valid models, invariants, accepted events, failure atomicity, commands,
   resource ceilings, and complexity.
5. Implement an independent reference model and bounded/property/differential tests.
6. Promote a public primitive facade only after DOM and terminal can independently
   witness the same semantic transitions.

## Candidate audit

| Candidate facade | Proposed primitive composition | Required proof before implementation |
|---|---|---|
| Tabs | sequence + cursor + single selection | manual/automatic activation laws and focus/selection separation |
| Radio group | sequence + cursor + single selection | required/optional selection and selection-follows-focus policy |
| Toolbar | sequence + cursor | orientation, disabled-item eligibility, and boundary policy |
| Menu / menubar | sequence or tree + cursor + popup path | nested popup ownership, invocation, close propagation, and focus return |
| Menu button | sequence + cursor + popup | trigger/open/list navigation authority and focus return |
| Accordion | sequence + cursor + keyed open set | single/multiple expansion and non-collapsible policy; tree expansion is not reused blindly |
| Disclosure | open state | idempotent set/toggle algebra; likely shares a small open-state machine |
| Checkbox | checked state | two/three-state carrier and cycle/set laws |
| Switch | checked state | shares two-state checked algebra; adapter semantics differ |
| Toggle button | checked state | shares two-state checked algebra; activation command differs |
| Grid | grid + cursor + selection + edit mode | cell/row selection modes, visible eligibility, and edit authority |
| Spin Button | range + text + parsed tick | parse/format/validation policy and invalid-draft behavior |
| Multi-thumb slider | sequence of thumbs + range + constrained ticks | ordering/cross-thumb constraints and atomic multi-value updates |
| Window splitter | range + tick | shares bounded range algebra unless splitter-specific invariants disprove it |
| Dialog | popup state + commands | open/close algebra; modality and focus scope stay host capabilities |
| Alert dialog | popup state + announce command | dialog algebra plus initial-focus and announcement obligations |
| Tooltip | popup state + commands | deterministic open/close events; delay and hover geometry stay host capabilities |
| Carousel | sequence + cursor + rotation policy | manual/automatic movement, pause, wrapping, and announcement laws |
| Feed | sequence window + cursor + revision + request command | finite/windowed access laws; a genuinely unbounded feed requires a separate stream theory |

The static APG patterns—alert, breadcrumb, landmarks, link, meter, and table—do not
automatically become interaction machines. They are adapter semantics or projections
unless an independent state invariant is demonstrated.

## Expected sharing

- `linear-choice`: tabs and radio group share movement and single-selection mechanisms,
  while keeping distinct activation policy facades.
- `linear-cursor`: toolbar and flat menu navigation share sequence/cursor movement.
- `checked`: checkbox, switch, and toggle button share one value algebra.
- `open-state`: disclosure and simple popup controls may share set/toggle mechanics, but
  popup focus-return commands remain a separate composite concern.
- `range-control`: slider and window splitter share bounded tick transitions; spin button
  and multi-thumb slider add genuinely different text or constraint authority.

Sharing is an implementation conclusion only after observational equivalence is proved.
It must not erase role-specific DOM or terminal behavior.

## Verified family: linear controls

`tabs` and `radio-group` are projections of one `linear-choice` machine with state
`cursor × single-selection`. They differ only by policy and event vocabulary: tabs may
separate focus from activation, while radio movement always checks the focused item.
`toolbar` is not a choice projection. Its state is cursor-only and invocation emits a
command without creating selection authority.

The countermodels are decisive:

- two manual tabs states may have the same cursor and different selected tabs, so cursor
  alone cannot implement tabs;
- two toolbars with the same cursor have no distinct selected-value observation, so adding
  selection would create state the pattern does not own;
- a flat menu can share cursor movement, but nested menus cannot share the toolbar machine
  because identical cursors can have different open popup paths and focus-return targets.

Evidence consists of independent array-based references, bounded differential enumeration,
2,000 seeded random models and 20,000 transitions per shared machine, plus DOM and terminal
keyboard/direct-target witnesses. The promoted public facades are `tabs`, `radio-group`,
and `toolbar`; `linear-choice` and `linear-action` remain internal shared mechanisms.

## Verified family: expansion controls

`disclosure` is the two-state algebra `open ∈ boolean` with toggle and idempotent set
events. `accordion` is not a sequence of disclosure machines: its single-expansion and
non-collapsible policies constrain the open identities as one atomic keyed set, alongside
an independently owned cursor. Two accordions may have the same focused header but
different open headers, which disproves cursor-only reduction; two single accordions may
not independently open two disclosure booleans, which disproves boolean-product reduction.

Both mechanisms match independent references under bounded enumeration. DOM witnesses
project click, focus, `aria-expanded`, and panel visibility; terminal witnesses own the
equivalent enter/space and directional key mapping.

## Verified family: checked controls

Checkbox, switch, and toggle button share set/toggle mechanics, but not the same public
carrier or host projection. Checkbox may observe `mixed`; switch and toggle button are
binary projections, and toggle button renames checked authority to pressed authority.
Independent reference comparison covers every carrier/event/policy combination. DOM and
terminal witnesses verify role-specific ARIA or key dispatch without duplicating the state
machine.

## Verified projection: window splitter

Window splitter and slider are observationally equivalent over every range state and
event; the only additional obligation is the DOM `separator` projection. Sectile therefore
reuses the bounded slider algebra and exposes a role-specific host facade instead of
inventing a second primitive machine.

## Verified composite: spin button

Spin button is not a slider projection because the same committed tick may coexist with
different valid or invalid text drafts. Its state is `tick × optional draft`; range events
clear a draft, commit parses onto the exact range lattice, and invalid commits reject
without losing the draft. Independent reference enumeration and both host witnesses cover
valid commit, invalid draft preservation, cancellation, and range movement.

## Verified family: popup surfaces

Dialog, alert dialog, and tooltip share deterministic open/close mechanics but not command
authority. Dialog requests initial focus and restoration, alert dialog additionally requests
announcement, and tooltip owns neither focus command. Focus containment, inertness, hover
geometry, and delay timers remain host capabilities. DOM and terminal witnesses verify the
distinct command projections and escape handling.

## Verified composite: multi-thumb slider

Multi-thumb slider owns a stable thumb sequence and one atomic tick vector. With crossing
disabled, every adjacent pair preserves ordering and the configured minimum gap. A move
clamps against both the range and neighboring thumbs, so independent slider machines cannot
represent the invariant without an external coordinator. Bounded differential comparison
against an independent vector reference covers every valid two-thumb state, active thumb,
movement event, direct focus, and direct tick assignment. DOM and terminal witnesses expose
the same controlled/uncontrolled transitions without taking ownership of the constraint.

## Verified composite: grid

Grid interaction adds `cursor × single selection × edit mode` to the existing coordinate
structure. Directional movement changes only one axis, selection does not imply editing,
and navigation is suspended while an edit is active. The primitive is intentionally
exported from the existing `grid` subpath; Tree Grid remains a strict extension because it
also owns row expansion and visible projection. An independent coordinate reference and
DOM/terminal witnesses cover navigation, direct targeting, selection, and editing.

## Verified family: menu controls

Menu, Menubar, and Menu Button share an ordered-tree cursor and a single connected open
submenu path. Opening descends to the first child, closing returns to the owning parent,
sibling movement wraps within one menu level, and leaf invocation atomically closes the
path and requests focus restoration. This disproves reduction to Toolbar: identical item
cursors can have different open submenu paths. Menu Button adds trigger projection while
Menubar changes directional key meaning; neither duplicates the renderer-neutral machine.

## Verified composite: carousel

Carousel owns a slide cursor, user-owned pause state, and a set of independent host pause
reasons. Manual movement remains valid while paused; composed pause reasons prevent hover or
focus resumption from overriding an explicit user pause. The primitive contains no clock:
DOM and terminal adapters schedule automatic movement, expose interval configuration, and
clean up timers. Bounded reference comparison covers wrapping, stopped boundaries, direct
slide focus, position projection, and pause algebra; both hosts witness projection.

## Verified composite: feed

Feed is deliberately finite and windowed. Its state is `cursor × window revision × pending
request direction`; request events emit capabilities without fabricating loaded items, and
hosts replace the window only through a strictly newer revision. This keeps network and
stream ownership outside primitives while making duplicate requests and stale windows
observable. A genuinely unbounded feed remains out of scope until stream theory is added.
