import {
  applyCollectionWindowEvent,
  createCollectionWindowState,
  synchronizeCollectionWindow,
  tryCreateCollectionWindowState,
  type CollectionWindowDirection,
  type CollectionWindowState,
} from './collection-window.js';
import { createCursorState, type CursorState } from './internal/state/cursor.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { unwrap } from './result.js';
import type { Sequence } from './structures/sequence.js';
import type { Result, StableID } from './shared.js';

export type FeedDirection = CollectionWindowDirection;

export interface FeedWindowMetadata {
  readonly requestGeneration?: number;
  readonly start?: number;
  readonly total?: number | null;
}

export interface FeedState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
  readonly revision: number;
  readonly requestGeneration: number;
  readonly start: number;
  readonly size: number;
  readonly total: number | null;
  readonly pending: FeedDirection | null;
}

export type FeedEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'request-before'
  | 'request-after'
  | 'clear-request'
  | { readonly type: 'focus'; readonly id: ID };

export type FeedCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | {
      readonly type: 'request-window';
      readonly direction: FeedDirection;
      readonly anchor: ID | null;
      readonly revision: number;
      readonly requestGeneration: number;
    };

export interface FeedUpdate<ID extends StableID = StableID> {
  readonly state: FeedState<ID>;
  readonly commands: readonly FeedCommand<ID>[];
}

export interface FeedWindowReplacement<ID extends StableID = StableID> {
  readonly revision: number;
  readonly requestGeneration?: number;
  readonly start?: number;
  readonly total?: number | null;
  readonly current?: ID | null;
}

export function createFeedState<ID extends StableID>(
  items: Sequence<ID>,
  current: ID | null = null,
  revision = 0,
  pending: FeedDirection | null = null,
  metadata: FeedWindowMetadata = {},
): FeedState<ID> {
  return unwrap(tryCreateFeedState(items, current, revision, pending, metadata));
}

export function tryCreateFeedState<ID extends StableID>(
  items: Sequence<ID>,
  current: ID | null = null,
  revision = 0,
  pending: FeedDirection | null = null,
  metadata: FeedWindowMetadata = {},
): Result<FeedState<ID>> {
  if (current !== null && !items.contains(current)) {
    return fail('construction', 'feed-cursor-outside-window', 'Feed cursor must identify an item in the current window.');
  }
  const requestGeneration = metadata.requestGeneration ?? (pending === null ? 0 : 1);
  const collectionWindow = tryCreateCollectionWindowState<ID>({
    revision,
    requestGeneration,
    start: metadata.start ?? 0,
    size: items.size,
    total: metadata.total ?? null,
    pending: pending === null ? null : {
      generation: requestGeneration,
      direction: pending,
      anchor: current,
      revision,
    },
  });
  if (!collectionWindow.ok) return collectionWindow;
  return ok(fromWindow(createCursorState(current), collectionWindow.value));
}

export function applyFeedEvent<ID extends StableID>(
  items: Sequence<ID>,
  state: FeedState<ID>,
  event: FeedEvent<ID>,
): Result<FeedUpdate<ID>> {
  const valid = tryCreateFeedState(
    items,
    state.cursor.current,
    state.revision,
    state.pending,
    { requestGeneration: state.requestGeneration, start: state.start, total: state.total },
  );
  if (!valid.ok) return transitionFailure(valid);
  if (state.size !== items.size) {
    return fail(
      'transition-rejection',
      'feed-window-size-mismatch',
      'Feed state size must match the current item window.',
      { stateSize: state.size, itemSize: items.size },
    );
  }

  if (event === 'clear-request' || event === 'request-before' || event === 'request-after') {
    const updated = applyCollectionWindowEvent(toWindow(state), event === 'clear-request'
      ? { type: 'clear-request' }
      : {
          type: 'request-window',
          direction: event === 'request-before' ? 'before' : 'after',
          anchor: state.cursor.current,
        });
    if (!updated.ok) return updated;
    const commands: FeedCommand<ID>[] = updated.value.commands.map(({ request }) => ({
      type: 'request-window',
      direction: request.direction,
      anchor: request.anchor,
      revision: request.revision,
      requestGeneration: request.generation,
    }));
    return createMachineUpdate(fromWindow(state.cursor, updated.value.state), commands);
  }

  let id: ID | null;
  if (typeof event === 'object') {
    if (!items.contains(event.id)) {
      return fail('transition-rejection', 'feed-target-unavailable', 'Direct feed focus requires an item in the current window.');
    }
    id = event.id;
  } else if (state.cursor.current === null) {
    id = items.at(event === 'next' ? 0 : items.size - 1);
  } else {
    const moved = items.move(state.cursor.current, event === 'next' ? 1 : -1, 'stop');
    id = moved.kind === 'found' ? moved.id : state.cursor.current;
  }
  return id === null || id === state.cursor.current
    ? createMachineUpdate(state)
    : createMachineUpdate(
        Object.freeze({ ...state, cursor: createCursorState(id) }),
        [{ type: 'focus', id }],
      );
}

export function synchronizeFeedWindow<ID extends StableID>(
  items: Sequence<ID>,
  state: FeedState<ID>,
  replacement: FeedWindowReplacement<ID>,
): Result<FeedState<ID>> {
  const synchronized = synchronizeCollectionWindow(toWindow(state), {
    revision: replacement.revision,
    ...(replacement.requestGeneration === undefined
      ? {}
      : { requestGeneration: replacement.requestGeneration }),
    start: replacement.start ?? state.start,
    size: items.size,
    total: replacement.total === undefined ? state.total : replacement.total,
  });
  if (!synchronized.ok) return synchronized;
  const current = replacement.current ?? state.cursor.current ?? items.at(0);
  if (current !== null && !items.contains(current)) {
    return fail('transition-rejection', 'feed-cursor-outside-window', 'Replacement cursor must identify an item in the new feed window.');
  }
  return ok(fromWindow(createCursorState(current), synchronized.value));
}

function toWindow<ID extends StableID>(
  state: FeedState<ID>,
): CollectionWindowState<ID> {
  return createCollectionWindowState({
    revision: state.revision,
    requestGeneration: state.requestGeneration,
    start: state.start,
    size: state.size,
    total: state.total,
    pending: state.pending === null ? null : {
      generation: state.requestGeneration,
      direction: state.pending,
      anchor: state.cursor.current,
      revision: state.revision,
    },
  });
}

function fromWindow<ID extends StableID>(
  cursor: CursorState<ID>,
  collectionWindow: CollectionWindowState<ID>,
): FeedState<ID> {
  return Object.freeze({
    cursor,
    revision: collectionWindow.revision,
    requestGeneration: collectionWindow.requestGeneration,
    start: collectionWindow.start,
    size: collectionWindow.size,
    total: collectionWindow.total,
    pending: collectionWindow.pending?.direction ?? null,
  });
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}
