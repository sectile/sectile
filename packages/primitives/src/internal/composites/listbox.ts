import type { BoundaryPolicy, Result, SectileError, StableID } from '../../shared.js';
import type { Sequence } from '../../sequence.js';
import { createCursorState, type CursorState } from '../cursor.js';
import { fail, freezeArray, normalizeMaxScan, ok, resourceError } from '../foundation.js';
import {
  clearSelection,
  createSelectionState,
  selectOne,
  toggleMultipleSelection,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../selection.js';

export type ListboxEvent = 'next' | 'previous' | 'toggle' | 'activate' | 'clear';

export type ListboxCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'activate'; readonly id: ID };

export interface ListboxState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
  readonly selection: SelectionState<ID>;
}

export interface ListboxStateInput<ID extends StableID = StableID>
  extends SelectionSnapshotInput<ID> {
  readonly current?: ID | null;
}

export interface ListboxPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly selectionFollowsFocus?: boolean;
  readonly boundary?: BoundaryPolicy;
  readonly maxScan?: number;
}

export interface ListboxTransition<ID extends StableID = StableID> {
  readonly state: ListboxState<ID>;
  readonly commands: readonly ListboxCommand<ID>[];
}

export function createListboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ListboxStateInput<ID> = {},
): Result<ListboxState<ID>> {
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) {
    return fail(
      'construction',
      'listbox-cursor-outside-domain',
      'Listbox cursor must exist in the sequence domain.',
      { current },
    );
  }
  const selection = createSelectionState(domain, 'multiple', input);
  if (!selection.ok) return selection;
  return ok(listboxState(createCursorState(current), selection.value));
}

export function stepListbox<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
  event: ListboxEvent,
  policies: ListboxPolicies<ID> = {},
): Result<ListboxTransition<ID>> {
  const stateError = validateListboxState(domain, state);
  if (stateError !== null) return { ok: false, error: stateError };
  if (!isListboxEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-listbox-event',
      'Listbox event must be next, previous, toggle, activate, or clear.',
      { event },
    );
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') {
    return fail(
      'transition-rejection',
      'invalid-listbox-boundary',
      'Listbox boundary must be stop or wrap.',
      { boundary },
    );
  }
  const selectionFollowsFocus = policies.selectionFollowsFocus ?? false;
  if (typeof selectionFollowsFocus !== 'boolean') {
    return fail(
      'transition-rejection',
      'invalid-selection-follows-focus',
      'selectionFollowsFocus must be boolean.',
      { selectionFollowsFocus },
    );
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-eligibility-policy',
      'Listbox eligibility policy must be a function.',
    );
  }

  switch (event) {
    case 'next':
      return moveListbox(domain, state, 1, boundary, selectionFollowsFocus, policies);
    case 'previous':
      return moveListbox(domain, state, -1, boundary, selectionFollowsFocus, policies);
    case 'toggle': {
      const current = state.cursor.current;
      if (current === null) return noCursor();
      return accepted(
        listboxState(
          state.cursor,
          toggleMultipleSelection(state.selection, current, domain),
        ),
      );
    }
    case 'activate': {
      const current = state.cursor.current;
      if (current === null) return noCursor();
      return accepted(
        listboxState(state.cursor, selectOne(state.selection, current, domain)),
        [{ type: 'activate', id: current }],
      );
    }
    case 'clear': {
      const selection = clearSelection(state.selection);
      return accepted(selection === state.selection ? state : listboxState(state.cursor, selection));
    }
  }
}

function moveListbox<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
  direction: -1 | 1,
  boundary: BoundaryPolicy,
  selectionFollowsFocus: boolean,
  policies: ListboxPolicies<ID>,
): Result<ListboxTransition<ID>> {
  const eligible = policies.eligible ?? (() => true);
  const current = state.cursor.current;
  let target: ID | null;
  if (current === null) {
    const initial = initialEligible(domain, direction, eligible, policies.maxScan);
    if (!initial.ok) return initial;
    target = initial.value;
  } else {
    const movement = domain.move(current, direction, boundary, {
      eligible,
      ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
    });
    if (movement.kind === 'resource-rejected') return { ok: false, error: movement.error };
    target = movement.kind === 'found' ? movement.id : null;
  }
  if (target === null) return accepted(state);
  const cursor = createCursorState(target);
  const selection = selectionFollowsFocus
    ? selectOne(state.selection, target, domain)
    : state.selection;
  return accepted(listboxState(cursor, selection), [{ type: 'focus', id: target }]);
}

function initialEligible<ID extends StableID>(
  domain: Sequence<ID>,
  direction: -1 | 1,
  eligible: (id: ID) => boolean,
  requestedMaxScan: number | undefined,
): Result<ID | null> {
  const maxScan = normalizeMaxScan(requestedMaxScan);
  if (typeof maxScan !== 'number') return { ok: false, error: maxScan };
  let scanned = 0;
  let index = direction > 0 ? 0 : domain.size - 1;
  while (index >= 0 && index < domain.size) {
    if (scanned === maxScan) {
      return {
        ok: false,
        error: resourceError(
          'scan-ceiling-reached',
          'Listbox movement reached maxScan before its semantic result was determined.',
          { maxScan },
        ),
      };
    }
    const id = domain.at(index);
    scanned += 1;
    if (id !== null && eligible(id)) return ok(id);
    index += direction;
  }
  return ok(null);
}

function validateListboxState<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
): SectileError | null {
  if (state.cursor.current !== null && !domain.contains(state.cursor.current)) {
    return {
      class: 'transition-rejection',
      code: 'listbox-cursor-outside-domain',
      message: 'Listbox cursor must exist in the sequence domain.',
      details: { current: state.cursor.current },
    };
  }
  const unique = new Set(state.selection.selected);
  if (unique.size !== state.selection.selected.length || state.selection.size !== unique.size) {
    return {
      class: 'transition-rejection',
      code: 'invalid-listbox-selection',
      message: 'Listbox selection must contain unique identities with a matching size.',
    };
  }
  let previousIndex = -1;
  for (const id of unique) {
    const index = domain.indexOf(id);
    if (index === null) {
      return {
        class: 'transition-rejection',
        code: 'listbox-selection-outside-domain',
        message: 'Listbox selection identities must exist in the sequence domain.',
        details: { id },
      };
    }
    if (index <= previousIndex || !state.selection.has(id)) {
      return {
        class: 'transition-rejection',
        code: 'invalid-listbox-selection',
        message: 'Listbox selection observations must match canonical sequence order.',
      };
    }
    previousIndex = index;
  }
  for (const id of domain.ids) {
    if (state.selection.has(id) !== unique.has(id)) {
      return {
        class: 'transition-rejection',
        code: 'invalid-listbox-selection',
        message: 'Listbox selection membership observations must agree.',
      };
    }
  }
  if (state.selection.anchor !== null && !domain.contains(state.selection.anchor)) {
    return {
      class: 'transition-rejection',
      code: 'listbox-anchor-outside-domain',
      message: 'Listbox selection anchor must exist in the sequence domain.',
      details: { anchor: state.selection.anchor },
    };
  }
  return null;
}

function listboxState<ID extends StableID>(
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): ListboxState<ID> {
  return Object.freeze({ cursor, selection });
}

function accepted<ID extends StableID>(
  state: ListboxState<ID>,
  commands: readonly ListboxCommand<ID>[] = [],
): Result<ListboxTransition<ID>> {
  const frozenCommands = freezeArray(
    commands.map((command) => Object.freeze({ ...command })),
  );
  return ok(Object.freeze({ state, commands: frozenCommands }));
}

function noCursor<ID extends StableID>(): Result<ListboxTransition<ID>> {
  return fail(
    'transition-rejection',
    'no-cursor',
    'Listbox toggle and activate require a current cursor.',
  );
}

function isListboxEvent(value: string): value is ListboxEvent {
  return (
    value === 'next' ||
    value === 'previous' ||
    value === 'toggle' ||
    value === 'activate' ||
    value === 'clear'
  );
}
