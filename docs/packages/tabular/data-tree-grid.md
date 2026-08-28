<script setup>
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# DataTreeGrid

DataTreeGrid adds parent and child rows to DataGrid's cell cursor and editing model. Use it for service ownership, file-like inventory, and grouped permissions where users work on leaf cells while retaining **parent context**.

<TabularExample kind="tree-overview" />

## Expand and collapse branches

A group disclosure changes expansion state and requests a new view. Tabular does not hide an arbitrary nested DOM subtree. The source returns a flat list of currently visible rows plus hierarchy metadata for the active expansion.

<TabularExample kind="tree-hierarchy" />

Rows can carry `level`, `positionInSet`, `setSize`, and parent/group IDs. A parent that does not match a filter may remain as `contextOnly` so its matching descendants keep meaningful location. It is navigation context, not a selectable or editable record.

## Select leaf rows

Checkbox selection applies to leaves. A Shift range follows visible leaf order, skipping group rows and collapsed descendants. The header control represents every leaf matched by the current query revision.

<TabularExample kind="tree-selection" />

For group-level selection, pass a group-leaves target to `BulkSelectionControl`. It stores source-resolvable intent instead of enumerating every descendant ID.

## Navigate, edit, and recover

Arrow-key navigation and edit mode follow DataGrid. Left and Right may move columns or collapse and expand a branch according to product policy. If collapse hides the cursor or editor, recovery targets a nearby visible cell or the owning group row.

An edit commit is a command; the application persists it. A view arriving after persistence or expansion is accepted atomically only after its request, source, and view revisions match.

## Preserve parent context during query

Sort and filter descriptors can be sent directly to a server. The server returns matching leaves and any ancestors required for navigation as `contextOnly`, so users can still understand which branch contains a result.

The [async source](./data-source) shows request serialization, loading, errors, and stale-response rejection in a live UI.

## Large treegrids

Tabular computes hierarchy semantics for visible rows but does not measure DOM or scroll. Install and compose `@sectile/virtual` only when a large treegrid is a measured bottleneck. See [optional virtualization](./virtual).

## Find a public part

| Goal | Vue part | Primary state or behavior |
| --- | --- | --- |
| Treegrid boundary | `Root` | cursor, edit mode, tree metadata |
| Hierarchical rows | `Body`, `Row`, `Cell` | level, position, contextOnly |
| Expansion | `RowDisclosure` | expansion query and new request |
| Selection | `RowSelectionControl`, `BulkSelectionControl` | visible leaf range, group leaves |
| Editing | `Editor` | leaf-cell commit/cancel/restore |
| Columns | `ColumnHeader`, `ColumnResizeHandle` | query and host size |

Import Core from `@sectile/tabular/data-tree-grid`, and DOM or Vue bindings from `@sectile/dom/tabular` and `@sectile/vue/data-tree-grid`.
