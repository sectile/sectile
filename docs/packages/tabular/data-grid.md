<script setup>
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# DataGrid

DataGrid is a two-dimensional workspace where cells are the task. Use it for arrow-key navigation, roving focus, cell editing, and deterministic recovery. Choose [DataTable](./data-table) when reading and selecting rows is the primary interaction.

<TabularExample kind="grid-overview" />

## Navigate cells with the keyboard

Only one cell participates in the tab order. Arrow keys move the cursor, Home and End move to row boundaries, and PageUp/PageDown move relative to the access window. Core emits reveal and focus commands for off-screen targets instead of touching the platform.

<TabularExample kind="grid-navigation" />

When a new view removes the active row or column, the cursor recovers to a nearby row in the same column, a nearby column in the same row, or the first focusable cell. Core, DOM, and Vue share this rule.

## Edit, commit, or cancel

Enter or an input action switches from navigation mode to edit mode. Commit produces a typed command; Escape restores the original value and cursor. The application owns persistence and validation copy.

<TabularExample kind="grid-editing" />

- `Editor` can wrap a native input, select, or textarea.
- A parser returns a wire value or a structured error.
- Editor recovery remains deterministic when a new view arrives during editing.
- Reload the source after persistence or synchronize an optimistic view.

## Select rows independently from the cursor

The cell cursor answers “where am I working?” while row selection answers “which records receive a bulk action?”. They are independent, and row checkboxes support anchored Shift ranges.

<TabularExample kind="grid-selection" />

The range follows visible leaf-row order. A new sort or filter establishes a new order, while group and context rows are excluded.

## Query server data

DataGrid shares DataTable's query and source contract. Sort and filter controls request a view rather than rearranging mounted cells. A server resolves the query and page/window access into a response envelope.

Use the [async source example](./data-source) to inspect retained results while loading, cancellation, stale-response rejection, and retry.

## Columns and large data

Column order, visibility, and pinning are controller state. Pixel size and scrolling are host state. Ordinary grids do not need virtualization; compose the consumer-installed `@sectile/virtual` only for genuinely large surfaces. See [optional virtualization](./virtual).

## Find a public part

| Goal | Vue part | Primary state or behavior |
| --- | --- | --- |
| Grid boundary | `Root` | cursor, edit mode, command boundary |
| Headers | `Header`, `HeaderRow`, `ColumnHeader` | query and column metadata |
| Cells | `Body`, `Row`, `Cell` | roving tabindex, active cell |
| Editing | `Editor` | begin, commit, cancel, restore |
| Row selection | `RowSelectionControl`, `BulkSelectionControl` | explicit/range/all-matching |
| Column size | `ColumnResizeHandle` | host size state |

Import Core from `@sectile/tabular/data-grid`, and DOM or Vue bindings from `@sectile/dom/tabular` and `@sectile/vue/data-grid`. See [DOM](./dom) and [Vue](./vue) for composition details.
