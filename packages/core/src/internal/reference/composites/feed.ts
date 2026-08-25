import type { FeedCommand, FeedEvent, FeedState, FeedUpdate } from '../../../feed.js';
import type { StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';

export type ReferenceFeedResult<ID extends StableID> =
  | { readonly ok: true; readonly value: FeedUpdate<ID> }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function createReferenceFeedState<ID extends StableID>(
  current: ID | null = null,
  revision = 0,
  pending: FeedState<ID>['pending'] = null,
  requestGeneration: number = pending === null ? 0 : 1,
  start: number = 0,
  size: number = 2,
  total: number | null = null,
): FeedState<ID> {
  return Object.freeze({
    cursor: Object.freeze({ current }),
    revision,
    requestGeneration,
    start,
    size,
    total,
    pending,
  });
}

export function applyReferenceFeedEvent<ID extends StableID>(
  items: Sequence<ID>,
  state: FeedState<ID>,
  event: FeedEvent<ID>,
): ReferenceFeedResult<ID> {
  if (event === 'clear-request') {
    return accepted(createReferenceFeedState(
      state.cursor.current,
      state.revision,
      null,
      state.requestGeneration,
      state.start,
      state.size,
      state.total,
    ));
  }
  if (event === 'request-before' || event === 'request-after') {
    if (state.pending !== null) return accepted(state);
    const direction = event === 'request-before' ? 'before' : 'after';
    const requestGeneration = state.requestGeneration + 1;
    return accepted(
      createReferenceFeedState(
        state.cursor.current,
        state.revision,
        direction,
        requestGeneration,
        state.start,
        state.size,
        state.total,
      ),
      [{
        type: 'request-window',
        direction,
        anchor: state.cursor.current,
        revision: state.revision,
        requestGeneration,
      }],
    );
  }
  const ids = items.ids;
  let id: ID | null;
  if (typeof event === 'object') {
    if (!ids.includes(event.id)) return rejected('feed-target-unavailable');
    id = event.id;
  } else if (state.cursor.current === null) {
    id = event === 'next' ? ids[0] ?? null : ids.at(-1) ?? null;
  } else {
    const index = ids.indexOf(state.cursor.current);
    id = ids[index + (event === 'next' ? 1 : -1)] ?? state.cursor.current;
  }
  return id === null || id === state.cursor.current
    ? accepted(state)
    : accepted(
        createReferenceFeedState(
          id,
          state.revision,
          state.pending,
          state.requestGeneration,
          state.start,
          state.size,
          state.total,
        ),
        [{ type: 'focus', id }],
      );
}

function accepted<ID extends StableID>(
  state: FeedState<ID>,
  commands: readonly FeedCommand<ID>[] = [],
): ReferenceFeedResult<ID> {
  return { ok: true, value: { state, commands } };
}

function rejected<ID extends StableID>(errorCode: string): ReferenceFeedResult<ID> {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
