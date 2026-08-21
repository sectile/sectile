import type { OpenCommand, OpenEvent, OpenState } from '../../state/open-state.js';

export type ReferenceOpenResult =
  | { readonly ok: true; readonly value: { readonly state: OpenState; readonly commands: readonly OpenCommand[] } }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function referenceOpenState(open = false): OpenState {
  return Object.freeze({ open });
}

export function referenceApplyOpenEvent(state: OpenState, event: OpenEvent): ReferenceOpenResult {
  if (typeof state.open !== 'boolean') return rejected('invalid-open-state');
  let next: boolean | null = null;
  if (event === 'toggle') next = !state.open;
  else if (event === 'open') next = true;
  else if (event === 'close') next = false;
  else if (typeof event === 'object' && event.type === 'set-open' && typeof event.open === 'boolean') {
    next = event.open;
  }
  if (next === null) return rejected('invalid-open-event');
  return {
    ok: true,
    value: {
      state: next === state.open ? state : referenceOpenState(next),
      commands: next === state.open ? [] : [{ type: 'open-changed', open: next }],
    },
  };
}

function rejected(errorCode: string): ReferenceOpenResult {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
