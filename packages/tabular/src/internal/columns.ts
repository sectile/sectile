import { fail, ok } from './foundation.js';
import type {
  TabularColumnDefinition,
  TabularColumnID,
  TabularColumnState,
  TabularHeaderNode,
  TabularLimits,
  TabularPinRegion,
  TabularResult,
} from '../contracts.js';

export interface TabularColumnPartitions {
  readonly start: readonly TabularColumnID[];
  readonly center: readonly TabularColumnID[];
  readonly end: readonly TabularColumnID[];
}

const COLUMN_DOMAIN = Symbol('sectile.tabular.column-domain');
const HEADER_DOMAIN = Symbol('sectile.tabular.header-domain');
type CanonicalColumnState = TabularColumnState & {
  readonly [COLUMN_DOMAIN]: readonly TabularColumnDefinition[];
  readonly [HEADER_DOMAIN]: readonly TabularHeaderNode[];
};

export function createTabularColumnState(
  columns: readonly TabularColumnDefinition[],
  headers: readonly TabularHeaderNode[] = Object.freeze([]),
): TabularColumnState {
  return markColumnState({
    order: Object.freeze(columns.map((column) => column.id)),
    hidden: Object.freeze(columns.filter((column) => column.initialVisible === false).map((column) => column.id)),
    pinnedStart: Object.freeze(columns.filter((column) => column.initialPin === 'start').map((column) => column.id)),
    pinnedEnd: Object.freeze(columns.filter((column) => column.initialPin === 'end').map((column) => column.id)),
  }, columns, headers);
}

export function canonicalizeTabularColumnState(
  state: TabularColumnState,
  columns: readonly TabularColumnDefinition[],
  headers: readonly TabularHeaderNode[] = Object.freeze([]),
): TabularResult<TabularColumnState> {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    return fail('construction', 'invalid-controlled-shape', 'Column state must be an object.');
  }
  if (COLUMN_DOMAIN in state
    && (state as CanonicalColumnState)[COLUMN_DOMAIN] === columns
    && (state as CanonicalColumnState)[HEADER_DOMAIN] === headers) return ok(state);
  const domain = new Set(columns.map((column) => column.id));
  if (!Array.isArray(state.order) || state.order.length !== domain.size
    || new Set(state.order).size !== state.order.length
    || state.order.some((id) => !domain.has(id))) {
    return fail('construction', 'invalid-controlled-shape', 'Column order must be a permutation of the model columns.');
  }
  for (const [label, ids] of [['hidden', state.hidden], ['pinnedStart', state.pinnedStart], ['pinnedEnd', state.pinnedEnd]] as const) {
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some((id) => !domain.has(id))) {
      return fail('construction', 'invalid-controlled-shape', `${label} must contain unique model column IDs.`);
    }
  }
  const pinnedEnd = new Set(state.pinnedEnd);
  if (state.pinnedStart.some((id) => pinnedEnd.has(id))) {
    return fail('construction', 'invalid-controlled-shape', 'A column cannot be pinned to both logical edges.');
  }
  const normalized = markColumnState({
    order: Object.freeze([...state.order]),
    hidden: Object.freeze([...state.hidden]),
    pinnedStart: Object.freeze([...state.pinnedStart]),
    pinnedEnd: Object.freeze([...state.pinnedEnd]),
  }, columns, headers);
  const topology = validateTabularHeaderProjection(normalized, headers);
  return topology.ok ? ok(normalized) : topology;
}

export function reconcileTabularColumns(
  previousColumns: readonly TabularColumnDefinition[],
  previousState: TabularColumnState,
  nextColumns: readonly TabularColumnDefinition[],
  limits: TabularLimits,
  nextHeaders: readonly TabularHeaderNode[] = Object.freeze([]),
): TabularResult<TabularColumnState> {
  if (nextColumns.length > limits.maxColumns) {
    return fail('resource-rejection', 'column-ceiling-exceeded', 'Column schema exceeds the configured ceiling.', {
      actual: nextColumns.length,
      ceiling: limits.maxColumns,
    });
  }
  const previousDomain = new Set(previousColumns.map((column) => column.id));
  const nextByID = new Map(nextColumns.map((column) => [column.id, column]));
  if (nextByID.size !== nextColumns.length) {
    return fail('transition-rejection', 'duplicate-identity', 'Next column schema identities must be unique.');
  }
  if (previousState.order.length !== previousDomain.size
    || new Set(previousState.order).size !== previousState.order.length
    || previousState.order.some((id) => !previousDomain.has(id))) {
    return fail('transition-rejection', 'invalid-controlled-shape', 'Previous column order is invalid for its schema.');
  }
  const survivingOrder = previousState.order.filter((id) => nextByID.has(id));
  const inserted = nextColumns.filter((column) => !previousDomain.has(column.id)).map((column) => column.id);
  const order = Object.freeze([...survivingOrder, ...inserted]);
  const hidden = Object.freeze([
    ...previousState.hidden.filter((id) => nextByID.has(id)),
    ...nextColumns.filter((column) => !previousDomain.has(column.id) && column.initialVisible === false).map((column) => column.id),
  ]);
  const pinnedStart = Object.freeze([
    ...previousState.pinnedStart.filter((id) => nextByID.has(id)),
    ...nextColumns.filter((column) => !previousDomain.has(column.id) && column.initialPin === 'start').map((column) => column.id),
  ]);
  const pinnedEnd = Object.freeze([
    ...previousState.pinnedEnd.filter((id) => nextByID.has(id)),
    ...nextColumns.filter((column) => !previousDomain.has(column.id) && column.initialPin === 'end').map((column) => column.id),
  ]);
  return canonicalizeTabularColumnState({ order, hidden, pinnedStart, pinnedEnd }, nextColumns, nextHeaders);
}

function markColumnState(
  state: TabularColumnState,
  columns: readonly TabularColumnDefinition[],
  headers: readonly TabularHeaderNode[],
): CanonicalColumnState {
  const result = { ...state } as TabularColumnState & {
    [COLUMN_DOMAIN]?: readonly TabularColumnDefinition[];
    [HEADER_DOMAIN]?: readonly TabularHeaderNode[];
  };
  Object.defineProperty(result, COLUMN_DOMAIN, { value: columns, enumerable: false });
  Object.defineProperty(result, HEADER_DOMAIN, { value: headers, enumerable: false });
  return Object.freeze(result) as CanonicalColumnState;
}

export function validateTabularHeaderProjection(
  state: TabularColumnState,
  headers: readonly TabularHeaderNode[],
): TabularResult<true> {
  if (headers.length === 0) return ok(true);
  const partitions = projectTabularColumnPartitions(state);
  const ordered = [...partitions.start, ...partitions.center, ...partitions.end];
  const indexes = new Map<TabularColumnID, number>();
  for (let index = 0; index < ordered.length; index += 1) indexes.set(ordered[index]!, index);
  type Interval = { readonly start: number; readonly end: number; readonly count: number };
  const visit = (node: TabularHeaderNode): TabularResult<Interval | null> => {
    if (node.kind === 'column') {
      const index = indexes.get(node.columnID);
      return ok(index === undefined ? null : { start: index, end: index, count: 1 });
    }
    let start = Number.MAX_SAFE_INTEGER;
    let end = -1;
    let count = 0;
    for (const child of node.children) {
      const interval = visit(child);
      if (!interval.ok) return interval;
      if (interval.value === null) continue;
      start = Math.min(start, interval.value.start);
      end = Math.max(end, interval.value.end);
      count += interval.value.count;
    }
    if (count === 0) return ok(null);
    if (end - start + 1 !== count) {
      return fail('construction', 'invalid-header-node', 'Visible leaves of every header group must form one contiguous projected interval.', {
        headerNodeID: node.id,
        start,
        end,
        visibleLeafCount: count,
      });
    }
    return ok({ start, end, count });
  };
  for (const header of headers) {
    const interval = visit(header);
    if (!interval.ok) return interval;
  }
  return ok(true);
}

export function setTabularColumnVisibility(
  state: TabularColumnState,
  columnID: TabularColumnID,
  visible: boolean,
): TabularColumnState {
  const hidden = new Set(state.hidden);
  if (visible) hidden.delete(columnID);
  else hidden.add(columnID);
  const orderedHidden = state.order.filter((id) => hidden.has(id));
  return orderedHidden.length === state.hidden.length && orderedHidden.every((id, index) => id === state.hidden[index])
    ? state
    : Object.freeze({ ...state, hidden: Object.freeze(orderedHidden) });
}

export function pinTabularColumn(
  state: TabularColumnState,
  columnID: TabularColumnID,
  region: TabularPinRegion,
): TabularColumnState {
  const start = state.pinnedStart.filter((id) => id !== columnID);
  const end = state.pinnedEnd.filter((id) => id !== columnID);
  if (region === 'start') start.push(columnID);
  if (region === 'end') end.push(columnID);
  const pinnedStart = state.order.filter((id) => start.includes(id));
  const pinnedEnd = state.order.filter((id) => end.includes(id));
  return Object.freeze({ ...state, pinnedStart: Object.freeze(pinnedStart), pinnedEnd: Object.freeze(pinnedEnd) });
}

export function projectTabularColumnPartitions(state: TabularColumnState): TabularColumnPartitions {
  const hidden = new Set(state.hidden);
  const start = new Set(state.pinnedStart);
  const end = new Set(state.pinnedEnd);
  return Object.freeze({
    start: Object.freeze(state.order.filter((id) => !hidden.has(id) && start.has(id))),
    center: Object.freeze(state.order.filter((id) => !hidden.has(id) && !start.has(id) && !end.has(id))),
    end: Object.freeze(state.order.filter((id) => !hidden.has(id) && end.has(id))),
  });
}
