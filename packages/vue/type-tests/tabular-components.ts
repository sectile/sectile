import { shallowRef } from 'vue';
import { getAllMatchingSelectionState } from '@sectile/tabular/data-table';
import type { TabularBulkSelectionState } from '@sectile/tabular';
import { projectTabularHeaders, type TabularHeaderLayout } from '@sectile/tabular/model';
const headerLayout: readonly TabularHeaderLayout[] = projectTabularHeaders({ columns: [{ id: 'name' }], headers: [] }, new Map([['name', 1]]));
// @ts-expect-error accepted header layout is readonly
headerLayout[0]!.colSpan = 2;
import {
  useDataTable,
  createDataTableComponents,
  type DataTableBodyProps,
  type DataTableBodySlotProps,
  type DataTableCellProps,
  type DataTableColumnHeaderProps,
  type DataTableColumnState,
  type DataTableController,
  type DataTableHeaderRowProps,
  type DataTableQuery,
  type DataTableRootProps,
  type DataTableSelectionControlProps,
} from '@sectile/vue/data-table';
import {
  useDataGrid,
  createDataGridComponents,
  type DataGridBodyProps,
  type DataGridBodySlotProps,
  type DataGridCellProps,
  type DataGridRootExpose,
} from '@sectile/vue/data-grid';
import {
  useDataTreeGrid,
  createDataTreeGridComponents,
  type DataTreeGridBodySlotProps,
  type DataTreeGridCellProps,
  type DataTreeGridRowDisclosureProps,
  type DataTreeGridSourceResolver,
} from '@sectile/vue/data-tree-grid';

interface UserCells { readonly name: string; readonly active: boolean; readonly profile: { readonly name: string }; readonly items: readonly { readonly price: number }[] }
interface UserGroupCells { readonly label: string; readonly memberCount: number }

const query = shallowRef<DataTableQuery>({ sort: [], filters: [], groups: [], aggregates: [], pivots: [] });
const columnState = shallowRef<DataTableColumnState>({ order: ['name'], hidden: [], pinnedStart: [], pinnedEnd: [] });
const inferredTable = useDataTable({
  query,
  columnState,
  source: async (request) => ({
    ...request,
    viewRevision: 1,
    matchingLeafCount: { kind: 'known', value: 1 },
    visibleRowCount: { kind: 'known', value: 1 },
    rows: [{ kind: 'leaf', id: 'u1', cells: { name: 'Ada', active: true, profile: { name: 'Ada' }, items: [{ price: 10 }] } }],
    columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }, { id: 'active' }, { id: 'profile.name' }, { id: 'items[0].price' }], headers: [] },
    removedRowIDs: [],
  }),
});
const table = inferredTable;
const bulkState: TabularBulkSelectionState = getAllMatchingSelectionState(table.getSnapshot());
const validBulkStates: readonly TabularBulkSelectionState[] = ['unchecked', 'indeterminate', 'checked'];
// @ts-expect-error portable state uses the indeterminate value, not an ARIA token
const invalidBulkState: TabularBulkSelectionState = 'mixed';
// @ts-expect-error an aggregate result is not guaranteed to be fully checked
const uncheckedNarrowing: 'checked' = getAllMatchingSelectionState(table.getSnapshot());
// @ts-expect-error the getter consumes a profile snapshot, not a raw selection
getAllMatchingSelectionState({ kind: 'explicit-rows', rowIDs: [] });
void bulkState; void validBulkStates; void invalidBulkState; void uncheckedNarrowing;
const groupedTable = useDataTable({ source: async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 1 }, visibleRowCount: { kind: 'known', value: 2 }, rows: [{ kind: 'leaf', id: 'u1', cells: { name: 'Ada', active: true, profile: { name: 'Ada' }, items: [{ price: 10 }] } }, { kind: 'group', id: 'g1', parentGroupID: null, depth: 0, expanded: true, cells: { label: 'People', memberCount: 1 } }], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }, { id: 'label' }], headers: [] }, removedRowIDs: [] }) });
const grid = useDataGrid({ source: async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 1 }, visibleRowCount: { kind: 'known', value: 1 }, rows: [{ kind: 'leaf', id: 'u1', cells: { name: 'Ada', active: true, profile: { name: 'Ada' }, items: [{ price: 10 }] } }], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name', capabilities: ['edit'] }, { id: 'active' }], headers: [] }, removedRowIDs: [] }) });
const tree = useDataTreeGrid({ source: async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 1 }, visibleRowCount: { kind: 'known', value: 1 }, rows: [{ kind: 'leaf', id: 'u1', cells: { name: 'Ada', active: true, profile: { name: 'Ada' }, items: [{ price: 10 }] } }], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name', capabilities: ['edit'] }, { id: 'active' }], headers: [] }, removedRowIDs: [] }), defaultExpansion: [] });
const Table = createDataTableComponents(table);
const Grid = createDataGridComponents(grid);
const acceptedGridSizes: Readonly<Record<string, number>> = grid.columnSizes.value;
// @ts-expect-error accepted size publication is readonly
grid.columnSizes.value = {};
// @ts-expect-error accepted size entries are readonly
grid.columnSizes.value.name = 100;
void acceptedGridSizes;
const TreeGrid = createDataTreeGridComponents(tree);
const acceptedTableSizes: Readonly<Record<string, number>> = table.columnSizes.value;
const acceptedTreeSizes: Readonly<Record<string, number>> = tree.columnSizes.value;
// @ts-expect-error accepted size publication is readonly
table.columnSizes.value = {};
// @ts-expect-error accepted size publication is readonly
tree.columnSizes.value = {};
void acceptedTableSizes; void acceptedTreeSizes;
type TableProviderProps = InstanceType<typeof Table.Provider>['$props'];
const tableProviderHasController: 'controller' extends keyof TableProviderProps ? true : false = false;

type InferredCells = typeof inferredTable extends DataTableController<infer Cells> ? Cells : never;
const inferredName: InferredCells['name'] = 'Ada';
const rootProps: DataTableRootProps = { onCommand: () => {} };
const expose: DataGridRootExpose<UserCells> = { controller: grid, refresh() {} };
const resolver: DataTreeGridSourceResolver<UserCells> = async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }, { id: 'active' }], headers: [] }, removedRowIDs: [] });
const flatHeader: DataTableHeaderRowProps = {};
const automaticTableBody: DataTableBodyProps = { rowAttributes: { class: 'shipment-row' } };
const manualGridBody: DataGridBodyProps = { manual: true, rowAttributes: { 'data-density': 'compact' } };
const inheritedTableCell: DataTableCellProps<keyof UserCells> = { column: 'name' };
const leafColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { column: 'name' };
const groupedColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { header: 'employment' };
const explicitGridCell: DataGridCellProps<keyof UserCells> = { rowID: 'r1', column: 'name' };
const inheritedTreeCell: DataTreeGridCellProps<keyof UserCells> = { column: 'name' };
const nestedObjectCell: InstanceType<typeof Table.Cell>['$props'] = { column: 'profile.name' };
const nestedArrayCell: InstanceType<typeof Table.Cell>['$props'] = { column: 'items[0].price' };
const inheritedSelection: DataTableSelectionControlProps = { name: 'users' };
const inheritedDisclosure: DataTreeGridRowDisclosureProps = {};
type IsAny<Value> = 0 extends (1 & Value) ? true : false;
type TableBodyRow = DataTableBodySlotProps<UserCells>['row'];
type GridBodyRow = DataGridBodySlotProps<UserCells>['row'];
type TreeBodyRow = DataTreeGridBodySlotProps<UserCells>['row'];
type GroupedTableRow = DataTableBodySlotProps<UserCells, UserGroupCells>['row'];
const tableBodyRowIsTyped: IsAny<TableBodyRow> = false;
const gridBodyRowIsTyped: IsAny<GridBodyRow> = false;
const treeBodyRowIsTyped: IsAny<TreeBodyRow> = false;
const bodyName: string = {} as TableBodyRow['cells']['name'];
const groupedValue = (row: GroupedTableRow): string | number => row.kind === 'leaf' ? row.cells.name : row.cells.memberCount;
// @ts-expect-error Bound component paths are inferred from source row cells.
const invalidNestedCell: InstanceType<typeof Table.Cell>['$props'] = { column: 'items.price' };
// @ts-expect-error Bound component columns are limited to the view cell schema.
const invalidCell: DataTableCellProps<keyof UserCells> = { column: 'missing' };
// @ts-expect-error Leaf headers are limited to the view cell schema.
const invalidColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { column: 'missing' };
// @ts-expect-error A header binds either a leaf column or a schema header node, never both.
const ambiguousColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { column: 'name', header: 'employment' };
// @ts-expect-error Header depth is derived from the header schema, not a component prop.
const legacyHeaderDepth: DataTableHeaderRowProps = { depth: 0 };
void [Table, Grid, TreeGrid, groupedTable, tableProviderHasController, inferredName, rootProps, expose, resolver, flatHeader, automaticTableBody, manualGridBody, inheritedTableCell, leafColumnHeader, groupedColumnHeader, explicitGridCell, inheritedTreeCell, nestedObjectCell, nestedArrayCell, invalidNestedCell, inheritedSelection, inheritedDisclosure, tableBodyRowIsTyped, gridBodyRowIsTyped, treeBodyRowIsTyped, bodyName, groupedValue, invalidCell, invalidColumnHeader, ambiguousColumnHeader, legacyHeaderDepth];
