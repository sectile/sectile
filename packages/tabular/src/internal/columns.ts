import { fail, ok } from './foundation.js';
import type {
  TabularColumnDefinition,
  TabularColumnID,
  TabularColumnState,
  TabularLimits,
  TabularPinRegion,
  TabularResult,
} from '../contracts.js';

export interface TabularColumnPartitions {
  readonly start: readonly TabularColumnID[];
  readonly center: readonly TabularColumnID[];
  readonly end: readonly TabularColumnID[];
}

export function createTabularColumnState(
  columns: readonly TabularColumnDefinition[],
): TabularColumnState {
  return Object.freeze({
    order: Object.freeze(columns.map((column) => column.id)),
    hidden: Object.freeze(columns.filter((column) => column.initialVisible === false).map((column) => column.id)),
    pinnedStart: Object.freeze(columns.filter((column) => column.initialPin === 'start').map((column) => column.id)),
    pinnedEnd: Object.freeze(columns.filter((column) => column.initialPin === 'end').map((column) => column.id)),
  });
}

export function reconcileTabularColumns(
  previousColumns: readonly TabularColumnDefinition[],
  previousState: TabularColumnState,
  nextColumns: readonly TabularColumnDefinition[],
  limits: TabularLimits,
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
  return ok(Object.freeze({ order, hidden, pinnedStart, pinnedEnd }));
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
