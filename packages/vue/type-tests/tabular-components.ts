import { shallowRef } from 'vue';
import { defineDataTableColumns, useDataTable, type DataTableBodyProps, type DataTableCellProps, type DataTableColumnState, type DataTableHeaderRowProps, type DataTableQuery, type DataTableRootProps, type DataTableSelectionControlProps } from '@sectile/vue/data-table';
import { defineDataGridColumns, useDataGrid, type DataGridBodyProps, type DataGridCellProps, type DataGridRootExpose } from '@sectile/vue/data-grid';
import { defineDataTreeGridColumns, useDataTreeGrid, type DataTreeGridCellProps, type DataTreeGridRowDisclosureProps, type DataTreeGridSourceResolver } from '@sectile/vue/data-tree-grid';

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
const flatHeader: DataTableHeaderRowProps = {};
const automaticTableBody: DataTableBodyProps = {};
const manualGridBody: DataGridBodyProps = { manual: true };
const inheritedTableCell: DataTableCellProps = { column: 'name' };
const explicitGridCell: DataGridCellProps = { rowID: 'r1', column: 'name' };
const inheritedTreeCell: DataTreeGridCellProps = { column: 'name' };
const inheritedSelection: DataTableSelectionControlProps = { name: 'users' };
const inheritedDisclosure: DataTreeGridRowDisclosureProps = {};
void [table, tree, rootProps, expose, resolver, flatHeader, automaticTableBody, manualGridBody, inheritedTableCell, explicitGridCell, inheritedTreeCell, inheritedSelection, inheritedDisclosure];
