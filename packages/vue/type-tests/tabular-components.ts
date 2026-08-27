import { shallowRef } from 'vue';
import { defineDataTableColumns, useDataTable, type DataTableColumnState, type DataTableQuery, type DataTableRootProps } from '@sectile/vue/data-table';
import { defineDataGridColumns, useDataGrid, type DataGridRootExpose } from '@sectile/vue/data-grid';
import { defineDataTreeGridColumns, useDataTreeGrid, type DataTreeGridSourceResolver } from '@sectile/vue/data-tree-grid';

interface User { readonly id: string; readonly name: string }
const tableColumns = defineDataTableColumns([{ id: 'name', getValue: (user: User) => user.name }]);
const query = shallowRef<DataTableQuery>({ sort: [], filters: [], groups: [], aggregates: [], pivots: [] });
const columnState = shallowRef<DataTableColumnState>({ order: ['name'], hidden: [], pinnedStart: [], pinnedEnd: [] });
const table = useDataTable({ columns: tableColumns, query, columnState });
const grid = useDataGrid({ columns: defineDataGridColumns([{ id: 'name', capabilities: ['edit'] }]) });
const tree = useDataTreeGrid({ columns: defineDataTreeGridColumns([{ id: 'name', capabilities: ['edit'] }]), defaultExpansion: [] });
const rootProps: DataTableRootProps = { onCommand: () => {} };
const expose: DataGridRootExpose = { controller: grid, refresh() {} };
const resolver: DataTreeGridSourceResolver = async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }], headers: [] }, removedRowIDs: [] });
void [table, tree, rootProps, expose, resolver];
