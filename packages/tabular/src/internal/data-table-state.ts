import { canonicalizeTabularAccessState } from './access.js';
import { canonicalizeTabularColumnState, projectTabularColumnPartitions, type TabularColumnPartitions } from './columns.js';
import { canonicalizeTabularExpansion } from './expansion.js';
import { fail, ok } from './foundation.js';
import { canonicalizeRowSelection, reconcileRowSelectionBinding } from './selection.js';
import { canonicalizeTabularStateQuery } from '../model.js';
import type {
  TabularAccessState,
  TabularCommand,
  TabularControlledValues,
  TabularGroupID,
  TabularModel,
  TabularResult,
  TabularRow,
  TabularRowSelection,
  TabularState,
} from '../contracts.js';

const models = new WeakMap<object, TabularModel>();

export function retainDataTableModel(controller: object, model: TabularModel): void {
  models.set(controller, model);
}

export function dataTableModelOf(controller: object): TabularModel {
  const model = models.get(controller);
  if (model === undefined) throw new Error('DataTable controller model is unavailable.');
  return model;
}

export function resetAccessForQuery(state: TabularAccessState): TabularAccessState {
  return state.kind === 'page'
    ? Object.freeze({ ...state, page: 1, visibleRowCount: null, pagination: null })
    : Object.freeze({
        kind: 'window' as const,
        window: Object.freeze({ ...state.window, start: 0, total: null, pending: null }),
      });
}

export function prepareControlledDataTableState(
  model: TabularModel,
  current: TabularState,
  values: TabularControlledValues,
): TabularResult<{ readonly state: TabularState; readonly commands: readonly TabularCommand[] }> {
  for (const key of ['query', 'rowSelection', 'columnState', 'accessState', 'expansion'] as const) {
    if ((values[key] !== undefined) !== model.controlled[key]) {
      return fail('transition-rejection', 'invalid-controlled-shape', 'Controlled values must preserve construction-time ownership.', { key });
    }
  }
  let next = current;
  let requestNeeded = false;
  if (values.query !== undefined && values.query !== current.query) {
    const query = canonicalizeTabularStateQuery(model, values.query);
    if (!query.ok) return query;
    const queryRevision = next.queryRevision + 1;
    next = Object.freeze({
      ...next,
      query: query.value,
      queryRevision,
      rowSelection: reconcileRowSelectionBinding(next.rowSelection, next.sourceGeneration, queryRevision, false),
      ...(!model.controlled.accessState ? { accessState: resetAccessForQuery(next.accessState) } : {}),
    });
    requestNeeded = true;
  }
  if (values.rowSelection !== undefined) {
    const selection = canonicalizeRowSelection(values.rowSelection, model.limits);
    if (!selection.ok) return selection;
    next = Object.freeze({ ...next, rowSelection: selection.value });
  }
  if (values.columnState !== undefined) {
    const schema = current.acceptedViewState.kind === 'none' ? model : current.acceptedViewState.view.columnSchema;
    const columnState = canonicalizeTabularColumnState(values.columnState, schema.columns, schema.headers);
    if (!columnState.ok) return columnState;
    const changed = !sameIDs(current.columnState.order, columnState.value.order)
      || !sameIDs(current.columnState.hidden, columnState.value.hidden)
      || !sameIDs(current.columnState.pinnedStart, columnState.value.pinnedStart)
      || !sameIDs(current.columnState.pinnedEnd, columnState.value.pinnedEnd);
    next = Object.freeze({
      ...next,
      columnState: columnState.value,
      projectionGeneration: changed ? next.projectionGeneration + 1 : next.projectionGeneration,
    });
  }
  if (values.accessState !== undefined && values.accessState !== current.accessState) {
    const accessState = canonicalizeTabularAccessState(values.accessState);
    if (!accessState.ok) return accessState;
    next = Object.freeze({ ...next, accessState: accessState.value });
    requestNeeded = true;
  }
  if (values.expansion !== undefined && values.expansion !== current.expansion) {
    const expansion = canonicalizeTabularExpansion(values.expansion, model.limits);
    if (!expansion.ok) return expansion;
    next = Object.freeze({ ...next, expansion: expansion.value, expansionRevision: next.expansionRevision + 1 });
    requestNeeded = true;
  }
  return requestNeeded ? issueDataTableRequest(next) : ok(Object.freeze({ state: next, commands: Object.freeze([]) }));
}

export interface DataTableStateProjection {
  readonly generation: number;
  readonly rows: readonly TabularRow[];
  readonly columns: TabularColumnPartitions;
  readonly rowSelection: TabularRowSelection;
  readonly expansion: readonly TabularGroupID[];
}

export function projectDataTableState(state: TabularState): DataTableStateProjection {
  return Object.freeze({
    generation: state.projectionGeneration,
    rows: state.acceptedViewState.kind === 'none' ? Object.freeze([]) : state.acceptedViewState.view.rows,
    columns: projectTabularColumnPartitions(state.columnState),
    rowSelection: state.rowSelection,
    expansion: state.expansion,
  });
}

function sameIDs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function issueDataTableRequest(state: TabularState): TabularResult<{ readonly state: TabularState; readonly commands: readonly TabularCommand[] }> {
  if (state.requestRevision === Number.MAX_SAFE_INTEGER) return fail('resource-rejection', 'revision-ceiling-reached', 'Request revision is exhausted.');
  const request = Object.freeze({
    protocolVersion: 1 as const,
    requestID: state.requestRevision + 1,
    sourceGeneration: state.sourceGeneration,
    queryRevision: state.queryRevision,
    expansionRevision: state.expansionRevision,
    query: state.query,
    expansion: state.expansion,
    access: state.accessState.kind === 'page'
      ? Object.freeze({ kind: 'page' as const, page: state.accessState.page, itemsPerPage: state.accessState.itemsPerPage })
      : Object.freeze({ kind: 'window' as const, start: state.accessState.window.start, count: state.accessState.window.size }),
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
