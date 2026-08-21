import type { Result, StableID } from '../../shared.js';
import type { Sequence } from '../../structures/sequence.js';
import { fail, ok } from '../kernel/foundation.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import {
  createSelectionState,
  selectOne,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';
import {
  createTextEditingState,
  type TextEditingState,
} from '../editing/text.js';

export interface ComboboxCommand<ID extends StableID = StableID> {
  readonly type: 'accept';
  readonly id: ID;
}

export interface ComboboxState<ID extends StableID = StableID> {
  readonly text: TextEditingState;
  readonly popupOpen: boolean;
  readonly cursor: CursorState<ID>;
  readonly selection: SelectionState<ID>;
}

export interface ComboboxStateInput<ID extends StableID = StableID>
  extends SelectionSnapshotInput<ID> {
  readonly popupOpen?: boolean;
  readonly current?: ID | null;
}

export interface ComboboxUpdate<ID extends StableID = StableID> {
  readonly state: ComboboxState<ID>;
  readonly commands: readonly ComboboxCommand<ID>[];
}

export function createComboboxState<ID extends StableID>(
  domain: Sequence<ID>,
  text: TextEditingState,
  input: ComboboxStateInput<ID> = {},
): Result<ComboboxState<ID>> {
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) {
    return fail(
      'construction',
      'combobox-cursor-outside-domain',
      'Combobox cursor must exist in the candidate domain.',
      { current },
    );
  }
  const popupOpen = input.popupOpen ?? false;
  if (typeof popupOpen !== 'boolean') {
    return fail('construction', 'invalid-popup-state', 'Combobox popupOpen must be boolean.');
  }
  const selection = createSelectionState(domain, 'single', input);
  if (!selection.ok) return selection;
  return ok(comboboxState(text, popupOpen, createCursorState(current), selection.value));
}

export function acceptComboboxCandidate<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
): Result<ComboboxUpdate<ID>> {
  const current = state.cursor.current;
  if (current === null || !domain.contains(current)) {
    return fail(
      'transition-rejection',
      'no-candidate',
      'Combobox acceptance requires a current candidate.',
    );
  }
  if (state.text.composition !== null) {
    return fail(
      'transition-rejection',
      'composition-active',
      'Combobox acceptance requires composition to be committed or cancelled first.',
    );
  }
  const label = labels.get(current);
  if (label === undefined) {
    return fail(
      'transition-rejection',
      'missing-candidate-label',
      'Combobox candidate must have a label.',
      { current },
    );
  }
  const text = createTextEditingState(label, {
    anchorCodeUnitOffset: label.length,
    focusCodeUnitOffset: label.length,
  });
  if (!text.ok) {
    return fail(
      'transition-rejection',
      'invalid-candidate-label',
      'Combobox candidate label must be well-formed plain text.',
      { current },
    );
  }
  const selection = selectOne(state.selection, current, domain);
  const next = comboboxState(text.value, false, state.cursor, selection);
  return createMachineUpdate(next, [{ type: 'accept', id: current }]);
}

function comboboxState<ID extends StableID>(
  text: TextEditingState,
  popupOpen: boolean,
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): ComboboxState<ID> {
  return Object.freeze({ text, popupOpen, cursor, selection });
}
