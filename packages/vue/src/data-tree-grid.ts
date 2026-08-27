import { getCurrentScope, onScopeDispose, toValue, watch, type DefineComponent, type InjectionKey } from 'vue';
import { connectDataTreeGrid, type DataTreeGridColumnSizeState as DOMDataTreeGridColumnSizeState, type DataTreeGridDOMCommand } from '@sectile/dom/data-tree-grid';
import {
  createDataTreeGrid,
  type DataTreeGridCommand as SemanticDataTreeGridCommand,
  type DataTreeGridController as SemanticDataTreeGridController,
  type DataTreeGridCursorState,
  type DataTreeGridEditState,
  type DataTreeGridEvent,
  type DataTreeGridExpansionState,
  type DataTreeGridOptions as SemanticDataTreeGridOptions,
  type DataTreeGridProjection,
  type DataTreeGridState,
  type DataTreeGridUpdate,
} from '@sectile/tabular/data-tree-grid';
import type { TabularAcceptedViewState, TabularAccessState, TabularColumnDefinition, TabularColumnState, TabularError, TabularGroupID, TabularHeaderNode, TabularHeaderNodeID, TabularLimits, TabularQuery, TabularRequest, TabularRequestState, TabularResult, TabularRowID, TabularRowSelection, TabularView, TabularViewResponse, TabularWireValue } from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import type { DataTableColumn, DataTableReactiveInput, DataTableWritableRef } from './data-table.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
import { aliasVueProfileController, controlledValues, createVueProfileController, useProfile, useProfileSource, type ProfileContext, type SourceOptions, type SourceResolver, type SourceReturn, type SourceStatus, type VueProfileController } from './internal/tabular-profile.js';

export type DataTreeGridColumn<RecordValue = unknown, ID extends string = string, CellValue extends TabularWireValue = TabularWireValue> = DataTableColumn<RecordValue, ID, CellValue>;
export type DataTreeGridQuery = TabularQuery; export type DataTreeGridView = TabularView; export type DataTreeGridViewResponse = TabularViewResponse;
export type DataTreeGridRowSelection = TabularRowSelection; export type DataTreeGridGroupID = TabularGroupID; export type DataTreeGridRowID = TabularRowID;
export type DataTreeGridColumnState = TabularColumnState; export type DataTreeGridAccessState = TabularAccessState;
export type DataTreeGridRequestState = TabularRequestState; export type DataTreeGridAcceptedViewState = TabularAcceptedViewState;
export type DataTreeGridColumnSizeState = DOMDataTreeGridColumnSizeState; export type DataTreeGridSourceStatus = SourceStatus;
export type DataTreeGridSemanticCommand = SemanticDataTreeGridCommand; export type DataTreeGridCommand = DataTreeGridDOMCommand; export type DataTreeGridError = TabularError;
export type DataTreeGridCommandHandler = (command: DataTreeGridCommand) => void; export type DataTreeGridErrorHandler = (error: DataTreeGridError) => void;
export type DataTreeGridSourceErrorHandler = (error: unknown) => void; export type DataTreeGridStatusChangeHandler = (status: DataTreeGridSourceStatus) => void;
export type DataTreeGridQueryChangeHandler = (value: DataTreeGridQuery) => void; export type DataTreeGridRowSelectionChangeHandler = (value: DataTreeGridRowSelection) => void;
export type DataTreeGridColumnStateChangeHandler = (value: DataTreeGridColumnState) => void; export type DataTreeGridAccessStateChangeHandler = (value: DataTreeGridAccessState) => void;
export type DataTreeGridExpansionChangeHandler = (value: readonly DataTreeGridGroupID[]) => void; export type DataTreeGridCursorChangeHandler = (value: DataTreeGridCursorState) => void;
export type DataTreeGridEditStateChangeHandler = (value: DataTreeGridEditState) => void; export type DataTreeGridColumnSizeChangeHandler = (value: DataTreeGridColumnSizeState) => void;

export interface UseDataTreeGridOptions<RecordValue = unknown> {
  readonly columns: DataTableReactiveInput<readonly DataTreeGridColumn<RecordValue>[]>; readonly headers?: DataTableReactiveInput<readonly TabularHeaderNode[]>; readonly sourceKey?: DataTableReactiveInput<string>; readonly limits?: Partial<TabularLimits>; readonly initialView?: DataTreeGridViewResponse;
  readonly query?: DataTableWritableRef<DataTreeGridQuery>; readonly defaultQuery?: DataTreeGridQuery; readonly onQueryChange?: DataTreeGridQueryChangeHandler;
  readonly rowSelection?: DataTableWritableRef<DataTreeGridRowSelection>; readonly defaultRowSelection?: DataTreeGridRowSelection; readonly onRowSelectionChange?: DataTreeGridRowSelectionChangeHandler;
  readonly columnState?: DataTableWritableRef<DataTreeGridColumnState>; readonly defaultColumnState?: DataTreeGridColumnState; readonly onColumnStateChange?: DataTreeGridColumnStateChangeHandler;
  readonly accessState?: DataTableWritableRef<DataTreeGridAccessState>; readonly defaultAccessState?: DataTreeGridAccessState; readonly onAccessStateChange?: DataTreeGridAccessStateChangeHandler;
  readonly expansion?: DataTableWritableRef<readonly DataTreeGridGroupID[]>; readonly defaultExpansion?: readonly DataTreeGridGroupID[]; readonly onExpansionChange?: DataTreeGridExpansionChangeHandler;
  readonly cursor?: DataTableWritableRef<DataTreeGridCursorState>; readonly defaultCursor?: DataTreeGridCursorState; readonly onCursorChange?: DataTreeGridCursorChangeHandler;
  readonly editState?: DataTableWritableRef<DataTreeGridEditState>; readonly defaultEditState?: DataTreeGridEditState; readonly onEditStateChange?: DataTreeGridEditStateChangeHandler;
  readonly columnSizeState?: DataTableWritableRef<Readonly<Record<string, number>>>; readonly defaultColumnSizeState?: Readonly<Record<string, number>>; readonly onColumnSizeStateChange?: DataTreeGridColumnSizeChangeHandler;
  readonly isCellDisabled?: SemanticDataTreeGridOptions['isCellDisabled'];
}
export interface DataTreeGridController extends VueProfileController<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand> { getProjection(): DataTreeGridProjection }
interface HostOptions { readonly columnSizes?: Readonly<Record<string, number>>; readonly defaultColumnSizes?: Readonly<Record<string, number>>; readonly onColumnSizesChange?: DataTreeGridColumnSizeChangeHandler }
const hosts = new WeakMap<object, HostOptions>();
export function defineDataTreeGridColumns<const Columns extends readonly DataTreeGridColumn<never>[]>(columns: Columns): Columns { return columns; }

export function useDataTreeGrid(options: UseDataTreeGridOptions<never>): DataTreeGridController {
  for (const property of ['query', 'rowSelection', 'columnState', 'accessState', 'expansion', 'cursor', 'editState', 'columnSizeState']) assertExclusive(options, property);
  const semantic = createDataTreeGrid({
    columns: stripColumns(toValue(options.columns)), ...(options.headers === undefined ? {} : { headers: toValue(options.headers) }), ...(options.limits === undefined ? {} : { limits: options.limits }), ...(options.isCellDisabled === undefined ? {} : { isCellDisabled: options.isCellDisabled }),
    controlled: { query: options.query !== undefined, rowSelection: options.rowSelection !== undefined, columnState: options.columnState !== undefined, accessState: options.accessState !== undefined, expansion: options.expansion !== undefined },
    initialValues: {
      ...(options.query === undefined && options.defaultQuery === undefined ? {} : { query: options.query?.value ?? options.defaultQuery }),
      ...(options.rowSelection === undefined && options.defaultRowSelection === undefined ? {} : { rowSelection: options.rowSelection?.value ?? options.defaultRowSelection }),
      ...(options.columnState === undefined && options.defaultColumnState === undefined ? {} : { columnState: options.columnState?.value ?? options.defaultColumnState }),
      ...(options.accessState === undefined && options.defaultAccessState === undefined ? {} : { accessState: options.accessState?.value ?? options.defaultAccessState }),
      ...(options.expansion === undefined && options.defaultExpansion === undefined ? {} : { expansion: options.expansion?.value ?? options.defaultExpansion }),
    },
    ...(options.onQueryChange === undefined ? {} : { onQueryChange: options.onQueryChange }), ...(options.onRowSelectionChange === undefined ? {} : { onRowSelectionChange: options.onRowSelectionChange }), ...(options.onColumnStateChange === undefined ? {} : { onColumnStateChange: options.onColumnStateChange }), ...(options.onAccessStateChange === undefined ? {} : { onAccessStateChange: options.onAccessStateChange }), ...(options.onExpansionChange === undefined ? {} : { onExpansionChange: options.onExpansionChange }),
  });
  const base = createVueProfileController(semantic); const notify = (before: DataTreeGridState, after: DataTreeGridState): void => { if (before.cursor !== after.cursor) options.onCursorChange?.(after.cursor); if (before.edit !== after.edit) options.onEditStateChange?.(after.edit); };
  const controller = Object.freeze({ ...base,
    dispatch: (event: DataTreeGridEvent, revision?: number) => { const before = base.getSnapshot(); const result = base.dispatch(event, revision); if (result.ok) notify(before, result.value.snapshot); return result; },
    synchronizeView: (response: DataTreeGridViewResponse) => { const before = base.getSnapshot(); const result = base.synchronizeView(response); if (result.ok) notify(before, result.value); return result; },
    syncControlledValues: (values: Parameters<typeof base.syncControlledValues>[0]) => { const before = base.getSnapshot(); const result = base.syncControlledValues(values); if (result.ok) notify(before, result.value); return result; },
    requestView: () => { const before = base.getSnapshot(); const result = base.requestView(); if (result.ok) notify(before, result.value); return result; },
    abandonRequest: (requestID: number) => { const before = base.getSnapshot(); const result = base.abandonRequest(requestID); if (result.ok) notify(before, result.value); return result; },
    getProjection: () => semantic.getProjection(),
  }) as DataTreeGridController; aliasVueProfileController(controller, base);
  hosts.set(controller, Object.freeze({ ...(options.columnSizeState === undefined ? {} : { columnSizes: options.columnSizeState.value }), ...(options.defaultColumnSizeState === undefined ? {} : { defaultColumnSizes: options.defaultColumnSizeState }), ...(options.onColumnSizeStateChange === undefined ? {} : { onColumnSizesChange: options.onColumnSizeStateChange }) }));
  if (options.initialView !== undefined) unwrap(controller.synchronizeView(options.initialView));
  const desiredCursor = options.cursor?.value ?? options.defaultCursor; if (desiredCursor?.current !== null && desiredCursor?.current !== undefined && controller.getProjection().rows.length > 0) unwrap(controller.dispatch({ type: 'focus-cell', cell: desiredCursor.current }));
  const stops: Array<() => void> = []; const sync = () => unwrap(controller.syncControlledValues(controlledValues(options)));
  for (const source of [options.query, options.rowSelection, options.columnState, options.accessState, options.expansion]) if (source !== undefined) stops.push(watch(() => source.value, sync));
  if (options.sourceKey !== undefined) stops.push(watch(() => toValue(options.sourceKey!), () => { unwrap(controller.dispatch({ type: 'replace-source' })); }));
  stops.push(watch(() => toValue(options.columns), () => { unwrap(controller.dispatch({ type: 'replace-source' })); }, { deep: false }));
  if (options.cursor !== undefined) stops.push(watch(() => options.cursor!.value, (value) => { if (value.current !== null) unwrap(controller.dispatch({ type: 'focus-cell', cell: value.current })); }));
  if (options.editState !== undefined) stops.push(watch(() => options.editState!.value, (value) => { unwrap(controller.dispatch(value.kind === 'editing' ? { type: 'begin-edit', cell: value.cell } : { type: 'cancel-edit', reason: 'application' })); }));
  const rawDispose = controller.dispose; const wrapped = Object.freeze({ ...controller, dispose: () => { for (const stop of stops.splice(0)) stop(); rawDispose(); } }) as DataTreeGridController; aliasVueProfileController(wrapped, controller); hosts.set(wrapped, hosts.get(controller) ?? {}); if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose); return wrapped;
}

export type DataTreeGridSourceResolver = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataTreeGridViewResponse | Promise<DataTreeGridViewResponse>;
export interface UseDataTreeGridSourceOptions { readonly onError?: DataTreeGridSourceErrorHandler; readonly onStatusChange?: DataTreeGridStatusChangeHandler }
export interface UseDataTreeGridSourceReturn extends SourceReturn {}
export function useDataTreeGridSource(controller: DataTreeGridController, resolver: DataTreeGridSourceResolver, options?: UseDataTreeGridSourceOptions): UseDataTreeGridSourceReturn { return useProfileSource(controller, resolver as SourceResolver, options as SourceOptions | undefined); }

export interface DataTreeGridContextValue extends Omit<ProfileContext<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand, HostConnection>, 'connection'> {}
const publicKey: InjectionKey<ProfileContext<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand, HostConnection>> = Symbol('SectileDataTreeGrid'); const privateKey: InjectionKey<ProfileContext<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand, HostConnection>> = Symbol('SectileDataTreeGridHost');
export function useDataTreeGridContext(): DataTreeGridContextValue { return useProfile(publicKey, 'useDataTreeGridContext'); }
const parts = createTabularParts({ profile: 'data-tree-grid', prefix: 'DataTreeGrid', publicKey, privateKey, connect: (element, controller, callbacks) => connectDataTreeGrid({ controller: controller as DataTreeGridController, root: element, ...hosts.get(controller), ...(callbacks.onCommand === undefined ? {} : { onCommand: callbacks.onCommand as DataTreeGridCommandHandler }), onSnapshotChange: callbacks.onSnapshotChange }) as unknown as HostConnection });

export interface DataTreeGridProviderProps { readonly controller: DataTreeGridController }
export interface DataTreeGridRootProps { readonly onCommand?: DataTreeGridCommandHandler; readonly onError?: DataTreeGridErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataTreeGridRootSlotProps { readonly acceptedViewState: DataTreeGridAcceptedViewState; readonly requestState: DataTreeGridRequestState; readonly query: DataTreeGridQuery; readonly rowSelection: DataTreeGridRowSelection; readonly columnState: DataTreeGridColumnState; readonly accessState: DataTreeGridAccessState; readonly expansion: readonly DataTreeGridGroupID[]; readonly cursor: DataTreeGridCursorState; readonly editState: DataTreeGridEditState }
export interface DataTreeGridRootExpose { readonly controller: DataTreeGridController; refresh(): void }
export interface DataTreeGridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean } export interface DataTreeGridHeaderRowProps extends DataTreeGridPartProps { readonly depth: number } export interface DataTreeGridColumnHeaderProps extends DataTreeGridPartProps { readonly headerNodeID: TabularHeaderNodeID }
export interface DataTreeGridSortTriggerProps extends DataTreeGridPartProps { readonly columnID: string; readonly comparator?: string } export type DataTreeGridFilterControlProps = DataTreeGridPartProps & ({ readonly scope: 'global'; readonly id: string; readonly predicate: string } | { readonly scope: 'column'; readonly columnID: string; readonly id: string; readonly predicate: string });
export interface DataTreeGridColumnResizeHandleProps extends DataTreeGridPartProps { readonly columnID: string; readonly minSize?: number; readonly maxSize?: number } export interface DataTreeGridRowProps extends DataTreeGridPartProps { readonly rowID: DataTreeGridRowID | DataTreeGridGroupID }
export interface DataTreeGridRowDisclosureProps extends DataTreeGridPartProps { readonly rowID: DataTreeGridGroupID; readonly disabled?: boolean } export interface DataTreeGridRowSelectionControlProps extends DataTreeGridPartProps { readonly rowID: DataTreeGridRowID; readonly name: string; readonly value: string; readonly form?: string; readonly disabled?: boolean }
export interface DataTreeGridBulkSelectionControlProps extends DataTreeGridPartProps { readonly target: { readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: DataTreeGridGroupID }; readonly disabled?: boolean } export interface DataTreeGridCellProps extends DataTreeGridPartProps { readonly rowID: DataTreeGridRowID | DataTreeGridGroupID; readonly columnID: string } export interface DataTreeGridEditorProps extends DataTreeGridCellProps { readonly parseValue?: (value: string) => TabularResult<TabularWireValue>; readonly commitOnChange?: boolean }
export type DataTreeGridHeaderProps = DataTreeGridPartProps; export type DataTreeGridBodyProps = DataTreeGridPartProps; export type DataTreeGridPartSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridProviderSlotProps = DataTreeGridRootSlotProps;
export type DataTreeGridHeaderSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridHeaderRowSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridColumnHeaderSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridSortTriggerSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridFilterControlSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridColumnResizeHandleSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridBodySlotProps = DataTreeGridRootSlotProps; export type DataTreeGridRowSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridRowDisclosureSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridRowSelectionControlSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridBulkSelectionControlSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridCellSlotProps = DataTreeGridRootSlotProps; export type DataTreeGridEditorSlotProps = DataTreeGridRootSlotProps;
export const DataTreeGridProvider = parts['Provider'] as DefineComponent<DataTreeGridProviderProps>; export const DataTreeGridRoot = parts['Root'] as DefineComponent<DataTreeGridRootProps>; export const DataTreeGridHeader = parts['Header'] as DefineComponent<DataTreeGridHeaderProps>; export const DataTreeGridHeaderRow = parts['HeaderRow'] as DefineComponent<DataTreeGridHeaderRowProps>; export const DataTreeGridColumnHeader = parts['ColumnHeader'] as DefineComponent<DataTreeGridColumnHeaderProps>; export const DataTreeGridSortTrigger = parts['SortTrigger'] as DefineComponent<DataTreeGridSortTriggerProps>; export const DataTreeGridFilterControl = parts['FilterControl'] as DefineComponent<DataTreeGridFilterControlProps>; export const DataTreeGridColumnResizeHandle = parts['ColumnResizeHandle'] as DefineComponent<DataTreeGridColumnResizeHandleProps>; export const DataTreeGridBody = parts['Body'] as DefineComponent<DataTreeGridBodyProps>; export const DataTreeGridRow = parts['Row'] as DefineComponent<DataTreeGridRowProps>; export const DataTreeGridRowDisclosure = parts['Disclosure'] as DefineComponent<DataTreeGridRowDisclosureProps>; export const DataTreeGridRowSelectionControl = parts['SelectionControl'] as DefineComponent<DataTreeGridRowSelectionControlProps>; export const DataTreeGridBulkSelectionControl = parts['BulkSelectionControl'] as DefineComponent<DataTreeGridBulkSelectionControlProps>; export const DataTreeGridCell = parts['Cell'] as DefineComponent<DataTreeGridCellProps>; export const DataTreeGridEditor = parts['Editor'] as DefineComponent<DataTreeGridEditorProps>;

function stripColumns(columns: readonly DataTreeGridColumn<never>[]): readonly TabularColumnDefinition[] { return columns.map(({ getValue: _getValue, groupValue: _groupValue, aggregate: _aggregate, ...column }) => Object.freeze(column)); }
function assertExclusive(options: object, property: string): void { const values = options as Record<string, unknown>; const fallback = `default${property[0]!.toUpperCase()}${property.slice(1)}`; if (values[property] !== undefined && values[fallback] !== undefined) throw new TypeError(`${property} and ${fallback} are mutually exclusive.`); }
function unwrap<T>(result: TabularResult<T>): T { if (!result.ok) throw new TypeError(result.error.message); return result.value; }
export type { DataTreeGridCursorState, DataTreeGridEditState, DataTreeGridEvent, DataTreeGridExpansionState, DataTreeGridProjection, DataTreeGridState, DataTreeGridUpdate, SemanticDataTreeGridController };
