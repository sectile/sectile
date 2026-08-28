import { getCurrentScope, onScopeDispose, toValue, watch, type DefineComponent, type InjectionKey } from 'vue';
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
import type { TabularAcceptedViewState, TabularAccessState, TabularColumnDefinition, TabularColumnState, TabularError, TabularGroupID, TabularHeaderNode, TabularHeaderNodeID, TabularLimits, TabularQuery, TabularRequest, TabularRequestState, TabularResult, TabularRow, TabularRowID, TabularRowSelection, TabularView, TabularViewResponse, TabularWireValue } from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import type { DataTableColumn, DataTableReactiveInput, DataTableWritableRef } from './data-table.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
import { aliasVueProfileController, controlledValues, createVueProfileController, useProfile, useProfileSource, type ProfileContext, type SourceOptions, type SourceResolver, type SourceReturn, type SourceStatus, type VueProfileController } from './internal/tabular-profile.js';

export type DataGridColumn<RecordValue = unknown, ID extends string = string, CellValue extends TabularWireValue = TabularWireValue> = DataTableColumn<RecordValue, ID, CellValue>;
export type DataGridQuery = TabularQuery;
export type DataGridView = TabularView;
export type DataGridViewResponse = TabularViewResponse;
export type DataGridViewRow = TabularRow;
export type DataGridRowSelection = TabularRowSelection;
export type DataGridGroupID = TabularGroupID;
export type DataGridRowID = TabularRowID;
export type DataGridColumnState = TabularColumnState;
export type DataGridAccessState = TabularAccessState;
export type DataGridRequestState = TabularRequestState;
export type DataGridAcceptedViewState = TabularAcceptedViewState;
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

export interface UseDataGridOptions<RecordValue = unknown> {
  readonly columns: DataTableReactiveInput<readonly DataGridColumn<RecordValue>[]>;
  readonly headers?: DataTableReactiveInput<readonly TabularHeaderNode[]>;
  readonly sourceKey?: DataTableReactiveInput<string>;
  readonly limits?: Partial<TabularLimits>;
  readonly initialView?: DataGridViewResponse;
  readonly query?: DataTableWritableRef<DataGridQuery>; readonly defaultQuery?: DataGridQuery; readonly onQueryChange?: DataGridQueryChangeHandler;
  readonly rowSelection?: DataTableWritableRef<DataGridRowSelection>; readonly defaultRowSelection?: DataGridRowSelection; readonly onRowSelectionChange?: DataGridRowSelectionChangeHandler;
  readonly columnState?: DataTableWritableRef<DataGridColumnState>; readonly defaultColumnState?: DataGridColumnState; readonly onColumnStateChange?: DataGridColumnStateChangeHandler;
  readonly accessState?: DataTableWritableRef<DataGridAccessState>; readonly defaultAccessState?: DataGridAccessState; readonly onAccessStateChange?: DataGridAccessStateChangeHandler;
  readonly cursor?: DataTableWritableRef<DataGridCursorState>; readonly defaultCursor?: DataGridCursorState; readonly onCursorChange?: DataGridCursorChangeHandler;
  readonly editState?: DataTableWritableRef<DataGridEditState>; readonly defaultEditState?: DataGridEditState; readonly onEditStateChange?: DataGridEditStateChangeHandler;
  readonly columnSizeState?: DataTableWritableRef<Readonly<Record<string, number>>>; readonly defaultColumnSizeState?: Readonly<Record<string, number>>; readonly onColumnSizeStateChange?: DataGridColumnSizeChangeHandler;
  readonly isCellDisabled?: SemanticDataGridOptions['isCellDisabled'];
}
export interface DataGridController extends VueProfileController<DataGridState, DataGridEvent, SemanticDataGridCommand> { getProjection(): DataGridProjection }
interface HostOptions { readonly columnSizes?: Readonly<Record<string, number>>; readonly defaultColumnSizes?: Readonly<Record<string, number>>; readonly onColumnSizesChange?: DataGridColumnSizeChangeHandler }
const hosts = new WeakMap<object, HostOptions>();

export function defineDataGridColumns<const Columns extends readonly DataGridColumn<never>[]>(columns: Columns): Columns { return columns; }
export function useDataGrid(options: UseDataGridOptions<never>): DataGridController {
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
    synchronizeView: (response: DataGridViewResponse) => { const before = base.getSnapshot(); const result = base.synchronizeView(response); if (result.ok) notify(before, result.value); return result; },
    syncControlledValues: (values: Parameters<typeof base.syncControlledValues>[0]) => { const before = base.getSnapshot(); const result = base.syncControlledValues(values); if (result.ok) notify(before, result.value); return result; },
    requestView: () => { const before = base.getSnapshot(); const result = base.requestView(); if (result.ok) notify(before, result.value); return result; },
    abandonRequest: (requestID: number) => { const before = base.getSnapshot(); const result = base.abandonRequest(requestID); if (result.ok) notify(before, result.value); return result; },
    getProjection: () => semantic.getProjection(),
  }) as DataGridController;
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
  const wrapped = Object.freeze({ ...controller, dispose: () => { for (const stop of stops.splice(0)) stop(); rawDispose(); } }) as DataGridController;
  aliasVueProfileController(wrapped, controller); hosts.set(wrapped, hosts.get(controller) ?? {});
  if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose);
  return wrapped;
}

export type DataGridSourceResolver = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataGridViewResponse | Promise<DataGridViewResponse>;
export interface UseDataGridSourceOptions { readonly onError?: DataGridSourceErrorHandler; readonly onStatusChange?: DataGridStatusChangeHandler }
export interface UseDataGridSourceReturn extends SourceReturn {}
export function useDataGridSource(controller: DataGridController, resolver: DataGridSourceResolver, options?: UseDataGridSourceOptions): UseDataGridSourceReturn { return useProfileSource(controller, resolver as SourceResolver, options as SourceOptions | undefined); }

export interface DataGridContextValue extends Omit<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>, 'connection'> {}
const publicKey: InjectionKey<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>> = Symbol('SectileDataGrid');
const privateKey: InjectionKey<ProfileContext<DataGridState, DataGridEvent, SemanticDataGridCommand, HostConnection>> = Symbol('SectileDataGridHost');
export function useDataGridContext(): DataGridContextValue { return useProfile(publicKey, 'useDataGridContext'); }
const parts = createTabularParts({ profile: 'data-grid', prefix: 'DataGrid', publicKey, privateKey, connect: (element, controller, callbacks) => connectDataGrid({ controller: controller as DataGridController, root: element, ...hosts.get(controller), ...(callbacks.onCommand === undefined ? {} : { onCommand: callbacks.onCommand as DataGridCommandHandler }), onSnapshotChange: callbacks.onSnapshotChange }) as unknown as HostConnection });

export interface DataGridProviderProps { readonly controller: DataGridController }
export interface DataGridRootProps { readonly onCommand?: DataGridCommandHandler; readonly onError?: DataGridErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataGridRootSlotProps { readonly acceptedViewState: DataGridAcceptedViewState; readonly requestState: DataGridRequestState; readonly query: DataGridQuery; readonly rowSelection: DataGridRowSelection; readonly columnState: DataGridColumnState; readonly accessState: DataGridAccessState; readonly cursor: DataGridCursorState; readonly editState: DataGridEditState; readonly rows: readonly DataGridViewRow[] }
export interface DataGridRootExpose { readonly controller: DataGridController; refresh(): void }
export interface DataGridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataGridHeaderRowProps extends DataGridPartProps { readonly depth?: number }
export interface DataGridColumnHeaderProps extends DataGridPartProps { readonly headerNodeID: TabularHeaderNodeID }
export interface DataGridSortTriggerProps extends DataGridPartProps { readonly column: string; readonly comparator?: string }
export type DataGridFilterControlProps = DataGridPartProps & ({ readonly scope: 'global'; readonly id: string; readonly predicate: string } | { readonly scope: 'column'; readonly column: string; readonly id: string; readonly predicate: string });
export interface DataGridColumnResizeHandleProps extends DataGridPartProps { readonly column: string; readonly minSize?: number; readonly maxSize?: number }
export interface DataGridRowProps extends DataGridPartProps { readonly rowID: DataGridRowID }
export interface DataGridRowSelectionControlProps extends DataGridPartProps { readonly rowID?: DataGridRowID; readonly name: string; readonly value?: string; readonly form?: string; readonly disabled?: boolean }
export interface DataGridBulkSelectionControlProps extends DataGridPartProps { readonly target: { readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: DataGridGroupID }; readonly disabled?: boolean }
export interface DataGridCellProps extends DataGridPartProps { readonly rowID?: DataGridRowID; readonly column: string }
export interface DataGridEditorProps extends DataGridCellProps { readonly parseValue?: (value: string) => TabularResult<TabularWireValue>; readonly commitOnChange?: boolean }
export type DataGridHeaderProps = DataGridPartProps; export interface DataGridBodyProps extends DataGridPartProps { readonly manual?: boolean } export interface DataGridPartSlotProps extends DataGridRootSlotProps { readonly row?: DataGridViewRow; readonly isGroup?: boolean } export type DataGridProviderSlotProps = DataGridRootSlotProps;
export interface DataGridBodySlotProps extends DataGridRootSlotProps { readonly row: DataGridViewRow; readonly rowIndex: number; readonly isGroup: boolean }
export type DataGridHeaderSlotProps = DataGridRootSlotProps; export type DataGridHeaderRowSlotProps = DataGridRootSlotProps; export type DataGridColumnHeaderSlotProps = DataGridRootSlotProps; export type DataGridSortTriggerSlotProps = DataGridRootSlotProps; export type DataGridFilterControlSlotProps = DataGridRootSlotProps; export type DataGridColumnResizeHandleSlotProps = DataGridRootSlotProps; export type DataGridRowSlotProps = DataGridRootSlotProps; export type DataGridRowSelectionControlSlotProps = DataGridPartSlotProps; export type DataGridBulkSelectionControlSlotProps = DataGridRootSlotProps; export type DataGridCellSlotProps = DataGridPartSlotProps; export type DataGridEditorSlotProps = DataGridPartSlotProps;
export const DataGridProvider = parts['Provider'] as DefineComponent<DataGridProviderProps>;
export const DataGridRoot = parts['Root'] as DefineComponent<DataGridRootProps>;
export const DataGridHeader = parts['Header'] as DefineComponent<DataGridHeaderProps>;
export const DataGridHeaderRow = parts['HeaderRow'] as DefineComponent<DataGridHeaderRowProps>;
export const DataGridColumnHeader = parts['ColumnHeader'] as DefineComponent<DataGridColumnHeaderProps>;
export const DataGridSortTrigger = parts['SortTrigger'] as DefineComponent<DataGridSortTriggerProps>;
export const DataGridFilterControl = parts['FilterControl'] as DefineComponent<DataGridFilterControlProps>;
export const DataGridColumnResizeHandle = parts['ColumnResizeHandle'] as DefineComponent<DataGridColumnResizeHandleProps>;
export const DataGridBody = parts['Body'] as DefineComponent<DataGridBodyProps>;
export const DataGridRow = parts['Row'] as DefineComponent<DataGridRowProps>;
export const DataGridRowSelectionControl = parts['SelectionControl'] as DefineComponent<DataGridRowSelectionControlProps>;
export const DataGridBulkSelectionControl = parts['BulkSelectionControl'] as DefineComponent<DataGridBulkSelectionControlProps>;
export const DataGridCell = parts['Cell'] as DefineComponent<DataGridCellProps>;
export const DataGridEditor = parts['Editor'] as DefineComponent<DataGridEditorProps>;

function stripColumns(columns: readonly DataGridColumn<never>[]): readonly TabularColumnDefinition[] { return columns.map(({ getValue: _getValue, groupValue: _groupValue, aggregate: _aggregate, ...column }) => Object.freeze(column)); }
function assertExclusive(options: object, property: string): void { const values = options as Record<string, unknown>; const fallback = `default${property[0]!.toUpperCase()}${property.slice(1)}`; if (values[property] !== undefined && values[fallback] !== undefined) throw new TypeError(`${property} and ${fallback} are mutually exclusive.`); }
function unwrap<T>(result: TabularResult<T>): T { if (!result.ok) throw new TypeError(result.error.message); return result.value; }
export type { DataGridCursorState, DataGridEditState, DataGridEvent, DataGridProjection, DataGridState, DataGridUpdate, SemanticDataGridController };
