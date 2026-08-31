import { getCurrentScope, onScopeDispose, toValue, watch, type Component, type ComputedRef, type InjectionKey } from 'vue';
import { connectDataGrid, type DataGridColumnSizeState as DOMDataGridColumnSizeState, type DataGridConnection, type DataGridDOMCommand } from '@sectile/dom/tabular';
import {
  createDataGrid,
  type DataGridCommand as SemanticDataGridCommand,
  type DataGridControlledValues,
  type DataGridController as SemanticDataGridController,
  type DataGridCursorState,
  type DataGridEditState,
  type DataGridEvent,
  type DataGridOptions as SemanticDataGridOptions,
  type DataGridProjection,
  type DataGridState,
  type DataGridUpdate,
} from '@sectile/tabular/data-grid';
import type { TabularAcceptedViewState, TabularAccessState, TabularCellRecord, TabularColumnState, TabularError, TabularGroupID, TabularHeaderNodeID, TabularLimits, TabularQuery, TabularRequest, TabularRequestState, TabularResult, TabularRow, TabularRowID, TabularRowSelection, TabularView, TabularViewResponse, TabularWireValue } from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import type { DataTableColumnID, DataTableGroupCellsFromSource, DataTableLeafCellsFromSource, DataTableReactiveInput, DataTableWritableRef } from './data-table.js';
import { createTabularComponentSuite, type TabularBodyComponent, type TabularComponent } from './internal/tabular-components.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
import { aliasVueProfileController, controlledValues, createVueProfileController, useProfile, useProfileSource, type ProfileContext, type SourceResolver, type SourceReturn, type SourceStatus, type VueProfileController } from './internal/tabular-profile.js';

export type DataGridQuery = TabularQuery;
export type DataGridViewRow<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularRow<LeafCells, GroupCells>;
export type DataGridView<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularView<DataGridViewRow<LeafCells, GroupCells>>;
export type DataGridViewResponse<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularViewResponse<DataGridViewRow<LeafCells, GroupCells>>;
export type DataGridRowSelection = TabularRowSelection;
export type DataGridGroupID = TabularGroupID;
export type DataGridRowID = TabularRowID;
export type DataGridColumnState = TabularColumnState;
export type DataGridAccessState = TabularAccessState;
export type DataGridRequestState = TabularRequestState;
export type DataGridAcceptedViewState<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularAcceptedViewState<DataGridViewRow<LeafCells, GroupCells>>;
export type DataGridColumnSizeState = DOMDataGridColumnSizeState;
export type DataGridSourceStatus = SourceStatus;
export type DataGridSemanticCommand = SemanticDataGridCommand;
export type DataGridCommand = DataGridDOMCommand;
export type DataGridError = TabularError;
export type DataGridCommandHandler = (command: DataGridCommand) => void;
export type DataGridErrorHandler = (error: DataGridError) => void;
export type DataGridSourceErrorHandler = (error: unknown) => void;
export type DataGridStatusChangeHandler = (status: DataGridSourceStatus) => void;
export type DataGridQueryChangeHandler = (value: DataGridQuery) => void;
export type DataGridRowSelectionChangeHandler = (value: DataGridRowSelection) => void;
export type DataGridColumnStateChangeHandler = (value: DataGridColumnState) => void;
export type DataGridAccessStateChangeHandler = (value: DataGridAccessState) => void;
export type DataGridCursorChangeHandler = (value: DataGridCursorState) => void;
export type DataGridEditStateChangeHandler = (value: DataGridEditState) => void;
export type DataGridColumnSizeChangeHandler = (value: DataGridColumnSizeState) => void;

export type DataGridSourceResolver<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataGridViewResponse<LeafCells, GroupCells> | Promise<DataGridViewResponse<LeafCells, GroupCells>>;
type DataGridSourceResponse<Source extends SourceResolver> = Awaited<ReturnType<Source>>;
export interface UseDataGridOptions<Source extends SourceResolver = DataGridSourceResolver> {
  readonly source: Source;
  readonly sourceKey?: DataTableReactiveInput<string>;
  readonly limits?: Partial<TabularLimits>;
  readonly initialView?: DataGridSourceResponse<Source>;
  readonly onSourceError?: DataGridSourceErrorHandler;
  readonly onSourceStatusChange?: DataGridStatusChangeHandler;
  readonly query?: DataTableWritableRef<DataGridQuery>; readonly defaultQuery?: DataGridQuery; readonly onQueryChange?: DataGridQueryChangeHandler;
  readonly rowSelection?: DataTableWritableRef<DataGridRowSelection>; readonly defaultRowSelection?: DataGridRowSelection; readonly onRowSelectionChange?: DataGridRowSelectionChangeHandler;
  readonly columnState?: DataTableWritableRef<DataGridColumnState>; readonly defaultColumnState?: DataGridColumnState; readonly onColumnStateChange?: DataGridColumnStateChangeHandler;
  readonly accessState?: DataTableWritableRef<DataGridAccessState>; readonly defaultAccessState?: DataGridAccessState; readonly onAccessStateChange?: DataGridAccessStateChangeHandler;
  readonly cursor?: DataTableWritableRef<DataGridCursorState>; readonly defaultCursor?: DataGridCursorState; readonly onCursorChange?: DataGridCursorChangeHandler;
  readonly editState?: DataTableWritableRef<DataGridEditState>; readonly defaultEditState?: DataGridEditState; readonly onEditStateChange?: DataGridEditStateChangeHandler;
  readonly columnSizeState?: DataTableWritableRef<Readonly<Record<string, number>>>; readonly defaultColumnSizeState?: Readonly<Record<string, number>>; readonly onColumnSizeStateChange?: DataGridColumnSizeChangeHandler;
  readonly isCellDisabled?: SemanticDataGridOptions['isCellDisabled'];
}
declare const dataGridSchema: unique symbol;
export interface DataGridController<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends VueProfileController<DataGridState, DataGridEvent, SemanticDataGridCommand, DataGridControlledValues>, SourceReturn<DataGridSourceResolver<LeafCells, GroupCells>> { readonly [dataGridSchema]?: { readonly leaf: LeafCells; readonly group: GroupCells }; readonly acceptedViewState: ComputedRef<DataGridAcceptedViewState<LeafCells, GroupCells>>; getProjection(): DataGridProjection }
interface HostOptions { readonly columnSizes?: Readonly<Record<string, number>>; readonly defaultColumnSizes?: Readonly<Record<string, number>>; readonly onColumnSizesChange?: DataGridColumnSizeChangeHandler }
const hosts = new WeakMap<object, HostOptions>();
const activeConnections = new WeakMap<object, HostConnection>();

export function useDataGrid<const Source extends SourceResolver, LeafCells extends object = DataTableLeafCellsFromSource<Source>, GroupCells extends object = DataTableGroupCellsFromSource<Source>>(options: UseDataGridOptions<Source>): DataGridController<LeafCells, GroupCells> {
  for (const property of ['query', 'rowSelection', 'columnState', 'accessState', 'cursor', 'editState', 'columnSizeState']) assertExclusive(options, property);
  const semantic = createDataGrid({
    columns: options.initialView?.columnSchema.columns ?? [],
    headers: options.initialView?.columnSchema.headers ?? [],
    ...(options.limits === undefined ? {} : { limits: options.limits }),
    ...(options.isCellDisabled === undefined ? {} : { isCellDisabled: options.isCellDisabled }),
    controlled: { query: options.query !== undefined, rowSelection: options.rowSelection !== undefined, columnState: options.columnState !== undefined, accessState: options.accessState !== undefined, expansion: false, cursor: options.cursor !== undefined, edit: options.editState !== undefined },
    initialValues: {
      ...(options.query === undefined && options.defaultQuery === undefined ? {} : { query: options.query?.value ?? options.defaultQuery }),
      ...(options.rowSelection === undefined && options.defaultRowSelection === undefined ? {} : { rowSelection: options.rowSelection?.value ?? options.defaultRowSelection }),
      ...(options.columnState === undefined && options.defaultColumnState === undefined ? {} : { columnState: options.columnState?.value ?? options.defaultColumnState }),
      ...(options.accessState === undefined && options.defaultAccessState === undefined ? {} : { accessState: options.accessState?.value ?? options.defaultAccessState }),
      ...(options.cursor === undefined && options.defaultCursor === undefined ? {} : { cursor: options.cursor?.value ?? options.defaultCursor }),
      ...(options.editState === undefined && options.defaultEditState === undefined ? {} : { edit: options.editState?.value ?? options.defaultEditState }),
    },
    ...(options.onQueryChange === undefined ? {} : { onQueryChange: options.onQueryChange }),
    ...(options.onRowSelectionChange === undefined ? {} : { onRowSelectionChange: options.onRowSelectionChange }),
    ...(options.onColumnStateChange === undefined ? {} : { onColumnStateChange: options.onColumnStateChange }),
    ...(options.onAccessStateChange === undefined ? {} : { onAccessStateChange: options.onAccessStateChange }),
    ...(options.onCursorChange === undefined ? {} : { onCursorChange: options.onCursorChange }),
    ...(options.onEditStateChange === undefined ? {} : { onEditStateChange: options.onEditStateChange }),
  });
  const base = createVueProfileController(semantic);
  const controller = Object.freeze({
    ...base,
    getProjection: () => semantic.getProjection(),
  });
  aliasVueProfileController(controller, base);
  hosts.set(controller, Object.freeze({ ...(options.columnSizeState === undefined ? {} : { columnSizes: options.columnSizeState.value }), ...(options.defaultColumnSizeState === undefined ? {} : { defaultColumnSizes: options.defaultColumnSizeState }), ...(options.onColumnSizeStateChange === undefined ? {} : { onColumnSizesChange: options.onColumnSizeStateChange }) }));
  if (options.initialView !== undefined) unwrap(controller.synchronizeView(options.initialView as DataGridViewResponse<LeafCells, GroupCells>));
  const source = useProfileSource(controller, options.source, {
    ...(options.onSourceError === undefined ? {} : { onError: options.onSourceError }),
    ...(options.onSourceStatusChange === undefined ? {} : { onStatusChange: options.onSourceStatusChange }),
  });
  const stops: Array<() => void> = [];
  const sync = () => unwrap(controller.syncControlledValues(gridControlledValues(options)));
  for (const source of [options.query, options.rowSelection, options.columnState, options.accessState, options.cursor, options.editState]) if (source !== undefined) stops.push(watch(() => source.value, sync));
  if (options.sourceKey !== undefined) stops.push(watch(() => toValue(options.sourceKey!), () => { unwrap(controller.dispatch({ type: 'replace-source' })); }));
  const rawDispose = controller.dispose;
  const wrapped = Object.freeze({ ...controller, status: source.status, error: source.error, reload: source.reload, cancel: source.cancel, replaceResolver: (resolver: DataGridSourceResolver<LeafCells, GroupCells>) => source.replaceResolver(resolver as SourceResolver), dispose: () => { for (const stop of stops.splice(0)) stop(); source.dispose(); rawDispose(); } }) as DataGridController<LeafCells, GroupCells>;
  aliasVueProfileController(wrapped, controller); hosts.set(wrapped, hosts.get(controller) ?? {});
  if (options.columnSizeState !== undefined) stops.push(watch(() => options.columnSizeState!.value, (value) => {
    hosts.set(wrapped, Object.freeze({ ...hosts.get(wrapped), columnSizes: value }));
    const result = activeConnections.get(wrapped)?.syncControlledValues?.({ ...gridControlledValues(options), columnSizes: value });
    if (result !== undefined && !result.ok) throw new TypeError('Controlled DataGrid column sizes failed to synchronize.');
  }, { deep: false }));
  if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose);
  return wrapped;
}

export interface DataGridContextValue extends Omit<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>, 'connection'> {}
const publicKey: InjectionKey<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>> = Symbol('SectileDataGrid');
const privateKey: InjectionKey<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>> = Symbol('SectileDataGridHost');
export function useDataGridContext(): DataGridContextValue { return useProfile(publicKey, 'useDataGridContext'); }
const parts = createTabularParts({ profile: 'data-grid', prefix: 'DataGrid', publicKey, privateKey, connect: (element, controller, callbacks) => connectDataGrid({ controller: controller as DataGridController, root: element, ...hosts.get(controller), ...(callbacks.onCommand === undefined ? {} : { onCommand: callbacks.onCommand as DataGridCommandHandler }), onSnapshotChange: callbacks.onSnapshotChange }) as unknown as HostConnection, connectionChanged: (controller, connection) => { if (connection === null) activeConnections.delete(controller); else activeConnections.set(controller, connection); } });

function gridControlledValues(options: UseDataGridOptions): DataGridControlledValues {
  return Object.freeze({
    ...controlledValues(options),
    ...(options.cursor === undefined ? {} : { cursor: options.cursor.value }),
    ...(options.editState === undefined ? {} : { edit: options.editState.value }),
  });
}

export interface DataGridProviderProps {}
export interface DataGridRootProps { readonly onCommand?: DataGridCommandHandler; readonly onError?: DataGridErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataGridRootSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly acceptedViewState: DataGridAcceptedViewState<LeafCells, GroupCells>; readonly requestState: DataGridRequestState; readonly query: DataGridQuery; readonly rowSelection: DataGridRowSelection; readonly columnState: DataGridColumnState; readonly accessState: DataGridAccessState; readonly cursor: DataGridCursorState; readonly editState: DataGridEditState; readonly rows: readonly DataGridViewRow<LeafCells, GroupCells>[] }
export interface DataGridRootExpose<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly controller: DataGridController<LeafCells, GroupCells>; refresh(): void }
export interface DataGridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export type DataGridHeaderRowProps = DataGridPartProps;
export type DataGridColumnHeaderProps<Column extends string = string> = DataGridPartProps & (
  | { readonly column: Column; readonly header?: never }
  | { readonly header: TabularHeaderNodeID; readonly column?: never }
);
export interface DataGridSortTriggerProps<Column extends string = string> extends DataGridPartProps { readonly column: Column; readonly comparator?: string }
export type DataGridFilterControlProps<Column extends string = string> = DataGridPartProps & ({ readonly scope: 'global'; readonly id: string; readonly predicate: string } | { readonly scope: 'column'; readonly column: Column; readonly id: string; readonly predicate: string });
export interface DataGridColumnResizeHandleProps<Column extends string = string> extends DataGridPartProps { readonly column: Column; readonly minSize?: number; readonly maxSize?: number }
export interface DataGridRowProps extends DataGridPartProps { readonly rowID: DataGridRowID }
export interface DataGridRowSelectionControlProps extends DataGridPartProps { readonly rowID?: DataGridRowID; readonly name: string; readonly value?: string; readonly form?: string; readonly disabled?: boolean }
export interface DataGridBulkSelectionControlProps extends DataGridPartProps { readonly target: { readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: DataGridGroupID }; readonly disabled?: boolean }
export interface DataGridCellProps<Column extends string = string> extends DataGridPartProps { readonly rowID?: DataGridRowID; readonly column: Column }
export interface DataGridEditorProps<Column extends string = string> extends DataGridCellProps<Column> { readonly parseValue?: (value: string) => TabularResult<TabularWireValue>; readonly commitOnChange?: boolean }
export type DataGridHeaderProps = DataGridPartProps; export interface DataGridBodyProps extends DataGridPartProps { readonly manual?: boolean } export interface DataGridPartSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends DataGridRootSlotProps<LeafCells, GroupCells> { readonly row?: DataGridViewRow<LeafCells, GroupCells>; readonly isGroup?: boolean } export type DataGridProviderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>;
export interface DataGridBodySlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends DataGridRootSlotProps<LeafCells, GroupCells> { readonly row: DataGridViewRow<LeafCells, GroupCells>; readonly rowIndex: number; readonly isGroup: boolean }
export type DataGridHeaderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridHeaderRowSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridColumnHeaderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridSortTriggerSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridFilterControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridColumnResizeHandleSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridRowSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridRowSelectionControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridPartSlotProps<LeafCells, GroupCells>; export type DataGridBulkSelectionControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridRootSlotProps<LeafCells, GroupCells>; export type DataGridCellSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridPartSlotProps<LeafCells, GroupCells>; export type DataGridEditorSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataGridPartSlotProps<LeafCells, GroupCells>;

export interface DataGridComponents<LeafCells extends object, GroupCells extends object = LeafCells> {
  readonly Provider: TabularComponent<DataGridProviderProps, DataGridProviderSlotProps<LeafCells, GroupCells>>;
  readonly Root: TabularComponent<DataGridRootProps, DataGridRootSlotProps<LeafCells, GroupCells>>;
  readonly Header: TabularComponent<DataGridHeaderProps, DataGridHeaderSlotProps<LeafCells, GroupCells>>;
  readonly HeaderRow: TabularComponent<DataGridHeaderRowProps, DataGridHeaderRowSlotProps<LeafCells, GroupCells>>;
  readonly ColumnHeader: TabularComponent<DataGridColumnHeaderProps<DataTableColumnID<LeafCells, GroupCells>>, DataGridColumnHeaderSlotProps<LeafCells, GroupCells>>;
  readonly SortTrigger: TabularComponent<DataGridSortTriggerProps<DataTableColumnID<LeafCells, GroupCells>>, DataGridSortTriggerSlotProps<LeafCells, GroupCells>>;
  readonly FilterControl: TabularComponent<DataGridFilterControlProps<DataTableColumnID<LeafCells, GroupCells>>, DataGridFilterControlSlotProps<LeafCells, GroupCells>>;
  readonly ColumnResizeHandle: TabularComponent<DataGridColumnResizeHandleProps<DataTableColumnID<LeafCells, GroupCells>>, DataGridColumnResizeHandleSlotProps<LeafCells, GroupCells>>;
  readonly Body: TabularBodyComponent<DataGridBodyProps, DataGridRootSlotProps<LeafCells, GroupCells>, DataGridBodySlotProps<LeafCells, GroupCells>>;
  readonly Row: TabularComponent<DataGridRowProps, DataGridRowSlotProps<LeafCells, GroupCells>>;
  readonly RowSelectionControl: TabularComponent<DataGridRowSelectionControlProps, DataGridRowSelectionControlSlotProps<LeafCells, GroupCells>>;
  readonly BulkSelectionControl: TabularComponent<DataGridBulkSelectionControlProps, DataGridBulkSelectionControlSlotProps<LeafCells, GroupCells>>;
  readonly Cell: TabularComponent<DataGridCellProps<DataTableColumnID<LeafCells, GroupCells>>, DataGridCellSlotProps<LeafCells, GroupCells>>;
  readonly Editor: TabularComponent<DataGridEditorProps<DataTableColumnID<LeafCells, GroupCells>>, DataGridEditorSlotProps<LeafCells, GroupCells>>;
}

const componentSuites = new WeakMap<object, Readonly<Record<string, Component>>>();
export function createDataGridComponents<LeafCells extends object, GroupCells extends object>(controller: DataGridController<LeafCells, GroupCells>): DataGridComponents<LeafCells, GroupCells> {
  return createTabularComponentSuite(parts, controller, componentSuites, 'DataGrid', {
    Root: 'Root',
    Header: 'Header',
    HeaderRow: 'HeaderRow',
    ColumnHeader: 'ColumnHeader',
    SortTrigger: 'SortTrigger',
    FilterControl: 'FilterControl',
    ColumnResizeHandle: 'ColumnResizeHandle',
    Body: 'Body',
    Row: 'Row',
    RowSelectionControl: 'SelectionControl',
    BulkSelectionControl: 'BulkSelectionControl',
    Cell: 'Cell',
    Editor: 'Editor',
  }) as unknown as DataGridComponents<LeafCells, GroupCells>;
}

function assertExclusive(options: object, property: string): void { const values = options as Record<string, unknown>; const fallback = `default${property[0]!.toUpperCase()}${property.slice(1)}`; if (values[property] !== undefined && values[fallback] !== undefined) throw new TypeError(`${property} and ${fallback} are mutually exclusive.`); }
function unwrap<T>(result: TabularResult<T>): T { if (!result.ok) throw new TypeError(result.error.message); return result.value; }
export type { DataGridCursorState, DataGridEditState, DataGridEvent, DataGridProjection, DataGridState, DataGridUpdate, SemanticDataGridController };
