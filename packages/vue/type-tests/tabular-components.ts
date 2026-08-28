import { shallowRef } from 'vue';
import {
  defineDataTableColumns,
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
} from '../.verification-dist/data-table.js';
import {
  defineDataGridColumns,
  useDataGrid,
  createDataGridComponents,
  type DataGridBodyProps,
  type DataGridBodySlotProps,
  type DataGridCellProps,
  type DataGridRootExpose,
} from '../.verification-dist/data-grid.js';
import {
  defineDataTreeGridColumns,
  useDataTreeGrid,
  createDataTreeGridComponents,
  type DataTreeGridBodySlotProps,
  type DataTreeGridCellProps,
  type DataTreeGridRowDisclosureProps,
  type DataTreeGridSourceResolver,
} from '../.verification-dist/data-tree-grid.js';

interface User { readonly id: string; readonly name: string }
interface UserCells { readonly name: string; readonly active: boolean }
interface UserGroupCells { readonly label: string; readonly memberCount: number }

const tableColumns = defineDataTableColumns([{ id: 'name', getValue: (user: User) => user.name }]);
const query = shallowRef<DataTableQuery>({ sort: [], filters: [], groups: [], aggregates: [], pivots: [] });
const columnState = shallowRef<DataTableColumnState>({ order: ['name'], hidden: [], pinnedStart: [], pinnedEnd: [] });
const inferredTable = useDataTable({ columns: tableColumns, query, columnState });
const table = useDataTable<UserCells>({ columns: defineDataTableColumns([{ id: 'name' }, { id: 'active' }]) });
const groupedTable = useDataTable<UserCells, UserGroupCells>({ columns: defineDataTableColumns([{ id: 'name' }, { id: 'active' }]) });
const grid = useDataGrid<UserCells>({ columns: defineDataGridColumns([{ id: 'name', capabilities: ['edit'] }, { id: 'active' }]) });
const tree = useDataTreeGrid<UserCells>({ columns: defineDataTreeGridColumns([{ id: 'name', capabilities: ['edit'] }, { id: 'active' }]), defaultExpansion: [] });
const Table = createDataTableComponents(table);
const Grid = createDataGridComponents(grid);
const TreeGrid = createDataTreeGridComponents(tree);
type TableProviderProps = InstanceType<typeof Table.Provider>['$props'];
const tableProviderHasController: 'controller' extends keyof TableProviderProps ? true : false = false;

type InferredCells = typeof inferredTable extends DataTableController<infer Cells> ? Cells : never;
const inferredName: InferredCells['name'] = 'Ada';
const rootProps: DataTableRootProps = { onCommand: () => {} };
const expose: DataGridRootExpose<UserCells> = { controller: grid, refresh() {} };
const resolver: DataTreeGridSourceResolver<UserCells> = async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }, { id: 'active' }], headers: [] }, removedRowIDs: [] });
const flatHeader: DataTableHeaderRowProps = {};
const automaticTableBody: DataTableBodyProps = {};
const manualGridBody: DataGridBodyProps = { manual: true };
const inheritedTableCell: DataTableCellProps<keyof UserCells> = { column: 'name' };
const leafColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { column: 'name' };
const groupedColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { header: 'employment' };
const explicitGridCell: DataGridCellProps<keyof UserCells> = { rowID: 'r1', column: 'name' };
const inheritedTreeCell: DataTreeGridCellProps<keyof UserCells> = { column: 'name' };
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
// @ts-expect-error Bound component columns are limited to the view cell schema.
const invalidCell: DataTableCellProps<keyof UserCells> = { column: 'missing' };
// @ts-expect-error Leaf headers are limited to the view cell schema.
const invalidColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { column: 'missing' };
// @ts-expect-error A header binds either a leaf column or a schema header node, never both.
const ambiguousColumnHeader: DataTableColumnHeaderProps<keyof UserCells> = { column: 'name', header: 'employment' };
// @ts-expect-error Header depth is derived from the header schema, not a component prop.
const legacyHeaderDepth: DataTableHeaderRowProps = { depth: 0 };
void [Table, Grid, TreeGrid, groupedTable, tableProviderHasController, inferredName, rootProps, expose, resolver, flatHeader, automaticTableBody, manualGridBody, inheritedTableCell, leafColumnHeader, groupedColumnHeader, explicitGridCell, inheritedTreeCell, inheritedSelection, inheritedDisclosure, tableBodyRowIsTyped, gridBodyRowIsTyped, treeBodyRowIsTyped, bodyName, groupedValue, invalidCell, invalidColumnHeader, ambiguousColumnHeader, legacyHeaderDepth];
