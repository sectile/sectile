import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { QuantizedRange } from './structures/range.js';
import type { Sequence } from './structures/sequence.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import { createCursorState, type CursorState } from './internal/state/cursor.js';

export interface MultiThumbSliderState<ID extends StableID = StableID> { readonly cursor: CursorState<ID>; readonly ticks: readonly number[] }
export type MultiThumbSliderEvent<ID extends StableID = StableID> = 'next-thumb' | 'previous-thumb' | 'increment' | 'decrement' | 'home' | 'end' | { readonly type: 'focus'; readonly id: ID } | { readonly type: 'set-tick'; readonly id: ID; readonly tick: number };
export type MultiThumbSliderCommand<ID extends StableID = StableID> = { readonly type: 'focus'; readonly id: ID } | { readonly type: 'announce-tick'; readonly id: ID; readonly tick: number };
export interface MultiThumbSliderPolicies { readonly minGap?: number; readonly allowCross?: boolean }
export interface MultiThumbSliderUpdate<ID extends StableID = StableID> { readonly state: MultiThumbSliderState<ID>; readonly commands: readonly MultiThumbSliderCommand<ID>[] }
export interface MultiThumbSliderThumbBounds { readonly index: number; readonly tick: number; readonly lowerTick: number; readonly upperTick: number }

/** Query-local validation reads at most three adjacent ticks; full state admission is separate. */
export function getMultiThumbSliderThumbBounds<ID extends StableID>(thumbs: Sequence<ID>, range: QuantizedRange,
  state: MultiThumbSliderState<NoInfer<ID>>, id: NoInfer<ID>, policies: MultiThumbSliderPolicies = {}): Result<MultiThumbSliderThumbBounds> {
  if (state.ticks.length !== thumbs.size) return fail('construction', 'thumb-value-count-mismatch', 'Every thumb requires one tick.');
  const index = thumbs.indexOf(id);
  if (index === null) return fail('construction', 'multi-thumb-target-unavailable', 'Thumb target must exist.');
  const gap = policies.minGap ?? 0;
  if (!Number.isSafeInteger(gap) || gap < 0) return fail('construction', 'invalid-thumb-gap', 'minGap must be a non-negative safe integer.');
  const tick = state.ticks[index];
  for (let position = Math.max(0, index - 1); position <= Math.min(state.ticks.length - 1, index + 1); position++) {
    const candidate = position === index ? tick : state.ticks[position];
    if (candidate === undefined || !Number.isSafeInteger(candidate) || candidate < 0 || candidate > range.count)
      return fail('construction', 'thumb-tick-outside-range', 'Relevant thumb ticks must be safe range ticks.');
  }
  const { lower, upper } = thumbLimits(state, index, range.count, policies);
  if (lower > (tick as number) || upper < (tick as number)) return fail('construction', 'thumb-order-violation', 'Thumb ticks must preserve order and minimum gap.');
  return ok(Object.freeze({ index, tick: tick as number, lowerTick: lower, upperTick: upper }));
}

function thumbLimits<ID extends StableID>(state: MultiThumbSliderState<ID>, index: number, count: number, policies: MultiThumbSliderPolicies): { readonly lower: number; readonly upper: number } {
  const gap = policies.minGap ?? 0;
  return { lower: policies.allowCross || index === 0 ? 0 : (state.ticks[index - 1] as number) + gap,
    upper: policies.allowCross || index === state.ticks.length - 1 ? count : (state.ticks[index + 1] as number) - gap };
}

export function createMultiThumbSliderState<ID extends StableID>(thumbs: Sequence<ID>, range: QuantizedRange, ticks: readonly number[], current: ID | null = null, policies: MultiThumbSliderPolicies = {}): MultiThumbSliderState<ID> {
  return unwrap(tryCreateMultiThumbSliderState(thumbs, range, ticks, current, policies));
}

export function tryCreateMultiThumbSliderState<ID extends StableID>(thumbs: Sequence<ID>, range: QuantizedRange, ticks: readonly number[], current: ID | null = null, policies: MultiThumbSliderPolicies = {}): Result<MultiThumbSliderState<ID>> {
  if (ticks.length !== thumbs.size) return fail('construction', 'thumb-value-count-mismatch', 'Every thumb requires one tick.');
  if (current !== null && !thumbs.contains(current)) return fail('construction', 'multi-thumb-cursor-outside-domain', 'Active thumb must exist.');
  const gap = policies.minGap ?? 0;
  if (!Number.isSafeInteger(gap) || gap < 0) return fail('construction', 'invalid-thumb-gap', 'minGap must be a non-negative safe integer.');
  for (let index = 0; index < ticks.length; index += 1) {
    const tick = ticks[index];
    if (tick === undefined || !Number.isSafeInteger(tick) || tick < 0 || tick > range.count) return fail('construction', 'thumb-tick-outside-range', 'Every thumb tick must be inside the range.');
    if (!policies.allowCross && index > 0 && (ticks[index - 1] as number) + gap > tick) return fail('construction', 'thumb-order-violation', 'Thumb ticks must preserve order and minimum gap.');
  }
  return ok(Object.freeze({ cursor: createCursorState(current), ticks: Object.freeze([...ticks]) }));
}

export function applyMultiThumbSliderEvent<ID extends StableID>(thumbs: Sequence<ID>, range: QuantizedRange, state: MultiThumbSliderState<ID>, event: MultiThumbSliderEvent<ID>, policies: MultiThumbSliderPolicies = {}): Result<MultiThumbSliderUpdate<ID>> {
  const valid = tryCreateMultiThumbSliderState(thumbs, range, state.ticks, state.cursor.current, policies);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (event === 'next-thumb' || event === 'previous-thumb') {
    if (thumbs.size === 0) return createMachineUpdate(state);
    const current = state.cursor.current;
    let id: ID | null;
    if (current === null) id = thumbs.at(event === 'next-thumb' ? 0 : thumbs.size - 1);
    else { const target = thumbs.move(current, event === 'next-thumb' ? 1 : -1, 'wrap'); id = target.kind === 'found' ? target.id : null; }
    if (id === null) return createMachineUpdate(state);
    return createMachineUpdate(Object.freeze({ cursor: createCursorState(id), ticks: state.ticks }), [{ type: 'focus', id }]);
  }
  const id = typeof event === 'object' ? event.id : state.cursor.current;
  if (id === null) return fail('transition-rejection', 'no-cursor', 'Multi-thumb change requires an active thumb.');
  const index = thumbs.indexOf(id);
  if (index === null) return fail('transition-rejection', 'multi-thumb-target-unavailable', 'Thumb target must exist.');
  if (typeof event === 'object' && event.type === 'focus') return createMachineUpdate(Object.freeze({ cursor: createCursorState(id), ticks: state.ticks }), [{ type: 'focus', id }]);
  const current = state.ticks[index] as number;
  let tick = typeof event === 'object' ? event.tick : event === 'increment' ? current + 1 : event === 'decrement' ? current - 1 : event === 'home' ? 0 : range.count;
  tick = Math.max(0, Math.min(range.count, tick));
  if (!policies.allowCross) {
    const { lower, upper } = thumbLimits(state, index, range.count, policies);
    tick = Math.max(lower, Math.min(upper, tick));
  }
  if (!Number.isSafeInteger(tick)) return fail('transition-rejection', 'thumb-tick-outside-range', 'Thumb tick must be a safe range tick.');
  const ticks = [...state.ticks]; ticks[index] = tick;
  const commands: MultiThumbSliderCommand<ID>[] = [];
  if (state.cursor.current !== id) commands.push({ type: 'focus', id });
  if (current !== tick) commands.push({ type: 'announce-tick', id, tick });
  return createMachineUpdate(Object.freeze({ cursor: createCursorState(id), ticks: Object.freeze(ticks) }), commands);
}
