import { createPaginationModel, tryCreatePaginationState } from '@sectile/core/pagination';
import { unwrap } from '@sectile/core/result';
import { canonicalizeTabularColumnState, projectTabularColumnPartitions, reconcileTabularColumns } from './internal/columns.js';
import { canonicalizeTabularAccessState } from './internal/access.js';
import { canonicalizeTabularExpansion } from './internal/expansion.js';
import { fail, ok } from './internal/foundation.js';
import {
  canonicalizeRowSelection,
  createGroupLeafSelectionTarget,
  reconcileAuthoritativeRowRemoval,
  reconcileRowSelectionBinding,
  selectAllMatchingRows,
  setVisibleRowSelectionRange,
  toggleExplicitRowSelection,
} from './internal/selection.js';
import { canonicalizeTabularStateQuery, tryCreateTabularModel, tryCreateTabularState } from './model.js';
import { synchronizeTabularView } from './source.js';
import type {
  TabularAccessState,
  TabularCellAddress,
  TabularColumnState,
  TabularCommand,
  TabularControlledValues,
  TabularGroupID,
  TabularModel,
  TabularOptions,
  TabularQuery,
  TabularRequest,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularRowSelection,
  TabularSnapshot,
  TabularState,
  TabularViewResponse,
  TabularWireValue,
} from './contracts.js';

export { rowSelectionContains } from './internal/selection.js';

export type DataTableState = TabularState;

export interface DataTableOptions extends TabularOptions {
  readonly onQueryChange?: (query: TabularQuery) => void;
  readonly onRowSelectionChange?: (selection: TabularRowSelection) => void;
  readonly onColumnStateChange?: (state: TabularColumnState) => void;
  readonly onAccessStateChange?: (state: TabularAccessState) => void;
  readonly onExpansionChange?: (expansion: readonly TabularGroupID[]) => void;
}

export type DataTableEvent =
  | { readonly type: 'set-query'; readonly query: TabularQuery }
  | { readonly type: 'set-row-selection'; readonly selection: TabularRowSelection }
  | { readonly type: 'toggle-row-selection'; readonly rowID: TabularRowID }
  | { readonly type: 'set-row-selection-range'; readonly anchorRowID: TabularRowID; readonly rowID: TabularRowID; readonly selected: boolean }
  | { readonly type: 'select-all-matching' }
  | { readonly type: 'request-group-leaf-selection'; readonly groupID: TabularGroupID }
  | { readonly type: 'set-column-state'; readonly columnState: TabularColumnState }
  | { readonly type: 'set-access'; readonly accessState: TabularAccessState }
  | { readonly type: 'set-expansion'; readonly expansion: readonly TabularGroupID[] }
  | { readonly type: 'request-value-commit'; readonly cell: TabularCellAddress; readonly value: TabularWireValue }
  | { readonly type: 'request-view' }
  | { readonly type: 'replace-source' }
  | { readonly type: 'reset' };

export type DataTableCommand =
  | TabularCommand
  | { readonly type: 'request-value-commit'; readonly cell: TabularCellAddress; readonly value: TabularWireValue };

export interface DataTableUpdate {
  readonly snapshot: TabularSnapshot;
  readonly commands: readonly DataTableCommand[];
}

export interface DataTableProjection {
  readonly generation: number;
  readonly rows: readonly TabularRow[];
  readonly columns: {
    readonly start: readonly string[];
    readonly center: readonly string[];
    readonly end: readonly string[];
  };
  readonly rowSelection: TabularRowSelection;
  readonly expansion: readonly TabularGroupID[];
}

export interface DataTableController {
  getSnapshot(): TabularSnapshot;
  getProjection(): DataTableProjection;
  dispatch(event: DataTableEvent, expectedRevision?: number): TabularResult<DataTableUpdate>;
  synchronizeView(response: TabularViewResponse): TabularResult<TabularSnapshot>;
  syncControlledValues(values: TabularControlledValues): TabularResult<TabularSnapshot>;
  requestView(): TabularResult<TabularSnapshot>;
  abandonRequest(requestID: number): TabularResult<TabularSnapshot>;
  subscribeCommands(listener: (command: DataTableCommand) => void): () => void;
  attachRequestExecutor(listener: (command: Extract<DataTableCommand, { readonly type: 'request-view' }>) => void): TabularResult<() => void>;
  dispose(): void;
}

export function createDataTable(options: DataTableOptions): DataTableController {
  return unwrap(tryCreateDataTable(options));
}

export function tryCreateDataTable(options: DataTableOptions): TabularResult<DataTableController> {
  const model = tryCreateTabularModel(options);
  if (!model.ok) return model;
  const state = tryCreateTabularState(model.value);
  if (!state.ok) return state;
  const requested = issueRequest(state.value);
  if (!requested.ok) return requested;
  return ok(new DataTableRuntime(options, model.value, Object.freeze({ revision: 0, state: requested.value.state })));
}

export function applyDataTableEvent(
  model: TabularModel,
  snapshot: TabularSnapshot,
  event: DataTableEvent,
  expectedRevision: number = snapshot.revision,
): TabularResult<DataTableUpdate> {
  if (expectedRevision !== snapshot.revision || !Number.isSafeInteger(expectedRevision)) {
    return fail('transition-rejection', 'stale-revision', 'Expected DataTable revision is stale.', {
      expectedRevision,
      currentRevision: snapshot.revision,
    });
  }
  if (snapshot.revision === Number.MAX_SAFE_INTEGER) return fail('resource-rejection', 'revision-ceiling-reached', 'DataTable revision is exhausted.');
  const reduced = reduceDataTableEvent(model, snapshot.state, event);
  if (!reduced.ok) return reduced;
  return ok(Object.freeze({
    snapshot: Object.freeze({ revision: snapshot.revision + 1, state: reduced.value.state }),
    commands: reduced.value.commands,
  }));
}

class DataTableRuntime implements DataTableController {
  readonly #options: DataTableOptions;
  readonly #model: TabularModel;
  #snapshot: TabularSnapshot;
  readonly #listeners = new Set<(command: DataTableCommand) => void>();
  #executor: ((command: Extract<DataTableCommand, { readonly type: 'request-view' }>) => void) | null = null;
  #disposed = false;

  public constructor(options: DataTableOptions, model: TabularModel, snapshot: TabularSnapshot) {
    this.#options = options;
    this.#model = model;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): TabularSnapshot { return this.#snapshot; }

  public getProjection(): DataTableProjection {
    const state = this.#snapshot.state;
    return Object.freeze({
      generation: state.projectionGeneration,
      rows: state.acceptedViewState.kind === 'none' ? Object.freeze([]) : state.acceptedViewState.view.rows,
      columns: projectTabularColumnPartitions(state.columnState),
      rowSelection: state.rowSelection,
      expansion: state.expansion,
    });
  }

  public dispatch(event: DataTableEvent, expectedRevision: number = this.#snapshot.revision): TabularResult<DataTableUpdate> {
    if (this.#disposed) return dataTableDisposed('dispatch events');
    const proposed = applyDataTableEvent(this.#model, this.#snapshot, event, expectedRevision);
    if (!proposed.ok) return proposed;
    const before = this.#snapshot.state;
    const proposedState = proposed.value.snapshot.state;
    const controlledRequestProposal = (
      (this.#model.controlled.query && proposedState.query !== before.query)
      || (this.#model.controlled.accessState && proposedState.accessState !== before.accessState)
      || (this.#model.controlled.expansion && proposedState.expansion !== before.expansion)
    );
    const reconciled = this.#reconcileControlled(before, proposed.value.snapshot.state);
    if (!reconciled.ok) return reconciled;
    const committedState = controlledRequestProposal
      ? Object.freeze({
          ...reconciled.value,
          requestRevision: before.requestRevision,
          requestState: before.requestState,
          acceptedViewState: before.acceptedViewState,
          ...((this.#model.controlled.query && proposedState.query !== before.query)
            ? { queryRevision: before.queryRevision, rowSelection: before.rowSelection }
            : {}),
          ...((this.#model.controlled.expansion && proposedState.expansion !== before.expansion)
            ? { expansionRevision: before.expansionRevision }
            : {}),
        })
      : reconciled.value;
    const candidateCommands = controlledRequestProposal
      ? proposed.value.commands.filter((command) => command.type !== 'request-view')
      : proposed.value.commands;
    const snapshot = Object.freeze({ revision: proposed.value.snapshot.revision, state: committedState });
    this.#snapshot = snapshot;
    const commands = Object.freeze(candidateCommands.filter((command) => (
      command.type !== 'request-view'
      || snapshot.state.requestState.pendingRequest?.requestID === command.request.requestID
    )));
    const update = Object.freeze({ snapshot, commands });
    let firstError: unknown;
    let hasError = false;
    try { this.#emit(commands); }
    catch (error) { hasError = true; firstError = error; }
    try { this.#notifyControlled(before, proposedState); }
    catch (error) {
      if (!hasError) { hasError = true; firstError = error; }
    }
    if (hasError) throw firstError;
    return ok(update);
  }

  public synchronizeView(response: TabularViewResponse): TabularResult<TabularSnapshot> {
    if (this.#disposed) return dataTableDisposed('synchronize view responses');
    const pending = this.#snapshot.state.requestState.pendingRequest;
    if (pending === null) return fail('transition-rejection', 'stale-request', 'No request is pending for this response.');
    const currentView = this.#snapshot.state.acceptedViewState.kind === 'none' ? null : this.#snapshot.state.acceptedViewState.view;
    const view = synchronizeTabularView(pending, response, currentView, this.#model.limits);
    if (!view.ok) return view;
    const previousColumns = currentView?.columnSchema.columns ?? this.#model.columns;
    const columnState = reconcileTabularColumns(
      previousColumns,
      this.#snapshot.state.columnState,
      view.value.columnSchema.columns,
      this.#model.limits,
      view.value.columnSchema.headers,
    );
    if (!columnState.ok) return columnState;
    const accessState = synchronizeAccess(this.#snapshot.state.accessState, view.value);
    if (!accessState.ok) return accessState;
    const projectionChanged = !sameProjection(this.#snapshot.state, view.value, columnState.value);
    const state = Object.freeze({
      ...this.#snapshot.state,
      columnState: columnState.value,
      accessState: accessState.value,
      columnSchemaRevision: view.value.columnSchema.revision,
      rowSelection: reconcileAuthoritativeRowRemoval(this.#snapshot.state.rowSelection, response.removedRowIDs),
      requestState: Object.freeze({ kind: 'ready' as const, pendingRequest: null }),
      acceptedViewState: Object.freeze({ kind: 'current' as const, view: view.value }),
      projectionGeneration: projectionChanged
        ? this.#snapshot.state.projectionGeneration + 1
        : this.#snapshot.state.projectionGeneration,
    });
    return this.#replaceState(state);
  }

  public syncControlledValues(values: TabularControlledValues): TabularResult<TabularSnapshot> {
    if (this.#disposed) return dataTableDisposed('synchronize controlled values');
    const current = this.#snapshot.state;
    for (const key of ['query', 'rowSelection', 'columnState', 'accessState', 'expansion'] as const) {
      if ((values[key] !== undefined) !== this.#model.controlled[key]) {
        return fail('transition-rejection', 'invalid-controlled-shape', 'Controlled values must preserve construction-time ownership.', { key });
      }
    }
    let next = current;
    let requestNeeded = false;
    if (values.query !== undefined && values.query !== current.query) {
      const query = canonicalizeTabularStateQuery(this.#model, values.query);
      if (!query.ok) return query;
      next = Object.freeze({ ...next, query: query.value, queryRevision: next.queryRevision + 1,
        rowSelection: reconcileRowSelectionBinding(next.rowSelection, next.sourceGeneration, next.queryRevision + 1, false) });
      requestNeeded = true;
    }
    if (values.rowSelection !== undefined) {
      const selection = canonicalizeRowSelection(values.rowSelection, this.#model.limits);
      if (!selection.ok) return selection;
      next = Object.freeze({ ...next, rowSelection: selection.value });
    }
    if (values.columnState !== undefined) {
      const schema = activeColumnSchema(this.#model, current);
      const columnState = canonicalizeTabularColumnState(values.columnState, schema.columns, schema.headers);
      if (!columnState.ok) return columnState;
      next = Object.freeze({
      ...next,
      columnState: columnState.value,
      projectionGeneration: sameColumnProjection(current.columnState, columnState.value)
        ? next.projectionGeneration
        : next.projectionGeneration + 1,
      });
    }
    if (values.accessState !== undefined && values.accessState !== current.accessState) {
      const accessState = canonicalizeTabularAccessState(values.accessState);
      if (!accessState.ok) return accessState;
      next = Object.freeze({ ...next, accessState: accessState.value });
      requestNeeded = true;
    }
    if (values.expansion !== undefined && values.expansion !== current.expansion) {
      const expansion = canonicalizeTabularExpansion(values.expansion, this.#model.limits);
      if (!expansion.ok) return expansion;
      next = Object.freeze({ ...next, expansion: expansion.value, expansionRevision: next.expansionRevision + 1 });
      requestNeeded = true;
    }
    if (requestNeeded) {
      const request = issueRequest(next);
      if (!request.ok) return request;
      next = request.value.state;
    }
    const replaced = this.#replaceState(next);
    if (replaced.ok && requestNeeded) this.#emit([{ type: 'request-view', request: next.requestState.pendingRequest! }]);
    return replaced;
  }

  public requestView(): TabularResult<TabularSnapshot> {
    const update = this.dispatch({ type: 'request-view' });
    return update.ok ? ok(update.value.snapshot) : update;
  }

  public abandonRequest(requestID: number): TabularResult<TabularSnapshot> {
    if (this.#disposed) return dataTableDisposed('abandon requests');
    const state = this.#snapshot.state;
    if (state.requestState.pendingRequest?.requestID !== requestID) return fail('transition-rejection', 'stale-request', 'Request ID does not identify the active request.');
    const ready = state.acceptedViewState.kind === 'current';
    return this.#replaceState(Object.freeze({
      ...state,
      requestState: ready
        ? Object.freeze({ kind: 'ready' as const, pendingRequest: null })
        : Object.freeze({ kind: 'idle' as const, pendingRequest: null }),
    }));
  }

  public subscribeCommands(listener: (command: DataTableCommand) => void): () => void {
    if (!this.#disposed) this.#listeners.add(listener);
    let active = true;
    return () => { if (active) { active = false; this.#listeners.delete(listener); } };
  }

  public attachRequestExecutor(listener: (command: Extract<DataTableCommand, { readonly type: 'request-view' }>) => void): TabularResult<() => void> {
    if (this.#disposed) return dataTableDisposed('attach request executors');
    if (this.#executor !== null) return fail('construction', 'duplicate-source-executor', 'Only one request executor may attach to a DataTable controller.');
    this.#executor = listener;
    const pending = this.#snapshot.state.requestState.pendingRequest;
    if (pending !== null) {
      try {
        listener(Object.freeze({ type: 'request-view', request: pending }));
      } catch (error) {
        if (this.#executor === listener) this.#executor = null;
        throw error;
      }
    }
    let active = true;
    return ok(() => { if (active) { active = false; if (this.#executor === listener) this.#executor = null; } });
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#listeners.clear();
    this.#executor = null;
  }

  #replaceState(state: TabularState): TabularResult<TabularSnapshot> {
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return fail('resource-rejection', 'revision-ceiling-reached', 'DataTable revision is exhausted.');
    this.#snapshot = Object.freeze({ revision: this.#snapshot.revision + 1, state });
    return ok(this.#snapshot);
  }

  #reconcileControlled(current: TabularState, proposed: TabularState): TabularResult<TabularState> {
    let reconciled = proposed;
    for (const key of ['query', 'rowSelection', 'columnState', 'accessState', 'expansion'] as const) {
      if (this.#model.controlled[key]) reconciled = Object.freeze({ ...reconciled, [key]: current[key] });
    }
    return ok(reconciled);
  }

  #notifyControlled(previous: TabularState, proposed: TabularState): void {
    const callbacks = {
      query: this.#options.onQueryChange,
      rowSelection: this.#options.onRowSelectionChange,
      columnState: this.#options.onColumnStateChange,
      accessState: this.#options.onAccessStateChange,
      expansion: this.#options.onExpansionChange,
    };
    let firstError: unknown;
    let hasError = false;
    for (const key of ['query', 'rowSelection', 'columnState', 'accessState', 'expansion'] as const) {
      if (proposed[key] === previous[key]) continue;
      try { callbacks[key]?.(proposed[key] as never); }
      catch (error) {
        if (!hasError) { hasError = true; firstError = error; }
      }
    }
    if (hasError) throw firstError;
  }

  #emit(commands: readonly DataTableCommand[]): void {
    const listeners = [...this.#listeners];
    const executor = this.#executor;
    let firstError: unknown;
    let failed = false;
    for (const command of commands) {
      for (const listener of listeners) {
        try {
          listener(command);
        } catch (error) {
          if (!failed) { failed = true; firstError = error; }
        }
      }
      if (command.type === 'request-view' && executor !== null) {
        try {
          executor(command);
        } catch (error) {
          if (!failed) { failed = true; firstError = error; }
        }
      }
    }
    if (failed) throw firstError;
  }
}

function dataTableDisposed<T>(operation: string): TabularResult<T> {
  return fail('transition-rejection', 'controller-disposed', `Disposed DataTable controller cannot ${operation}.`);
}

function reduceDataTableEvent(
  model: TabularModel,
  state: TabularState,
  event: DataTableEvent,
): TabularResult<{ readonly state: TabularState; readonly commands: readonly DataTableCommand[] }> {
  if (typeof event !== 'object' || event === null) {
    return fail('transition-rejection', 'invalid-data-table-event', 'DataTable event must be a recognized event object.');
  }
  if (event.type === 'request-value-commit') return ok(Object.freeze({ state, commands: Object.freeze([event]) }));
  if (event.type === 'request-group-leaf-selection') {
    const target = createGroupLeafSelectionTarget(state.rowSelection, event.groupID, state.sourceGeneration, state.queryRevision, model.limits);
    return target.ok ? ok(Object.freeze({ state, commands: Object.freeze([{ type: 'request-bulk-selection' as const, target: target.value }]) })) : target;
  }
  if (event.type === 'set-row-selection') {
    const valid = canonicalizeRowSelection(event.selection, model.limits);
    if (!valid.ok) return valid;
    return ok(Object.freeze({ state: Object.freeze({ ...state, rowSelection: valid.value }), commands: Object.freeze([]) }));
  }
  if (event.type === 'toggle-row-selection') {
    const selection = toggleExplicitRowSelection(state.rowSelection, event.rowID, model.limits);
    return selection.ok ? ok(Object.freeze({ state: Object.freeze({ ...state, rowSelection: selection.value }), commands: Object.freeze([]) })) : selection;
  }
  if (event.type === 'set-row-selection-range') {
    const visibleRowIDs = state.acceptedViewState.kind === 'none'
      ? Object.freeze([])
      : Object.freeze(state.acceptedViewState.view.rows.filter((row) => row.kind === 'leaf').map((row) => row.id));
    const selection = setVisibleRowSelectionRange(
      state.rowSelection,
      visibleRowIDs,
      event.anchorRowID,
      event.rowID,
      event.selected,
      model.limits,
    );
    return selection.ok ? ok(Object.freeze({ state: Object.freeze({ ...state, rowSelection: selection.value }), commands: Object.freeze([]) })) : selection;
  }
  if (event.type === 'select-all-matching') {
    const selection = selectAllMatchingRows(state.sourceGeneration, state.queryRevision, model.limits);
    return selection.ok ? ok(Object.freeze({ state: Object.freeze({ ...state, rowSelection: selection.value }), commands: Object.freeze([]) })) : selection;
  }
  if (event.type === 'set-column-state') {
    const schema = activeColumnSchema(model, state);
    const columnState = canonicalizeTabularColumnState(event.columnState, schema.columns, schema.headers);
    if (!columnState.ok) return columnState;
    return ok(Object.freeze({
      state: Object.freeze({
        ...state,
        columnState: columnState.value,
        projectionGeneration: sameColumnProjection(state.columnState, columnState.value)
          ? state.projectionGeneration
          : state.projectionGeneration + 1,
      }),
      commands: Object.freeze([]),
    }));
  }
  if (event.type === 'set-access') {
    const accessState = canonicalizeTabularAccessState(event.accessState);
    return accessState.ok ? requestAfter(Object.freeze({ ...state, accessState: accessState.value })) : accessState;
  }
  if (event.type === 'set-query') {
    const query = canonicalizeTabularStateQuery(model, event.query);
    if (!query.ok) return query;
    const queryRevision = state.queryRevision + 1;
    return requestAfter(Object.freeze({
      ...state,
      query: query.value,
      queryRevision,
      rowSelection: reconcileRowSelectionBinding(state.rowSelection, state.sourceGeneration, queryRevision, false),
      accessState: state.accessState.kind === 'page' ? Object.freeze({ ...state.accessState, page: 1, visibleRowCount: null, pagination: null }) : state.accessState,
    }));
  }
  if (event.type === 'set-expansion') {
    const expansion = canonicalizeTabularExpansion(event.expansion, model.limits);
    return expansion.ok
      ? requestAfter(Object.freeze({ ...state, expansion: expansion.value, expansionRevision: state.expansionRevision + 1 }))
      : expansion;
  }
  if (event.type === 'replace-source') return requestAfter(Object.freeze({
    ...state,
    sourceGeneration: state.sourceGeneration + 1,
    rowSelection: reconcileRowSelectionBinding(state.rowSelection, state.sourceGeneration + 1, state.queryRevision, true),
    expansion: Object.freeze([]),
    expansionRevision: 0,
    acceptedViewState: Object.freeze({ kind: 'none' }),
  }));
  if (event.type === 'reset') {
    const initial = tryCreateTabularState(model);
    return initial.ok ? requestAfter(initial.value) : initial;
  }
  if (event.type === 'request-view') return requestAfter(state);
  return fail('transition-rejection', 'invalid-data-table-event', 'DataTable event type is not recognized.');
}

function activeColumnSchema(model: TabularModel, state: TabularState): Pick<TabularModel, 'columns' | 'headers'> {
  return state.acceptedViewState.kind === 'none'
    ? model
    : state.acceptedViewState.view.columnSchema;
}

function requestAfter(state: TabularState): TabularResult<{ readonly state: TabularState; readonly commands: readonly DataTableCommand[] }> {
  const requested = issueRequest(state);
  return requested.ok ? ok(Object.freeze({ state: requested.value.state, commands: requested.value.commands })) : requested;
}

function issueRequest(state: TabularState): TabularResult<{ readonly state: TabularState; readonly commands: readonly DataTableCommand[] }> {
  if (state.requestRevision === Number.MAX_SAFE_INTEGER) return fail('resource-rejection', 'revision-ceiling-reached', 'Request revision is exhausted.');
  const request: TabularRequest = Object.freeze({
    protocolVersion: 1,
    requestID: state.requestRevision + 1,
    sourceGeneration: state.sourceGeneration,
    queryRevision: state.queryRevision,
    expansionRevision: state.expansionRevision,
    query: state.query,
    expansion: state.expansion,
    access: state.accessState.kind === 'page'
      ? Object.freeze({ kind: 'page', page: state.accessState.page, itemsPerPage: state.accessState.itemsPerPage })
      : Object.freeze({ kind: 'window', start: state.accessState.window.start, count: state.accessState.window.size }),
    columnSchemaRevision: state.columnSchemaRevision,
  });
  const next = Object.freeze({
    ...state,
    requestRevision: request.requestID,
    requestState: Object.freeze({ kind: 'pending' as const, pendingRequest: request }),
    acceptedViewState: state.acceptedViewState.kind === 'current'
      ? Object.freeze({ kind: 'stale' as const, view: state.acceptedViewState.view })
      : state.acceptedViewState,
  });
  return ok(Object.freeze({ state: next, commands: Object.freeze([{ type: 'request-view' as const, request }]) }));
}

function synchronizeAccess(state: TabularAccessState, view: { readonly visibleRowCount: { readonly kind: string; readonly value?: number } }): TabularResult<TabularAccessState> {
  if (state.kind === 'window') return ok(state);
  if (view.visibleRowCount.kind !== 'known' || view.visibleRowCount.value === undefined) return fail('transition-rejection', 'response-envelope-mismatch', 'Page view requires a known visible count.');
  const model = createPaginationModel({ total: view.visibleRowCount.value, itemsPerPage: state.itemsPerPage });
  const pagination = tryCreatePaginationState(model, state.page, state.itemsPerPage);
  return pagination.ok
    ? ok(Object.freeze({ ...state, visibleRowCount: view.visibleRowCount.value, pagination: pagination.value }))
    : fail('transition-rejection', 'response-envelope-mismatch', pagination.error.message, pagination.error.details);
}

function sameProjection(
  state: TabularState,
  view: { readonly rows: readonly TabularRow[] },
  columns: TabularColumnState,
): boolean {
  const currentView = state.acceptedViewState.kind === 'none' ? null : state.acceptedViewState.view;
  const previousRows = currentView?.rows ?? [];
  return previousRows.length === view.rows.length
    && previousRows.every((row, index) => row.id === view.rows[index]?.id)
    && sameColumnProjection(state.columnState, columns);
}

function sameColumnProjection(left: TabularColumnState, right: TabularColumnState): boolean {
  return sameIDs(left.order, right.order)
    && sameIDs(left.hidden, right.hidden)
    && sameIDs(left.pinnedStart, right.pinnedStart)
    && sameIDs(left.pinnedEnd, right.pinnedEnd);
}

function sameIDs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export type {
  TabularAccessState,
  TabularCellAddress,
  TabularColumnState,
  TabularControlledValues,
  TabularQuery,
  TabularRequest,
  TabularRowSelection,
  TabularSnapshot,
  TabularViewResponse,
  TabularWireValue,
} from './contracts.js';
