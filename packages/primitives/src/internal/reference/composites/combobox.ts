import type { StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import type {
  ComboboxCommand,
  ComboboxState,
  ComboboxStateInput,
  ComboboxTransition,
} from '../../composites/combobox.js';
import type { TextEditingState } from '../../editing/text.js';
import { createReferenceTextEditingState } from '../editing/text.js';
import { ReferenceSelectionState, referenceSelectOne } from '../state/selection.js';

interface ReferenceComboboxRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection';
  readonly errorCode: string;
}

export type ReferenceComboboxResult<ID extends StableID> =
  | { readonly ok: true; readonly value: ComboboxTransition<ID> }
  | ReferenceComboboxRejection;

export function createReferenceComboboxState<ID extends StableID>(
  domain: Sequence<ID>,
  text: TextEditingState,
  input: ComboboxStateInput<ID> = {},
): ComboboxState<ID> {
  const current = input.current ?? null;
  if (current !== null && referenceIndexOf(domain, current) === null) {
    throw new TypeError('reference combobox cursor outside domain');
  }
  const selected = [...new Set(input.selected ?? [])];
  if (selected.length > 1 || selected.some((id) => referenceIndexOf(domain, id) === null)) {
    throw new TypeError('reference combobox selection outside domain');
  }
  const anchor = input.anchor ?? null;
  if (anchor !== null && referenceIndexOf(domain, anchor) === null) {
    throw new TypeError('reference combobox anchor outside domain');
  }
  return referenceState(
    text,
    input.popupOpen ?? false,
    current,
    new ReferenceSelectionState(selected, anchor),
  );
}

export function referenceAcceptCombobox<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
): ReferenceComboboxResult<ID> {
  const current = state.cursor.current;
  if (current === null || referenceIndexOf(domain, current) === null) {
    return rejected('no-candidate');
  }
  if (state.text.composition !== null) return rejected('composition-active');
  const label = labels.get(current);
  if (label === undefined) return rejected('missing-candidate-label');
  let text: TextEditingState;
  try {
    text = createReferenceTextEditingState(label, {
      anchorCodeUnitOffset: label.length,
      focusCodeUnitOffset: label.length,
    });
  } catch {
    return rejected('invalid-candidate-label');
  }
  const selection = referenceSelectOne(state.selection, current, domain);
  return accepted(referenceState(text, false, current, selection), [{ type: 'accept', id: current }]);
}

function referenceIndexOf<ID extends StableID>(domain: Sequence<ID>, id: ID): number | null {
  for (let index = 0; index < domain.size; index += 1) {
    if (domain.at(index) === id) return index;
  }
  return null;
}

function referenceState<ID extends StableID>(
  text: TextEditingState,
  popupOpen: boolean,
  current: ID | null,
  selection: ComboboxState<ID>['selection'],
): ComboboxState<ID> {
  return Object.freeze({ text, popupOpen, cursor: Object.freeze({ current }), selection });
}

function accepted<ID extends StableID>(
  state: ComboboxState<ID>,
  commands: readonly ComboboxCommand<ID>[],
): ReferenceComboboxResult<ID> {
  return { ok: true, value: Object.freeze({ state, commands: Object.freeze(commands.map((command) => Object.freeze({ ...command }))) }) };
}

function rejected(errorCode: string): ReferenceComboboxRejection {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}
