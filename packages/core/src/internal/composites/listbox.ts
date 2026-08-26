import { unwrap } from '../../result.js';
import type { BoundaryPolicy, Result, SectileError, StableID } from '../../shared.js';
import type { Sequence } from '../../structures/sequence.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import { fail, ok } from '../kernel/foundation.js';
import { findEligibleFromEdge } from '../kernel/indexed-sequence.js';
import { createMachineUpdate } from '../kernel/machine.js';
import {
  clearSelection,
  createSelectionState,
  selectOne,
  toggleMultipleSelection,
  type SelectionMode,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';

export type ListboxSelectionMode = SelectionMode;

export const DEFAULT_LISTBOX_SELECTION_MODE = 'single' as const;

export type ListboxEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'toggle'
  | 'activate'
  | 'clear'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'toggle'; readonly id: ID }
  | { readonly type: 'activate'; readonly id: ID };

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
  readonly selectionMode?: SelectionMode;
  readonly deselectable?: boolean;
  readonly eligible?: (id: ID) => boolean;
  readonly selectionFollowsFocus?: boolean;
  readonly boundary?: BoundaryPolicy;
  readonly maxScan?: number;
}

export interface ListboxUpdate<ID extends StableID = StableID> {
  readonly state: ListboxState<ID>;
  readonly commands: readonly ListboxCommand<ID>[];
}

export function createListboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ListboxStateInput<ID> = {},
  selectionMode: SelectionMode = DEFAULT_LISTBOX_SELECTION_MODE,
): ListboxState<ID> {
  return unwrap(tryCreateListboxState(domain, input, selectionMode));
}

export function tryCreateListboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ListboxStateInput<ID> = {},
  selectionMode: SelectionMode = DEFAULT_LISTBOX_SELECTION_MODE,
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
  const selection = createSelectionState(domain, selectionMode, input);
  if (!selection.ok) return selection;
  return ok(listboxState(createCursorState(current), selection.value));
}

export function applyListboxEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
  event: ListboxEvent<ID>,
  policies: ListboxPolicies<ID> = {},
): Result<ListboxUpdate<ID>> {
  const stateError = validateListboxState(domain, state);
  if (stateError !== null) return { ok: false, error: stateError };
  if (!isListboxEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-listbox-event',
      'Listbox event must be next, previous, first, last, toggle, activate, or clear.',
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
  const deselectable = policies.deselectable ?? false;
  if (typeof deselectable !== 'boolean') {
    return fail(
      'transition-rejection',
      'invalid-deselectable-policy',
      'deselectable must be boolean.',
      { deselectable },
    );
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-eligibility-policy',
      'Listbox eligibility policy must be a function.',
    );
  }
  const selectionMode = policies.selectionMode ?? DEFAULT_LISTBOX_SELECTION_MODE;
  if (selectionMode !== 'single' && selectionMode !== 'multiple') {
    return fail(
      'transition-rejection',
      'invalid-selection-mode',
      'Listbox selection mode must be single or multiple.',
      { selectionMode },
    );
  }
  if (selectionMode === 'single' && state.selection.size > 1) {
    return fail(
      'transition-rejection',
      'invalid-selection-cardinality',
      'Single-selection listbox state permits at most one selected identity.',
      { selectedCount: state.selection.size },
    );
  }

  if (typeof event === 'object') {
    if (!domain.contains(event.id) || policies.eligible?.(event.id) === false) {
      return fail(
        'transition-rejection',
        'listbox-target-unavailable',
        'Direct listbox events require an eligible identity in the domain.',
        { id: event.id },
      );
    }
    if (event.type === 'focus') {
      const selection = selectionFollowsFocus
        ? selectOne(state.selection, event.id, domain)
        : state.selection;
      return createMachineUpdate(
        listboxState(createCursorState(event.id), selection),
        [{ type: 'focus', id: event.id }],
      );
    }
    if (event.type === 'toggle') {
      return createMachineUpdate(listboxState(
        createCursorState(event.id),
        selectForMode(state.selection, event.id, domain, selectionMode, deselectable),
      ), [{ type: 'focus', id: event.id }]);
    }
    return createMachineUpdate(
      listboxState(createCursorState(event.id), selectOne(state.selection, event.id, domain)),
      [{ type: 'focus', id: event.id }, { type: 'activate', id: event.id }],
    );
  }

  switch (event) {
    case 'next':
      return moveListbox(domain, state, 1, boundary, selectionFollowsFocus, policies);
    case 'previous':
      return moveListbox(domain, state, -1, boundary, selectionFollowsFocus, policies);
    case 'first':
      return moveListboxToEdge(domain, state, 1, selectionFollowsFocus, policies);
    case 'last':
      return moveListboxToEdge(domain, state, -1, selectionFollowsFocus, policies);
    case 'toggle': {
      const current = state.cursor.current;
      if (current === null) return noCursor();
      return createMachineUpdate(
        listboxState(
          state.cursor,
          selectForMode(state.selection, current, domain, selectionMode, deselectable),
        ),
      );
    }
    case 'activate': {
      const current = state.cursor.current;
      if (current === null) return noCursor();
      return createMachineUpdate(
        listboxState(state.cursor, selectOne(state.selection, current, domain)),
        [{ type: 'activate', id: current }],
      );
    }
    case 'clear': {
      const selection = clearSelection(state.selection);
      return createMachineUpdate(
        selection === state.selection ? state : listboxState(state.cursor, selection),
      );
    }
  }
}

export interface ListboxTypeaheadOptions<ID extends StableID = StableID> {
  readonly textValue: (id: ID) => string;
  readonly eligible?: (id: ID) => boolean;
  readonly normalize?: (text: string) => string;
  readonly maxScan?: number;
}

export function findListboxTypeaheadMatch<ID extends StableID>(
  domain: Sequence<ID>,
  current: ID | null,
  query: string,
  options: ListboxTypeaheadOptions<ID>,
): Result<ID | null> {
  if (typeof query !== 'string' || query.length === 0) return ok(null);
  if (typeof options.textValue !== 'function') {
    return fail('transition-rejection', 'invalid-typeahead-text-value',
      'Listbox typeahead requires a textValue function.');
  }
  if (options.eligible !== undefined && typeof options.eligible !== 'function') {
    return fail('transition-rejection', 'invalid-eligibility-policy',
      'Listbox typeahead eligibility must be a function.');
  }
  if (options.normalize !== undefined && typeof options.normalize !== 'function') {
    return fail('transition-rejection', 'invalid-typeahead-normalizer',
      'Listbox typeahead normalize must be a function.');
  }
  if (options.maxScan !== undefined
    && (!Number.isSafeInteger(options.maxScan) || options.maxScan < 0)) {
    return fail('resource-rejection', 'invalid-scan-ceiling',
      'Listbox typeahead maxScan must be a non-negative safe integer.');
  }
  if (current !== null && !domain.contains(current)) {
    return fail('transition-rejection', 'listbox-cursor-outside-domain',
      'Listbox typeahead cursor must exist in the sequence domain.', { current });
  }
  const normalize = options.normalize ?? ((text: string) => text.toLowerCase());
  const needle = normalize(query);
  if (needle.length === 0 || domain.size === 0) return ok(null);
  const eligible = options.eligible ?? (() => true);
  const maxScan = options.maxScan ?? Number.MAX_SAFE_INTEGER;
  const start = current === null ? 0 : ((domain.indexOf(current) as number) + 1) % domain.size;
  let scanned = 0;
  for (let offset = 0; offset < domain.size; offset += 1) {
    if (scanned === maxScan) {
      return fail('resource-rejection', 'scan-ceiling-reached',
        'Listbox typeahead reached maxScan before its result was determined.', { maxScan });
    }
    const id = domain.at((start + offset) % domain.size);
    scanned += 1;
    if (id !== null && eligible(id) && normalize(options.textValue(id)).startsWith(needle)) {
      return ok(id);
    }
  }
  return ok(null);
}

function moveListbox<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
  direction: -1 | 1,
  boundary: BoundaryPolicy,
  selectionFollowsFocus: boolean,
  policies: ListboxPolicies<ID>,
): Result<ListboxUpdate<ID>> {
  const eligible = policies.eligible ?? (() => true);
  const current = state.cursor.current;
  let target: ID | null;
  if (current === null) {
    const initial = findEligibleFromEdge(domain, direction, {
      eligible,
      ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
    });
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
  if (target === null) return createMachineUpdate(state);
  const cursor = createCursorState(target);
  const selection = selectionFollowsFocus
    ? selectOne(state.selection, target, domain)
    : state.selection;
  return createMachineUpdate(listboxState(cursor, selection), [{ type: 'focus', id: target }]);
}

function moveListboxToEdge<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
  direction: -1 | 1,
  selectionFollowsFocus: boolean,
  policies: ListboxPolicies<ID>,
): Result<ListboxUpdate<ID>> {
  const target = findEligibleFromEdge(domain, direction, {
    eligible: policies.eligible ?? (() => true),
    ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
  });
  if (!target.ok) return target;
  if (target.value === null || target.value === state.cursor.current) {
    return createMachineUpdate(state);
  }
  return createMachineUpdate(
    listboxState(
      createCursorState(target.value),
      selectionFollowsFocus ? selectOne(state.selection, target.value, domain) : state.selection,
    ),
    [{ type: 'focus', id: target.value }],
  );
}

function selectForMode<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: Sequence<ID>,
  selectionMode: SelectionMode,
  deselectable: boolean,
): SelectionState<ID> {
  return selectionMode === 'single'
    ? deselectable && state.has(id) ? clearSelection(state) : selectOne(state, id, domain)
    : toggleMultipleSelection(state, id, domain);
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

function noCursor<ID extends StableID>(): Result<ListboxUpdate<ID>> {
  return fail(
    'transition-rejection',
    'no-cursor',
    'Listbox toggle and activate require a current cursor.',
  );
}

function isListboxEvent<ID extends StableID>(value: unknown): value is ListboxEvent<ID> {
  return typeof value === 'string' ? (
    value === 'next' ||
    value === 'previous' ||
    value === 'first' ||
    value === 'last' ||
    value === 'toggle' ||
    value === 'activate' ||
    value === 'clear'
  ) : typeof value === 'object' && value !== null
    && 'type' in value && 'id' in value
    && (value.type === 'focus' || value.type === 'toggle' || value.type === 'activate')
    && typeof value.id === 'string';
}
