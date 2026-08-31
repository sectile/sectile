import { tryCreateCollectionWindowState } from '@sectile/core/collection-window';
import { createPaginationModel, tryCreatePaginationState } from '@sectile/core/pagination';
import { fail, ok } from './foundation.js';
import type { TabularAccessState, TabularResult } from '../contracts.js';

export function canonicalizeTabularAccessState(
  state: TabularAccessState,
): TabularResult<TabularAccessState> {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    return fail('construction', 'invalid-controlled-shape', 'Access state must be an object.');
  }
  if (state.kind === 'window') {
    const window = tryCreateCollectionWindowState(state.window);
    return window.ok
      ? ok(Object.freeze({ kind: 'window' as const, window: window.value }))
      : fail('construction', 'invalid-controlled-shape', window.error.message, window.error.details);
  }
  if (state.kind !== 'page') {
    return fail('construction', 'invalid-controlled-shape', 'Access state kind must be page or window.');
  }
  if (!Number.isSafeInteger(state.page) || state.page <= 0
    || !Number.isSafeInteger(state.itemsPerPage) || state.itemsPerPage <= 0) {
    return fail('construction', 'invalid-controlled-shape', 'Page and itemsPerPage must be positive safe integers.');
  }
  if (state.visibleRowCount === null) {
    return state.pagination === null
      ? ok(Object.freeze({ ...state, pagination: null }))
      : fail('construction', 'invalid-controlled-shape', 'Unknown visible row count cannot carry pagination state.');
  }
  if (!Number.isSafeInteger(state.visibleRowCount) || state.visibleRowCount < 0) {
    return fail('construction', 'invalid-controlled-shape', 'Visible row count must be null or a non-negative safe integer.');
  }
  const pagination = tryCreatePaginationState(
    createPaginationModel({ total: state.visibleRowCount, itemsPerPage: state.itemsPerPage }),
    state.page,
    state.itemsPerPage,
  );
  if (!pagination.ok) {
    return fail('construction', 'invalid-controlled-shape', pagination.error.message, pagination.error.details);
  }
  if (state.pagination === null
    || state.pagination.page !== pagination.value.page
    || state.pagination.itemsPerPage !== pagination.value.itemsPerPage) {
    return fail('construction', 'invalid-controlled-shape', 'Visible row count and pagination state must describe the same page.');
  }
  return ok(Object.freeze({ ...state, pagination: pagination.value }));
}
