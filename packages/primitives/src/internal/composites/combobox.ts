import type { BoundaryPolicy, Result, StableID } from '../../shared.js';
import type { Sequence } from '../../structures/sequence.js';
import {
  applyTextEvent,
  createTextEditingState,
  isWellFormedPlainText,
  normalizeTextEditingState,
  type TextEditingState,
  type TextEvent,
} from '../editing/text.js';
import { fail, ok } from '../kernel/foundation.js';
import { findEligibleFromEdge } from '../kernel/indexed-sequence.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import {
  createSelectionState,
  selectOne,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';

export type ComboboxEvent =
  | 'next'
  | 'previous'
  | 'close'
  | 'accept'
  | { readonly type: 'text'; readonly event: TextEvent };

export type ComboboxCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'accept'; readonly id: ID };

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

export interface ComboboxPolicies<ID extends StableID = StableID> {
  readonly matches?: (label: string, query: string, id: ID) => boolean;
  readonly boundary?: BoundaryPolicy;
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
  const normalizedText = normalizeTextEditingState(text);
  if (!normalizedText.ok) return normalizedText;
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
  return ok(comboboxState(
    normalizedText.value,
    popupOpen,
    createCursorState(current),
    selection.value,
  ));
}

export function applyComboboxEvent<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
  event: ComboboxEvent,
  policies: ComboboxPolicies<ID> = {},
): Result<ComboboxUpdate<ID>> {
  const policyValidation = validatePolicies(policies);
  if (!policyValidation.ok) return policyValidation;
  const current = state;

  if (isTextEvent(event)) {
    return editComboboxText(
      domain,
      labels,
      current,
      event.event,
      policies,
    );
  }
  if (!isComboboxEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-combobox-event',
      'Combobox event must be text, navigation, popup, or acceptance.',
      { event },
    );
  }

  switch (event) {
    case 'next':
      return moveCombobox(domain, labels, current, 1, policies);
    case 'previous':
      return moveCombobox(domain, labels, current, -1, policies);
    case 'close':
      return createMachineUpdate(comboboxState(
        current.text,
        false,
        current.cursor,
        current.selection,
      ));
    case 'accept':
      return acceptComboboxCandidate(domain, labels, current);
  }
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
  if (!isWellFormedPlainText(label)) {
    return fail(
      'transition-rejection',
      'invalid-candidate-label',
      'Combobox candidate label must be well-formed plain text.',
      { current },
    );
  }
  const text = createTextEditingState(label, {
    anchorCodeUnitOffset: label.length,
    focusCodeUnitOffset: label.length,
  });
  if (!text.ok) return text;
  const selection = selectOne(state.selection, current, domain);
  const next = comboboxState(text.value, false, state.cursor, selection);
  return createMachineUpdate(next, [{ type: 'accept', id: current }]);
}

function editComboboxText<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
  event: TextEvent,
  policies: ComboboxPolicies<ID>,
): Result<ComboboxUpdate<ID>> {
  const edited = applyTextEvent(state.text, event);
  if (!edited.ok) return edited;
  const previousQuery = committedQuery(state.text);
  const nextQuery = committedQuery(edited.value.state);
  const eligible = resolveEligible(domain, labels, nextQuery, policies.matches);
  if (!eligible.ok) return eligible;

  let current = state.cursor.current;
  if (previousQuery !== nextQuery || current === null || !eligible.value.has(current)) {
    const first = findEligibleFromEdge(domain, 1, {
      eligible: (id) => eligible.value.has(id),
    });
    if (!first.ok) return first;
    current = first.value;
  }
  const next = comboboxState(
    edited.value.state,
    true,
    createCursorState(current),
    state.selection,
  );
  return createMachineUpdate(
    next,
    current !== null && current !== state.cursor.current
      ? [{ type: 'focus', id: current }]
      : [],
  );
}

function moveCombobox<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  state: ComboboxState<ID>,
  direction: -1 | 1,
  policies: ComboboxPolicies<ID>,
): Result<ComboboxUpdate<ID>> {
  const eligible = resolveEligible(
    domain,
    labels,
    committedQuery(state.text),
    policies.matches,
  );
  if (!eligible.ok) return eligible;
  const options = {
    eligible: (id: ID) => eligible.value.has(id),
  };
  const currentEligible = state.cursor.current !== null
    && eligible.value.has(state.cursor.current);
  let target: ID | null;
  if (!currentEligible) {
    const first = findEligibleFromEdge(domain, direction, options);
    if (!first.ok) return first;
    target = first.value;
  } else {
    const movement = domain.move(
      state.cursor.current,
      direction,
      policies.boundary ?? 'stop',
      options,
    );
    if (movement.kind === 'resource-rejected') return { ok: false, error: movement.error };
    target = movement.kind === 'found' ? movement.id : state.cursor.current;
  }
  return updateCursor(state, target);
}

function updateCursor<ID extends StableID>(
  state: ComboboxState<ID>,
  current: ID | null,
): Result<ComboboxUpdate<ID>> {
  const next = comboboxState(
    state.text,
    true,
    current === state.cursor.current ? state.cursor : createCursorState(current),
    state.selection,
  );
  return createMachineUpdate(
    next,
    current !== null && current !== state.cursor.current
      ? [{ type: 'focus', id: current }]
      : [],
  );
}

function resolveEligible<ID extends StableID>(
  domain: Sequence<ID>,
  labels: ReadonlyMap<ID, string>,
  query: string,
  matches: ComboboxPolicies<ID>['matches'],
): Result<ReadonlySet<ID>> {
  if (matches === undefined) return ok(new Set(domain.ids));
  const eligible = new Set<ID>();
  for (const id of domain.ids) {
    const label = labels.get(id);
    if (label === undefined) {
      return fail(
        'transition-rejection',
        'missing-candidate-label',
        'Every filtered combobox candidate must have a label.',
        { id },
      );
    }
    if (!isWellFormedPlainText(label)) {
      return fail(
        'transition-rejection',
        'invalid-candidate-label',
        'Every filtered combobox candidate label must be well-formed plain text.',
        { id },
      );
    }
    if (matches(label, query, id)) eligible.add(id);
  }
  return ok(eligible);
}

function validatePolicies<ID extends StableID>(
  policies: ComboboxPolicies<ID>,
): Result<true> {
  if (!isObject(policies)) {
    return fail(
      'transition-rejection',
      'invalid-combobox-policies',
      'Combobox policies must be an object.',
    );
  }
  if (policies.matches !== undefined && typeof policies.matches !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-filter-policy',
      'Combobox matches policy must be a function.',
    );
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') {
    return fail(
      'transition-rejection',
      'invalid-combobox-boundary',
      'Combobox boundary must be stop or wrap.',
      { boundary },
    );
  }
  return ok(true);
}

function committedQuery(text: TextEditingState): string {
  return text.composition === null ? text.snapshot.text : text.composition.baseline.text;
}

function comboboxState<ID extends StableID>(
  text: TextEditingState,
  popupOpen: boolean,
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): ComboboxState<ID> {
  return Object.freeze({ text, popupOpen, cursor, selection });
}

function isTextEvent(event: ComboboxEvent): event is Extract<ComboboxEvent, object> {
  return isObject(event) && event.type === 'text';
}

function isComboboxEvent(event: ComboboxEvent): event is Exclude<ComboboxEvent, object> {
  return event === 'next'
    || event === 'previous'
    || event === 'close'
    || event === 'accept';
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}
