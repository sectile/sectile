import type { Result } from '../../shared.js';
import type { QuantizedRange } from '../../structures/range.js';
import { fail, ok } from '../kernel/foundation.js';
import { createMachineUpdate } from '../kernel/machine.js';

export type SliderEvent =
  | 'increment'
  | 'decrement'
  | 'page-up'
  | 'page-down'
  | 'home'
  | 'end';

export interface SliderState {
  readonly tick: number;
}

export interface SliderCommand {
  readonly type: 'announce-tick';
  readonly tick: number;
}

export interface SliderUpdate {
  readonly state: SliderState;
  readonly commands: readonly SliderCommand[];
}

export function createSliderState(
  range: QuantizedRange,
  tick = 0,
): Result<SliderState> {
  if (!isSliderTick(range, tick)) {
    return fail(
      'construction',
      'slider-tick-outside-range',
      'Slider tick must be a safe integer inside the quantized range.',
      { tick, count: range.count },
    );
  }
  return ok(sliderState(tick));
}

export function applySliderEvent(
  range: QuantizedRange,
  state: SliderState,
  event: SliderEvent,
  page = 2,
): Result<SliderUpdate> {
  if (!isSliderTick(range, state.tick)) {
    return fail(
      'transition-rejection',
      'slider-tick-outside-range',
      'Slider tick must be a safe integer inside the quantized range.',
      { tick: state.tick, count: range.count },
    );
  }
  if (!isSliderEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-slider-event',
      'Slider event must be increment, decrement, page-up, page-down, home, or end.',
      { event },
    );
  }
  if (!Number.isSafeInteger(page) || page < 1) {
    return fail(
      'transition-rejection',
      'invalid-slider-page',
      'Slider page must be a positive safe integer.',
      { page },
    );
  }

  let tick: number;
  switch (event) {
    case 'increment':
      tick = state.tick === range.count ? range.count : state.tick + 1;
      break;
    case 'decrement':
      tick = state.tick === 0 ? 0 : state.tick - 1;
      break;
    case 'page-up':
      tick = page >= range.count - state.tick ? range.count : state.tick + page;
      break;
    case 'page-down':
      tick = page >= state.tick ? 0 : state.tick - page;
      break;
    case 'home':
      tick = 0;
      break;
    case 'end':
      tick = range.count;
      break;
  }

  if (tick === state.tick) return createMachineUpdate(state);
  const next = sliderState(tick);
  return createMachineUpdate(next, [{ type: 'announce-tick', tick }]);
}

function isSliderTick(range: QuantizedRange, tick: number): boolean {
  return Number.isSafeInteger(tick) && tick >= 0 && tick <= range.count;
}

function isSliderEvent(value: string): value is SliderEvent {
  return (
    value === 'increment' ||
    value === 'decrement' ||
    value === 'page-up' ||
    value === 'page-down' ||
    value === 'home' ||
    value === 'end'
  );
}

function sliderState(tick: number): SliderState {
  return Object.freeze({ tick });
}
