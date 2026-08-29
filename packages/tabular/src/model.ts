import { unwrap } from '@sectile/core/result';
import { fail, ok, validateID } from './internal/foundation.js';
import { canonicalizeRowSelection } from './internal/selection.js';
import type {
  TabularAccessState,
  TabularCellAddress,
  TabularCellRecord,
  TabularCellID,
  TabularColumnDefinition,
  TabularColumnState,
  TabularControlledOwnership,
  TabularControlledValues,
  TabularEvent,
  TabularHeaderNode,
  TabularLimits,
  TabularModel,
  TabularOptions,
  TabularQuery,
  TabularResult,
  TabularRowSelection,
  TabularSnapshot,
  TabularState,
  TabularUpdate,
} from './contracts.js';

const DEFAULT_TABULAR_LIMITS: TabularLimits = Object.freeze({
  maxIDCodeUnits: 1_024,
  maxRows: 100_000,
  maxColumns: 10_000,
  maxProjectedCells: 1_000_000,
  maxGroupDepth: 1_024,
  maxSortRules: 64,
  maxFilterRules: 256,
  maxGroupDescriptors: 64,
  maxAggregateDescriptors: 256,
  maxPivotDescriptors: 64,
  maxPivotColumns: 10_000,
  maxSelectionIDs: 100_000,
  maxScanRecords: 1_000_000,
  maxQueryValueDepth: 32,
  maxQueryValueCodeUnits: 1_048_576,
  maxQueryValueNodes: 100_000,
  maxLiveRequestGenerations: 1,
});

const EMPTY_QUERY: TabularQuery = Object.freeze({
  sort: Object.freeze([]),
  filters: Object.freeze([]),
  groups: Object.freeze([]),
  aggregates: Object.freeze([]),
  pivots: Object.freeze([]),
});

const CONTROLLED_KEYS = Object.freeze([
  'query', 'rowSelection', 'columnState', 'accessState', 'expansion',
] as const);

export function createTabularModel(options: TabularOptions): TabularModel {
  return unwrap(tryCreateTabularModel(options));
}

export function tryCreateTabularModel(options: TabularOptions): TabularResult<TabularModel> {
  if (options === null || typeof options !== 'object' || !Array.isArray(options.columns)) {
    return fail('construction', 'invalid-column-definition', 'Tabular columns must be an array.');
  }
  const limitsResult = normalizeLimits(options.limits);
  if (!limitsResult.ok) return limitsResult;
  const limits = limitsResult.value;
  if (options.columns.length > limits.maxColumns) {
    return fail('resource-rejection', 'column-ceiling-exceeded', 'Column count exceeds the configured ceiling.', {
      actual: options.columns.length,
      ceiling: limits.maxColumns,
    });
  }
  const columnsResult = normalizeColumns(options.columns, limits);
  if (!columnsResult.ok) return columnsResult;
  const headersResult = normalizeHeaders(options.headers ?? [], columnsResult.value, limits);
  if (!headersResult.ok) return headersResult;
  const controlledResult = normalizeControlled(options.controlled, options.initialValues);
  if (!controlledResult.ok) return controlledResult;
  const preliminary: TabularModel = Object.freeze({
    columns: columnsResult.value,
    headers: headersResult.value,
    limits,
    controlled: controlledResult.value,
    initialValues: Object.freeze({ ...(options.initialValues ?? {}) }),
  });
  const initialState = tryCreateTabularState(preliminary, options.initialValues);
  if (!initialState.ok) return initialState;
  return ok(Object.freeze({
    ...preliminary,
    initialValues: Object.freeze({
      query: initialState.value.query,
      rowSelection: initialState.value.rowSelection,
      columnState: initialState.value.columnState,
      accessState: initialState.value.accessState,
      expansion: initialState.value.expansion,
    }),
  }));
}

export function tryCreateTabularState(
  model: TabularModel,
  values?: TabularControlledValues,
): TabularResult<TabularState> {
  const suppliedValues = values === undefined
    ? model.initialValues
    : { ...model.initialValues, ...values };
  const columnOrder = model.columns.map((column) => column.id);
  const defaults: TabularControlledValues = {
    query: EMPTY_QUERY,
    rowSelection: Object.freeze({ kind: 'explicit-rows', rowIDs: Object.freeze([]) }),
    columnState: Object.freeze({
      order: Object.freeze(columnOrder),
      hidden: Object.freeze(model.columns.filter((column) => column.initialVisible === false).map((column) => column.id)),
      pinnedStart: Object.freeze(model.columns.filter((column) => column.initialPin === 'start').map((column) => column.id)),
      pinnedEnd: Object.freeze(model.columns.filter((column) => column.initialPin === 'end').map((column) => column.id)),
    }),
    accessState: Object.freeze({
      kind: 'page',
      page: 1,
      itemsPerPage: 25,
      visibleRowCount: null,
      pagination: null,
    }),
    expansion: Object.freeze([]),
  };
  const merged: TabularControlledValues = { ...defaults, ...suppliedValues };
  for (const key of CONTROLLED_KEYS) {
    if (model.controlled[key] && suppliedValues[key] === undefined) {
      return fail('construction', 'controlled-value-required', `Controlled ${key} requires an initial value.`, { key });
    }
  }
  const reconciled = validateSlices(model, merged);
  if (!reconciled.ok) return reconciled;
  return ok(Object.freeze({
    ...reconciled.value,
    queryRevision: 0,
    expansionRevision: 0,
    sourceGeneration: 0,
    requestRevision: 0,
    columnSchemaRevision: 0,
    projectionGeneration: 0,
    requestState: Object.freeze({ kind: 'idle', pendingRequest: null }),
    acceptedViewState: Object.freeze({ kind: 'none' }),
  }));
}

export function applyTabularEvent(
  model: TabularModel,
  snapshot: TabularSnapshot,
  expectedRevision: number,
  event: TabularEvent,
): TabularResult<TabularUpdate> {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== snapshot.revision) {
    return fail('transition-rejection', 'stale-revision', 'Expected revision does not match the Tabular snapshot.', {
      expectedRevision,
      currentRevision: snapshot.revision,
    });
  }
  if (snapshot.revision === Number.MAX_SAFE_INTEGER) {
    return fail('resource-rejection', 'revision-ceiling-reached', 'Tabular revision cannot advance further.');
  }
  const next = event.type === 'reset'
    ? tryCreateTabularState(model, controlledSubset(model, snapshot.state))
    : reconcileTabularState(model, snapshot.state, event.values);
  if (!next.ok) return next;
  return ok(Object.freeze({
    snapshot: Object.freeze({ revision: snapshot.revision + 1, state: next.value }),
    commands: Object.freeze([]),
  }));
}

export function reconcileTabularState(
  model: TabularModel,
  state: TabularState,
  values: TabularControlledValues,
): TabularResult<TabularState> {
  for (const key of CONTROLLED_KEYS) {
    const provided = values[key] !== undefined;
    if (provided !== model.controlled[key]) {
      return fail('transition-rejection', provided ? 'uncontrolled-value-update' : 'controlled-value-required',
        provided
          ? `Uncontrolled ${key} cannot be synchronized externally.`
          : `Controlled ${key} requires its external value.`, { key });
    }
  }
  const slices = validateSlices(model, { ...state, ...values });
  if (!slices.ok) return slices;
  return ok(Object.freeze({ ...state, ...slices.value }));
}

export function encodeTabularCellID(
  address: TabularCellAddress,
  limits: Pick<TabularLimits, 'maxIDCodeUnits'> = DEFAULT_TABULAR_LIMITS,
): TabularCellID {
  return unwrap(tryEncodeTabularCellID(address, limits));
}

function tryEncodeTabularCellID(
  address: TabularCellAddress,
  limits: Pick<TabularLimits, 'maxIDCodeUnits'> = DEFAULT_TABULAR_LIMITS,
): TabularResult<TabularCellID> {
  const rowError = validateID(address?.rowID, 'rowID', limits);
  if (rowError !== null) return { ok: false, error: rowError };
  const columnError = validateID(address?.columnID, 'columnID', limits);
  if (columnError !== null) return { ok: false, error: columnError };
  return ok(`c1:${address.rowID.length}:${address.rowID}${address.columnID.length}:${address.columnID}`);
}

export function tryDecodeTabularCellID(
  cellID: TabularCellID,
  limits: Pick<TabularLimits, 'maxIDCodeUnits'> = DEFAULT_TABULAR_LIMITS,
): TabularResult<TabularCellAddress> {
  if (typeof cellID !== 'string' || !cellID.startsWith('c1:')) {
    return fail('construction', 'invalid-cell-codec', 'Cell ID has an unsupported codec version.');
  }
  const first = parseLength(cellID, 3);
  if (first === null) return fail('construction', 'invalid-cell-codec', 'Cell ID row length is malformed.');
  const rowStart = first.end;
  const rowEnd = rowStart + first.length;
  if (rowEnd > cellID.length) return fail('construction', 'invalid-cell-codec', 'Cell ID row length exceeds its payload.');
  const second = parseLength(cellID, rowEnd);
  if (second === null) return fail('construction', 'invalid-cell-codec', 'Cell ID column length is malformed.');
  const columnStart = second.end;
  const columnEnd = columnStart + second.length;
  if (columnEnd !== cellID.length) return fail('construction', 'invalid-cell-codec', 'Cell ID contains trailing or missing data.');
  const rowID = cellID.slice(rowStart, rowEnd);
  const columnID = cellID.slice(columnStart, columnEnd);
  const rowError = validateID(rowID, 'rowID', limits);
  if (rowError !== null) return { ok: false, error: rowError };
  const columnError = validateID(columnID, 'columnID', limits);
  if (columnError !== null) return { ok: false, error: columnError };
  return ok(Object.freeze({ rowID, columnID }));
}

function normalizeLimits(input: Partial<TabularLimits> | undefined): TabularResult<TabularLimits> {
  const result = { ...DEFAULT_TABULAR_LIMITS, ...input };
  for (const [key, value] of Object.entries(result)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return fail('construction', 'invalid-limit', 'Every Tabular limit must be a positive safe integer.', { key, value });
    }
  }
  return ok(Object.freeze(result));
}

function normalizeColumns(
  columns: readonly TabularColumnDefinition[],
  limits: TabularLimits,
): TabularResult<readonly TabularColumnDefinition[]> {
  const ids = new Set<string>();
  const result: TabularColumnDefinition[] = [];
  for (const column of columns) {
    if (column === null || typeof column !== 'object') {
      return fail('construction', 'invalid-column-definition', 'Every column must be an object.');
    }
    const idError = validateID(column.id, 'columnID', limits);
    if (idError !== null) return { ok: false, error: idError };
    if (ids.has(column.id)) {
      return fail('construction', 'duplicate-identity', 'Column identities must be unique.', { id: column.id });
    }
    ids.add(column.id);
    if (column.label !== undefined && typeof column.label !== 'string') {
      return fail('construction', 'invalid-column-definition', 'Column label must be a string.', { id: column.id });
    }
    const capabilities = column.capabilities ?? [];
    const validCapabilities = new Set(['sort', 'filter', 'group', 'aggregate', 'pivot', 'edit']);
    if (!Array.isArray(capabilities) || capabilities.some((value) => !validCapabilities.has(value))) {
      return fail('construction', 'invalid-column-definition', 'Column capabilities are invalid.', { id: column.id });
    }
    if (new Set(capabilities).size !== capabilities.length) {
      return fail('construction', 'duplicate-identity', 'Column capabilities must be unique.', { id: column.id });
    }
    if (column.initialVisible !== undefined && typeof column.initialVisible !== 'boolean') {
      return fail('construction', 'invalid-column-definition', 'initialVisible must be boolean.', { id: column.id });
    }
    if (column.initialPin !== undefined && !['start', 'center', 'end'].includes(column.initialPin)) {
      return fail('construction', 'invalid-column-definition', 'initialPin must be a logical pin region.', { id: column.id });
    }
    result.push(Object.freeze({ ...column, capabilities: Object.freeze([...capabilities]) }));
  }
  return ok(Object.freeze(result));
}

function normalizeHeaders(
  headers: readonly TabularHeaderNode[],
  columns: readonly TabularColumnDefinition[],
  limits: TabularLimits,
): TabularResult<readonly TabularHeaderNode[]> {
  if (!Array.isArray(headers)) return fail('construction', 'invalid-header-node', 'Headers must be an array.');
  const headerIDs = new Set<string>();
  const columnIDs = new Set(columns.map((column) => column.id));
  const leafColumns = new Set<string>();
  const visit = (node: TabularHeaderNode, depth: number): TabularResult<TabularHeaderNode> => {
    if (depth > limits.maxGroupDepth) {
      return fail('resource-rejection', 'group-depth-ceiling-exceeded', 'Header depth exceeds the configured ceiling.');
    }
    const idError = validateID(node?.id, 'headerNodeID', limits);
    if (idError !== null) return { ok: false, error: idError };
    if (headerIDs.has(node.id)) return fail('construction', 'duplicate-identity', 'Header identities must be unique.', { id: node.id });
    headerIDs.add(node.id);
    if (node.kind === 'column') {
      if (!columnIDs.has(node.columnID) || leafColumns.has(node.columnID)) {
        return fail('construction', leafColumns.has(node.columnID) ? 'duplicate-identity' : 'invalid-header-node',
          'Header leaves must reference one existing column exactly once.', { columnID: node.columnID });
      }
      leafColumns.add(node.columnID);
      return ok(Object.freeze({ ...node }));
    }
    if (node.kind !== 'group' || !Array.isArray(node.children) || node.children.length === 0) {
      return fail('construction', 'invalid-header-node', 'Header groups require at least one child.');
    }
    const children: TabularHeaderNode[] = [];
    for (const child of node.children) {
      const childResult = visit(child, depth + 1);
      if (!childResult.ok) return childResult;
      children.push(childResult.value);
    }
    return ok(Object.freeze({ ...node, children: Object.freeze(children) }));
  };
  const result: TabularHeaderNode[] = [];
  for (const header of headers) {
    const normalized = visit(header, 1);
    if (!normalized.ok) return normalized;
    result.push(normalized.value);
  }
  return ok(Object.freeze(result));
}

function normalizeControlled(
  controlled: TabularControlledOwnership | undefined,
  values: TabularControlledValues | undefined,
): TabularResult<Required<TabularControlledOwnership>> {
  const result = {
    query: controlled?.query ?? false,
    rowSelection: controlled?.rowSelection ?? false,
    columnState: controlled?.columnState ?? false,
    accessState: controlled?.accessState ?? false,
    expansion: controlled?.expansion ?? false,
  };
  for (const key of CONTROLLED_KEYS) {
    if (typeof result[key] !== 'boolean') {
      return fail('construction', 'invalid-controlled-shape', 'Controlled ownership flags must be boolean.', { key });
    }
    if (result[key] && values?.[key] === undefined) {
      return fail('construction', 'controlled-value-required', `Controlled ${key} requires an initial value.`, { key });
    }
  }
  return ok(Object.freeze(result));
}

function validateSlices(
  model: TabularModel,
  values: TabularControlledValues,
): TabularResult<Required<TabularControlledValues>> {
  const query = values.query;
  const rowSelection = values.rowSelection;
  const columnState = values.columnState;
  const accessState = values.accessState;
  const expansion = values.expansion;
  if (query === undefined || rowSelection === undefined || columnState === undefined || accessState === undefined || expansion === undefined) {
    return fail('construction', 'invalid-controlled-shape', 'Every Tabular state slice must be present.');
  }
  if (query.sort.length > model.limits.maxSortRules) return ceiling('sort-rule-ceiling-exceeded', query.sort.length, model.limits.maxSortRules);
  if (query.filters.length > model.limits.maxFilterRules) return ceiling('filter-rule-ceiling-exceeded', query.filters.length, model.limits.maxFilterRules);
  if (query.groups.length > model.limits.maxGroupDescriptors) return ceiling('group-descriptor-ceiling-exceeded', query.groups.length, model.limits.maxGroupDescriptors);
  if (query.aggregates.length > model.limits.maxAggregateDescriptors) return ceiling('aggregate-descriptor-ceiling-exceeded', query.aggregates.length, model.limits.maxAggregateDescriptors);
  if (query.pivots.length > model.limits.maxPivotDescriptors) return ceiling('pivot-descriptor-ceiling-exceeded', query.pivots.length, model.limits.maxPivotDescriptors);
  const canonicalSelection = canonicalizeRowSelection(rowSelection, model.limits);
  if (!canonicalSelection.ok) return canonicalSelection;
  const columnResult = validateColumnState(columnState, model.columns);
  if (!columnResult.ok) return columnResult;
  if (!Array.isArray(expansion)) return fail('construction', 'invalid-controlled-shape', 'Expansion must be an array.');
  const frozenExpansion = Object.freeze([...expansion]);
  return ok(Object.freeze({
    query,
    rowSelection: canonicalSelection.value,
    columnState: columnResult.value,
    accessState,
    expansion: frozenExpansion,
  }));
}

function validateColumnState(
  state: TabularColumnState,
  columns: readonly TabularColumnDefinition[],
): TabularResult<TabularColumnState> {
  const domain = new Set(columns.map((column) => column.id));
  if (!Array.isArray(state.order) || state.order.length !== domain.size || new Set(state.order).size !== state.order.length
    || state.order.some((id) => !domain.has(id))) {
    return fail('construction', 'invalid-controlled-shape', 'Column order must be a permutation of the model columns.');
  }
  for (const [label, ids] of [['hidden', state.hidden], ['pinnedStart', state.pinnedStart], ['pinnedEnd', state.pinnedEnd]] as const) {
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some((id) => !domain.has(id))) {
      return fail('construction', 'invalid-controlled-shape', `${label} must contain unique model column IDs.`);
    }
  }
  if (state.pinnedStart.some((id) => state.pinnedEnd.includes(id))) {
    return fail('construction', 'invalid-controlled-shape', 'A column cannot be pinned to both logical edges.');
  }
  return ok(Object.freeze({
    order: Object.freeze([...state.order]),
    hidden: Object.freeze([...state.hidden]),
    pinnedStart: Object.freeze([...state.pinnedStart]),
    pinnedEnd: Object.freeze([...state.pinnedEnd]),
  }));
}

function controlledSubset(model: TabularModel, state: TabularState): TabularControlledValues {
  const result: {
    query?: TabularQuery;
    rowSelection?: TabularRowSelection;
    columnState?: TabularColumnState;
    accessState?: TabularAccessState;
    expansion?: readonly string[];
  } = {};
  for (const key of CONTROLLED_KEYS) if (model.controlled[key]) result[key] = state[key] as never;
  return result;
}

function ceiling<T>(code: Parameters<typeof fail<T>>[1], actual: number, limit: number): TabularResult<T> {
  return fail('resource-rejection', code, 'Tabular state exceeds its configured ceiling.', { actual, ceiling: limit });
}

function parseLength(input: string, start: number): { readonly length: number; readonly end: number } | null {
  const separator = input.indexOf(':', start);
  if (separator === -1) return null;
  const digits = input.slice(start, separator);
  if (!/^(?:0|[1-9]\d*)$/u.test(digits)) return null;
  const length = Number(digits);
  return Number.isSafeInteger(length) ? { length, end: separator + 1 } : null;
}

export type {
  TabularAcceptedViewState,
  TabularAccessState,
  TabularCellAddress,
  TabularCellRecord,
  TabularCellID,
  TabularColumnCapability,
  TabularColumnDefinition,
  TabularColumnID,
  TabularColumnState,
  TabularCommand,
  TabularControlledValues,
  TabularError,
  TabularErrorCode,
  TabularEvent,
  TabularGroupID,
  TabularHeaderNode,
  TabularHeaderNodeID,
  TabularLimits,
  TabularModel,
  TabularOptions,
  TabularPinRegion,
  TabularProjectionGeneration,
  TabularRequestState,
  TabularResult,
  TabularRow,
  TabularLeafRow,
  TabularGroupRow,
  TabularRowID,
  TabularRowSelection,
  TabularSnapshot,
  TabularState,
  TabularUpdate,
  TabularWireValue,
  TabularWireCells,
} from './contracts.js';
