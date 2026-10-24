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

## Remaining-scope implementation checkpoint

The maintainer subsequently authorized every remaining non-Editor/Content/Coverflow
item. This supersedes the earlier P1/P2 scope omission. Source base:
`07719293dc0e535cf43ab09df1c40d7b2c9a52f3`; policy remains the pinned revision above.

P1 now transfers native text, selection and owned focus when representation
changes. Active composition defers replacement; an input request also waits for
line breaks to be removed rather than discarding them. Native history is tied
to a browser element and is explicitly not claimed to transfer between elements.
P2 uses existing Core decimal arithmetic and NumberField validation for explicit
set-value/step events. Vue exposes revocable async commitValue/clear/stepBy ports
through the existing native-field owner, with controlled settlement and rejection.
No floating-point arithmetic, synthetic DOM edit, or new numeric editor is used.
Focused GC-enabled Core/Vue checks passed 49 tests.

Tooltip timing is adopted in the existing hover owner: two optional delays and
an explicit caller-owned skip-delay group. A group retains only a count/deadline
in a WeakMap; each native connection owns at most one pending timer. Keyboard
focus remains immediate. The DOM popup suite including accepted/refused group
timing and cleanup passed. Native HTMLDialog promotion is declined because it
would overlap Sectile's modal focus/isolation owner; P5 already provides the
required retained presentation. Link drill-down reuses NavigationMenu's existing
branch and native-anchor contract, including close-submenu for a Back action.
These are Sectile ownership decisions, not deferred external approvals.

Issue 227 browser coverage now includes 26 plain/controlled/uncontrolled and
compound input cases. A real Chromium failure exposed controlled textarea
defaultValue updates splitting native history. A separate plain-input experiment
also showed that assigning an unchanged placeholder on every input splits native
undo grouping; Date/Time/DateTime now compare before writing. Client native field,
range and quantity projections defer live values to their DOM owners while SSR
retains initial values. All 26 Chromium history cases passed after these fixes;
PinInput remains a specialized per-cell composition contract. Value/selection
traces and the extended real macOS composition matrix are being verified.

The existing macOS job is split into four bounded standard-runner shards; each
uses plain native controls as IME witnesses. Additional published-artifact,
full-suite, public declaration, bundle and hosted checks remain pending for this
checkpoint. No release or issue-Done status is claimed.

The numeric command implementation was moved into the existing NumberField module
after bundle measurement showed that putting async command logic in the shared
native-field factory charged Date/Time consumers for numeric-only behavior.
The shared owner now supplies only an optional lifecycle/connection port. New
named/root-equivalent NumberField and Tooltip fixtures cover both bundlers.
All historical budgets remain except the measured esbuild DateField row:
42,659/12,733/11,462 B became 44,454/13,377/12,057 B raw/gzip/brotli;
Brotli exceeded its previous 5% + 16 B allowance by 5 B. The remaining shared
lifecycle port, SSR/native ownership corrections and temporal placeholder guard
justify this scoped replacement. A separate numeric editor was rejected because
it would duplicate the current native owner. Full collection covered 496 fixtures
and 992 bundles; this decision does not raise unrelated consumer ceilings.

## Close corrections and artifact boundary

Commit `2a0d46d0a4ea54fe3413f68c2a17dad04609f308` passed consumer
installation, both bundlers, DOM, lifecycle retention, documentation, public
signatures and package structure in hosted verification. Its full close failed:
Core's additive numeric events needed semantic API classification, the complexity
aggregate was stale, and two Vue assertions retained superseded contracts. The
Combobox regression now completes composition before expecting representation
replacement; the Form regression keeps the initial native default and still
asserts that reset restores the latest controlled model. Neither weakens the
requested native ownership. Focused GC-enabled Core/DOM/Vue checks and both
corrected Vue suites passed locally. Public declaration/SFC checks passed.

The expanded macOS matrix observed `한ㅡㄹ` after the native textarea witness,
with no composing-value writes. This remains a failed check, not a passed native
IME result. Source activation is now scoped to the browser session rather than
reset between every field, and failure reports include all value/selection
writes. Hosted verification of that correction is pending.

Browser execution now extracts the existing preparation owner's publication
tarballs, validates their package contracts and resolves public entry points to
those extracted bytes. Root owns cross-package composition; the Vue server only
receives explicit alias inputs. The existing interaction fixture is reused,
including all 26 input cases, nested popup AX/focus, retained Drawer, gesture and
Reorder journeys. Chromium passed locally against those candidate artifacts;
the report includes their versions and SHA-256 digests. This is packed-candidate
evidence, not registry-release evidence.

Registry inspection still reports DOM/Vue `0.19.0` at
`aaa01f132db0ed1c1732d5f1749038c88cdd8a2d`, preceding these fixes.
The existing read-only `pnpm release:plan --allow-dirty` selects Core `0.16.0`,
DOM/Vue `0.20.0` and dependent patch releases for the full unreleased change set.
No version mutation, tag, registry publication or release approval is inferred.
Issue 227 AC-12 remains open until the maintainer's release decision and a check
of the published bytes. The workflow's human-release boundary remains applicable.

## Final input-owner coverage extension

The public-input inventory also found TreeSelect's newer query input, which was
not named in issue 227's original baseline. Its controlled native edit reproduced
the same `abc → empty → abc` stale projection. The regression failed against
`16a1a652daaf3e8b515bc009f0bf088af1dd5539` before the correction.
The DOM query owner now delays only final native value correction until the
controlled owner settles. It retains one pending query and one coalesced,
generation-guarded microtask; settlement performs O(q) native comparison and
does not revisit mounted rows or repeat layout. No Core tree/query representation,
algorithm or public API changes. Unbind invalidates pending work; held-handle GC
now includes an outstanding native observation.

Vue no longer binds a live query value after SSR. Source/controller replacement
waits for native composition to finish on the same input. One scoped timer
notifies the existing source watcher, preserving Vue error handling and the old
valid owner if the replacement source is invalid. Native identity changes and
unmount retire composition ownership. A deferred source holds the old canonical
owner alongside the caller's replacement until composition settles, within the
existing source cardinality ceilings. Tests cover accepted/refused/transformed
queries, committed source replacement, invalid deferred source recovery, owned
focus, pending timer cancellation and zero row reprojection during settlement.
The focused GC-enabled DOM/Vue run passed 26 tests.

The browser catalog now contains 30 cases, including controlled/uncontrolled
TreeSelect and both DateTimeRange endpoints. Other Temporal picker variants
inherit the tested picker/native-range/native-field owners; their semantic and
format distinctions remain covered by package tests. File, hidden submission,
checkbox/radio, range and native-color inputs have no free-form text contract.
Each macOS shard has seven non-plain cases, their seven plain peers and the two
shared native witnesses, giving 16 native composition scenarios per shard.

Matched plain peers demonstrated that document replacement alone does not reset
the macOS application's input-method context. Independent witnesses now explicitly
select ASCII then Korean through the focused application's real OS menu. The
first `한글` phrase, active composition focus, configuration update and zero
composing-value/selection rewrite requirements remain. In an additional same-input
continuation, even plain HTML after `value = ''` produced `한ㅡㄹ한` for the
requested `한글한` hardware keys. That is retained as an observed runner/browser
limit. Continuation therefore verifies actual native input-event text survives
unchanged into the accepted token, and reports requested and observed strings;
it does not fabricate a corrected IME result. Registry release acceptance and
physical keyboard/assistive-technology claims remain separate.
