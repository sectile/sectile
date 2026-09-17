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
reason and remediation Work Item. They cover Chart model/projection contracts,
Virtual track contracts and Vue Form contracts.
They are not blanket package exemptions.

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
