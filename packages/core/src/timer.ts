import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';

export interface TimerPolicies {
  readonly countdown?: boolean;
  readonly startMs?: number;
  /** `null` leaves an elapsed timer unbounded. Countdown timers default to zero. */
  readonly targetMs?: number | null;
}
export interface TimerState { readonly valueMs: number; readonly running: boolean; readonly completed: boolean }
export type TimerEvent = 'start' | 'pause' | 'resume' | 'reset' | 'restart' | 'toggle' | { readonly type: 'tick'; readonly elapsedMs: number };
export type TimerCommand = { readonly type: 'timer-completed'; readonly valueMs: number };
export interface TimerUpdate { readonly state: TimerState; readonly commands: readonly TimerCommand[] }
export interface TimerParts { readonly days: number; readonly hours: number; readonly minutes: number; readonly seconds: number; readonly milliseconds: number }

export function createTimerState(policies: TimerPolicies = {}, valueMs: number = policies.startMs ?? 0, running = false): Result<TimerState> {
  const valid = validatePolicies(policies);
  if (!valid.ok) return valid;
  if (!Number.isFinite(valueMs) || valueMs < 0) return fail('construction', 'timer-value-invalid', 'Timer value must be finite and non-negative.');
  const target = getTarget(policies);
  const completed = target !== null && valueMs === target;
  if (policies.countdown === true && target !== null && valueMs < target) return fail('construction', 'timer-value-before-target', 'Countdown value must not be below its target.');
  if (policies.countdown !== true && target !== null && valueMs > target) return fail('construction', 'timer-value-after-target', 'Elapsed timer value must not exceed its target.');
  return ok(Object.freeze({ valueMs, running: running && !completed, completed }));
}

export function applyTimerEvent(state: TimerState, event: TimerEvent, policies: TimerPolicies = {}): Result<TimerUpdate> {
  const valid = createTimerState(policies, state.valueMs, state.running);
  if (!valid.ok) return fail('transition-rejection', valid.error.code, valid.error.message);
  const startMs = policies.startMs ?? 0;
  if (event === 'reset') return update(Object.freeze({ valueMs: startMs, running: false, completed: isComplete(startMs, policies) }));
  if (event === 'restart') return update(Object.freeze({ valueMs: startMs, running: !isComplete(startMs, policies), completed: isComplete(startMs, policies) }));
  if (event === 'pause') return update(Object.freeze({ ...state, running: false }));
  if (event === 'start' || event === 'resume') return state.completed ? update(state) : update(Object.freeze({ ...state, running: true }));
  if (event === 'toggle') return state.completed ? update(state) : update(Object.freeze({ ...state, running: !state.running }));
  if (!Number.isFinite(event.elapsedMs) || event.elapsedMs < 0) return fail('transition-rejection', 'timer-elapsed-invalid', 'Timer elapsed time must be finite and non-negative.');
  if (!state.running || event.elapsedMs === 0) return update(state);
  const target = getTarget(policies);
  const raw = policies.countdown === true ? state.valueMs - event.elapsedMs : state.valueMs + event.elapsedMs;
  const valueMs = policies.countdown === true ? Math.max(target ?? 0, raw) : target === null ? raw : Math.min(target, raw);
  const completed = target !== null && valueMs === target;
  return update(Object.freeze({ valueMs, running: !completed, completed }), completed && !state.completed ? [{ type: 'timer-completed', valueMs }] : []);
}

export function getTimerParts(valueMs: number): Result<TimerParts> {
  if (!Number.isFinite(valueMs) || valueMs < 0) return fail('construction', 'timer-value-invalid', 'Timer value must be finite and non-negative.');
  const whole = Math.floor(valueMs);
  return ok(Object.freeze({
    days: Math.floor(whole / 86_400_000),
    hours: Math.floor(whole / 3_600_000) % 24,
    minutes: Math.floor(whole / 60_000) % 60,
    seconds: Math.floor(whole / 1_000) % 60,
    milliseconds: whole % 1_000,
  }));
}

export function getTimerProgress(state: TimerState, policies: TimerPolicies = {}): Result<number | null> {
  const valid = createTimerState(policies, state.valueMs, state.running);
  if (!valid.ok) return valid;
  const start = policies.startMs ?? 0;
  const target = getTarget(policies);
  if (target === null || target === start) return ok(target === start ? 100 : null);
  const progress = policies.countdown === true ? (start - state.valueMs) / (start - target) : (state.valueMs - start) / (target - start);
  return ok(Math.max(0, Math.min(100, progress * 100)));
}

function validatePolicies(policies: TimerPolicies): Result<true> {
  const start = policies.startMs ?? 0; const target = getTarget(policies);
  if (!Number.isFinite(start) || start < 0) return fail('construction', 'timer-start-invalid', 'Timer start must be finite and non-negative.');
  if (target !== null && (!Number.isFinite(target) || target < 0)) return fail('construction', 'timer-target-invalid', 'Timer target must be finite and non-negative, or null.');
  if (policies.countdown === true && target !== null && start < target) return fail('construction', 'timer-countdown-order-invalid', 'Countdown start must not be below its target.');
  if (policies.countdown !== true && target !== null && start > target) return fail('construction', 'timer-countup-order-invalid', 'Elapsed timer start must not exceed its target.');
  return ok(true);
}
function getTarget(policies: TimerPolicies): number | null { return policies.targetMs === undefined ? policies.countdown === true ? 0 : null : policies.targetMs; }
function isComplete(valueMs: number, policies: TimerPolicies): boolean { const target = getTarget(policies); return target !== null && valueMs === target; }
function update(state: TimerState, commands: readonly TimerCommand[] = []): Result<TimerUpdate> { return ok(Object.freeze({ state, commands: Object.freeze([...commands]) })); }
