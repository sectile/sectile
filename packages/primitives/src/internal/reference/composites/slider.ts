import type { QuantizedRange } from '../../../structures/range.js';
import type {
  SliderCommand,
  SliderEvent,
  SliderState,
  SliderTransition,
} from '../../composites/slider.js';

interface ReferenceSliderRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection';
  readonly errorCode: string;
}

export type ReferenceSliderResult =
  | { readonly ok: true; readonly value: SliderTransition }
  | ReferenceSliderRejection;

export function createReferenceSliderState(
  range: QuantizedRange,
  tick = 0,
): SliderState {
  if (!referenceTickExists(range, tick)) {
    throw new TypeError('reference slider tick outside range');
  }
  return referenceState(tick);
}

export function referenceStepSlider(
  range: QuantizedRange,
  state: SliderState,
  event: SliderEvent,
  page = 2,
): ReferenceSliderResult {
  if (!referenceTickExists(range, state.tick)) {
    return referenceRejected('slider-tick-outside-range');
  }
  if (!referenceEventExists(event)) return referenceRejected('invalid-slider-event');
  if (!Number.isSafeInteger(page) || page < 1) {
    return referenceRejected('invalid-slider-page');
  }

  let tick = state.tick;
  if (event === 'increment') tick += 1;
  else if (event === 'decrement') tick -= 1;
  else if (event === 'page-up') tick += page;
  else if (event === 'page-down') tick -= page;
  else if (event === 'home') tick = 0;
  else tick = range.count;
  tick = Math.max(0, Math.min(range.count, tick));

  if (tick === state.tick) return referenceAccepted(state);
  return referenceAccepted(
    referenceState(tick),
    [{ type: 'announce-tick', tick }],
  );
}

function referenceTickExists(range: QuantizedRange, tick: number): boolean {
  return Number.isSafeInteger(tick) && range.valueAt(tick) !== null;
}

function referenceEventExists(value: string): value is SliderEvent {
  return (
    value === 'increment' ||
    value === 'decrement' ||
    value === 'page-up' ||
    value === 'page-down' ||
    value === 'home' ||
    value === 'end'
  );
}

function referenceState(tick: number): SliderState {
  return Object.freeze({ tick });
}

function referenceAccepted(
  state: SliderState,
  commands: readonly SliderCommand[] = [],
): ReferenceSliderResult {
  return {
    ok: true,
    value: Object.freeze({
      state,
      commands: Object.freeze(commands.map((command) => Object.freeze({ ...command }))),
    }),
  };
}

function referenceRejected(errorCode: string): ReferenceSliderRejection {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
