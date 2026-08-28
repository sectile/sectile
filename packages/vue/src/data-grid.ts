import { getCurrentScope, onScopeDispose, toValue, watch, type Component, type ComputedRef, type InjectionKey } from 'vue';
import { connectDataGrid, type DataGridColumnSizeState as DOMDataGridColumnSizeState, type DataGridConnection, type DataGridDOMCommand } from '@sectile/dom/data-grid';
import {
  createDataGrid,
  type DataGridCommand as SemanticDataGridCommand,
  type DataGridController as SemanticDataGridController,
  type DataGridCursorState,
  type DataGridEditState,
  type DataGridEvent,
  type DataGridOptions as SemanticDataGridOptions,
  type DataGridProjection,
  type DataGridState,
  type DataGridUpdate,
} from '@sectile/tabular/data-grid';
import type { TabularAcceptedViewState, TabularAccessState, TabularCellRecord, TabularColumnDefinition, TabularColumnState, TabularError, TabularGroupID, TabularHeaderNode, TabularHeaderNodeID, TabularLimits, TabularQuery, TabularRequest, TabularRequestState, TabularResult, TabularRow, TabularRowID, TabularRowSelection, TabularView, TabularViewResponse, TabularWireValue } from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import type { DataTableCellsFromColumns, DataTableColumn, DataTableColumnID, DataTableReactiveInput, DataTableWritableRef } from './data-table.js';
import { createTabularComponentSuite, type TabularBodyComponent, type TabularComponent } from './internal/tabular-components.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
import { aliasVueProfileController, controlledValues, createVueProfileController, useProfile, useProfileSource, type ProfileContext, type SourceOptions, type SourceResolver, type SourceReturn, type SourceStatus, type VueProfileController } from './internal/tabular-profile.js';

export type DataGridColumn<RecordValue = unknown, ID extends string = string, CellValue extends TabularWireValue = TabularWireValue> = DataTableColumn<RecordValue, ID, CellValue>;
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

export interface UseDataGridOptions<Columns extends readonly DataGridColumn<never>[] = readonly DataGridColumn<never>[], LeafCells extends object = DataTableCellsFromColumns<Columns>, GroupCells extends object = LeafCells> {
  readonly columns: DataTableReactiveInput<Columns>;
  readonly headers?: DataTableReactiveInput<readonly TabularHeaderNode[]>;
  readonly sourceKey?: DataTableReactiveInput<string>;
  readonly limits?: Partial<TabularLimits>;
  readonly initialView?: DataGridViewResponse<LeafCells, GroupCells>;
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
export interface DataGridController<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends VueProfileController<DataGridState, DataGridEvent, SemanticDataGridCommand> { readonly [dataGridSchema]?: { readonly leaf: LeafCells; readonly group: GroupCells }; readonly acceptedViewState: ComputedRef<DataGridAcceptedViewState<LeafCells, GroupCells>>; getProjection(): DataGridProjection }
interface HostOptions { readonly columnSizes?: Readonly<Record<string, number>>; readonly defaultColumnSizes?: Readonly<Record<string, number>>; readonly onColumnSizesChange?: DataGridColumnSizeChangeHandler }
const hosts = new WeakMap<object, HostOptions>();

export function defineDataGridColumns<const Columns extends readonly DataGridColumn<never>[]>(columns: Columns): Columns { return columns; }
export function useDataGrid<ExplicitLeafCells extends object | undefined = undefined, ExplicitGroupCells extends object | undefined = ExplicitLeafCells, const Columns extends readonly DataGridColumn<never>[] = readonly DataGridColumn<never>[], LeafCells extends object = ExplicitLeafCells extends object ? ExplicitLeafCells : DataTableCellsFromColumns<Columns>, GroupCells extends object = ExplicitGroupCells extends object ? ExplicitGroupCells : LeafCells>(options: UseDataGridOptions<Columns, LeafCells, GroupCells>): DataGridController<LeafCells, GroupCells> {
  for (const property of ['query', 'rowSelection', 'columnState', 'accessState', 'cursor', 'editState', 'columnSizeState']) assertExclusive(options, property);
  const semantic = createDataGrid({
    columns: stripColumns(toValue(options.columns)),
    ...(options.headers === undefined ? {} : { headers: toValue(options.headers) }),
    ...(options.limits === undefined ? {} : { limits: options.limits }),
    ...(options.isCellDisabled === undefined ? {} : { isCellDisabled: options.isCellDisabled }),
    controlled: { query: options.query !== undefined, rowSelection: options.rowSelection !== undefined, columnState: options.columnState !== undefined, accessState: options.accessState !== undefined, expansion: false },
    initialValues: {
      ...(options.query === undefined && options.defaultQuery === undefined ? {} : { query: options.query?.value ?? options.defaultQuery }),
      ...(options.rowSelection === undefined && options.defaultRowSelection === undefined ? {} : { rowSelection: options.rowSelection?.value ?? options.defaultRowSelection }),
      ...(options.columnState === undefined && options.defaultColumnState === undefined ? {} : { columnState: options.columnState?.value ?? options.defaultColumnState }),
      ...(options.accessState === undefined && options.defaultAccessState === undefined ? {} : { accessState: options.accessState?.value ?? options.defaultAccessState }),
    },
    ...(options.onQueryChange === undefined ? {} : { onQueryChange: options.onQueryChange }),
    ...(options.onRowSelectionChange === undefined ? {} : { onRowSelectionChange: options.onRowSelectionChange }),
    ...(options.onColumnStateChange === undefined ? {} : { onColumnStateChange: options.onColumnStateChange }),
    ...(options.onAccessStateChange === undefined ? {} : { onAccessStateChange: options.onAccessStateChange }),
  });
  const base = createVueProfileController(semantic);
  const notify = (before: DataGridState, after: DataGridState): void => {
    if (before.cursor !== after.cursor) options.onCursorChange?.(after.cursor);
    if (before.edit !== after.edit) options.onEditStateChange?.(after.edit);
  };
  const controller = Object.freeze({
    ...base,
    dispatch: (event: DataGridEvent, revision?: number) => { const before = base.getSnapshot(); const result = base.dispatch(event, revision); if (result.ok) notify(before, result.value.snapshot); return result; },
    synchronizeView: (response: DataGridViewResponse<LeafCells, GroupCells>) => { const before = base.getSnapshot(); const result = base.synchronizeView(response); if (result.ok) notify(before, result.value); return result; },
    syncControlledValues: (values: Parameters<typeof base.syncControlledValues>[0]) => { const before = base.getSnapshot(); const result = base.syncControlledValues(values); if (result.ok) notify(before, result.value); return result; },
    requestView: () => { const before = base.getSnapshot(); const result = base.requestView(); if (result.ok) notify(before, result.value); return result; },
    abandonRequest: (requestID: number) => { const before = base.getSnapshot(); const result = base.abandonRequest(requestID); if (result.ok) notify(before, result.value); return result; },
    getProjection: () => semantic.getProjection(),
  }) as DataGridController<LeafCells, GroupCells>;
  aliasVueProfileController(controller, base);
  hosts.set(controller, Object.freeze({ ...(options.columnSizeState === undefined ? {} : { columnSizes: options.columnSizeState.value }), ...(options.defaultColumnSizeState === undefined ? {} : { defaultColumnSizes: options.defaultColumnSizeState }), ...(options.onColumnSizeStateChange === undefined ? {} : { onColumnSizesChange: options.onColumnSizeStateChange }) }));
  if (options.initialView !== undefined) unwrap(controller.synchronizeView(options.initialView));
  const desiredCursor = options.cursor?.value ?? options.defaultCursor;
  if (desiredCursor?.current !== null && desiredCursor?.current !== undefined && controller.getProjection().rows.length > 0) unwrap(controller.dispatch({ type: 'focus-cell', cell: desiredCursor.current }));
  const stops: Array<() => void> = [];
  const sync = () => unwrap(controller.syncControlledValues(controlledValues(options)));
  for (const source of [options.query, options.rowSelection, options.columnState, options.accessState]) if (source !== undefined) stops.push(watch(() => source.value, sync));
  if (options.sourceKey !== undefined) stops.push(watch(() => toValue(options.sourceKey!), () => { unwrap(controller.dispatch({ type: 'replace-source' })); }));
  stops.push(watch(() => toValue(options.columns), () => { unwrap(controller.dispatch({ type: 'replace-source' })); }, { deep: false }));
  if (options.cursor !== undefined) stops.push(watch(() => options.cursor!.value, (value) => { if (value.current !== null) unwrap(controller.dispatch({ type: 'focus-cell', cell: value.current })); }));
  if (options.editState !== undefined) stops.push(watch(() => options.editState!.value, (value) => { unwrap(controller.dispatch(value.kind === 'editing' ? { type: 'begin-edit', cell: value.cell } : { type: 'cancel-edit', reason: 'application' })); }));
  const rawDispose = controller.dispose;
  const wrapped = Object.freeze({ ...controller, dispose: () => { for (const stop of stops.splice(0)) stop(); rawDispose(); } }) as DataGridController<LeafCells, GroupCells>;
  aliasVueProfileController(wrapped, controller); hosts.set(wrapped, hosts.get(controller) ?? {});
  if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose);
  return wrapped;
}

export type DataGridSourceResolver<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataGridViewResponse<LeafCells, GroupCells> | Promise<DataGridViewResponse<LeafCells, GroupCells>>;
export interface UseDataGridSourceOptions { readonly onError?: DataGridSourceErrorHandler; readonly onStatusChange?: DataGridStatusChangeHandler }
export interface UseDataGridSourceReturn extends SourceReturn {}
export function useDataGridSource<LeafCells extends object, GroupCells extends object>(controller: DataGridController<LeafCells, GroupCells>, resolver: DataGridSourceResolver<LeafCells, GroupCells>, options?: UseDataGridSourceOptions): UseDataGridSourceReturn { return useProfileSource(controller, resolver as SourceResolver, options as SourceOptions | undefined); }

export interface DataGridContextValue extends Omit<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>, 'connection'> {}
const publicKey: InjectionKey<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>> = Symbol('SectileDataGrid');
const privateKey: InjectionKey<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>> = Symbol('SectileDataGridHost');
export function useDataGridContext(): DataGridContextValue { return useProfile(publicKey, 'useDataGridContext'); }
const parts = createTabularParts({ profile: 'data-grid', prefix: 'DataGrid', publicKey, privateKey, connect: (element, controller, callbacks) => connectDataGrid({ controller: controller as DataGridController, root: element, ...hosts.get(controller), ...(callbacks.onCommand === undefined ? {} : { onCommand: callbacks.onCommand as DataGridCommandHandler }), onSnapshotChange: callbacks.onSnapshotChange }) as unknown as HostConnection });

export interface DataGridProviderProps {}
export interface DataGridRootProps { readonly onCommand?: DataGridCommandHandler; readonly onError?: DataGridErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataGridRootSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly acceptedViewState: DataGridAcceptedViewState<LeafCells, GroupCells>; readonly requestState: DataGridRequestState; readonly query: DataGridQuery; readonly rowSelection: DataGridRowSelection; readonly columnState: DataGridColumnState; readonly accessState: DataGridAccessState; readonly cursor: DataGridCursorState; readonly editState: DataGridEditState; readonly rows: readonly DataGridViewRow<LeafCells, GroupCells>[] }
export interface DataGridRootExpose<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly controller: DataGridController<LeafCells, GroupCells>; refresh(): void }
export interface DataGridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export type DataGridHeaderRowProps = DataGridPartProps;
export interface DataGridColumnHeaderProps extends DataGridPartProps { readonly headerNodeID: TabularHeaderNodeID }
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
  readonly ColumnHeader: TabularComponent<DataGridColumnHeaderProps, DataGridColumnHeaderSlotProps<LeafCells, GroupCells>>;
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
export function useDataGridComponents<LeafCells extends object, GroupCells extends object>(controller: DataGridController<LeafCells, GroupCells>): DataGridComponents<LeafCells, GroupCells> {
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

function stripColumns(columns: readonly DataGridColumn<never>[]): readonly TabularColumnDefinition[] { return columns.map(({ getValue: _getValue, groupValue: _groupValue, aggregate: _aggregate, ...column }) => Object.freeze(column)); }
function assertExclusive(options: object, property: string): void { const values = options as Record<string, unknown>; const fallback = `default${property[0]!.toUpperCase()}${property.slice(1)}`; if (values[property] !== undefined && values[fallback] !== undefined) throw new TypeError(`${property} and ${fallback} are mutually exclusive.`); }
function unwrap<T>(result: TabularResult<T>): T { if (!result.ok) throw new TypeError(result.error.message); return result.value; }
export type { DataGridCursorState, DataGridEditState, DataGridEvent, DataGridProjection, DataGridState, DataGridUpdate, SemanticDataGridController };
