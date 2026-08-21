import type { QuantizedRange } from '../../../structures/range.js';
import type { Sequence } from '../../../structures/sequence.js';
import type {
  MultiThumbSliderCommand,
  MultiThumbSliderEvent,
  MultiThumbSliderPolicies,
  MultiThumbSliderState,
} from '../../../multi-thumb-slider.js';
import type { StableID } from '../../../shared.js';

export type ReferenceMultiThumbSliderResult<ID extends StableID> =
  | { readonly ok: true; readonly value: { readonly state: MultiThumbSliderState<ID>; readonly commands: readonly MultiThumbSliderCommand<ID>[] } }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function createReferenceMultiThumbSliderState<ID extends StableID>(
  current: ID | null,
  ticks: readonly number[],
): MultiThumbSliderState<ID> {
  return Object.freeze({ cursor: Object.freeze({ current }), ticks: Object.freeze([...ticks]) });
}

export function applyReferenceMultiThumbSliderEvent<ID extends StableID>(
  thumbs: Sequence<ID>,
  range: QuantizedRange,
  state: MultiThumbSliderState<ID>,
  event: MultiThumbSliderEvent<ID>,
  policies: MultiThumbSliderPolicies = {},
): ReferenceMultiThumbSliderResult<ID> {
  const gap = policies.minGap ?? 0;
  if (!isValid(thumbs, range, state, gap, policies.allowCross === true)) {
    return rejected('invalid-multi-thumb-state');
  }
  if (event === 'next-thumb' || event === 'previous-thumb') {
    if (thumbs.size === 0) return accepted(state);
    const currentIndex = state.cursor.current === null ? null : thumbs.indexOf(state.cursor.current);
    const delta = event === 'next-thumb' ? 1 : -1;
    const index = currentIndex === null
      ? (delta === 1 ? 0 : thumbs.size - 1)
      : (currentIndex + delta + thumbs.size) % thumbs.size;
    const id = thumbs.at(index);
    if (id === null) return accepted(state);
    return accepted(referenceState(id, state.ticks), [{ type: 'focus', id }]);
  }

  const id = typeof event === 'object' ? event.id : state.cursor.current;
  if (id === null) return rejected('no-cursor');
  const index = thumbs.indexOf(id);
  if (index === null) return rejected('multi-thumb-target-unavailable');
  if (typeof event === 'object' && event.type === 'focus') {
    return accepted(referenceState(id, state.ticks), [{ type: 'focus', id }]);
  }

  const previous = state.ticks[index] as number;
  let tick = typeof event === 'object'
    ? event.tick
    : event === 'increment'
      ? previous + 1
      : event === 'decrement'
        ? previous - 1
        : event === 'home'
          ? 0
          : range.count;
  tick = Math.max(0, Math.min(range.count, tick));
  if (policies.allowCross !== true) {
    const lower = index === 0 ? 0 : (state.ticks[index - 1] as number) + gap;
    const upper = index === state.ticks.length - 1 ? range.count : (state.ticks[index + 1] as number) - gap;
    tick = Math.max(lower, Math.min(upper, tick));
  }
  if (!Number.isSafeInteger(tick)) return rejected('thumb-tick-outside-range');
  const ticks = [...state.ticks];
  ticks[index] = tick;
  const commands: MultiThumbSliderCommand<ID>[] = [];
  if (state.cursor.current !== id) commands.push({ type: 'focus', id });
  if (previous !== tick) commands.push({ type: 'announce-tick', id, tick });
  return accepted(referenceState(id, ticks), commands);
}

function isValid<ID extends StableID>(
  thumbs: Sequence<ID>,
  range: QuantizedRange,
  state: MultiThumbSliderState<ID>,
  gap: number,
  allowCross: boolean,
): boolean {
  if (!Number.isSafeInteger(gap) || gap < 0 || state.ticks.length !== thumbs.size) return false;
  if (state.cursor.current !== null && !thumbs.contains(state.cursor.current)) return false;
  return state.ticks.every((tick, index) => (
    Number.isSafeInteger(tick)
    && tick >= 0
    && tick <= range.count
    && (allowCross || index === 0 || (state.ticks[index - 1] as number) + gap <= tick)
  ));
}

function referenceState<ID extends StableID>(current: ID | null, ticks: readonly number[]): MultiThumbSliderState<ID> {
  return createReferenceMultiThumbSliderState(current, ticks);
}

function accepted<ID extends StableID>(
  state: MultiThumbSliderState<ID>,
  commands: readonly MultiThumbSliderCommand<ID>[] = [],
): ReferenceMultiThumbSliderResult<ID> {
  return { ok: true, value: { state, commands: Object.freeze([...commands]) } };
}

function rejected<ID extends StableID>(errorCode: string): ReferenceMultiThumbSliderResult<ID> {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
