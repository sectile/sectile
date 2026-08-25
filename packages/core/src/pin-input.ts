import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { fail, freezeArray, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';

export interface PinInputState { readonly values: readonly string[]; readonly current: number }
export type PinInputEvent = 'next' | 'previous' | 'backspace' | 'delete' | { readonly type: 'focus'; readonly index: number } | { readonly type: 'input'; readonly value: string };
export type PinInputCommand = { readonly type: 'focus-cell'; readonly index: number } | { readonly type: 'complete'; readonly value: string };
export interface PinInputPolicies { readonly accept?: (value: string, index: number) => boolean }

export type PinInputAcceptPredicate = NonNullable<PinInputPolicies['accept']>;
export interface PinInputUpdate { readonly state: PinInputState; readonly commands: readonly PinInputCommand[] }

export function createPinInputState(length: number, value: string | readonly string[] = ''): PinInputState {
  return unwrap(tryCreatePinInputState(length, value));
}

export function tryCreatePinInputState(length: number, value: string | readonly string[] = ''): Result<PinInputState> {
  if (!Number.isSafeInteger(length) || length < 1) return fail('construction', 'invalid-pin-input-length', 'Pin input length must be a positive safe integer.');
  const source = typeof value === 'string' ? Array.from(value) : [...value];
  if (source.length > length || source.some((part) => typeof part !== 'string' || Array.from(part).length > 1)) return fail('construction', 'invalid-pin-input-value', 'Pin input values must contain at most one character per cell.');
  const values = Array.from({ length }, (_, index) => source[index] ?? '');
  const current = Math.min(source.length, length - 1);
  return ok(Object.freeze({ values: freezeArray(values), current }));
}
export function applyPinInputEvent(length: number, state: PinInputState, event: PinInputEvent, policies: PinInputPolicies = {}): Result<PinInputUpdate> {
  const valid = tryCreatePinInputState(length, state.values); if (!valid.ok || state.current < 0 || state.current >= length) return fail('transition-rejection', 'invalid-pin-input-state', 'Pin input state must match its declared length.');
  const focus = (index: number): Result<PinInputUpdate> => createMachineUpdate<PinInputState, PinInputCommand>(Object.freeze({ values: state.values, current: Math.max(0, Math.min(length - 1, index)) }), [{ type: 'focus-cell', index: Math.max(0, Math.min(length - 1, index)) }]);
  if (event === 'next') return focus(state.current + 1); if (event === 'previous') return focus(state.current - 1);
  if (typeof event === 'object' && event.type === 'focus') return Number.isSafeInteger(event.index) ? focus(event.index) : fail('transition-rejection', 'invalid-pin-input-index', 'Pin input focus index must be a safe integer.');
  const values = [...state.values];
  if (event === 'delete') values[state.current] = '';
  else if (event === 'backspace') { if (values[state.current] === '' && state.current > 0) { values[state.current - 1] = ''; return createMachineUpdate<PinInputState, PinInputCommand>(Object.freeze({ values: freezeArray(values), current: state.current - 1 }), [{ type: 'focus-cell', index: state.current - 1 }]); } values[state.current] = ''; }
  else if (typeof event === 'object' && event.type === 'input') { const characters = Array.from(event.value); if (characters.length !== 1 || policies.accept?.(event.value, state.current) === false) return fail('transition-rejection', 'pin-input-value-rejected', 'Pin input accepts one permitted character at a time.'); values[state.current] = event.value; const current = Math.min(length - 1, state.current + 1); const commands: PinInputCommand[] = current === state.current ? [] : [{ type: 'focus-cell', index: current }]; if (values.every(Boolean)) commands.push({ type: 'complete', value: values.join('') }); return createMachineUpdate(Object.freeze({ values: freezeArray(values), current }), commands); }
  else return fail('transition-rejection', 'invalid-pin-input-event', 'Pin input event is not recognized.');
  return createMachineUpdate(Object.freeze({ values: freezeArray(values), current: state.current }));
}
