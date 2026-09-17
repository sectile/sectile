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
