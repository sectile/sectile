import { tryCreateCollectionWindowState } from '@sectile/core/collection-window';
import { createPaginationModel, tryCreatePaginationState } from '@sectile/core/pagination';
import { fail, ok } from './foundation.js';
import type { TabularAccessState, TabularResult } from '../contracts.js';

export function deriveSafeTabularPageStart(page: number, itemsPerPage: number): number | null {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(itemsPerPage) || itemsPerPage < 1) return null;
  const pageIndex = page - 1;
  if (pageIndex > Math.floor(Number.MAX_SAFE_INTEGER / itemsPerPage)) return null;
  return pageIndex * itemsPerPage;
}

export function canonicalizeTabularAccessState(
  state: TabularAccessState,
): TabularResult<TabularAccessState> {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    return fail('construction', 'invalid-controlled-shape', 'Access state must be an object.');
  }
  try {
    const kind = state.kind;
    if (kind === 'window') {
      const windowInput = state.window;
      const window = tryCreateCollectionWindowState(windowInput);
      return window.ok
        ? ok(Object.freeze({ kind, window: window.value }))
        : fail('construction', 'invalid-controlled-shape', window.error.message, window.error.details);
    }
    if (kind !== 'page') {
      return fail('construction', 'invalid-controlled-shape', 'Access state kind must be page or window.');
    }
    const page = state.page;
    const itemsPerPage = state.itemsPerPage;
    const visibleRowCount = state.visibleRowCount;
    const currentPagination = state.pagination;
    if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(itemsPerPage) || itemsPerPage <= 0) {
      return fail('construction', 'invalid-controlled-shape', 'Page and itemsPerPage must be positive safe integers.');
    }
    if (deriveSafeTabularPageStart(page, itemsPerPage) === null) {
      return fail('construction', 'invalid-controlled-shape', 'Page access must have a safe derived start.');
    }
    if (visibleRowCount === null) {
      return currentPagination === null
        ? ok(Object.freeze({ kind, page, itemsPerPage, visibleRowCount, pagination: null }))
        : fail('construction', 'invalid-controlled-shape', 'Unknown visible row count cannot carry pagination state.');
    }
    if (!Number.isSafeInteger(visibleRowCount) || visibleRowCount < 0) {
      return fail('construction', 'invalid-controlled-shape', 'Visible row count must be null or a non-negative safe integer.');
    }
    const pagination = tryCreatePaginationState(
      createPaginationModel({ total: visibleRowCount, itemsPerPage }),
      page,
      itemsPerPage,
    );
    if (!pagination.ok) {
      return fail('construction', 'invalid-controlled-shape', pagination.error.message, pagination.error.details);
    }
    if (currentPagination === null
      || currentPagination.page !== pagination.value.page
      || currentPagination.itemsPerPage !== pagination.value.itemsPerPage) {
      return fail('construction', 'invalid-controlled-shape', 'Visible row count and pagination state must describe the same page.');
    }
    return ok(Object.freeze({ kind, page, itemsPerPage, visibleRowCount, pagination: pagination.value }));
  } catch {
    return fail('construction', 'invalid-controlled-shape', 'Access state properties must be readable.');
  }
}
