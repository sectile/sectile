import { unwrap } from './result.js';
import type { Result } from './shared.js';
import {
  applyPopupEvent,
  type PopupEvent,
} from './internal/composites/popup.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';

export type DrawerSide = 'top' | 'right' | 'bottom' | 'left';

export interface DrawerState {
  readonly open: boolean;
  readonly side: DrawerSide;
}

export type DrawerEvent = PopupEvent | { readonly type: 'set-side'; readonly side: DrawerSide };
export type DrawerCommand = { readonly type: 'request-initial-focus' } | { readonly type: 'request-focus-restore' };
export interface DrawerUpdate { readonly state: DrawerState; readonly commands: readonly DrawerCommand[] }

export function createDrawerState(open = false, side: DrawerSide = 'bottom'): DrawerState {
  return unwrap(tryCreateDrawerState(open, side));
}

export function tryCreateDrawerState(open = false, side: DrawerSide = 'bottom'): Result<DrawerState> {
  if (typeof open !== 'boolean') return fail('construction', 'invalid-drawer-open', 'Drawer open state must be boolean.');
  if (!isDrawerSide(side)) return fail('construction', 'invalid-drawer-side', 'Drawer side must be top, right, bottom, or left.');
  return ok(Object.freeze({ open, side }));
}

export function applyDrawerEvent(state: DrawerState, event: DrawerEvent): Result<DrawerUpdate> {
  const valid = tryCreateDrawerState(state.open, state.side);
  if (!valid.ok) return fail('transition-rejection', valid.error.code, valid.error.message);

  if (typeof event === 'object' && event.type === 'set-side') {
    if (!isDrawerSide(event.side)) return fail('transition-rejection', 'invalid-drawer-side', 'Drawer side must be top, right, bottom, or left.');
    if (event.side === state.side) return createMachineUpdate(state);
    return createMachineUpdate(Object.freeze({ open: state.open, side: event.side }));
  }

  const result = applyPopupEvent({ open: state.open }, event);
  if (!result.ok) return result;
  return createMachineUpdate(
    Object.freeze({ open: result.value.state.open, side: state.side }),
    result.value.commands.map((command) => ({
      type: command.type === 'popup-opened' ? 'request-initial-focus' as const : 'request-focus-restore' as const,
    })),
  );
}

function isDrawerSide(value: unknown): value is DrawerSide {
  return value === 'top' || value === 'right' || value === 'bottom' || value === 'left';
}
