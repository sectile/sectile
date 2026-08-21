import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import {
  acceptComboboxCandidate,
  createComboboxState as createInternalComboboxState,
  type ComboboxCommand,
  type ComboboxState,
  type ComboboxUpdate,
} from './internal/composites/combobox.js';
import { createTextEditingState } from './internal/editing/text.js';

export type ComboboxEvent = 'accept';

export interface ComboboxStateInput<ID extends StableID = StableID> {
  readonly inputValue?: string;
  readonly popupOpen?: boolean;
  readonly current?: ID | null;
  readonly selected?: readonly ID[];
  readonly anchor?: ID | null;
}

export function createComboboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ComboboxStateInput<ID> = {},
): Result<ComboboxState<ID>> {
  const inputValue = input.inputValue === undefined ? '' : input.inputValue;
  if (typeof inputValue !== 'string') {
    return {
      ok: false,
      error: {
        class: 'construction',
        code: 'invalid-combobox-input-value',
        message: 'Combobox inputValue must be a string.',
      },
    };
  }
  const text = createTextEditingState(inputValue, {
    anchorCodeUnitOffset: inputValue.length,
    focusCodeUnitOffset: inputValue.length,
  });
  if (!text.ok) return text;
  return createInternalComboboxState(domain, text.value, input);
}

export function applyComboboxEvent<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
  event: ComboboxEvent,
): Result<ComboboxUpdate<ID>> {
  if (event !== 'accept') {
    return {
      ok: false,
      error: {
        class: 'transition-rejection',
        code: 'invalid-combobox-event',
        message: 'Combobox event must be accept.',
        details: { event },
      },
    };
  }
  return acceptComboboxCandidate(domain, labels, state);
}

export type {
  ComboboxCommand,
  ComboboxState,
  ComboboxUpdate,
};
