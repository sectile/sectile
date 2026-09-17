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
Form path/value concentration, Virtual track contracts and Vue Form contracts.
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
