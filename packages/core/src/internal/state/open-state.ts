import { unwrap } from '../../result.js';
import type { Result } from '../../shared.js';
import { fail, ok } from '../kernel/foundation.js';
import { createMachineUpdate, type MachineUpdate } from '../kernel/machine.js';

export interface OpenState { readonly open: boolean }
export type OpenEvent = 'toggle' | 'open' | 'close' | { readonly type: 'set-open'; readonly open: boolean };
export type OpenCommand = { readonly type: 'open-changed'; readonly open: boolean };

export function createOpenState(open = false): OpenState {
  return unwrap(tryCreateOpenState(open));
}

export function tryCreateOpenState(open = false): Result<OpenState> {
  return typeof open === 'boolean'
    ? ok(Object.freeze({ open }))
    : fail('construction', 'invalid-open-state', 'Open state must be boolean.');
}

export function applyOpenEvent(
  state: OpenState,
  event: OpenEvent,
): Result<MachineUpdate<OpenState, OpenCommand>> {
  if (typeof state.open !== 'boolean') {
    return fail('transition-rejection', 'invalid-open-state', 'Open state must be boolean.');
  }
  const next = typeof event === 'object'
    ? event.type === 'set-open' && typeof event.open === 'boolean' ? event.open : null
    : event === 'toggle' ? !state.open : event === 'open' ? true : event === 'close' ? false : null;
  if (next === null) {
    return fail('transition-rejection', 'invalid-open-event', 'Open event is not accepted.');
  }
  if (next === state.open) return createMachineUpdate(state);
  const created = tryCreateOpenState(next);
  if (!created.ok) return created;
  return createMachineUpdate(created.value, [{ type: 'open-changed', open: next }]);
}
