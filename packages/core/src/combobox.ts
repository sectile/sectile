import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import {
  applyComboboxEvent as applyInternalComboboxEvent,
  tryCreateComboboxState as tryCreateInternalComboboxState,
  type ComboboxCommand,
  type ComboboxEvent,
  type ComboboxPolicies,
  type ComboboxState,
  type ComboboxUpdate,
} from './internal/composites/combobox.js';
import {
  createTextEditingState,
  normalizeTextEditingState,
  type TextEditingState,
  tryCreateTextEditingState,
} from './internal/editing/text.js';

export interface ComboboxStateInput<ID extends StableID = StableID> {
  readonly inputValue?: string;
  readonly text?: TextEditingState;
  readonly popupOpen?: boolean;
  readonly current?: ID | null;
  readonly selected?: readonly ID[];
  readonly anchor?: ID | null;
}

export function createComboboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ComboboxStateInput<ID> = {},
): ComboboxState<ID> {
  return unwrap(tryCreateComboboxState(domain, input));
}

export function tryCreateComboboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ComboboxStateInput<ID> = {},
): Result<ComboboxState<ID>> {
  if (input.text !== undefined && input.inputValue !== undefined) {
    return {
      ok: false,
      error: {
        class: 'construction',
        code: 'ambiguous-combobox-text',
        message: 'Combobox state accepts either text or inputValue, not both.',
      },
    };
  }
  let text: Result<TextEditingState>;
  if (input.text !== undefined) {
    text = normalizeTextEditingState(input.text);
  } else {
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
    text = tryCreateTextEditingState(inputValue, {
      anchorCodeUnitOffset: inputValue.length,
      focusCodeUnitOffset: inputValue.length,
    });
  }
  if (!text.ok) return text;
  return tryCreateInternalComboboxState(domain, text.value, input);
}

export function applyComboboxEvent<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
  event: ComboboxEvent<ID>,
  policies: ComboboxPolicies<ID> = {},
): Result<ComboboxUpdate<ID>> {
  return applyInternalComboboxEvent(domain, labels, state, event, policies);
}

export type {
  ComboboxCommand,
  ComboboxEvent,
  ComboboxPolicies,
  ComboboxState,
  ComboboxUpdate,
};
