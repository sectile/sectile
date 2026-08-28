<script setup>
import TabularRemoteDataDemo from '../../.vitepress/theme/components/TabularRemoteDataDemo.vue'
</script>

# Async data sources

Remote sorting, filtering, and pagination do not require a separate mode. A query or access change sends the latest `TabularRequest` to `useData*Source`; the application serializes it for HTTP, RPC, or a query client and maps the result back into a response envelope.

<TabularRemoteDataDemo />

Change the sort direction, type several search values quickly, move between pages, select all matches, and preview a failure. Superseded work is aborted and only a response that matches the active request can be accepted.

::: details Complete interactive source
<<< ../../.vitepress/theme/components/TabularRemoteDataDemo.vue
:::

## Serialize a request

`request.query.sort` is an array, so a server that supports multi-sort can preserve the descriptors in order. Filter, group, aggregate, and pivot descriptors keep their IDs and policy keys as they cross the transport boundary.

```ts
function toSearchParams(request: Parameters<DataTableSourceResolver<UserCells>>[0]) {
  const params = new URLSearchParams()

  if (request.access.kind === 'page') {
    params.set('page', String(request.access.page))
    params.set('pageSize', String(request.access.itemsPerPage))
  } else {
    params.set('offset', String(request.access.start))
    params.set('limit', String(request.access.count))
  }

  for (const sort of request.query.sort) {
    const direction = sort.direction === 'ascending' ? 'asc' : 'desc'
    params.append('sort', `${sort.columnID}:${direction}`)
  }
  for (const filter of request.query.filters) {
    if (filter.enabled !== false) params.append('filter', JSON.stringify(filter))
  }
  return params
}
```

Policy keys are names, not functions sent over the network. A server can interpret `comparator: 'locale'` or `predicate: 'contains'` according to its own registered policies.

## Resolver and cancellation

```ts
import {
  useDataTableSource,
  type DataTableSourceResolver,
  type DataTableViewResponse,
} from '@sectile/vue/data-table'

const resolveUsers: DataTableSourceResolver<UserCells> = async (request, { signal }) => {
  const response = await fetch(`/api/users?${toSearchParams(request)}`, { signal })
  if (!response.ok) throw new Error(`User request failed: ${response.status}`)
  return toViewResponse(request, await response.json() as UsersPage)
}

const source = useDataTableSource(table, resolveUsers, {
  onError: reportError,
  onStatusChange: (status) => analytics.track('users-source', { status }),
})
```

A new request aborts the active resolver signal. If the transport cannot cancel and an older Promise still completes, its request ID no longer matches and the result is ignored.

## Build the response envelope

```ts
function toViewResponse(
  request: Parameters<DataTableSourceResolver<UserCells>>[0],
  page: UsersPage,
): DataTableViewResponse<UserCells> {
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: page.revision,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: page.total },
    visibleRowCount: { kind: 'known', value: page.total },
    rows: page.items.map((user) => ({
      kind: 'leaf', id: user.id,
      cells: { name: user.name, team: user.team, role: user.role },
    })),
    columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] },
    removedRowIDs: page.removedUserIDs,
  }
}
```

Within one source generation, `viewRevision` must be newer than the last accepted view. For a page response, `visibleRowCount` is the complete query result count rather than the current page length.

## Loading, stale, empty, and error

The source exposes state but does not impose rendering policy.

```vue
<p v-if="source.status.value === 'loading'" aria-live="polite">Refreshing users…</p>

<DataTable.Body>
  <template #default="{ row }"><!-- cells --></template>
  <template #empty><tr><td :colspan="columns.length">No users match.</td></tr></template>
</DataTable.Body>

<div v-if="source.status.value === 'error'" role="alert">
  Users could not be loaded.
  <button type="button" @click="source.reload">Retry</button>
</div>
```

While a new request is pending, the previous current view becomes `stale`. The application can preserve it, dim it, or replace it. Before the first response the accepted state is `none`; the latest accepted response is `current`.

## Source control API

| API | Purpose |
| --- | --- |
| `status` | `idle`, `loading`, `success`, or `error` |
| `error` | Latest resolver or response-validation failure |
| `reload()` | Request the current query, access, and expansion again |
| `cancel()` | Abort active work and abandon its pending request |
| `replaceResolver(next)` | Keep the controller, replace transport logic, and advance source generation |
| `dispose()` | Release the executor and active work; Vue scopes call it automatically |

One controller accepts one request executor. A query cache belongs inside the resolver; include descriptors in the cache key and pass the abort signal through.

## Source replacement and SSR

Changing `sourceKey` advances source generation and resets state bound to the previous source. Use `replaceResolver` when only the transport function changes.

Resolvers do not run during SSR. If you provide `initialView`, server and client must hydrate from the same envelope and schema; the mounted resolver can then refresh it.
