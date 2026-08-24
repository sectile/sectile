import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import { createCursorState, type CursorState } from './internal/state/cursor.js';

export type CarouselPauseReason = 'focus' | 'hover' | 'visibility';

export interface CarouselState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
  /** User-owned pause state. Host-owned temporary pauses live in pauseReasons. */
  readonly paused: boolean;
  readonly pauseReasons: readonly CarouselPauseReason[];
}

export type CarouselEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'pause'
  | 'resume'
  | 'toggle-pause'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'pause-for'; readonly reason: CarouselPauseReason }
  | { readonly type: 'resume-for'; readonly reason: CarouselPauseReason };

export type CarouselCommand<ID extends StableID = StableID> = {
  readonly type: 'announce-slide';
  readonly id: ID;
};

export interface CarouselPolicies { readonly wrap?: boolean }
export interface CarouselPosition { readonly index: number | null; readonly count: number }
export interface CarouselUpdate<ID extends StableID = StableID> { readonly state: CarouselState<ID>; readonly commands: readonly CarouselCommand<ID>[] }

export function createCarouselState<ID extends StableID>(
  slides: Sequence<ID>,
  current: ID | null = null,
  paused = false,
  pauseReasons: readonly CarouselPauseReason[] = [],
): CarouselState<ID> {
  return unwrap(tryCreateCarouselState(slides, current, paused, pauseReasons));
}

export function tryCreateCarouselState<ID extends StableID>(
  slides: Sequence<ID>,
  current: ID | null = null,
  paused = false,
  pauseReasons: readonly CarouselPauseReason[] = [],
): Result<CarouselState<ID>> {
  if (current !== null && !slides.contains(current)) return fail('construction', 'carousel-cursor-outside-slides', 'Carousel cursor must identify a slide.');
  return ok(Object.freeze({ cursor: createCursorState(current), paused, pauseReasons: Object.freeze([...new Set(pauseReasons)]) }));
}

export function getCarouselPosition<ID extends StableID>(slides: Sequence<ID>, state: CarouselState<ID>): CarouselPosition {
  return Object.freeze({ index: state.cursor.current === null ? null : slides.indexOf(state.cursor.current), count: slides.size });
}

export function isCarouselRotationPaused(state: CarouselState): boolean {
  return state.paused || state.pauseReasons.length > 0;
}

export function applyCarouselEvent<ID extends StableID>(
  slides: Sequence<ID>,
  state: CarouselState<ID>,
  event: CarouselEvent<ID>,
  policies: CarouselPolicies = {},
): Result<CarouselUpdate<ID>> {
  const valid = tryCreateCarouselState(slides, state.cursor.current, state.paused, state.pauseReasons);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };

  if (event === 'pause' || event === 'resume' || event === 'toggle-pause') {
    const paused = event === 'pause' ? true : event === 'resume' ? false : !state.paused;
    return createMachineUpdate(Object.freeze({ cursor: state.cursor, paused, pauseReasons: state.pauseReasons }));
  }

  if (typeof event === 'object' && (event.type === 'pause-for' || event.type === 'resume-for')) {
    const pauseReasons = event.type === 'pause-for'
      ? state.pauseReasons.includes(event.reason) ? state.pauseReasons : Object.freeze([...state.pauseReasons, event.reason])
      : Object.freeze(state.pauseReasons.filter((reason) => reason !== event.reason));
    if (pauseReasons === state.pauseReasons) return createMachineUpdate(state);
    return createMachineUpdate(Object.freeze({ cursor: state.cursor, paused: state.paused, pauseReasons }));
  }

  let id: ID | null;
  if (typeof event === 'object') {
    if (!slides.contains(event.id)) return fail('transition-rejection', 'carousel-target-unavailable', 'Direct carousel focus requires a slide.');
    id = event.id;
  } else if (event === 'first') id = slides.at(0);
  else if (event === 'last') id = slides.at(slides.size - 1);
  else if (state.cursor.current === null) id = slides.at(event === 'next' ? 0 : slides.size - 1);
  else {
    const moved = slides.move(state.cursor.current, event === 'next' ? 1 : -1, policies.wrap === false ? 'stop' : 'wrap');
    id = moved.kind === 'found' ? moved.id : state.cursor.current;
  }

  if (id === null || id === state.cursor.current) return createMachineUpdate(state);
  return createMachineUpdate(
    Object.freeze({ cursor: createCursorState(id), paused: state.paused, pauseReasons: state.pauseReasons }),
    [{ type: 'announce-slide', id }],
  );
}
