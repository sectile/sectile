<script setup>
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# Async data sources

A Tabular sort, filter, or page change is not an instruction to rearrange mounted rows. It is a **query change that requests a new view**. A source can evaluate that request in memory or send it to a server.

<TabularExample kind="remote-source" />

Search, sort, move to another page, and trigger a failure. The surface retains its last accepted rows while exposing loading or error state, and rejects a response that arrives too late. The Code tab shows the same lifecycle in Vue, DOM, and Core.

## One request lifecycle

1. The user changes sorting, filtering, expansion, or page/window access.
2. The controller creates a request with a unique ID plus current query, access, and revisions.
3. The source evaluates local data or performs HTTP/RPC.
4. The response is checked against the current pending request.
5. A matching view is accepted atomically; a stale or malformed response leaves the current view untouched.

Selection, cursor, and column state remain independent. Only targets missing from the accepted view are adjusted by profile-specific recovery rules.

## Serialize a request

Your server API can use any names, but transform query and access explicitly so their meaning is preserved.

| Tabular request | Example HTTP encoding |
| --- | --- |
| `query.sort` | `sort=name:asc,team:desc` |
| `query.filters` | `filter[status]=active&q=mina` |
| page access | `page=3&pageSize=25` |
| window access | `offset=200&limit=80` |
| `expansion.expandedGroupIDs` | `expanded=commerce,platform` |
| source/query revision | cache key or If-Match-style header |

The source and server define comparator and predicate semantics. Tabular does not impose a locale comparator or search language.

## Build a response envelope

Wrap server data with the request identity before synchronizing it.

```ts
return {
  protocolVersion: request.protocolVersion,
  requestID: request.requestID,
  sourceGeneration: request.sourceGeneration,
  queryRevision: request.queryRevision,
  expansionRevision: request.expansionRevision,
  viewRevision: payload.viewRevision,
  access: request.access,
  matchingLeafCount: { kind: 'known', value: payload.total },
  visibleRowCount: { kind: 'known', value: payload.rows.length },
  rows: payload.rows,
  columnSchema: {
    revision: request.columnSchemaRevision,
    columns: payload.columns,
    headers: payload.headers ?? [],
  },
  removedRowIDs: [],
}
```

This envelope prevents out-of-order responses or mismatched profile/schema data from being partially merged.

## Loading, empty, error, and retry

Tabular exposes state without prescribing its presentation.

| State | Recommended presentation |
| --- | --- |
| Initial loading | Skeleton or progress inside the table region |
| Loading with rows | Retain rows and show subtle toolbar progress |
| Empty | Explain the active query and offer filter reset |
| Error | Retain the last view and offer a described retry |
| Cancellation | Do not present it as an error; await the next request |

Vue's `useDataTable`, `useDataGrid`, and `useDataTreeGrid` accept `source` directly. Their controllers expose `status`, `error`, `reload`, `cancel`, `replaceResolver`, and `dispose`. Core and DOM compose the same policy from an application-owned `AbortController` and controller request state.

## Page and window access

Page access suits numbered navigation and total counts. Window access suits infinite scrolling or virtualization around an offset. A query change should reset either mode to a safe starting position and issue a new access revision.

Virtualization is not a source. When needed, consumer-installed `@sectile/virtual` only lays out the accepted visible rows. See [optional virtualization](./virtual).

## Application-owned responsibilities

- HTTP/RPC client, authentication, cache, and retry policy
- Loading, empty, and error presentation
- Optimistic updates and write-conflict resolution
- Server meaning of comparators and predicates
- Initial accepted view for SSR

Tabular owns request creation, revision comparison, stale-response rejection, accepted views, and typed commands. See [shared contracts](./contracts) for the complete state model.
