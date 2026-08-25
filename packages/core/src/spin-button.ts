import { unwrap } from './result.js';
import type { Result } from './shared.js';
import type { QuantizedRange } from './structures/range.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applySliderEvent,
  createSliderState,
  type SliderEvent,
  tryCreateSliderState,
} from './internal/composites/slider.js';

export interface SpinButtonState {
  readonly value: string;
  readonly draft: string | null;
}

export type SpinButtonEvent =
  | SliderEvent
  | { readonly type: 'input'; readonly text: string }
  | 'commit'
  | 'cancel';

export type SpinButtonCommand =
  | { readonly type: 'draft-changed'; readonly text: string | null }
  | { readonly type: 'announce-value'; readonly value: string };

export interface SpinButtonPolicies {
  readonly page?: number;
  readonly parse?: (text: string) => string | null;
}

export type SpinButtonParser = NonNullable<SpinButtonPolicies['parse']>;

export interface SpinButtonUpdate {
  readonly state: SpinButtonState;
  readonly commands: readonly SpinButtonCommand[];
}

export function createSpinButtonState(
  range: QuantizedRange,
  value: string = range.lower,
  draft: string | null = null,
): SpinButtonState {
  return unwrap(tryCreateSpinButtonState(range, value, draft));
}

export function tryCreateSpinButtonState(
  range: QuantizedRange,
  value: string = range.lower,
  draft: string | null = null,
): Result<SpinButtonState> {
  if (typeof value !== 'string') {
    return fail('construction', 'invalid-spin-button-value', 'Spin button value must be decimal text.');
  }
  const tick = range.tickOf(value);
  if (tick === null) {
    return fail('construction', 'spin-button-value-outside-lattice', 'Spin button value must lie on the range lattice.', { value });
  }
  if (draft !== null && typeof draft !== 'string') {
    return fail('construction', 'invalid-spin-button-draft', 'Spin button draft must be text or null.');
  }
  return ok(Object.freeze({ value: range.valueAt(tick) as string, draft }));
}

export function applySpinButtonEvent(
  range: QuantizedRange,
  state: SpinButtonState,
  event: SpinButtonEvent,
  policies: SpinButtonPolicies = {},
): Result<SpinButtonUpdate> {
  const valid = tryCreateSpinButtonState(range, state.value, state.draft);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (typeof event === 'object' && event.type === 'input') {
    if (typeof event.text !== 'string') {
      return fail('transition-rejection', 'invalid-spin-button-input', 'Spin button input must be text.');
    }
    if (event.text === state.draft) return createMachineUpdate(state);
    return createMachineUpdate(
      Object.freeze({ value: state.value, draft: event.text }),
      [{ type: 'draft-changed', text: event.text }],
    );
  }
  if (event === 'cancel') {
    if (state.draft === null) return createMachineUpdate(state);
    return createMachineUpdate(
      Object.freeze({ value: state.value, draft: null }),
      [{ type: 'draft-changed', text: null }],
    );
  }
  if (event === 'commit') {
    if (state.draft === null) return createMachineUpdate(state);
    const parsed = (policies.parse ?? ((text: string): string => text))(state.draft);
    const tick = parsed === null ? null : range.tickOf(parsed);
    if (tick === null) {
      return fail('transition-rejection', 'spin-button-draft-invalid', 'Spin button draft must parse to a value on the range lattice.', { draft: state.draft });
    }
    const value = range.valueAt(tick) as string;
    return createMachineUpdate(
      Object.freeze({ value, draft: null }),
      [
        { type: 'draft-changed', text: null },
        ...(value === state.value ? [] : [{ type: 'announce-value' as const, value }]),
      ],
    );
  }
  const currentTick = range.tickOf(state.value) as number;
  const sliderState = tryCreateSliderState(range, currentTick);
  if (!sliderState.ok) return sliderState;
  const moved = applySliderEvent(range, sliderState.value, event, policies.page);
  if (!moved.ok) return moved;
  const value = range.valueAt(moved.value.state.tick) as string;
  return createMachineUpdate(
    Object.freeze({ value, draft: null }),
    [
      ...(state.draft === null ? [] : [{ type: 'draft-changed' as const, text: null }]),
      ...(value === state.value ? [] : [{ type: 'announce-value' as const, value }]),
    ],
  );
}
