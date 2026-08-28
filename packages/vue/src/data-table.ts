import {
  getCurrentScope,
  onScopeDispose,
  toValue,
  watch,
  type AllowedComponentProps,
  type ComponentCustomProps,
  type DefineComponent,
  type InjectionKey,
  type Ref,
  type VNodeChild,
  type VNodeProps,
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
  TabularWireValue,
} from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
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
export type DataTableReactiveInput<T> = T | Ref<T> | (() => T);
export interface DataTableWritableRef<T> { value: T }
export type DataTableQuery = TabularQuery;
export type DataTableView = TabularView;
export type DataTableViewResponse = TabularViewResponse;
export type DataTableViewRow = TabularRow;
export type DataTableRowSelection = TabularRowSelection;
export type DataTableGroupID = TabularGroupID;
export type DataTableRowID = TabularRowID;
export type DataTableColumnState = TabularColumnState;
export type DataTableAccessState = TabularAccessState;
export type DataTableRequestState = TabularRequestState;
export type DataTableAcceptedViewState = TabularAcceptedViewState;
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

export interface UseDataTableOptions<RecordValue = unknown> {
  readonly columns: DataTableReactiveInput<readonly DataTableColumn<RecordValue>[]>;
  readonly headers?: DataTableReactiveInput<readonly TabularHeaderNode[]>;
  readonly sourceKey?: DataTableReactiveInput<string>;
  readonly limits?: Partial<TabularLimits>;
  readonly initialView?: DataTableViewResponse;
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

export interface DataTableController extends VueProfileController<TabularSnapshot, DataTableEvent, SemanticDataTableCommand> {
  getProjection(): DataTableProjection;
}

interface HostOptions {
  readonly columnSizes?: Readonly<Record<string, number>>;
  readonly defaultColumnSizes?: Readonly<Record<string, number>>;
  readonly onColumnSizesChange?: DataTableColumnSizeChangeHandler;
}
const hosts = new WeakMap<object, HostOptions>();

export function defineDataTableColumns<const Columns extends readonly DataTableColumn<never>[]>(columns: Columns): Columns { return columns; }

export function useDataTable(options: UseDataTableOptions<never>): DataTableController {
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
  const controller: DataTableController = Object.freeze({ ...base, getProjection: () => semantic.getProjection() });
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
  const wrapped = Object.freeze({ ...controller, dispose: () => { for (const stop of stops.splice(0)) stop(); dispose(); } }) as DataTableController;
  aliasVueProfileController(wrapped, controller);
  hosts.set(wrapped, hosts.get(controller) ?? {});
  if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose);
  return wrapped;
}

export type DataTableSourceResolver = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataTableViewResponse | Promise<DataTableViewResponse>;
export interface UseDataTableSourceOptions { readonly onError?: DataTableSourceErrorHandler; readonly onStatusChange?: DataTableStatusChangeHandler }
export interface UseDataTableSourceReturn extends SourceReturn {}
export function useDataTableSource(controller: DataTableController, resolver: DataTableSourceResolver, options?: UseDataTableSourceOptions): UseDataTableSourceReturn {
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

export interface DataTableProviderProps { readonly controller: DataTableController }
export interface DataTableRootProps { readonly onCommand?: DataTableCommandHandler; readonly onError?: DataTableErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataTableRootSlotProps { readonly acceptedViewState: DataTableAcceptedViewState; readonly requestState: DataTableRequestState; readonly query: DataTableQuery; readonly rowSelection: DataTableRowSelection; readonly columnState: DataTableColumnState; readonly accessState: DataTableAccessState; readonly expansion: readonly DataTableGroupID[]; readonly rows: readonly DataTableViewRow[] }
export interface DataTableRootExpose { readonly controller: DataTableController; refresh(): void }
export interface DataTablePartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export type DataTableHeaderRowProps = DataTablePartProps;
export interface DataTableColumnHeaderProps extends DataTablePartProps { readonly headerNodeID: TabularHeaderNodeID }
export interface DataTableSortTriggerProps extends DataTablePartProps { readonly column: string; readonly comparator?: string }
export type DataTableFilterControlProps = DataTablePartProps & ({ readonly scope: 'global'; readonly id: string; readonly predicate: string } | { readonly scope: 'column'; readonly column: string; readonly id: string; readonly predicate: string });
export interface DataTableColumnResizeHandleProps extends DataTablePartProps { readonly column: string; readonly minSize?: number; readonly maxSize?: number }
export interface DataTableRowProps extends DataTablePartProps { readonly rowID: DataTableRowID | DataTableGroupID }
export interface DataTableSelectionControlProps extends DataTablePartProps { readonly rowID?: DataTableRowID; readonly name: string; readonly value?: string; readonly form?: string; readonly disabled?: boolean }
export interface DataTableBulkSelectionControlProps extends DataTablePartProps { readonly target: { readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: DataTableGroupID }; readonly disabled?: boolean }
export interface DataTableDisclosureProps extends DataTablePartProps { readonly rowID?: DataTableGroupID; readonly disabled?: boolean }
export interface DataTableCellProps extends DataTablePartProps { readonly rowID?: DataTableRowID | DataTableGroupID; readonly column: string }
export interface DataTableEditorProps extends DataTableCellProps { readonly parseValue?: (value: string) => TabularResult<TabularWireValue>; readonly commitOnChange?: boolean }
export interface DataTablePartSlotProps extends DataTableRootSlotProps { readonly row?: DataTableViewRow; readonly isGroup?: boolean }
export interface DataTableBodySlotProps extends DataTableRootSlotProps { readonly row: DataTableViewRow; readonly rowIndex: number; readonly isGroup: boolean }
export type DataTableProviderSlotProps = DataTableRootSlotProps;
export type DataTableCaptionProps = DataTablePartProps;
export type DataTableHeaderProps = DataTablePartProps;
export interface DataTableBodyProps extends DataTablePartProps { readonly manual?: boolean }
export type DataTableBodyPublicProps = DataTableBodyProps & VNodeProps & AllowedComponentProps & ComponentCustomProps;
export interface DataTableBodyComponent {
  new <Manual extends boolean = false>(props: Omit<DataTableBodyPublicProps, 'manual'> & { readonly manual?: Manual }): {
    $props: Omit<DataTableBodyPublicProps, 'manual'> & { readonly manual?: Manual };
    $slots: {
      default?: (props: Manual extends true ? DataTableRootSlotProps : DataTableBodySlotProps) => VNodeChild;
      empty?: (props: DataTableRootSlotProps) => VNodeChild;
    };
  };
}
export type DataTableCaptionSlotProps = DataTableRootSlotProps; export type DataTableHeaderSlotProps = DataTableRootSlotProps; export type DataTableHeaderRowSlotProps = DataTableRootSlotProps; export type DataTableColumnHeaderSlotProps = DataTableRootSlotProps; export type DataTableSortTriggerSlotProps = DataTableRootSlotProps; export type DataTableFilterControlSlotProps = DataTableRootSlotProps; export type DataTableColumnResizeHandleSlotProps = DataTableRootSlotProps; export type DataTableRowSlotProps = DataTableRootSlotProps; export type DataTableSelectionControlSlotProps = DataTablePartSlotProps; export type DataTableBulkSelectionControlSlotProps = DataTableRootSlotProps; export type DataTableDisclosureSlotProps = DataTablePartSlotProps; export type DataTableCellSlotProps = DataTablePartSlotProps; export type DataTableEditorSlotProps = DataTablePartSlotProps;

export const DataTableProvider = parts['Provider'] as DefineComponent<DataTableProviderProps>;
export const DataTableRoot = parts['Root'] as DefineComponent<DataTableRootProps>;
export const DataTableCaption = parts['Caption'] as DefineComponent<DataTableCaptionProps>;
export const DataTableHeader = parts['Header'] as DefineComponent<DataTableHeaderProps>;
export const DataTableHeaderRow = parts['HeaderRow'] as DefineComponent<DataTableHeaderRowProps>;
export const DataTableColumnHeader = parts['ColumnHeader'] as DefineComponent<DataTableColumnHeaderProps>;
export const DataTableSortTrigger = parts['SortTrigger'] as DefineComponent<DataTableSortTriggerProps>;
export const DataTableFilterControl = parts['FilterControl'] as DefineComponent<DataTableFilterControlProps>;
export const DataTableColumnResizeHandle = parts['ColumnResizeHandle'] as DefineComponent<DataTableColumnResizeHandleProps>;
export const DataTableBody = parts['Body'] as unknown as DataTableBodyComponent;
export const DataTableRow = parts['Row'] as DefineComponent<DataTableRowProps>;
export const DataTableSelectionControl = parts['SelectionControl'] as DefineComponent<DataTableSelectionControlProps>;
export const DataTableBulkSelectionControl = parts['BulkSelectionControl'] as DefineComponent<DataTableBulkSelectionControlProps>;
export const DataTableDisclosure = parts['Disclosure'] as DefineComponent<DataTableDisclosureProps>;
export const DataTableCell = parts['Cell'] as DefineComponent<DataTableCellProps>;
export const DataTableEditor = parts['Editor'] as DefineComponent<DataTableEditorProps>;

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
