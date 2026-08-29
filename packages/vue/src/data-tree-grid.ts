import { getCurrentScope, onScopeDispose, toValue, watch, type Component, type ComputedRef, type InjectionKey } from 'vue';
import { connectDataTreeGrid, type DataTreeGridColumnSizeState as DOMDataTreeGridColumnSizeState, type DataTreeGridDOMCommand } from '@sectile/dom/tabular';
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
import type { TabularAcceptedViewState, TabularAccessState, TabularCellRecord, TabularColumnState, TabularError, TabularGroupID, TabularHeaderNodeID, TabularLimits, TabularQuery, TabularRequest, TabularRequestState, TabularResult, TabularRow, TabularRowID, TabularRowSelection, TabularView, TabularViewResponse, TabularWireValue } from '@sectile/tabular';
import type { PrimitiveAs } from './primitive.js';
import type { DataTableColumnID, DataTableGroupCellsFromSource, DataTableLeafCellsFromSource, DataTableReactiveInput, DataTableWritableRef } from './data-table.js';
import { createTabularComponentSuite, type TabularBodyComponent, type TabularComponent } from './internal/tabular-components.js';
import { createTabularParts, type HostConnection } from './internal/tabular-parts.js';
import { aliasVueProfileController, controlledValues, createVueProfileController, useProfile, useProfileSource, type ProfileContext, type SourceResolver, type SourceReturn, type SourceStatus, type VueProfileController } from './internal/tabular-profile.js';

export type DataTreeGridQuery = TabularQuery; export type DataTreeGridViewRow<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularRow<LeafCells, GroupCells>; export type DataTreeGridView<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularView<DataTreeGridViewRow<LeafCells, GroupCells>>; export type DataTreeGridViewResponse<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularViewResponse<DataTreeGridViewRow<LeafCells, GroupCells>>;
export type DataTreeGridRowSelection = TabularRowSelection; export type DataTreeGridGroupID = TabularGroupID; export type DataTreeGridRowID = TabularRowID;
export type DataTreeGridColumnState = TabularColumnState; export type DataTreeGridAccessState = TabularAccessState;
export type DataTreeGridRequestState = TabularRequestState; export type DataTreeGridAcceptedViewState<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = TabularAcceptedViewState<DataTreeGridViewRow<LeafCells, GroupCells>>;
export type DataTreeGridColumnSizeState = DOMDataTreeGridColumnSizeState; export type DataTreeGridSourceStatus = SourceStatus;
export type DataTreeGridSemanticCommand = SemanticDataTreeGridCommand; export type DataTreeGridCommand = DataTreeGridDOMCommand; export type DataTreeGridError = TabularError;
export type DataTreeGridCommandHandler = (command: DataTreeGridCommand) => void; export type DataTreeGridErrorHandler = (error: DataTreeGridError) => void;
export type DataTreeGridSourceErrorHandler = (error: unknown) => void; export type DataTreeGridStatusChangeHandler = (status: DataTreeGridSourceStatus) => void;
export type DataTreeGridQueryChangeHandler = (value: DataTreeGridQuery) => void; export type DataTreeGridRowSelectionChangeHandler = (value: DataTreeGridRowSelection) => void;
export type DataTreeGridColumnStateChangeHandler = (value: DataTreeGridColumnState) => void; export type DataTreeGridAccessStateChangeHandler = (value: DataTreeGridAccessState) => void;
export type DataTreeGridExpansionChangeHandler = (value: readonly DataTreeGridGroupID[]) => void; export type DataTreeGridCursorChangeHandler = (value: DataTreeGridCursorState) => void;
export type DataTreeGridEditStateChangeHandler = (value: DataTreeGridEditState) => void; export type DataTreeGridColumnSizeChangeHandler = (value: DataTreeGridColumnSizeState) => void;

export type DataTreeGridSourceResolver<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = (request: TabularRequest, context: { readonly signal: AbortSignal }) => DataTreeGridViewResponse<LeafCells, GroupCells> | Promise<DataTreeGridViewResponse<LeafCells, GroupCells>>;
type DataTreeGridSourceResponse<Source extends SourceResolver> = Awaited<ReturnType<Source>>;
export interface UseDataTreeGridOptions<Source extends SourceResolver = DataTreeGridSourceResolver> {
  readonly source: Source; readonly sourceKey?: DataTableReactiveInput<string>; readonly limits?: Partial<TabularLimits>; readonly initialView?: DataTreeGridSourceResponse<Source>; readonly onSourceError?: DataTreeGridSourceErrorHandler; readonly onSourceStatusChange?: DataTreeGridStatusChangeHandler;
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
declare const dataTreeGridSchema: unique symbol;
export interface DataTreeGridController<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends VueProfileController<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand>, SourceReturn<DataTreeGridSourceResolver<LeafCells, GroupCells>> { readonly [dataTreeGridSchema]?: { readonly leaf: LeafCells; readonly group: GroupCells }; readonly acceptedViewState: ComputedRef<DataTreeGridAcceptedViewState<LeafCells, GroupCells>>; getProjection(): DataTreeGridProjection }
interface HostOptions { readonly columnSizes?: Readonly<Record<string, number>>; readonly defaultColumnSizes?: Readonly<Record<string, number>>; readonly onColumnSizesChange?: DataTreeGridColumnSizeChangeHandler }
const hosts = new WeakMap<object, HostOptions>();
export function useDataTreeGrid<const Source extends SourceResolver, LeafCells extends object = DataTableLeafCellsFromSource<Source>, GroupCells extends object = DataTableGroupCellsFromSource<Source>>(options: UseDataTreeGridOptions<Source>): DataTreeGridController<LeafCells, GroupCells> {
  for (const property of ['query', 'rowSelection', 'columnState', 'accessState', 'expansion', 'cursor', 'editState', 'columnSizeState']) assertExclusive(options, property);
  const semantic = createDataTreeGrid({
    columns: options.initialView?.columnSchema.columns ?? [], headers: options.initialView?.columnSchema.headers ?? [], ...(options.limits === undefined ? {} : { limits: options.limits }), ...(options.isCellDisabled === undefined ? {} : { isCellDisabled: options.isCellDisabled }),
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
    synchronizeView: (response: DataTreeGridViewResponse<LeafCells, GroupCells>) => { const before = base.getSnapshot(); const result = base.synchronizeView(response); if (result.ok) notify(before, result.value); return result; },
    syncControlledValues: (values: Parameters<typeof base.syncControlledValues>[0]) => { const before = base.getSnapshot(); const result = base.syncControlledValues(values); if (result.ok) notify(before, result.value); return result; },
    requestView: () => { const before = base.getSnapshot(); const result = base.requestView(); if (result.ok) notify(before, result.value); return result; },
    abandonRequest: (requestID: number) => { const before = base.getSnapshot(); const result = base.abandonRequest(requestID); if (result.ok) notify(before, result.value); return result; },
    getProjection: () => semantic.getProjection(),
  }); aliasVueProfileController(controller, base);
  hosts.set(controller, Object.freeze({ ...(options.columnSizeState === undefined ? {} : { columnSizes: options.columnSizeState.value }), ...(options.defaultColumnSizeState === undefined ? {} : { defaultColumnSizes: options.defaultColumnSizeState }), ...(options.onColumnSizeStateChange === undefined ? {} : { onColumnSizesChange: options.onColumnSizeStateChange }) }));
  if (options.initialView !== undefined) unwrap(controller.synchronizeView(options.initialView as DataTreeGridViewResponse<LeafCells, GroupCells>));
  const source = useProfileSource(controller, options.source, { ...(options.onSourceError === undefined ? {} : { onError: options.onSourceError }), ...(options.onSourceStatusChange === undefined ? {} : { onStatusChange: options.onSourceStatusChange }) });
  const desiredCursor = options.cursor?.value ?? options.defaultCursor; if (desiredCursor?.current !== null && desiredCursor?.current !== undefined && controller.getProjection().rows.length > 0) unwrap(controller.dispatch({ type: 'focus-cell', cell: desiredCursor.current }));
  const stops: Array<() => void> = []; const sync = () => unwrap(controller.syncControlledValues(controlledValues(options)));
  for (const source of [options.query, options.rowSelection, options.columnState, options.accessState, options.expansion]) if (source !== undefined) stops.push(watch(() => source.value, sync));
  if (options.sourceKey !== undefined) stops.push(watch(() => toValue(options.sourceKey!), () => { unwrap(controller.dispatch({ type: 'replace-source' })); }));
  if (options.cursor !== undefined) stops.push(watch(() => options.cursor!.value, (value) => { if (value.current !== null) unwrap(controller.dispatch({ type: 'focus-cell', cell: value.current })); }));
  if (options.editState !== undefined) stops.push(watch(() => options.editState!.value, (value) => { unwrap(controller.dispatch(value.kind === 'editing' ? { type: 'begin-edit', cell: value.cell } : { type: 'cancel-edit', reason: 'application' })); }));
  const rawDispose = controller.dispose; const wrapped = Object.freeze({ ...controller, status: source.status, error: source.error, reload: source.reload, cancel: source.cancel, replaceResolver: (resolver: DataTreeGridSourceResolver<LeafCells, GroupCells>) => source.replaceResolver(resolver as SourceResolver), dispose: () => { for (const stop of stops.splice(0)) stop(); source.dispose(); rawDispose(); } }) as DataTreeGridController<LeafCells, GroupCells>; aliasVueProfileController(wrapped, controller); hosts.set(wrapped, hosts.get(controller) ?? {}); if (getCurrentScope() !== undefined) onScopeDispose(wrapped.dispose); return wrapped;
}

export interface DataTreeGridContextValue extends Omit<ProfileContext<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand, HostConnection>, 'connection'> {}
const publicKey: InjectionKey<ProfileContext<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand, HostConnection>> = Symbol('SectileDataTreeGrid'); const privateKey: InjectionKey<ProfileContext<DataTreeGridState, DataTreeGridEvent, SemanticDataTreeGridCommand, HostConnection>> = Symbol('SectileDataTreeGridHost');
export function useDataTreeGridContext(): DataTreeGridContextValue { return useProfile(publicKey, 'useDataTreeGridContext'); }
const parts = createTabularParts({ profile: 'data-tree-grid', prefix: 'DataTreeGrid', publicKey, privateKey, connect: (element, controller, callbacks) => connectDataTreeGrid({ controller: controller as DataTreeGridController, root: element, ...hosts.get(controller), ...(callbacks.onCommand === undefined ? {} : { onCommand: callbacks.onCommand as DataTreeGridCommandHandler }), onSnapshotChange: callbacks.onSnapshotChange }) as unknown as HostConnection });

export interface DataTreeGridProviderProps {}
export interface DataTreeGridRootProps { readonly onCommand?: DataTreeGridCommandHandler; readonly onError?: DataTreeGridErrorHandler; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface DataTreeGridRootSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly acceptedViewState: DataTreeGridAcceptedViewState<LeafCells, GroupCells>; readonly requestState: DataTreeGridRequestState; readonly query: DataTreeGridQuery; readonly rowSelection: DataTreeGridRowSelection; readonly columnState: DataTreeGridColumnState; readonly accessState: DataTreeGridAccessState; readonly expansion: readonly DataTreeGridGroupID[]; readonly cursor: DataTreeGridCursorState; readonly editState: DataTreeGridEditState; readonly rows: readonly DataTreeGridViewRow<LeafCells, GroupCells>[] }
export interface DataTreeGridRootExpose<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> { readonly controller: DataTreeGridController<LeafCells, GroupCells>; refresh(): void }
export interface DataTreeGridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean } export type DataTreeGridHeaderRowProps = DataTreeGridPartProps; export type DataTreeGridColumnHeaderProps<Column extends string = string> = DataTreeGridPartProps & ({ readonly column: Column; readonly header?: never } | { readonly header: TabularHeaderNodeID; readonly column?: never });
export interface DataTreeGridSortTriggerProps<Column extends string = string> extends DataTreeGridPartProps { readonly column: Column; readonly comparator?: string } export type DataTreeGridFilterControlProps<Column extends string = string> = DataTreeGridPartProps & ({ readonly scope: 'global'; readonly id: string; readonly predicate: string } | { readonly scope: 'column'; readonly column: Column; readonly id: string; readonly predicate: string });
export interface DataTreeGridColumnResizeHandleProps<Column extends string = string> extends DataTreeGridPartProps { readonly column: Column; readonly minSize?: number; readonly maxSize?: number } export interface DataTreeGridRowProps extends DataTreeGridPartProps { readonly rowID: DataTreeGridRowID | DataTreeGridGroupID }
export interface DataTreeGridRowDisclosureProps extends DataTreeGridPartProps { readonly rowID?: DataTreeGridGroupID; readonly disabled?: boolean } export interface DataTreeGridRowSelectionControlProps extends DataTreeGridPartProps { readonly rowID?: DataTreeGridRowID; readonly name: string; readonly value?: string; readonly form?: string; readonly disabled?: boolean }
export interface DataTreeGridBulkSelectionControlProps extends DataTreeGridPartProps { readonly target: { readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: DataTreeGridGroupID }; readonly disabled?: boolean } export interface DataTreeGridCellProps<Column extends string = string> extends DataTreeGridPartProps { readonly rowID?: DataTreeGridRowID | DataTreeGridGroupID; readonly column: Column } export interface DataTreeGridEditorProps<Column extends string = string> extends DataTreeGridCellProps<Column> { readonly parseValue?: (value: string) => TabularResult<TabularWireValue>; readonly commitOnChange?: boolean }
export type DataTreeGridHeaderProps = DataTreeGridPartProps; export interface DataTreeGridBodyProps extends DataTreeGridPartProps { readonly manual?: boolean } export interface DataTreeGridPartSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends DataTreeGridRootSlotProps<LeafCells, GroupCells> { readonly row?: DataTreeGridViewRow<LeafCells, GroupCells>; readonly isGroup?: boolean } export type DataTreeGridProviderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>;
export interface DataTreeGridBodySlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> extends DataTreeGridRootSlotProps<LeafCells, GroupCells> { readonly row: DataTreeGridViewRow<LeafCells, GroupCells>; readonly rowIndex: number; readonly isGroup: boolean }
export type DataTreeGridHeaderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridHeaderRowSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridColumnHeaderSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridSortTriggerSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridFilterControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridColumnResizeHandleSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridRowSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridRowDisclosureSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridPartSlotProps<LeafCells, GroupCells>; export type DataTreeGridRowSelectionControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridPartSlotProps<LeafCells, GroupCells>; export type DataTreeGridBulkSelectionControlSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridRootSlotProps<LeafCells, GroupCells>; export type DataTreeGridCellSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridPartSlotProps<LeafCells, GroupCells>; export type DataTreeGridEditorSlotProps<LeafCells extends object = TabularCellRecord, GroupCells extends object = LeafCells> = DataTreeGridPartSlotProps<LeafCells, GroupCells>;

export interface DataTreeGridComponents<LeafCells extends object, GroupCells extends object = LeafCells> {
  readonly Provider: TabularComponent<DataTreeGridProviderProps, DataTreeGridProviderSlotProps<LeafCells, GroupCells>>;
  readonly Root: TabularComponent<DataTreeGridRootProps, DataTreeGridRootSlotProps<LeafCells, GroupCells>>;
  readonly Header: TabularComponent<DataTreeGridHeaderProps, DataTreeGridHeaderSlotProps<LeafCells, GroupCells>>;
  readonly HeaderRow: TabularComponent<DataTreeGridHeaderRowProps, DataTreeGridHeaderRowSlotProps<LeafCells, GroupCells>>;
  readonly ColumnHeader: TabularComponent<DataTreeGridColumnHeaderProps<DataTableColumnID<LeafCells, GroupCells>>, DataTreeGridColumnHeaderSlotProps<LeafCells, GroupCells>>;
  readonly SortTrigger: TabularComponent<DataTreeGridSortTriggerProps<DataTableColumnID<LeafCells, GroupCells>>, DataTreeGridSortTriggerSlotProps<LeafCells, GroupCells>>;
  readonly FilterControl: TabularComponent<DataTreeGridFilterControlProps<DataTableColumnID<LeafCells, GroupCells>>, DataTreeGridFilterControlSlotProps<LeafCells, GroupCells>>;
  readonly ColumnResizeHandle: TabularComponent<DataTreeGridColumnResizeHandleProps<DataTableColumnID<LeafCells, GroupCells>>, DataTreeGridColumnResizeHandleSlotProps<LeafCells, GroupCells>>;
  readonly Body: TabularBodyComponent<DataTreeGridBodyProps, DataTreeGridRootSlotProps<LeafCells, GroupCells>, DataTreeGridBodySlotProps<LeafCells, GroupCells>>;
  readonly Row: TabularComponent<DataTreeGridRowProps, DataTreeGridRowSlotProps<LeafCells, GroupCells>>;
  readonly RowDisclosure: TabularComponent<DataTreeGridRowDisclosureProps, DataTreeGridRowDisclosureSlotProps<LeafCells, GroupCells>>;
  readonly RowSelectionControl: TabularComponent<DataTreeGridRowSelectionControlProps, DataTreeGridRowSelectionControlSlotProps<LeafCells, GroupCells>>;
  readonly BulkSelectionControl: TabularComponent<DataTreeGridBulkSelectionControlProps, DataTreeGridBulkSelectionControlSlotProps<LeafCells, GroupCells>>;
  readonly Cell: TabularComponent<DataTreeGridCellProps<DataTableColumnID<LeafCells, GroupCells>>, DataTreeGridCellSlotProps<LeafCells, GroupCells>>;
  readonly Editor: TabularComponent<DataTreeGridEditorProps<DataTableColumnID<LeafCells, GroupCells>>, DataTreeGridEditorSlotProps<LeafCells, GroupCells>>;
}

const componentSuites = new WeakMap<object, Readonly<Record<string, Component>>>();
export function createDataTreeGridComponents<LeafCells extends object, GroupCells extends object>(controller: DataTreeGridController<LeafCells, GroupCells>): DataTreeGridComponents<LeafCells, GroupCells> {
  return createTabularComponentSuite(parts, controller, componentSuites, 'DataTreeGrid', {
    Root: 'Root',
    Header: 'Header',
    HeaderRow: 'HeaderRow',
    ColumnHeader: 'ColumnHeader',
    SortTrigger: 'SortTrigger',
    FilterControl: 'FilterControl',
    ColumnResizeHandle: 'ColumnResizeHandle',
    Body: 'Body',
    Row: 'Row',
    RowDisclosure: 'Disclosure',
    RowSelectionControl: 'SelectionControl',
    BulkSelectionControl: 'BulkSelectionControl',
    Cell: 'Cell',
    Editor: 'Editor',
  }) as unknown as DataTreeGridComponents<LeafCells, GroupCells>;
}

function assertExclusive(options: object, property: string): void { const values = options as Record<string, unknown>; const fallback = `default${property[0]!.toUpperCase()}${property.slice(1)}`; if (values[property] !== undefined && values[fallback] !== undefined) throw new TypeError(`${property} and ${fallback} are mutually exclusive.`); }
function unwrap<T>(result: TabularResult<T>): T { if (!result.ok) throw new TypeError(result.error.message); return result.value; }
export type { DataTreeGridCursorState, DataTreeGridEditState, DataTreeGridEvent, DataTreeGridExpansionState, DataTreeGridProjection, DataTreeGridState, DataTreeGridUpdate, SemanticDataTreeGridController };
