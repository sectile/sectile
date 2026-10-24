# Issue 231 composition checkpoint

- Record ID: issue-231-composition-20261025-01
- Work ID / Run ID: issue-231 / composition-20261025
- Actor / role: Codex / Implementer; no independent review claimed
- Policy commit: `4dc9a67776d38d22a8a63208dc0c722f35b9d772`
- Source base: `67a1a2c601bac404d98ec7745508a4103a8434bc`
- Scope snapshot: issue 231 P3–P5, observed update
  `2026-10-24T19:46:56Z`; this record does not accept unrelated proposals.
- Execution authority: the maintainer requested implementation directly on main,
  without a PR, and asked Sectile to choose necessary APIs from its own evidence.
- State: implementation checkpoint; hosted close and native macOS IME remain
  pending. This is not a release verification or separate code-review approval.

## Ownership and decision

P3 is a concrete admission gap: the native protection check prevents an authored
image button from ever reaching `onStart`. DOM MediaGesture now admits an
explicit predicate and owns threshold, pending contacts, capture, cancellation,
native image drag and claimed-pointer click suppression. Vue forwards options
through its existing lifetime guard. Default native-control protection remains.
The alternatives of dropping button semantics or adding consumer pointer/capture
listeners fail the requested composition and duplicate an existing owner.

P4 is an observable transaction gap: existing pointer state and destinations are
private, and only a final order callback is public. DOM Reorder now exposes one
interaction snapshot, lifecycle notifications, cancellation and stationary-point
hit refresh. Full preview uses `applySequenceReorderEvent` or
`applyTreeReorderEvent`; accepted order still belongs to the existing semantic
controller. No Core reducer, retained hierarchy or reorder representation changes.
Keyboard preview is opt-in; existing immediate shortcuts remain available. Vue
projects the native interaction and provides retiring slot ports.

For n canonical items, m mounted candidates and native ancestry h, pointer facts
are constant-size; existing routing is O(m+h), and changed tree admission retains
its existing affected-subtree/cold-child-view bound. Explicit full preview and
keyboard steps can cost O(n). Only the current full preview is retained, and it
is borrowed again until the proposal changes. There are nine fixed native
listeners, no observer, timer or frame loop. The renderer owns edge scrolling
and invokes `refreshDropTarget()` after scrolling. Strict contracts and
production-bound counters live in the existing complexity owner.

P5 was independently reproduced in Chromium: retained inline/overlay Drawer
content survived but its internal initiating action did not regain focus after
accepted close. Commit `f957c5f2916dba019a4be7324c0a007c68918ad8`
restores an available internal action after the accepted return to inline. Both
explicit target and compound trigger browser cases passed.

## Bundle decision

P3's bounded pending/native lifecycle increased the existing esbuild named
fixtures by approximately 575 B DOM and 652 B Vue gzip. Keeping one native owner
was preferred to a separate adapter with duplicate lifecycle obligations.
Commit `67a1a2c601bac404d98ec7745508a4103a8434bc` records that scoped
baseline decision, including affected inherited popup consumers.

Reorder previously had side-effect erasure coverage but no named consumer
measurement. Extend the existing collector with direct/root-equivalent named
fixtures for `createReorder` and `TreeReorderRoot`. Measured esbuild sizes are
49,923/14,343/12,902 B DOM and 61,656/18,229/16,391 B Vue
raw/gzip/brotli; Vite sizes are 50,448/14,387/12,951 B and
61,647/18,005/16,278 B respectively. These establish the new named fixture
baselines with the collector's existing 5% + 16 B allowance. All historical
fixture ceilings remain unchanged. Side-effect imports still erase to zero;
root/direct module closures match. No dependency is added.

## Evidence and remaining work

Local checks used the implementation worktree based on the source SHA above;
the commit containing this record preserves the corresponding patch. Focused
GC-enabled DOM/Vue checks passed 73 tests, including all three layouts, controlled
refusal, cached preview, admission counters, callback retirement and listener
cleanup. Real Chromium passed the existing overlay/native-control scenarios and
the new keyboard preview/Escape/confirmation journey. Public declaration and
Vue SFC checks passed. The two-bundler record covered 488 fixtures / 976 bundles.
These results are source/build evidence, not registry-release evidence.

[The preceding main run](https://github.com/sectile/sectile/actions/runs/40130432619)
passed all six deterministic Linux lanes and the browser job. Native macOS
undo/redo passed, but the plain input's first Hangul phrase was `하ㄴ글` rather
than `한글`; no framework value write occurred. The native IME check remains a
failure. A deterministic native warm-up now establishes a marked-text session
before measuring; the measured phrase and composition assertions are unchanged.
Its hosted result and the current snapshot's full close checks must be observed
before completion. Artifacts are retained for one day; the commands and workflow
remain in the source for recovery.

No claim is made about screen-reader software, physical devices, Windows IMEs,
registry artifacts or published release status. Editor, Content and Coverflow
remain outside the requested implementation scope.

## B6 addendum

Issue 231 was updated again at `2026-10-24T20:47:12Z`, adding a deferred-mount
TextField defect. The regression was reproduced against
`6024e43f201e5eaa3deadce847c14cf40d0ccb61`'s runtime: a controlled value changed to `or` while an unresolved
Suspense sibling delayed mounting, but the first connection still rendered
the setup value. The model watcher skipped the update while no connection
existed, and onMounted then reused that captured value.

The first TextField connection now reads the latest controlled prop. Uncontrolled
initial/reset defaults keep their setup-time meaning; post-connection editing,
selection, native history and composition paths are unchanged. This is one
existing lifecycle-boundary read, with no new resource or retained state and no
additional full-text scan. The regression exercises three boundary entries,
multiple pending updates, an intentionally empty final value, form submission,
ordinary post-mount updates, uncontrolled defaults and unmount before resolution.
The first regression failed before the fix; the default/cancellation control
already passed. Hydration/autofill/BFCache behavior is not inferred from this
Suspense scenario. The GC-enabled TextField suite passed after the fix; the full
Vue suite passed 753 tests with 13 conditional GC skips. Production build and
diff checks passed. Hosted verification of the saved addendum remains pending.

## Hosted close before B6

[Run 40131580169](https://github.com/sectile/sectile/actions/runs/40131580169)
passed on `6024e43f201e5eaa3deadce847c14cf40d0ccb61`: preparation, all
six Linux verification lanes, the Chromium journey, native macOS input and the
required-job/result aggregate. This supersedes the earlier failed IME checkpoints
for that exact source snapshot; the failures above remain historical evidence.

The successful macOS witness used CGEvent hardware down/up key codes with explicit
modifier flags through the existing Swift process. System Events had added an
unexpected Alt modifier to Command+A; the earlier warm-up could not clear its
plain input. Actual composition now begins on the first measured Hangul key.
Plain input, controlled TextField and controlled Combobox each committed `한글`,
reported native composition start/end, matched accepted models and cleared with
two native Backspace keys. Undo/redo also passed, and the composing-value write
probe stayed empty. These are headed Chromium/macOS 15 runner results; they do
not imply physical-device or assistive-technology coverage. B6 still needs its
own saved-snapshot hosted run.
