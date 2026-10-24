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
- State: source, packed-candidate and published-registry acceptance passed;
  see the [published verification](../../verification/releases/release-2026-10-24.1.md).
  This record does not claim a separate independent code review.

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

## Compound fixture correction and native process boundary

Further close review found that the earlier range fixtures supplied only one
endpoint, while their connection requires both. The picker fixture also omitted
its trigger, content and grid. Earlier history passes for those cases exercised
plain native elements and are insufficient evidence for their adapters. The
fixtures now mount all required public parts, inspect the range's public draft,
and require the picker's initialized field format. This corrected reproduction
failed: typing `abc` in DateRange start and undoing produced `ab` instead of the
matched plain control's empty value, without a value/selection write.

The shared range adapter still assigned its unchanged placeholder on every
refresh. It now compares before writing, matching the scalar correction. The
corrected 30-case packed Chromium journey passed, including both endpoints of
Date, Time and DateTime ranges and the fully connected picker.

Native macOS peers also showed that ASCII/Korean menu cycling did not fully
isolate reused browser clients after semantic clears. Independent witnesses now
receive separate headed browser processes, with at most one live browser per
shard. The same-input continuation retains its process and element through the
clear, so process isolation does not substitute for native-output preservation.
The source-menu setup, strict first `한글` phrase and live reconfiguration/write
assertions remain. The hosted result for this process boundary is pending.

The verification audit also removed recurring checks for hydration comment IDs,
literal SSR helper names and literal emit expressions. Contract inventory/schema
checks remain; their referenced behavior and SSR fixtures are executed by the
existing Vue package unit. Prepared package admission is not repeated by every
browser process, and only result/trace diagnostics are uploaded on failure.

The existing release planner's concrete candidate set is:

| Package | Current | Candidate |
| --- | --- | --- |
| Core | 0.15.0 | 0.16.0 |
| Chart | 0.16.0 | 0.16.1 |
| Form | 0.15.1 | 0.15.2 |
| Temporal | 0.15.0 | 0.15.1 |
| Virtual | 0.16.0 | 0.16.1 |
| Terminal | 0.15.0 | 0.15.1 |
| Tabular | 0.17.0 | 0.17.1 |
| DOM | 0.19.0 | 0.20.0 |
| Vue | 0.19.0 | 0.20.0 |

This is a read-only plan for the full unreleased change set, not an executed
version change or publication approval. Exact released bytes can be supplied to
the same browser owner with `--tarball-directory`; its digest report must be tied
to the registry publication evidence before issue 227 AC-12 is marked complete.

The remaining picker classification is explicit: TimePickerInput renders the
tested TimeField owner through its existing value-control port. Day-based
Date/DateTime range picker inputs reuse the common picker host and scalar/range
field adapters. Month/year picker display inputs are read-only and do not expose
free-form editing. Their distinct formats and selection semantics remain in the
existing Temporal and Vue package suites.

Runner billing was checked against the repository's public visibility and
[GitHub's current Actions billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
standard GitHub-hosted compute is free for public repositories. The workflow uses
standard Ubuntu/macOS labels, four bounded native shards and one-day artifact
retention; this statement does not assert account-wide storage usage.

## Hosted close at 34440cc44

[Run 40138752921](https://github.com/sectile/sectile/actions/runs/40138752921)
passed on `34440cc444490dadb1dc42dc86f51f37af753aee`. Preparation,
all six Linux lanes, all 85 deterministic verification units, the packed Chromium
journey, all four native macOS shards and the required-result aggregate succeeded.
This supersedes the pending hosted checkpoints above for this code snapshot;
the failed reproductions remain historical evidence.

The Chromium journey covered all 30 catalog cases with the corrected compound
connections, accepted native history/write traces, nested popup focus and AX
quarantine, retained Drawer focus, gesture admission and Reorder preview/commit.
Each macOS shard passed 16 real native witnesses, 64 in total including matched
plain controls. Every measured first phrase was `한글` (or the specialized
single-cell `한`), composition start/end was observed, live reconfiguration kept
focus, and the composing value/selection write trace was empty. Both continued
Tags witnesses reported requested and observed `한글한`, with the Sectile token
equal to native output. The earlier reused-client failures are not current
failures of this isolated process setup. No physical-keyboard or screen-reader
software coverage is inferred.

The full run took about eight minutes. Linux lanes took about 58–96 seconds after
preparation; native jobs took about 5m40s–6m50s, with equal native witness counts
and additional continuation coverage in shard 3. Standard runners and existing
job owners are retained. Successful aggregation saves measured unit timings for
the next balanced Linux plan.

Issue 231's B1–B6/P1–P5 implementation and remaining composition decisions now
have source, package/public-surface, lifecycle and applicable browser evidence.
Issue 227's native ownership coverage has the same source/packed evidence, but
AC-12 still requires the maintainer's release decision and registry provenance
for the resulting DOM/Vue versions. No package version, tag, registry or GitHub
release was changed. No new PR was created. Existing untracked
`docs/engineering/proposals/coverflow-presentation.md` remains outside this work.

## Published close

The maintainer subsequently authorized release. The existing release owner
published DOM/Vue 0.20.0 and the seven other manifest packages from
`3b1e581ce8c6fe93aa759682ff890168ab3c2b8b` as
[release-2026-10-24.1](https://github.com/sectile/sectile/releases/tag/release-2026-10-24.1).
The exact release source passed all 62 affected deterministic units, Linux
Chromium and all four real macOS input shards. The preceding complete 85-unit
source run remains evidence for unchanged executable inputs. The nine
native-tested tarballs, sealed publication tarballs and registry downloads are
byte-identical; all registry
`latest` tags and SHA-512 values match. The existing browser journey also passed
against those registry downloads. The immutable release contains all original
tarballs and publication evidence. [The final verification record](../../verification/releases/release-2026-10-24.1.md)
and its linked artifact identities supersede the earlier Awaiting Release
checkpoints, including issue 227 AC-12. Excluded Editor/Content/Coverflow work
and the documented browser/AT coverage limits are unchanged.
