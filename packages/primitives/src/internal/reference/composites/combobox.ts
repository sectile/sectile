import type { StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import type {
  ComboboxCommand,
  ComboboxEvent,
  ComboboxPolicies,
  ComboboxState,
  ComboboxStateInput,
  ComboboxUpdate,
} from '../../composites/combobox.js';
import type { TextEditingState, TextEvent } from '../../editing/text.js';
import {
  createReferenceTextEditingState,
  referenceCancelTextComposition,
  referenceCommitTextComposition,
  referenceIsWellFormedPlainText,
  referenceReplaceTextState,
  referenceStartTextComposition,
  referenceUpdateTextComposition,
} from '../editing/text.js';
import { ReferenceSelectionState, referenceSelectOne } from '../state/selection.js';

interface ReferenceComboboxRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection' | 'resource-rejection';
  readonly errorCode: string;
}

export type ReferenceComboboxResult<ID extends StableID> =
  | { readonly ok: true; readonly value: ComboboxUpdate<ID> }
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

export function referenceApplyComboboxEvent<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
  event: ComboboxEvent,
  policies: ComboboxPolicies<ID> = {},
): ReferenceComboboxResult<ID> {
  if (policies.matches !== undefined && typeof policies.matches !== 'function') {
    return rejected('invalid-filter-policy');
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') return rejected('invalid-combobox-boundary');
  if (typeof event === 'object' && event !== null && event.type === 'text') {
    const text = referenceApplyTextEvent(state.text, event.event);
    if (typeof text === 'string') return rejected(text);
    const previousQuery = referenceCommittedQuery(state.text);
    const nextQuery = referenceCommittedQuery(text);
    const eligible = referenceEligible(domain, labels, nextQuery, policies.matches);
    if (typeof eligible === 'string') return rejected(eligible);
    let current = state.cursor.current;
    if (previousQuery !== nextQuery || current === null || !eligible.has(current)) {
      const candidate = referenceFromEdge(domain, eligible, 1);
      current = candidate;
    }
    return accepted(
      referenceState(text, true, current, state.selection),
      current !== null && current !== state.cursor.current
        ? [{ type: 'focus', id: current }]
        : [],
    );
  }

  if (event === 'accept') return referenceAcceptCombobox(domain, labels, state);
  if (event === 'close') {
    return accepted(
      referenceState(state.text, false, state.cursor.current, state.selection),
      [],
    );
  }
  if (event !== 'next' && event !== 'previous') return rejected('invalid-combobox-event');

  const eligible = referenceEligible(
    domain,
    labels,
    referenceCommittedQuery(state.text),
    policies.matches,
  );
  if (typeof eligible === 'string') return rejected(eligible);
  const direction = event === 'next' ? 1 : -1;
  const target = referenceMove(
    domain,
    eligible,
    state.cursor.current,
    direction,
    boundary,
  );
  return accepted(
    referenceState(state.text, true, target, state.selection),
    target !== null && target !== state.cursor.current
      ? [{ type: 'focus', id: target }]
      : [],
  );
}

function referenceApplyTextEvent(
  state: TextEditingState,
  event: TextEvent,
): TextEditingState | string {
  try {
    switch (event.type) {
      case 'replace':
        return referenceReplaceTextState(
          state,
          event.startCodeUnitOffset,
          event.endCodeUnitOffset,
          event.text,
          event.selection,
        );
      case 'composition-start':
        return referenceStartTextComposition(
          state,
          event.startCodeUnitOffset,
          event.endCodeUnitOffset,
          event.text,
          event.selection,
        );
      case 'composition-update':
        return referenceUpdateTextComposition(state, event.text, event.selection);
      case 'composition-commit':
        return referenceCommitTextComposition(state);
      case 'composition-cancel':
        return referenceCancelTextComposition(state);
    }
  } catch {
    if (event.type === 'replace' || event.type === 'composition-start') {
      return state.composition === null ? 'invalid-text-event' : 'composition-active';
    }
    return 'composition-inactive';
  }
}

function referenceEligible<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  query: string,
  matches: ComboboxPolicies<ID>['matches'],
): ReadonlySet<ID> | string {
  if (matches === undefined) return new Set(domain.ids);
  const eligible = new Set<ID>();
  for (const id of domain.ids) {
    const label = labels.get(id);
    if (label === undefined) return 'missing-candidate-label';
    if (!referenceIsWellFormedPlainText(label)) return 'invalid-candidate-label';
    if (matches(label, query, id)) eligible.add(id);
  }
  return eligible;
}

function referenceMove<ID extends StableID>(
  domain: Sequence<ID>,
  eligible: ReadonlySet<ID>,
  current: ID | null,
  direction: -1 | 1,
  boundary: 'stop' | 'wrap',
): ID | null {
  if (current === null || !eligible.has(current)) {
    return referenceFromEdge(domain, eligible, direction);
  }
  const currentIndex = referenceIndexOf(domain, current);
  if (currentIndex === null) return current;
  const indexes: number[] = [];
  for (
    let index = currentIndex + direction;
    index >= 0 && index < domain.size;
    index += direction
  ) indexes.push(index);
  if (boundary === 'wrap') {
    for (
      let index = direction > 0 ? 0 : domain.size - 1;
      index !== currentIndex;
      index += direction
    ) indexes.push(index);
  }
  for (const index of indexes) {
    const id = domain.at(index);
    if (id !== null && eligible.has(id)) return id;
  }
  return current;
}

function referenceFromEdge<ID extends StableID>(
  domain: Sequence<ID>,
  eligible: ReadonlySet<ID>,
  direction: -1 | 1,
): ID | null {
  for (
    let index = direction > 0 ? 0 : domain.size - 1;
    index >= 0 && index < domain.size;
    index += direction
  ) {
    const id = domain.at(index);
    if (id !== null && eligible.has(id)) return id;
  }
  return null;
}

function referenceCommittedQuery(text: TextEditingState): string {
  return text.composition === null ? text.snapshot.text : text.composition.baseline.text;
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

function rejected(
  errorCode: string,
  errorClass: ReferenceComboboxRejection['errorClass'] = 'transition-rejection',
): ReferenceComboboxRejection {
  return { ok: false, errorClass, errorCode };
}
