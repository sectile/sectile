import type { Result, SectileError } from './shared.js';
import { fail, ok, validateSafeCeiling } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';

export type PaginationControl = 'first-page' | 'previous-page' | 'next-page' | 'last-page';

export type PaginationEvent = PaginationControl
  | { readonly type: 'go-to-page'; readonly page: number }
  | { readonly type: 'set-items-per-page'; readonly itemsPerPage: number };

export type PaginationCommand =
  | { readonly type: 'page-changed'; readonly page: number }
  | { readonly type: 'items-per-page-changed'; readonly itemsPerPage: number };

export type PaginationItem =
  | { readonly type: 'page'; readonly page: number; readonly selected: boolean }
  | { readonly type: 'ellipsis'; readonly side: 'start' | 'end' }
  | {
      readonly type: 'control';
      readonly control: PaginationControl;
      readonly targetPage: number;
      readonly disabled: boolean;
    };

export interface PaginationItemRange {
  readonly start: number;
  readonly end: number;
  readonly total: number;
}

export interface PaginationModelOptions {
  readonly total: number;
  readonly itemsPerPage?: number;
  readonly siblingCount?: number;
  readonly showEdges?: boolean;
  readonly showControls?: boolean;
}

export interface PaginationModel {
  readonly total: number;
  readonly itemsPerPage: number;
  readonly siblingCount: number;
  readonly showEdges: boolean;
  readonly showControls: boolean;
}

export interface PaginationState {
  readonly page: number;
  readonly itemsPerPage: number;
}
export interface PaginationUpdate {
  readonly state: PaginationState;
  readonly commands: readonly PaginationCommand[];
}

export function createPaginationModel(options: PaginationModelOptions): Result<PaginationModel> {
  const itemsPerPage = options.itemsPerPage ?? 10;
  const siblingCount = options.siblingCount ?? 2;
  for (const [value, name, minimum] of [
    [options.total, 'total', 0],
    [itemsPerPage, 'itemsPerPage', 1],
    [siblingCount, 'siblingCount', 0],
  ] as const) {
    const error = validateSafeCeiling(value, name, minimum);
    if (error !== null) return { ok: false, error };
  }
  if (siblingCount > 1_000) {
    return fail(
      'resource-rejection',
      'pagination-sibling-ceiling-exceeded',
      'Pagination siblingCount exceeds its safety ceiling.',
      { siblingCount, ceiling: 1_000 },
    );
  }
  if (options.showEdges !== undefined && typeof options.showEdges !== 'boolean') {
    return fail('construction', 'invalid-pagination-show-edges', 'Pagination showEdges must be boolean.');
  }
  if (options.showControls !== undefined && typeof options.showControls !== 'boolean') {
    return fail('construction', 'invalid-pagination-show-controls', 'Pagination showControls must be boolean.');
  }
  return ok(Object.freeze({
    total: options.total,
    itemsPerPage,
    siblingCount,
    showEdges: options.showEdges ?? false,
    showControls: options.showControls ?? true,
  }));
}

export function createPaginationState(
  model: PaginationModel,
  page = 1,
  itemsPerPage: number = model.itemsPerPage,
): Result<PaginationState> {
  const modelError = validatePaginationModel(model);
  if (modelError !== null) return { ok: false, error: modelError };
  const sizeError = validateSafeCeiling(itemsPerPage, 'itemsPerPage', 1);
  if (sizeError !== null) return { ok: false, error: sizeError };
  const pageCount = derivePageCount(model.total, itemsPerPage);
  if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) {
    return fail(
      'construction',
      'pagination-page-out-of-range',
      'Pagination page must be a safe integer inside the page range.',
      { page, pageCount },
    );
  }
  return ok(Object.freeze({ page, itemsPerPage }));
}

export function applyPaginationEvent(
  model: PaginationModel,
  state: PaginationState,
  event: PaginationEvent,
): Result<PaginationUpdate> {
  const validState = createPaginationState(model, state.page, state.itemsPerPage);
  if (!validState.ok) return transitionFailure(validState);
  if (!isPaginationEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-pagination-event',
      'Pagination event must select a page or request a page boundary movement.',
      { event },
    );
  }
  if (typeof event === 'object' && event.type === 'set-items-per-page') {
    const sizeError = validateSafeCeiling(event.itemsPerPage, 'itemsPerPage', 1);
    if (sizeError !== null) return { ok: false, error: { ...sizeError, class: 'transition-rejection' } };
  }
  const pageCount = derivePageCount(model.total, state.itemsPerPage);
  const nextState = typeof event === 'object' && event.type === 'set-items-per-page'
    ? createPaginationState(
        model,
        Math.min(
          derivePageCount(model.total, event.itemsPerPage),
          Math.floor(((state.page - 1) * state.itemsPerPage) / event.itemsPerPage) + 1,
        ),
        event.itemsPerPage,
      )
    : createPaginationState(
        model,
        typeof event === 'object' ? event.page
          : event === 'first-page' ? 1
            : event === 'last-page' ? pageCount
              : event === 'previous-page' ? Math.max(1, state.page - 1)
                : Math.min(pageCount, state.page + 1),
        state.itemsPerPage,
      );
  if (!nextState.ok) return transitionFailure(nextState);
  const commands: PaginationCommand[] = [];
  if (nextState.value.itemsPerPage !== state.itemsPerPage) {
    commands.push({ type: 'items-per-page-changed', itemsPerPage: nextState.value.itemsPerPage });
  }
  if (nextState.value.page !== state.page) commands.push({ type: 'page-changed', page: nextState.value.page });
  return createMachineUpdate(nextState.value, commands);
}

export function getPaginationPageCount(
  model: PaginationModel,
  state: PaginationState,
): Result<number> {
  const validState = createPaginationState(model, state.page, state.itemsPerPage);
  return validState.ok
    ? ok(derivePageCount(model.total, validState.value.itemsPerPage))
    : transitionFailure(validState);
}

export function getPaginationItems(
  model: PaginationModel,
  state: PaginationState,
): Result<readonly PaginationItem[]> {
  const validState = createPaginationState(model, state.page, state.itemsPerPage);
  if (!validState.ok) return transitionFailure(validState);
  const pageCount = derivePageCount(model.total, state.itemsPerPage);
  const pages = getVisiblePages(state.page, pageCount, model.siblingCount, model.showEdges);
  const items: PaginationItem[] = [];
  if (model.showControls) {
    items.push(
      control('first-page', 1, state.page === 1),
      control('previous-page', Math.max(1, state.page - 1), state.page === 1),
    );
  }
  for (const page of pages) {
    items.push(typeof page === 'number'
      ? Object.freeze({ type: 'page', page, selected: page === state.page })
      : Object.freeze({ type: 'ellipsis', side: page }));
  }
  if (model.showControls) {
    items.push(
      control('next-page', Math.min(pageCount, state.page + 1), state.page === pageCount),
      control('last-page', pageCount, state.page === pageCount),
    );
  }
  return ok(Object.freeze(items));
}

export function getPaginationItemRange(
  model: PaginationModel,
  state: PaginationState,
): Result<PaginationItemRange> {
  const validState = createPaginationState(model, state.page, state.itemsPerPage);
  if (!validState.ok) return transitionFailure(validState);
  if (model.total === 0) return ok(Object.freeze({ start: 0, end: 0, total: 0 }));
  const start = (state.page - 1) * state.itemsPerPage + 1;
  const count = Math.min(state.itemsPerPage, model.total - start + 1);
  return ok(Object.freeze({ start, end: start + count - 1, total: model.total }));
}

type VisiblePage = number | 'start' | 'end';

function getVisiblePages(
  currentPage: number,
  pageCount: number,
  siblingCount: number,
  showEdges: boolean,
): readonly VisiblePage[] {
  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, pageCount);
  if (!showEdges) {
    const itemCount = siblingCount * 2 + 1;
    if (pageCount <= itemCount) return range(1, pageCount);
    if (currentPage <= siblingCount + 1) return range(1, itemCount);
    if (pageCount - currentPage <= siblingCount) return range(pageCount - itemCount + 1, pageCount);
    return range(leftSibling, rightSibling);
  }

  const totalPageNumbers = Math.min(siblingCount * 2 + 5, pageCount);
  const interiorCount = totalPageNumbers - 2;
  const showStartEllipsis = leftSibling > 3
    && Math.abs(pageCount - interiorCount) > 2
    && Math.abs(leftSibling - 1) > 2;
  const showEndEllipsis = rightSibling < pageCount - 2
    && Math.abs(pageCount - interiorCount) > 2
    && Math.abs(pageCount - rightSibling) > 2;

  if (!showStartEllipsis && showEndEllipsis) {
    return [...range(1, interiorCount), 'end', pageCount];
  }
  if (showStartEllipsis && !showEndEllipsis) {
    return [1, 'start', ...range(pageCount - interiorCount + 1, pageCount)];
  }
  if (showStartEllipsis && showEndEllipsis) {
    return [1, 'start', ...range(leftSibling, rightSibling), 'end', pageCount];
  }
  return range(1, pageCount);
}

function range(start: number, end: number): readonly number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function derivePageCount(total: number, itemsPerPage: number): number {
  return Math.max(1, Math.ceil(total / itemsPerPage));
}

function control(
  controlType: PaginationControl,
  targetPage: number,
  disabled: boolean,
): PaginationItem {
  return Object.freeze({ type: 'control', control: controlType, targetPage, disabled });
}

function validatePaginationModel(model: PaginationModel): SectileError | null {
  if (typeof model !== 'object' || model === null) {
    return {
      class: 'construction',
      code: 'invalid-pagination-model',
      message: 'Pagination model must be an object.',
    };
  }
  if (!Number.isSafeInteger(model.total) || model.total < 0
    || !Number.isSafeInteger(model.itemsPerPage) || model.itemsPerPage < 1
    || !Number.isSafeInteger(model.siblingCount) || model.siblingCount < 0
    || typeof model.showEdges !== 'boolean' || typeof model.showControls !== 'boolean') {
    return {
      class: 'construction',
      code: 'invalid-pagination-model',
      message: 'Pagination model fields must agree with a valid pagination domain.',
    };
  }
  return null;
}

function isPaginationEvent(value: unknown): value is PaginationEvent {
  if (typeof value === 'string') {
    return value === 'first-page' || value === 'previous-page'
      || value === 'next-page' || value === 'last-page';
  }
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return value.type === 'go-to-page'
    ? 'page' in value && Number.isSafeInteger(value.page)
    : value.type === 'set-items-per-page'
      && 'itemsPerPage' in value && Number.isSafeInteger(value.itemsPerPage);
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) {
    return fail('internal-invariant', 'unexpected-pagination-success', 'Expected a pagination failure.');
  }
  return { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
