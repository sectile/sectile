import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';
import { fail, ok, validateStableID } from './internal/kernel/foundation.js';
import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';

export type CollectionWindowDirection = 'before' | 'after';

export interface CollectionWindowRequest<ID extends StableID = StableID> {
  readonly generation: number;
  readonly direction: CollectionWindowDirection;
  readonly anchor: ID | null;
  readonly revision: number;
}

export interface CollectionWindowState<ID extends StableID = StableID> {
  readonly revision: number;
  readonly requestGeneration: number;
  readonly start: number;
  readonly size: number;
  readonly total: number | null;
  readonly pending: CollectionWindowRequest<ID> | null;
}

export interface CollectionWindowStateInput<ID extends StableID = StableID> {
  readonly revision?: number;
  readonly requestGeneration?: number;
  readonly start?: number;
  readonly size?: number;
  readonly total?: number | null;
  readonly pending?: CollectionWindowRequest<ID> | null;
}

export type CollectionWindowEvent<ID extends StableID = StableID> =
  | {
      readonly type: 'request-window';
      readonly direction: CollectionWindowDirection;
      readonly anchor: ID | null;
    }
  | { readonly type: 'clear-request'; readonly generation?: number };

export type CollectionWindowCommand<ID extends StableID = StableID> = {
  readonly type: 'request-window';
  readonly request: CollectionWindowRequest<ID>;
};

export type CollectionWindowUpdate<ID extends StableID = StableID> =
  MachineUpdate<CollectionWindowState<ID>, CollectionWindowCommand<ID>>;

export interface CollectionWindowReplacement {
  readonly revision: number;
  readonly requestGeneration?: number;
  readonly start: number;
  readonly size: number;
  readonly total?: number | null;
}

export function createCollectionWindowState<ID extends StableID = StableID>(
  input: CollectionWindowStateInput<ID> = {},
): CollectionWindowState<ID> {
  return unwrap(tryCreateCollectionWindowState(input));
}

export function tryCreateCollectionWindowState<ID extends StableID = StableID>(
  input: CollectionWindowStateInput<ID> = {},
): Result<CollectionWindowState<ID>> {
  const revision = input.revision ?? 0;
  const requestGeneration = input.requestGeneration ?? 0;
  const start = input.start ?? 0;
  const size = input.size ?? 0;
  const total = input.total ?? null;
  for (const [value, code] of [
    [revision, 'collection-window-revision-invalid'],
    [requestGeneration, 'collection-window-generation-invalid'],
    [start, 'collection-window-start-invalid'],
    [size, 'collection-window-size-invalid'],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      return fail('construction', code, 'Collection window indices and generations must be non-negative safe integers.');
    }
  }
  if (start > Number.MAX_SAFE_INTEGER - size) {
    return fail(
      'construction',
      'collection-window-range-invalid',
      'Collection window range must end at a safe integer.',
      { start, size },
    );
  }
  if (total !== null && (!Number.isSafeInteger(total) || total < 0 || start + size > total)) {
    return fail(
      'construction',
      'collection-window-total-invalid',
      'Collection window total must contain the complete loaded range.',
      { start, size, total },
    );
  }
  const pending = input.pending ?? null;
  if (pending !== null) {
    const anchorError = pending.anchor === null ? null : validateStableID(pending.anchor);
    if (anchorError !== null) return { ok: false, error: anchorError };
    if (
      pending.generation !== requestGeneration
      || pending.revision !== revision
      || (pending.direction !== 'before' && pending.direction !== 'after')
    ) {
      return fail(
        'construction',
        'collection-window-pending-invalid',
        'Pending request must match the current window revision and request generation.',
      );
    }
  }
  return ok(Object.freeze({ revision, requestGeneration, start, size, total, pending }));
}

export function applyCollectionWindowEvent<ID extends StableID>(
  state: CollectionWindowState<ID>,
  event: CollectionWindowEvent<ID>,
): Result<CollectionWindowUpdate<ID>> {
  const valid = tryCreateCollectionWindowState(state);
  if (!valid.ok) return transitionFailure(valid);
  if (event.type === 'clear-request') {
    if (event.generation !== undefined && state.pending?.generation !== event.generation) {
      return fail(
        'transition-rejection',
        'collection-window-request-stale',
        'Request generation does not identify the active collection window request.',
      );
    }
    return state.pending === null
      ? createMachineUpdate(state)
      : createMachineUpdate(Object.freeze({ ...state, pending: null }));
  }
  if (event.direction !== 'before' && event.direction !== 'after') {
    return fail('transition-rejection', 'collection-window-direction-invalid', 'Window direction is invalid.');
  }
  const anchorError = event.anchor === null ? null : validateStableID(event.anchor);
  if (anchorError !== null) {
    return fail('transition-rejection', anchorError.code, anchorError.message, anchorError.details);
  }
  if (state.pending !== null || !canRequestCollectionWindow(state, event.direction)) {
    return createMachineUpdate(state);
  }
  if (state.requestGeneration === Number.MAX_SAFE_INTEGER) {
    return fail(
      'resource-rejection',
      'collection-window-generation-exhausted',
      'Collection window request generation cannot advance beyond the safe-integer ceiling.',
    );
  }
  const request = Object.freeze({
    generation: state.requestGeneration + 1,
    direction: event.direction,
    anchor: event.anchor,
    revision: state.revision,
  });
  return createMachineUpdate(
    Object.freeze({ ...state, requestGeneration: request.generation, pending: request }),
    [{ type: 'request-window', request }],
  );
}

export function synchronizeCollectionWindow<ID extends StableID>(
  state: CollectionWindowState<ID>,
  replacement: CollectionWindowReplacement,
): Result<CollectionWindowState<ID>> {
  const valid = tryCreateCollectionWindowState(state);
  if (!valid.ok) return transitionFailure(valid);
  if (!Number.isSafeInteger(replacement.revision) || replacement.revision <= state.revision) {
    return fail(
      'transition-rejection',
      'collection-window-revision-stale',
      'Replacement revision must be newer than the current collection window.',
      { revision: replacement.revision, currentRevision: state.revision },
    );
  }
  if (
    replacement.requestGeneration !== undefined
    && replacement.requestGeneration !== state.pending?.generation
  ) {
    return fail(
      'transition-rejection',
      'collection-window-request-stale',
      'Replacement request generation does not identify the active request.',
      {
        requestGeneration: replacement.requestGeneration,
        currentGeneration: state.pending?.generation ?? null,
      },
    );
  }
  return tryCreateCollectionWindowState({
    revision: replacement.revision,
    requestGeneration: state.requestGeneration,
    start: replacement.start,
    size: replacement.size,
    total: replacement.total ?? null,
    pending: null,
  });
}

export function canRequestCollectionWindow<ID extends StableID>(
  state: CollectionWindowState<ID>,
  direction: CollectionWindowDirection,
): boolean {
  if (direction === 'before') return state.total === null || state.start > 0;
  return state.total === null || state.start + state.size < state.total;
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}
