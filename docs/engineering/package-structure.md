# Package responsibility boundaries

The package-structure gate checks the nine published product packages without
changing their public API or runtime ownership. The role policy lives in
`verification/package-structure/manifest.json`. Every source module has an
explicit owner role and a kind: owner, composition facade, or reference.
Related implementation belongs to its responsibility, not a repository-wide
`shared` directory. A publicly exported primitive may still be a lower-level
owner; being public alone does not make a dependency an architectural violation.

## Commands

Run `pnpm check:package-structure` for source and runtime verification. It reads
the actual package production configurations, resolves each package's declared
`@sectile/tooling/build` binary, runs it in the existing workspace dependency
order, and analyzes the JavaScript produced by those builds. It verifies that
the package build command is the shared `sectile-build production` operation;
unrecognized build hooks or commands require explicit orchestration support.
It checks the exact production input/output set and rejects inputs or policy
that change during the run. It does not accept a stale `dist` directory or a
separate TypeScript eraser as production evidence. The command builds product
packages only, not the documentation site, and does not run product test suites.

For an inexpensive source diagnostic, run
`node scripts/check-package-structure.mjs --source-only`. Its output explicitly
states that runtime was not checked. This mode is not complete acceptance for a
migration. The full check is registered as verification unit `package-structure`;
source, package configuration, graph tooling and policy changes select it in the
affected verification plan. Unrelated release-tool tests do not force this build.

The existing `check:module-dag` and `check:boundaries` remain separate required
checks. Core and this gate share the AST import collector and graph utilities.
Core retains its established static-edge report and stricter layer policy.
Workspace path confinement reuses the existing workspace-boundary owner.

## What is checked

Source edges include type imports, inline mixed imports, re-exports, type-query
imports, side-effect imports and literal dynamic imports. Runtime edges come
from actual emitted JavaScript, including empty imports/re-exports that still
cause module evaluation. Dynamic import cycles are conservatively included in
the runtime dependency policy; a cycle report is not a claim of an initialization
crash. Parsing does not execute product code.

The collector supports the packages' explicit ESM module and export conventions.
Computed dynamic imports, CommonJS require/import-equals, ambient module
augmentation, unsupported file/conditional export forms, aliases, unresolved
paths and undeclared dependencies are errors, not silently omitted edges.
Source references must stay in their package or use a declared public export.
Development-only dependencies cannot satisfy an emitted runtime import.

Role directions apply independently of filesystem visibility. Lower owners
cannot import a higher composition facade merely because its file is convenient.
Both source and runtime graphs report strongly connected components. A source
cycle wholly inside one owner may describe valid recursive contracts; a
cross-role cycle needs explicit remediation. Runtime cycles are governed by exact
component edge sets, even if every individual edge has an allowed role direction.

## Migration debt

The migration baseline is `dc6a84e58aeaed00b8af89e971723ecb20157b15`.
Remaining back-references have exact edge or component records with an owner,
reason and remediation Work Item. The remaining records cover Vue Form
contracts. They are not blanket package exemptions.

A successful check with such records says `passed-with-recorded-debt`, not that
the package structure is finished. A new edge, a larger cyclic component, or a
stale exception after its edge disappears fails. There is no automatic
learn/update-exceptions mode. Fixing an owner removes its matching record in the
same coherent change.

## DOM Chart ownership

The existing `@sectile/dom/chart` entrypoint explicitly re-exports its public
contracts and factories. Its private implementation is colocated under
`packages/dom/src/internal/chart/`:

```text
chart/
  contracts.ts
  navigation-options.ts
  result.ts
  create.ts
  connection.ts
  navigation.ts
  overlay.ts
  renderers/
    canvas2d.ts
    webgl2.ts
```

Contracts contain only types. Navigation option normalization and construction
errors are lower-level operations shared by creation and reconfiguration.
`create.ts` selects renderers and constructs connections; navigation imports
normalization directly, not the public composition entrypoint. The common error
constructor in `result.ts` preserves the same construction result contract
without depending on renderer or connection initialization.

Connection IDs and host resources remain under one connection owner. Renderer
classes and their GPU resources retain their original owners. The refactor
changes locations and import directions, not event handling, rendering,
validation rules or resource lifetimes. WI-002 removes the DOM Chart cycle and
its exact migration records without expanding allowed role directions.

## DOM Temporal ownership

The fifteen existing `@sectile/dom/temporal/*` public subpaths keep their keys
and exported names while their implementations are colocated under
`packages/dom/src/temporal/`:

```text
temporal/
  calendar.ts
  date-field.ts
  date-range-field.ts
  date-time-field.ts
  time-field.ts
  time-range-field.ts
  date-picker.ts
  date-range-picker.ts
  date-time-picker.ts
  date-time-range-picker.ts
  range-calendar.ts
  month-picker.ts
  month-range-picker.ts
  year-picker.ts
  year-range-picker.ts
  internal/
    result.ts
    date-picker-cell.ts
    period-picker.ts
    reference-date.ts
```

The internal Temporal support layer contains only DOM-specific controller/result
adaptation, date-cell projection, browser reference-date capture and period-key
translation. It does not own portable date arithmetic, selection, availability
or navigation; those remain in `@sectile/temporal`. Field adapters depend on
shared DOM text/input primitives, while picker adapters compose the existing
layer and positioning owners rather than cloning them.

Event listener identities, controlled-state synchronization, visibility,
position connections, layer bindings and disconnect cleanup remain with their
existing connections. The regrouping changes physical module targets and
allowed dependency directions only. It does not create a new listener registry,
observer, timer, cache or runtime dependency, and the DOM root remains isolated
from the optional Temporal runtime unless a Temporal subpath is imported.

## DOM Form ownership

The optional `@sectile/dom/form` subpath is delivered directly from the Form
connection family rather than a second runtime facade:

```text
form/
  contracts.ts       # public host contracts and defineFormSubmission
  participants.ts    # native value/name/target/document-order projection
  validation.ts      # native/schema issue and summary translation
  submission.ts      # FormData, submitter and managed-submission helpers
  connection.ts      # one state, subscription and browser-resource owner
```

The lower owners do not import connection orchestration. They translate bounded
browser values and host metadata only; portable field, issue, validation,
submission and path transitions remain in `@sectile/form`. `connection.ts`
continues to call the canonical Form state machine and re-exports the unchanged
DOM Form public contracts.

The connection remains the sole owner of participant/current/baseline maps, the
reverse target `WeakMap`, handled-event `WeakSet`, selector channels, validation
`AbortController`, native-resume token, pending reinitializations and the six
form-root listeners. External participant-root listeners keep the same
participant disposer lifetime. Splitting pure host helpers does not add an
observer, timer, listener registry, cache or alternate submission authority.

Existing work bounds are retained: initial participant setup scans supplied
owners and sorts only final unique participants, delegated event routing walks
only target ancestry, subscription creation/disposal remains expected constant
work, and notification dispatch visits only the affected channels except the
explicit reset/reinitialize all-channel cases.

## DOM Tabular ownership

The supported `@sectile/dom/tabular` aggregate retains its public names and
package export target. Its existing `src/tabular.ts` facade exposes three host
profiles grouped under `src/tabular/`:

```text
tabular/
  table.ts
  grid.ts
  tree-grid.ts
  contracts.ts
  result.ts
  projection.ts
  query.ts
  bindings/
    scope.ts
    columns.ts
    editor.ts
    selection.ts
  grid/
    contracts.ts
    connection.ts
```

Common contracts sit below host results, header projection and control bindings.
The binding scope owns connection-local event disposal; column sizing, editor
capture and selection controls use only the lower support they require. Grid
contracts are shared below the Grid/TreeGrid connection and their construction
adapters. None of these lower owners imports a profile constructor or the public
aggregate. The dependency gate checks type references as well as runtime edges.

`DOMDataTable` and `DOMTabularGrid` keep their existing registration, projection,
header and sparse-cell indexes and generation identities. They remain the sole
owners of their command subscription, pending reveal requests and connection
cleanup. `BindingScope` and `ColumnSizeStore` each have one definition; grouping
their code does not create another registry or allocate an index per call.

Portable navigation, selection and editing transitions remain in the Tabular
profile controllers. DOM captures native editor and control input and projects
the accepted state into attributes, focus and browser effects. Construction still
owns and disposes the controllers it creates; externally supplied controllers
retain their existing caller-owned lifetime. The optional aggregate and DOM root
keep their existing dependency isolation, including the Virtual-free host profiles.

## DOM overlay infrastructure ownership

Public overlay entrypoints stay at their existing `src/*.ts` paths. Shared browser
infrastructure is grouped below them under `src/overlay/`:

```text
overlay/
  layer/
    manager.ts      # document-scoped layer stack and descendant closure
    binding.ts      # per-surface registration and document dismissal listeners
  modal/
    effects.ts      # inert/aria isolation, scroll lock and MutationObserver
  popup/
    connection.ts   # focus, layer, modal, visibility and outside-interaction owner
  position/
    engine.ts       # physical layout discovery, observers and scheduled projection
    connection.ts   # one engine lifetime behind host PositionOptions
    picker.ts       # Temporal picker adapter
  presence/
    motion.ts       # exit-motion listeners and fallback timer
  menu/
    control.ts      # retained menu/submenu host connection
```

`position.ts`, `presence.ts`, `interact-outside.ts` and the public popup/menu
profiles remain at their supported paths. The lower modules do not import those
profile constructors. The role gate distinguishes layer registry, layer binding,
modal isolation, popup connection, positioning engine/connection/picker, motion
wait and menu connection so a helper cannot gain access to an upper resource
owner merely because all of them are overlay-related.

Layer state remains one document-scoped registry, modal isolation one
document-scoped state, and each popup/menu/position connection continues to own
the listeners, observers, scheduled work and registries it creates. Presence
retains its generation guard and one active motion cleanup. The move does not
change portable layer, popup, menu or anchored-layout semantics; those remain in
Core and the existing domain owners.

## DOM Virtual ownership

The existing `@sectile/dom/virtual` subpath and export target remain unchanged.
Its `src/virtual.ts` facade exposes the owners grouped under `src/virtual/`:

```text
virtual/
  contracts.ts    # public generic host contracts and internal result type
  scroll-host.ts  # physical owners, surface-frame reads, bounds and environment
  viewport.ts     # inset normalization and geometry/overscan equality
  measurement.ts  # axis measurement resolver
  style.ts        # surface and item style projection
  connection.ts   # registrations, measurement queue, scheduling and settlement
```

Contracts and stateless helpers never import the connection or public facade.
Style projection and measurement-resolver imports do not depend on connection
construction. Element/document resolution and surface geometry stay in the lower
scroll-host owner; portable frame transformations and layout operations remain
in `@sectile/virtual`.

`DOMVirtualizer` remains one state and resource owner. Its two observers, frame
registrations, item/reverse-item registrations, pending entries, placement index,
stable event handlers and schedule generation are not split into competing
registries. The measurement drain, physical viewport reads/writes, post-scroll
query, rollback-before-error reporting and accepted-state publication retain one
transaction boundary. Private methods are not wrapped solely to shorten the file.

Ordinary scroll reuses the cached surface frame; geometry invalidation and changed
item entries coalesce into the existing scheduled transaction. Stale registration
tokens and callbacks remain guarded. Disconnect removes the connection's listeners,
disconnects both observers, cancels scheduled work and clears its retained maps.
The document-host realm, browser scroll settlement and caller-supplied reader,
writer, environment and strategy contracts remain unchanged.

### Approved DOM compressed-distribution re-attestation

WI-008D retains this ownership split and re-attests only the two DOM compressed
package measurements after maintainer approval. The existing baseline schema and
5% tolerance formulas remain unchanged; category sizes, unpacked/install totals,
consumer-bundle limits and other packages retain their previous records.

| Collector | Historical baseline | Immediate predecessor | Current measurement | Old ceiling | New ceiling |
| --- | ---: | ---: | ---: | ---: | ---: |
| npm dry-run / source-map gate | 284,941 | 299,043 | 301,048 | 299,205 | 316,117 |
| pnpm pack / install gate | 288,213 | 302,599 | 304,465 | 302,656 | 319,721 |

All sizes are bytes. The immediate predecessor is
`906549b900f2fccf47b5d73d443abda74b8dbcdc`; the same-protocol incremental costs
are 2,005 and 1,866 bytes, not the changes from the older baseline. Re-attesting
measured values restores the collectors' existing tolerance, so the new ceiling
is distinct from the incremental code cost. Only DOM `packed.tarballBytes` in
`verification/source-maps/baseline.json` and DOM `tarballBytes` in
`verification/consumer-install/baseline.json` change. No fabricated normalized
measurement, new waiver mechanism, omitted artifact or compiler adjustment is used.

The split adds 1,074 JavaScript bytes, 2,590 declaration bytes and 47 source-map
bytes to the immediate predecessor; other packed bytes stay unchanged. These
categories remain within their old limits. Six DOM/Vue consumers measured with
esbuild and Vite show raw deltas of -3 to 0 bytes, gzip -15 to 0 and Brotli -17 to
+33. This limited bundle comparison is not a runtime-speed or universal-size
claim. The original failed pack gates remain in the work record, followed by the
successful revalidation under the approved measurements.

## Chart domain ownership

The existing Chart subpaths remain stable facades over responsibility-owned
implementation families under `packages/chart/src/internal/`:

```text
model/
  contracts.ts      # datum, layer, model, patch and limit types
  limits.ts         # defaults and normalized-limit provenance
  state.ts          # construction and immutable model patch assembly
  store.ts          # model provenance and borrowed packed layer views
  layer-owner.ts    # packed values, profile indexes and bounded repair

definition/
  contracts.ts      # resolved definition and layer metadata
  resolve.ts        # capture, axis resolution and model composition

layout/
  contracts.ts      # resolved axes, viewport and plot contracts
  plot.ts           # axis and plot layout construction

projection/
  project.ts        # packed projections and owner-bound geometry/color caches
  query-index.ts    # retained projection query indexes
  query.ts          # hit testing

interaction/
  state.ts          # selection, cursor and semantic event transitions
  view.ts           # axis-view transitions
  controller.ts     # publication, subscriptions and composition
```

Model storage depends on lower model contracts rather than model construction.
Resolved layout contracts are shared below view, definition and projection
assembly. `ChartViewport` remains available through the existing projection
subpath even though the type is owned by layout. Definition metadata likewise
lives below definition construction and projection; this removes the previous
cross-owner type cycles without hiding type-only imports from the gate.

The public `contract.ts` remains the compact input-normalization owner: it is
not a type-only module. `scale.ts` and the result owners remain foundational
rather than gaining unnecessary wrappers. Internal implementations target
owning modules, not the public composition facades.

The existing normalized-limit registry, model provenance, packed-value views,
projection caches, query indexes, selection/view indexes and controller
subscriptions each retain one owner and their prior lifetime. Moving these
modules does not change packed representations, patch algorithms, borrowed
buffer ownership, no-op sharing, generation guards or disposal behavior.

### Chart distribution budget decision — WI-004

The maintainer approved the measured Chart distribution cost of this ownership
split on 2026-09-17. The immediate comparison source is `636dc2e4`; the same
production builder and package manifest are used on both sides. Module linking,
lower contract declarations and their maps add installed-file overhead without
changing the algorithms, public API or consumer bundle requirements.

| Distribution evidence | Before at `636dc2e4` | After split |
|---|---:|---:|
| JavaScript bytes | 224,207 | 225,047 |
| Declaration bytes | 55,482 | 56,944 |
| Source-map bytes | 169,865 | 171,298 |
| Actual pnpm tarball bytes | 96,205 | 98,738 |

Only the Chart records in the existing install and source-map distribution
baselines are re-attested. The package-local limits remain 250,000 JavaScript,
120,000 declaration and 350,000 map bytes. Consumer bundle baselines, all other
package records, installed application records, dependencies and compiler/map
content policy are unchanged. Shared formulas remain 5 percent plus 32 bytes
for install categories/tarballs and 5 percent plus 16 bytes for source-map packs.

The older install record contained 92,836 tarball bytes, 214,607 JavaScript,
55,441 declaration and 162,820 map bytes. Those are historical baseline values,
not this unit's immediate before measurements. The current actual pnpm pack is
98,738 compressed and 458,579 unpacked bytes. Its effective limits change as
follows: tarball 97,510 to 103,707; JavaScript 225,370 to 236,332; declarations
58,246 to 59,824; maps 170,993 to 179,895; ancillary files 5,498 to 5,587.

The source-map collector uses a separate npm dry-run protocol: its historical
91,887 compressed and 438,079 unpacked bytes become 97,730 and 458,590. Effective
limits become 102,633 and 481,536, from 96,498 and 459,999. These numbers are not
interchangeable with actual pnpm pack measurements. Git retains the previous
records; the update neither omits source maps nor changes their validation.

Ten selected consumer scenarios in esbuild and Vite preserve external
dependencies, with raw deltas from -6 to +5 bytes, gzip from -186 to +23, and
Brotli from -16 to +103. Existing consumer bundle gates remain unchanged.
These measurements do not establish universal size or runtime improvements.
Future distribution growth requires its own reviewed decision.

## Form construction ownership

Form's existing `/path` and `/values` subpaths expose independent construction
owners under `packages/form/src/internal/construction/`:

```text
construction/
  limits.ts      # shared construction limits, normalization and ceiling results
  path.ts        # field/relative paths, validation and canonical encoding
  values.ts      # nested output assembly and owned-branch freezing
```

The dependency direction is values -> path -> limits, with state also consuming
path and limits. These lower owners never import the state implementation or a
public composition facade. Path/value imports therefore do not initialize Form
state stores. Each owner keeps its small vocabulary types with its operations;
all public limit re-exports resolve to one `FormConstructionLimits` declaration.

The construction split preserves parsing, input capture, failure ordering,
configured budgets, repeated-leaf ordering and opaque value identity. Only
newly constructed branches and repeated-leaf wrappers are frozen; caller-owned
leaves are not transferred to the output's structural ownership.

## Form state contracts

`internal/state/contracts.ts` owns the field, issue, validation, submission,
event and update types. It imports only the lower Core identity contract, not
state construction, storage, queries or transitions. The public `/state`
entrypoint keeps its existing Form-prefixed type names through explicit aliases;
internal operations consume the same definitions directly. The structure gate
classifies this lower contract owner separately from state implementation.

State implementation is grouped under `internal/state/`:

```text
state/
  contracts.ts       # portable field, issue, state, event and result types
  records.ts         # input capture, record normalization and comparison
  status.ts          # validation/submission records and generation guards
  storage/
    delta.ts         # bounded overlay indexes/sets and deletion identity
    fields.ts        # chunked field storage and field-array projection cache
    issues.ts        # issue, source and relation indexes
    snapshot.ts      # single state provenance registry and immutable snapshots
  query.ts           # fields, issue sources and lazy path-owner lookup
  projection.ts      # complete/incremental field and issue projections
  create.ts          # external-input validation and canonical construction
  transitions.ts     # event dispatch and state transition assembly
```

The public `/state` facade explicitly exports construction, query and transition
operations and the same type aliases. `internal/form.ts` is superseded, not a
compatibility barrel. Storage never imports queries, constructors or transitions;
queries do not import constructors or transitions. The role gate applies these
rules to type imports as well as emitted runtime dependencies.

`storage/snapshot.ts` is the sole canonical-state registry owner, and
`storage/fields.ts` owns the sole store-lifetime field-array cache. Delta classes
and their deletion symbol are defined once in `storage/delta.ts`. Splitting these
owners does not change the 64-field chunks, overlay depth of 32, lazy path-owner
index, snapshot sharing, retained output budgets or generation guards.

### Form distribution budget decision — WI-003B

The maintainer approved the measured Form-only distribution cost of separating
state responsibilities on 2026-09-17. The comparison source is `e84209e1`; the
unchanged production builder emits the additional private module declarations
and import/export records. This is installed-file overhead, not permission for
larger consumer bundles, new dependencies or additional event-path work.

The package-local JavaScript limit increases from 70,000 to 73,236 exclusive:
the reviewed 3,236-byte distribution delta, preserving the prior headroom. The
35,000-byte declaration and 80,000-byte source-map local limits remain unchanged.
Only the Form records in the install and source-map distribution baselines are
re-attested. The latter also checks compressed/unpacked package bytes; it does
not permit omitting maps or changing compiler/content policy. Shared formulas
remain 5 percent plus 32 bytes for install categories/tarballs and 5 percent
plus 16 bytes for the source-map pack check. Other package records, installed
application baselines, dependency policies and consumer bundle baselines are
unchanged. Git retains the prior measurements.

| Distribution evidence | Before at `e84209e1` | After split |
|---|---:|---:|
| JavaScript bytes | 69,902 | 73,138 |
| Declaration bytes | 15,602 | 24,352 |
| Source-map bytes | 51,056 | 52,996 |

The older recorded install baseline was a 31,338-byte tarball with 67,879
JavaScript, 14,862 declaration and 49,358 map bytes; the accepted actual pnpm
pack is 36,118 bytes with the current categories above. Its effective tarball
limit becomes 37,956 and declaration limit 25,602, under the unchanged formula.
The separate npm dry-run source-map collector measures 35,742 compressed and
154,578 unpacked bytes, versus its recorded 31,052 and 136,191; effective limits
become 37,546 and 162,323. These are distinct pack protocols, not interchangeable
measurements. New cross-module declarations and module linking records account
for the structural cost; no new third-party code is introduced. Future growth
requires its own reviewed decision.

## Virtual ownership

Virtual keeps its public subpaths while grouping implementation under
`packages/virtual/src/`. Index and layout subpaths map directly to their owners.
The existing collection and surface entrypoints remain thin re-exports of the
corresponding collection modules; they do not wrap calls or duplicate state.
Internal dependencies target owners directly. The root remains type-only.
Public declaration and nominal identity checks cover both direct targets and
facades, within the existing package and install budgets:

```text
indexes/
  extent.ts
  extent-metadata.ts
  blocked-vector.ts
layout/
  plan.ts
  track.ts
  repair-diagnostics.ts
  linear.ts
  spatial.ts
  masonry/
    layout.ts
    internals.ts
  grid/
    layout.ts
    partitioned.ts
    region-overlap.ts
collection/
  projection.ts
  surface.ts
```

`layout/track.ts` owns the shared `LinearAxis` and `LinearFlow` types as well
as extent-based track operations. The existing linear-layout subpath re-exports
those types; shared track code does not import a concrete layout. Concrete
linear, masonry, grid, partitioned-grid and spatial families have distinct
roles. Only the partitioned-grid owner composes the base grid implementation.
Indexes and shared plan/result helpers remain below concrete layout owners.

Each state brand, uniform-extent metadata map, collection provenance registry,
masonry registry and repair-diagnostic registry remains defined once. The
migration changes source ownership and imports, not index representations,
64-item partitioning, sparse/dense crossover rules, generation checks,
materialization boundaries or layout algorithms. The crossover source paths
follow the moved production implementation; historical measurements and
selected representations remain unchanged.

## Tabular ownership

Tabular preserves its public subpath keys while mapping model, query, source
and profile entrypoints directly to their responsibility owners:

```text
src/
  contracts.ts          # shared renderer-neutral vocabulary
  foundation.ts         # Core-backed result, identity and revision support
  model/
    state.ts            # model construction and state reconciliation
    access.ts
    columns.ts
    expansion.ts
    selection.ts
  source/
    query.ts            # canonical query validation and transitions
    view.ts             # prepared response provenance and visible-row indexes
    client.ts           # source/query/projection generations and synchronization
  profiles/
    table-state.ts      # table model registry and controlled state projection
    table.ts            # table controller and command subscriptions
    grid.ts             # shared grid interaction and projection
    data-grid.ts
    data-tree-grid.ts
  virtual.ts            # optional Virtual layout composition
  index.ts              # type-only public root
```

Canonical model slices do not import model assembly. Query normalization and
prepared-view indexes do not import source resolution. The table-state owner
stays below the table controller, and the shared grid owner composes that
controller without depending on specialized DataGrid or DataTreeGrid factories.
The role gate checks those directions for type and runtime dependencies.

Only the optional `/virtual` owner imports Virtual. Base model, source and
profile consumers retain their renderer-neutral dependency boundary. Public
subpaths resolve the same declarations and executable definitions at their new
locations; no function wrappers or duplicate runtime facades are introduced.

Column, expansion, selection and query caches retain one owner. Client source
stages, accepted/prepared views, table model provenance, controller subscriptions
and adapter state retain their existing generation and disposal contracts.
Grouping changes paths and permitted dependencies, not filtering, sorting,
grouping, pivoting, bounded navigation or incremental layout repair algorithms.

## Temporal ownership

Temporal separates date/time value arithmetic from input editing. Existing
public subpath keys remain unchanged; their export targets resolve the grouped
owners rather than introducing a second set of wrappers.

```text
src/
  values/
    date.ts             # civil date and range arithmetic
    time.ts             # time-of-day and range arithmetic
    date-time.ts        # composition of date/time values
  fields/
    date.ts
    time.ts
    date-time.ts
    date-range.ts
    time-range.ts
  calendar.ts           # calendar state, navigation and bounded projections
  pickers/
    date.ts
    date-range.ts
    date-time.ts
    date-time-range.ts
    range-calendar.ts   # existing high-level aliases
    period/
      navigation.ts
      month.ts
      month-range.ts
      year.ts
      year-range.ts
  internal/
    foundation.ts       # result construction
    machine.ts          # existing Core machine-update adapter
```

Value owners do not import field state, calendar or picker assemblies. Calendar
uses date values directly, so it no longer depends on date-field input editing.
Fields retain text state, segments, policies and commit/cancel behavior. Each
field subpath explicitly re-exports only the value APIs that it already exposed;
for example, the time-range constructors remain exposed by `/time-range-field`,
not added to `/time-field`. Date-time values compose the lower date/time owners.

Period navigation is shared by month/year adapters without depending on those
adapters. The range-calendar export is a facade over date-range picker and
calendar operations, not a lower owner that calendar must import. Pickers reuse
existing field policy types where needed, rather than cloning them. Type-only
and runtime dependencies remain distinguished by the role gate.

The split preserves arithmetic, parsing, formatting, error ordering, input
composition rules, availability callbacks and the same Core machine-update
path. It adds no clock, retained registry, timer or subscription. Existing
civil-year, draft-length, output-cell and caller-supplied scan limits are
unchanged. Physical artifact and consumer costs are checked independently from
source organization; this migration does not authorize broader size ceilings.

## Moving or extracting an implementation

Before editing, identify the owner, direct callers, public surfaces and any
canonical state, symbol or lifecycle resources. Record the old/new source paths
with the work item. Preserve one definition of each registry, brand and provider
key. A source move is not permission to replace algorithms or widen an optional
peer closure.

Update module classifications and intended role directions with the move.
Do not copy a newly observed graph into the allowed policy. Reuse the existing
package tests, public declaration fixtures, operation/resource checks and
applicable packed consumer/bundle/source-map evidence. Preserve historical
measurements and accepted ceilings. Source-bound attestations may be refreshed
only after reviewing the move and preserved implementation; no check becomes
optional simply because it refers to an old path.

The temporary inventory scripts in `.tmp` are not permanent graph owners and are
not part of the gate. The canonical implementation is the root-owned
`scripts/lib/module-graph/` family, used by the CLI and Core adapter. Its tests
exercise accepted and rejected graphs, not merely the existence of source files.
