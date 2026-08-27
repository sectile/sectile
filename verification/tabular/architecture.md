# Tabular architecture contract

`@sectile/tabular` owns renderer-neutral tabular data semantics. It composes
exported Core structures and exposes three fixed profiles: DataTable, DataGrid,
and DataTreeGrid. Hosts and frameworks adapt those profiles without moving host
state into Tabular.

## Dependency boundary

- Base Tabular runtime imports exported `@sectile/core` subpaths only.
- The type-only package root exposes shared contracts; constructors live on
  canonical runtime subpaths.
- `@sectile/tabular/virtual` is isolated behind an optional
  `@sectile/virtual` peer. Base declarations contain no Virtual names.
- Renderer/framework packages, Node built-ins, timers, transports, CSS, and host
  geometry are outside the Tabular production and declaration boundary.

## Shared authority

Tabular owns stable row, group, column, header-node, descriptor, and cell
identities; immutable query and column state; row selection; page or window
access; source/request/view revisions; accepted-view freshness; and ordered
renderer-neutral projections.

Hosts own input events, focus transfer, rendered-part registration, dimensions,
resizing, measurement, scrolling, scheduling, accessibility attributes, native
forms, styling, and teardown. Applications own source transport, caching, retry,
editor drafts, validation, persistence, and loading/error/empty presentation.

## Profile authority

| Capability | DataTable | DataGrid | DataTreeGrid |
|---|---|---|---|
| Host semantics | native table | ARIA grid | ARIA treegrid |
| Row shape | flat or native disclosure rows | flat | hierarchical |
| Cell cursor | none | Core Grid | Core Tree Grid + cell grid |
| Edit authority | application editor commit intent | one active editable cell | one active editable leaf cell |
| Selection | row selection | row + independent cell selection | row + independent cell selection |
| Expansion | native disclosure | none | controlled tree expansion |

A profile is selected at construction. A mode flag never changes native table,
grid, or treegrid authority at runtime.

## Source boundary

The reducer accepts versioned pure request/response envelopes. A synchronous
client source resolves injected policies in canonical filter, stable-sort,
group, aggregate, pivot, expansion, flatten, and access order. Remote transport
uses the same envelope outside Tabular. The model contains no Promise,
AbortSignal, transport error, cache, retry, or cancellation object.

Vue source helpers may own an injected asynchronous resolver and expose
`idle | loading | success | error`. They attach through the controller's sole
request-executor channel, abandon matching failed or cancelled requests, and
reject stale completions. Empty remains a current accepted-view derivation.

## Virtual boundary

Base Tabular contains no Virtual state or command. The optional adapter maps
profile projection identity and pin partitions into raw Virtual state and
mutations. It does not measure, observe, schedule, scroll, style, or render.
DataGrid and DataTreeGrid always use one partitioned track-grid strategy; an
unpinned grid is its center-only form. Projection generation and Virtual layout
generation are distinct counters.

## Extension rule

Advanced capabilities compose through named state slices and versioned source
contracts. V1 has no runtime feature registry, untyped reducer injection, or
generic plugin lifecycle. A shared extension mechanism requires multiple
independent implemented extensions and an explicit common law.

## Cost and resource contract

- Identity lookup: indexed expected O(1).
- Projection: O(rows + columns + header nodes + projected cells emitted).
- Client filtering/grouping/aggregation/pivoting: O(scanned records plus emitted
  schema); stable sorting: O(n log n).
- State transitions avoid record scans unless they invoke the client-source
  pipeline.

Default ceilings are 1,024 code units per ID; 100,000 rows; 10,000 columns;
1,000,000 projected cells and scanned records; group depth 1,024; 64 sort,
group, and pivot descriptors; 256 filter and aggregate descriptors; 10,000
pivot columns; 100,000 selected IDs or exclusions; query-value depth 32,
1,048,576 code units, and 100,000 nodes; one live request generation. Every
ceiling rejects atomically before partial state is exposed.

## Promotion evidence

A public surface ships only with reference or differential laws, independent
host witnesses, package/declaration closure, deterministic evidence, and packed
consumer installation checks appropriate to that surface.
