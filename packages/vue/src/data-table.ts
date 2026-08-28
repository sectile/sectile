import {
  getCurrentScope,
  onScopeDispose,
  toValue,
  watch,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue';
import {
  connectDataTable,
  type DataTableColumnSizeState as DOMDataTableColumnSizeState,
  type DataTableDOMCommand as DOMDataTableCommand,
  type DataTableConnection,
} from '@sectile/dom/data-table';
import {
  createDataTable,
  type DataTableCommand as SemanticDataTableCommand,
  type DataTableController as SemanticDataTableController,
  type DataTableEvent,
  type DataTableOptions as SemanticDataTableOptions,
  type DataTableProjection,
  type DataTableUpdate,
} from '@sectile/tabular/data-table';
import type {
  TabularAcceptedViewState,
  TabularAccessState,
  TabularCellRecord,
  TabularColumnDefinition,
  TabularColumnState,
  TabularError,
  TabularGroupID,
  TabularHeaderNode,
  TabularHeaderNodeID,
  TabularLimits,
  TabularQuery,
  TabularRequest,
  TabularRequestState,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularRowSelection,
  TabularSnapshot,
  TabularView,
  TabularViewResponse,
  TabularWireCells,
  TabularWireValue,
} from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
import {
  createTabularComponentSuite,
  type TabularBodyComponent,
  type TabularComponent,
} from './internal/tabular-components.js';
import {
  controlledValues,
  aliasVueProfileController,
  createVueProfileController,
  semanticController,
  useProfile,
  useProfileSource,
  type ProfileContext,
  type SourceOptions,
  type SourceResolver,
  type SourceReturn,
  type SourceStatus,
  type VueProfileController,
} from './internal/tabular-profile.js';

export interface DataTableColumn<RecordValue = unknown, ID extends string = string, CellValue extends TabularWireValue = TabularWireValue> extends TabularColumnDefinition {
  readonly id: ID;
  readonly getValue?: (record: RecordValue) => CellValue;
  readonly groupValue?: (record: RecordValue) => TabularWireValue;
  readonly aggregate?: (values: readonly CellValue[]) => TabularWireValue;
}
export type DataTableCellsFromColumns<Columns extends readonly DataTableColumn<never>[]> = Readonly<{
  [Column in Columns[number] as Column['id']]: Column extends { readonly getValue: (record: never) => infer Value }
    ? Extract<Value, TabularWireValue>
    : TabularWireValue;
}>;
export type DataTableColumnID<LeafCells extends object, GroupCells extends object = LeafCells> = Extract<keyof LeafCells | keyof GroupCells, string>;
export type DataTableCellValue<Cells extends object, Column extends string> = Column extends keyof Cells ? TabularWireCells<Cells>[Column] : TabularWireValue;
export type DataTableReactiveInput<T> = T | Ref<T> | (() => T);
export interface DataTableWritableRef<T> { value: T }
export type DataTableQuery = TabularQuery;
export type DataTableViewRow<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularRow<LeafCells, GroupCells>;
export type DataTableView<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularView<DataTableViewRow<LeafCells, GroupCells>>;
export type DataTableViewResponse<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularViewResponse<DataTableViewRow<LeafCells, GroupCells>>;
export type DataTableRowSelection = TabularRowSelection;
export type DataTableGroupID = TabularGroupID;
export type DataTableRowID = TabularRowID;
export type DataTableColumnState = TabularColumnState;
export type DataTableAccessState = TabularAccessState;
export type DataTableRequestState = TabularRequestState;
export type DataTableAcceptedViewState<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularAcceptedViewState<DataTableViewRow<LeafCells, GroupCells>>;
export type DataTableColumnSizeState = DOMDataTableColumnSizeState;
export type DataTableSourceStatus = SourceStatus;
export type DataTableSemanticCommand = SemanticDataTableCommand;
export type DataTableCommand = DOMDataTableCommand;
export type DataTableError = TabularError;
export type DataTableCommandHandler = (command: DataTableCommand) => void;
export type DataTableErrorHandler = (error: DataTableError) => void;
export type DataTableSourceErrorHandler = (error: unknown) => void;
export type DataTableStatusChangeHandler = (status: DataTableSourceStatus) => void;
export type DataTableQueryChangeHandler = (query: DataTableQuery) => void;
export type DataTableRowSelectionChangeHandler = (selection: DataTableRowSelection) => void;
export type DataTableColumnStateChangeHandler = (state: DataTableColumnState) => void;
export type DataTableAccessStateChangeHandler = (state: DataTableAccessState) => void;
export type DataTableExpansionChangeHandler = (expansion: readonly DataTableGroupID[]) => void;
export type DataTableColumnSizeChangeHandler = (state: DataTableColumnSizeState) => void;

export interface UseDataTableOptions<
  Columns extends readonly DataTableColumn<never>[] = readonly DataTableColumn<never>[],
  LeafCells extends object = DataTableCellsFromColumns<Columns>,
  GroupCells extends object = LeafCells,
> {
  readonly columns: DataTableReactiveInput<Columns>;
  readonly headers?: DataTableReactiveInput<readonly TabularHeaderNode[]>;
  readonly sourceKey?: DataTableReactiveInput<string>;
  readonly limits?: Partial<TabularLimits>;
  readonly initialView?: DataTableViewResponse<LeafCells, GroupCells>;
  readonly query?: DataTableWritableRef<DataTableQuery>;
  readonly defaultQuery?: DataTableQuery;
  readonly onQueryChange?: DataTableQueryChangeHandler;
  readonly rowSelection?: DataTableWritableRef<DataTableRowSelection>;
  readonly defaultRowSelection?: DataTableRowSelection;
  readonly onRowSelectionChange?: DataTableRowSelectionChangeHandler;
  readonly columnState?: DataTableWritableRef<DataTableColumnState>;
  readonly defaultColumnState?: DataTableColumnState;
  readonly onColumnStateChange?: DataTableColumnStateChangeHandler;
  readonly accessState?: DataTableWritableRef<DataTableAccessState>;
  readonly defaultAccessState?: DataTableAccessState;
  readonly onAccessStateChange?: DataTableAccessStateChangeHandler;
  readonly expansion?: DataTableWritableRef<readonly DataTableGroupID[]>;
  readonly defaultExpansion?: readonly DataTableGroupID[];
  readonly onExpansionChange?: DataTableExpansionChangeHandler;
  readonly columnSizeState?: DataTableWritableRef<Readonly<Record<string, number>>>;
  readonly defaultColumnSizeState?: Readonly<Record<string, number>>;
  readonly onColumnSizeStateChange?: DataTableColumnSizeChangeHandler;
}

declare const dataTableSchema: unique symbol;
export interface DataTableController<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends VueProfileController<TabularSnapshot, DataTableEvent, SemanticDataTableCommand> {
  readonly [dataTableSchema]?: { readonly leaf: LeafCells; readonly group: GroupCells };
  readonly acceptedViewState: ComputedRef<DataTableAcceptedViewState<LeafCells, GroupCells>>;
  getProjection(): DataTableProjection;
}

interface HostOptions {
  readonly columnSizes?: Readonly<Record<string, number>>;
  readonly defaultColumnSizes?: Readonly<Record<string, number>>;
  readonly onColumnSizesChange?: DataTableColumnSizeChangeHandler;
}
const hosts = new WeakMap<object, HostOptions>();

export function defineDataTableColumns<const Columns extends readonly DataTableColumn<never>[]>(columns: Columns): Columns { return columns; }

export function useDataTable<
  ExplicitLeafCells extends object | undefined = undefined,
  ExplicitGroupCells extends object | undefined = ExplicitLeafCells,
  const Columns extends readonly DataTableColumn<never>[] = readonly DataTableColumn<never>[],
  LeafCells extends object = ExplicitLeafCells extends object ? ExplicitLeafCells : DataTableCellsFromColumns<Columns>,
  GroupCells extends object = ExplicitGroupCells extends object ? ExplicitGroupCells : LeafCells,
>(options: UseDataTableOptions<Columns, LeafCells, GroupCells>): DataTableController<LeafCells, GroupCells> {
  assertExclusive(options, 'query');
  assertExclusive(options, 'rowSelection');
  assertExclusive(options, 'columnState');
  assertExclusive(options, 'accessState');
  assertExclusive(options, 'expansion');
  assertExclusive(options, 'columnSizeState');
  const initialValues = Object.freeze({
    ...(options.query === undefined && options.defaultQuery === undefined ? {} : { query: options.query?.value ?? options.defaultQuery }),
    ...(options.rowSelection === undefined && options.defaultRowSelection === undefined ? {} : { rowSelection: options.rowSelection?.value ?? options.defaultRowSelection }),
    ...(options.columnState === undefined && options.defaultColumnState === undefined ? {} : { columnState: options.columnState?.value ?? options.defaultColumnState }),
    ...(options.accessState === undefined && options.defaultAccessState === undefined ? {} : { accessState: options.accessState?.value ?? options.defaultAccessState }),
    ...(options.expansion === undefined && options.defaultExpansion === undefined ? {} : { expansion: options.expansion?.value ?? options.defaultExpansion }),
  });
  const semanticOptions: SemanticDataTableOptions = {
    columns: stripColumns(toValue(options.columns)),
    ...(options.headers === undefined ? {} : { headers: toValue(options.headers) }),
    ...(options.limits === undefined ? {} : { limits: options.limits }),
    controlled: {
      query: options.query !== undefined,
      rowSelection: options.rowSelection !== undefined,
      columnState: options.columnState !== undefined,
      accessState: options.accessState !== undefined,
      expansion: options.expansion !== undefined,
    },
    initialValues,
    ...(options.onQueryChange === undefined ? {} : { onQueryChange: options.onQueryChange }),
    ...(options.onRowSelectionChange === undefined ? {} : { onRowSelectionChange: options.onRowSelectionChange }),
    ...(options.onColumnStateChange === undefined ? {} : { onColumnStateChange: options.onColumnStateChange }),
    ...(options.onAccessStateChange === undefined ? {} : { onAccessStateChange: options.onAccessStateChange }),
    ...(options.onExpansionChange === undefined ? {} : { onExpansionChange: options.onExpansionChange }),
  };
  const semantic = createDataTable(semanticOptions);
  const base = createVueProfileController(semantic);
  const controller = Object.freeze({ ...base, getProjection: () => semantic.getProjection() }) as DataTableController<LeafCells, GroupCells>;
  aliasVueProfileController(controller, base);
  hosts.set(controller, Object.freeze({
    ...(options.columnSizeState === undefined ? {} : { columnSizes: options.columnSizeState.value }),
    ...(options.defaultColumnSizeState === undefined ? {} : { defaultColumnSizes: options.defaultColumnSizeState }),
    ...(options.onColumnSizeStateChange === undefined ? {} : { onColumnSizesChange: options.onColumnSizeStateChange }),
  }));
  if (options.initialView !== undefined) unwrapResult(controller.synchronizeView(options.initialView));
  const stops: Array<() => void> = [];
  const sync = (): void => { unwrapResult(controller.syncControlledValues(controlledValues(options))); };
  for (const source of [options.query, options.rowSelection, options.columnState, options.accessState, options.expansion]) if (source !== undefined) stops.push(watch(() => source.value, sync, { deep: false }));
  if (options.sourceKey !== undefined) stops.push(watch(() => toValue(options.sourceKey!), () => { unwrapResult(controller.dispatch({ type: 'replace-source' })); }));
  stops.push(watch(() => toValue(options.columns), () => { unwrapResult(controller.dispatch({ type: 'replace-source' })); }, { deep: false }));
  const dispose = controller.dispose;
  const wrapped = Object.freeze({ ...controller, dispose: () => { for (const stop of stops.splice(0)) stop(); dispose(); } }) as DataTableController<LeafCells, GroupCells>;
  aliasVueProfileController(wrapped, controller);
  hosts.set(wrapped, hosts.get(controller) ?? {});
  if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose);
  return wrapped;
}

export type DataTableSourceResolver<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataTableViewResponse<LeafCells, GroupCells> | Promise<DataTableViewResponse<LeafCells, GroupCells>>;
export interface UseDataTableSourceOptions { readonly onError?: DataTableSourceErrorHandler; readonly onStatusChange?: DataTableStatusChangeHandler }
export interface UseDataTableSourceReturn extends SourceReturn {}
export function useDataTableSource<LeafCells extends object, GroupCells extends object>(controller: DataTableController<LeafCells, GroupCells>, resolver: DataTableSourceResolver<LeafCells, GroupCells>, options?: UseDataTableSourceOptions): UseDataTableSourceReturn {
  return useProfileSource(controller, resolver as SourceResolver, options as SourceOptions | undefined);
}

export interface DataTableContextValue extends Omit<ProfileContext<TabularSnapshot, DataTableEvent, SemanticDataTableCommand, HostConnection>, 'connection'> {}
const publicKey: InjectionKey<ProfileContext<TabularSnapshot, DataTableEvent, SemanticDataTableCommand, HostConnection>> = Symbol('SectileDataTable');
const privateKey: InjectionKey<ProfileContext<TabularSnapshot, DataTableEvent, SemanticDataTableCommand, HostConnection>> = Symbol('SectileDataTableHost');
export function useDataTableContext(): DataTableContextValue { return useProfile(publicKey, 'useDataTableContext'); }

const parts = createTabularParts({
  profile: 'data-table', prefix: 'DataTable', publicKey, privateKey,
  connect: (element, controller, callbacks) => connectDataTable({
    controller: semanticController(controller) as SemanticDataTableController,
    table: element as HTMLTableElement,
    ...hosts.get(controller),
    ...(callbacks.onCommand === undefined ? {} : { onCommand: callbacks.onCommand as DataTableCommandHandler }),
    onSnapshotChange: callbacks.onSnapshotChange,
  }) as HostConnection,
});

export interface DataTableProviderProps {}
export interface DataTableRootProps { readonly onCommand?: DataTableCommandHandler; readonly onError?: DataTableErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataTableRootSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly acceptedViewState: DataTableAcceptedViewState<LeafCells, GroupCells>; readonly requestState: DataTableRequestState; readonly query: DataTableQuery; readonly rowSelection: DataTableRowSelection; readonly columnState: DataTableColumnState; readonly accessState: DataTableAccessState; readonly expansion: readonly DataTableGroupID[]; readonly rows: readonly DataTableViewRow<LeafCells, GroupCells>[] }
export interface DataTableRootExpose<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly controller: DataTableController<LeafCells, GroupCells>; refresh(): void }
export interface DataTablePartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export type DataTableHeaderRowProps = DataTablePartProps;
export type DataTableColumnHeaderProps<Column extends string = string> = DataTablePartProps & (
  | { readonly column: Column; readonly header?: never }
  | { readonly header: TabularHeaderNodeID; readonly column?: never }
);
export interface DataTableSortTriggerProps<Column extends string = string> extends DataTablePartProps { readonly column: Column; readonly comparator?: string }
export type DataTableFilterControlProps<Column extends string = string> = DataTablePartProps & ({ readonly scope: 'global'; readonly id: string; readonly predicate: string } | { readonly scope: 'column'; readonly column: Column; readonly id: string; readonly predicate: string });
export interface DataTableColumnResizeHandleProps<Column extends string = string> extends DataTablePartProps { readonly column: Column; readonly minSize?: number; readonly maxSize?: number }
export interface DataTableRowProps extends DataTablePartProps { readonly rowID: DataTableRowID | DataTableGroupID }
export interface DataTableSelectionControlProps extends DataTablePartProps { readonly rowID?: DataTableRowID; readonly name: string; readonly value?: string; readonly form?: string; readonly disabled?: boolean }
export interface DataTableBulkSelectionControlProps extends DataTablePartProps { readonly target: { readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: DataTableGroupID }; readonly disabled?: boolean }
export interface DataTableDisclosureProps extends DataTablePartProps { readonly rowID?: DataTableGroupID; readonly disabled?: boolean }
export interface DataTableCellProps<Column extends string = string> extends DataTablePartProps { readonly rowID?: DataTableRowID | DataTableGroupID; readonly column: Column }
export interface DataTableEditorProps<Column extends string = string> extends DataTableCellProps<Column> { readonly parseValue?: (value: string) => TabularResult<TabularWireValue>; readonly commitOnChange?: boolean }
export interface DataTablePartSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends DataTableRootSlotProps<LeafCells, GroupCells> { readonly row?: DataTableViewRow<LeafCells, GroupCells>; readonly isGroup?: boolean }
export interface DataTableBodySlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends DataTableRootSlotProps<LeafCells, GroupCells> { readonly row: DataTableViewRow<LeafCells, GroupCells>; readonly rowIndex: number; readonly isGroup: boolean }
export type DataTableProviderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>;
export type DataTableCaptionProps = DataTablePartProps;
export type DataTableHeaderProps = DataTablePartProps;
export interface DataTableBodyProps extends DataTablePartProps { readonly manual?: boolean }
export type DataTableCaptionSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableHeaderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableHeaderRowSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableColumnHeaderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableSortTriggerSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableFilterControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableColumnResizeHandleSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableRowSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableSelectionControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTablePartSlotProps<LeafCells, GroupCells>; export type DataTableBulkSelectionControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTableRootSlotProps<LeafCells, GroupCells>; export type DataTableDisclosureSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTablePartSlotProps<LeafCells, GroupCells>; export type DataTableCellSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTablePartSlotProps<LeafCells, GroupCells>; export type DataTableEditorSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTablePartSlotProps<LeafCells, GroupCells>;

export interface DataTableComponents<LeafCells extends object, GroupCells extends object = LeafCells> {
  readonly Provider: TabularComponent<DataTableProviderProps, DataTableProviderSlotProps<LeafCells, GroupCells>>;
  readonly Root: TabularComponent<DataTableRootProps, DataTableRootSlotProps<LeafCells, GroupCells>>;
  readonly Caption: TabularComponent<DataTableCaptionProps, DataTableCaptionSlotProps<LeafCells, GroupCells>>;
  readonly Header: TabularComponent<DataTableHeaderProps, DataTableHeaderSlotProps<LeafCells, GroupCells>>;
  readonly HeaderRow: TabularComponent<DataTableHeaderRowProps, DataTableHeaderRowSlotProps<LeafCells, GroupCells>>;
  readonly ColumnHeader: TabularComponent<DataTableColumnHeaderProps<DataTableColumnID<LeafCells, GroupCells>>, DataTableColumnHeaderSlotProps<LeafCells, GroupCells>>;
  readonly SortTrigger: TabularComponent<DataTableSortTriggerProps<DataTableColumnID<LeafCells, GroupCells>>, DataTableSortTriggerSlotProps<LeafCells, GroupCells>>;
  readonly FilterControl: TabularComponent<DataTableFilterControlProps<DataTableColumnID<LeafCells, GroupCells>>, DataTableFilterControlSlotProps<LeafCells, GroupCells>>;
  readonly ColumnResizeHandle: TabularComponent<DataTableColumnResizeHandleProps<DataTableColumnID<LeafCells, GroupCells>>, DataTableColumnResizeHandleSlotProps<LeafCells, GroupCells>>;
  readonly Body: TabularBodyComponent<DataTableBodyProps, DataTableRootSlotProps<LeafCells, GroupCells>, DataTableBodySlotProps<LeafCells, GroupCells>>;
  readonly Row: TabularComponent<DataTableRowProps, DataTableRowSlotProps<LeafCells, GroupCells>>;
  readonly SelectionControl: TabularComponent<DataTableSelectionControlProps, DataTableSelectionControlSlotProps<LeafCells, GroupCells>>;
  readonly BulkSelectionControl: TabularComponent<DataTableBulkSelectionControlProps, DataTableBulkSelectionControlSlotProps<LeafCells, GroupCells>>;
  readonly Disclosure: TabularComponent<DataTableDisclosureProps, DataTableDisclosureSlotProps<LeafCells, GroupCells>>;
  readonly Cell: TabularComponent<DataTableCellProps<DataTableColumnID<LeafCells, GroupCells>>, DataTableCellSlotProps<LeafCells, GroupCells>>;
  readonly Editor: TabularComponent<DataTableEditorProps<DataTableColumnID<LeafCells, GroupCells>>, DataTableEditorSlotProps<LeafCells, GroupCells>>;
}

const componentSuites = new WeakMap<object, Readonly<Record<string, Component>>>();
export function createDataTableComponents<LeafCells extends object, GroupCells extends object>(controller: DataTableController<LeafCells, GroupCells>): DataTableComponents<LeafCells, GroupCells> {
  return createTabularComponentSuite(parts, controller, componentSuites, 'DataTable', {
    Root: 'Root',
    Caption: 'Caption',
    Header: 'Header',
    HeaderRow: 'HeaderRow',
    ColumnHeader: 'ColumnHeader',
    SortTrigger: 'SortTrigger',
    FilterControl: 'FilterControl',
    ColumnResizeHandle: 'ColumnResizeHandle',
    Body: 'Body',
    Row: 'Row',
    SelectionControl: 'SelectionControl',
    BulkSelectionControl: 'BulkSelectionControl',
    Disclosure: 'Disclosure',
    Cell: 'Cell',
    Editor: 'Editor',
  }) as unknown as DataTableComponents<LeafCells, GroupCells>;
}

function stripColumns(columns: readonly DataTableColumn<never>[]): readonly TabularColumnDefinition[] {
  return columns.map(({ getValue: _getValue, groupValue: _groupValue, aggregate: _aggregate, ...column }) => Object.freeze(column));
}
function assertExclusive(options: object, property: string): void {
  const values = options as Record<string, unknown>;
  const fallback = `default${property[0]!.toUpperCase()}${property.slice(1)}`;
  if (values[property] !== undefined && values[fallback] !== undefined) throw new TypeError(`${property} and ${fallback} are mutually exclusive.`);
}
function unwrapResult<T>(result: TabularResult<T>): T { if (!result.ok) throw new TypeError(result.error.message); return result.value; }

export type { DataTableEvent, DataTableProjection, DataTableUpdate, SemanticDataTableController };
