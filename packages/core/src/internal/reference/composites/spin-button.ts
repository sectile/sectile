import type { QuantizedRange } from '../../../structures/range.js';
import type {
  SpinButtonCommand,
  SpinButtonEvent,
  SpinButtonPolicies,
  SpinButtonState,
} from '../../../spin-button.js';
import { applyReferenceSliderEvent, createReferenceSliderState } from './slider.js';

export type ReferenceSpinButtonResult =
  | { readonly ok: true; readonly value: { readonly state: SpinButtonState; readonly commands: readonly SpinButtonCommand[] } }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function createReferenceSpinButtonState(value = '0', draft: string | null = null): SpinButtonState {
  return Object.freeze({ value, draft });
}

export function applyReferenceSpinButtonEvent(
  range: QuantizedRange,
  state: SpinButtonState,
  event: SpinButtonEvent,
  policies: SpinButtonPolicies = {},
): ReferenceSpinButtonResult {
  if (typeof event === 'object' && event.type === 'input') {
    return accepted(createReferenceSpinButtonState(state.value, event.text), event.text === state.draft ? [] : [{ type: 'draft-changed', text: event.text }]);
  }
  if (event === 'cancel') {
    return accepted(createReferenceSpinButtonState(state.value, null), state.draft === null ? [] : [{ type: 'draft-changed', text: null }]);
  }
  if (event === 'commit') {
    if (state.draft === null) return accepted(state, []);
    const parsed = (policies.parse ?? ((text: string): string => text))(state.draft);
    const tick = parsed === null ? null : range.tickOf(parsed);
    if (tick === null) return rejected('spin-button-draft-invalid');
    const value = range.valueAt(tick) as string;
    return accepted(createReferenceSpinButtonState(value, null), [
      { type: 'draft-changed', text: null },
      ...(value === state.value ? [] : [{ type: 'announce-value' as const, value }]),
    ]);
  }
  const tick = range.tickOf(state.value) as number;
  const moved = applyReferenceSliderEvent(range, createReferenceSliderState(range, tick), event, policies.page);
  if (!moved.ok) return { ok: false, errorClass: moved.errorClass, errorCode: moved.errorCode };
  const value = range.valueAt(moved.value.state.tick) as string;
  return accepted(createReferenceSpinButtonState(value, null), [
    ...(state.draft === null ? [] : [{ type: 'draft-changed' as const, text: null }]),
    ...(value === state.value ? [] : [{ type: 'announce-value' as const, value }]),
  ]);
}

function accepted(state: SpinButtonState, commands: readonly SpinButtonCommand[]): ReferenceSpinButtonResult {
  return { ok: true, value: { state, commands } };
}

function rejected(errorCode: string): ReferenceSpinButtonResult {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
