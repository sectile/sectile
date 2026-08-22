import type { StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import type { CarouselCommand, CarouselEvent, CarouselPauseReason, CarouselPolicies, CarouselState, CarouselUpdate } from '../../../carousel.js';

export type ReferenceCarouselResult<ID extends StableID> =
  | { readonly ok: true; readonly value: CarouselUpdate<ID> }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function createReferenceCarouselState<ID extends StableID>(
  current: ID | null = null,
  paused = false,
  pauseReasons: readonly CarouselPauseReason[] = [],
): CarouselState<ID> {
  return Object.freeze({ cursor: Object.freeze({ current }), paused, pauseReasons: Object.freeze([...new Set(pauseReasons)]) });
}

export function applyReferenceCarouselEvent<ID extends StableID>(
  slides: Sequence<ID>,
  state: CarouselState<ID>,
  event: CarouselEvent<ID>,
  policies: CarouselPolicies = {},
): ReferenceCarouselResult<ID> {
  if (event === 'pause' || event === 'resume' || event === 'toggle-pause') {
    return accepted(createReferenceCarouselState(state.cursor.current, event === 'pause' ? true : event === 'resume' ? false : !state.paused, state.pauseReasons));
  }
  if (typeof event === 'object' && (event.type === 'pause-for' || event.type === 'resume-for')) {
    const pauseReasons = event.type === 'pause-for'
      ? state.pauseReasons.includes(event.reason) ? state.pauseReasons : [...state.pauseReasons, event.reason]
      : state.pauseReasons.filter((reason) => reason !== event.reason);
    return accepted(createReferenceCarouselState(state.cursor.current, state.paused, pauseReasons));
  }
  let id: ID | null;
  const ids = slides.ids;
  if (typeof event === 'object') {
    if (!ids.includes(event.id)) return rejected('carousel-target-unavailable');
    id = event.id;
  } else if (event === 'first') id = ids[0] ?? null;
  else if (event === 'last') id = ids.at(-1) ?? null;
  else if (state.cursor.current === null) id = event === 'next' ? ids[0] ?? null : ids.at(-1) ?? null;
  else {
    const index = ids.indexOf(state.cursor.current);
    const target = index + (event === 'next' ? 1 : -1);
    id = ids[target] ?? (policies.wrap === false ? state.cursor.current : event === 'next' ? ids[0] ?? null : ids.at(-1) ?? null);
  }
  return id === null || id === state.cursor.current
    ? accepted(state)
    : accepted(createReferenceCarouselState(id, state.paused, state.pauseReasons), [{ type: 'announce-slide', id }]);
}

function accepted<ID extends StableID>(state: CarouselState<ID>, commands: readonly CarouselCommand<ID>[] = []): ReferenceCarouselResult<ID> {
  return { ok: true, value: { state, commands } };
}
function rejected<ID extends StableID>(errorCode: string): ReferenceCarouselResult<ID> {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
