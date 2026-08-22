import type { BoundaryPolicy, Result, SectileError, StableID } from '../../shared.js';
import type { Sequence } from '../../structures/sequence.js';
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

export type LinearChoiceEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'select'
  | 'activate'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select'; readonly id: ID }
  | { readonly type: 'activate'; readonly id: ID };

export type LinearChoiceCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'activate'; readonly id: ID };

export interface LinearChoiceState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
  readonly selection: SelectionState<ID>;
}

export interface LinearChoiceStateInput<ID extends StableID = StableID>
  extends SelectionSnapshotInput<ID> {
  readonly current?: ID | null;
}

export interface LinearChoicePolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly selectionFollowsFocus?: boolean;
  readonly boundary?: BoundaryPolicy;
  readonly maxScan?: number;
}

export interface LinearChoiceUpdate<ID extends StableID = StableID> {
  readonly state: LinearChoiceState<ID>;
  readonly commands: readonly LinearChoiceCommand<ID>[];
}

export function createLinearChoiceState<ID extends StableID>(
  domain: Sequence<ID>,
  input: LinearChoiceStateInput<ID> = {},
): Result<LinearChoiceState<ID>> {
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) {
    return fail(
      'construction',
      'linear-choice-cursor-outside-domain',
      'Linear choice cursor must exist in the sequence domain.',
      { current },
    );
  }
  const selection = createSelectionState(domain, 'single', input);
  if (!selection.ok) return selection;
  return ok(linearChoiceState(createCursorState(current), selection.value));
}

export function applyLinearChoiceEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
  event: LinearChoiceEvent<ID>,
  policies: LinearChoicePolicies<ID> = {},
): Result<LinearChoiceUpdate<ID>> {
  const stateError = validateLinearChoiceState(domain, state);
  if (stateError !== null) return { ok: false, error: stateError };
  if (!isLinearChoiceEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-linear-choice-event',
      'Linear choice event is not part of the accepted vocabulary.',
      { event },
    );
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') {
    return fail(
      'transition-rejection',
      'invalid-linear-choice-boundary',
      'Linear choice boundary must be stop or wrap.',
      { boundary },
    );
  }
  const follows = policies.selectionFollowsFocus ?? false;
  if (typeof follows !== 'boolean') {
    return fail(
      'transition-rejection',
      'invalid-selection-follows-focus',
      'selectionFollowsFocus must be boolean.',
    );
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-eligibility-policy',
      'Linear choice eligibility policy must be a function.',
    );
  }

  if (typeof event === 'object') {
    if (!isAvailable(domain, event.id, policies)) return unavailable(event.id);
    if (event.type === 'focus') {
      return focusTarget(domain, state, event.id, follows);
    }
    return chooseTarget(domain, state, event.id, event.type === 'activate');
  }

  if (event === 'next' || event === 'previous' || event === 'first' || event === 'last') {
    return moveLinearChoice(domain, state, event, boundary, follows, policies);
  }
  const current = state.cursor.current;
  if (current === null) {
    return fail(
      'transition-rejection',
      'no-cursor',
      'Linear choice selection requires a cursor.',
    );
  }
  return chooseTarget(domain, state, current, event === 'activate', false);
}

function moveLinearChoice<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
  event: 'next' | 'previous' | 'first' | 'last',
  boundary: BoundaryPolicy,
  follows: boolean,
  policies: LinearChoicePolicies<ID>,
): Result<LinearChoiceUpdate<ID>> {
  const direction = event === 'next' || event === 'first' ? 1 : -1;
  const eligible = policies.eligible ?? (() => true);
  let target: ID | null;
  if (event === 'first' || event === 'last' || state.cursor.current === null) {
    const edge = findEligibleFromEdge(domain, direction, {
      eligible,
      ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
    });
    if (!edge.ok) return edge;
    target = edge.value;
  } else {
    const movement = domain.move(state.cursor.current, direction, boundary, {
      eligible,
      ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
    });
    if (movement.kind === 'resource-rejected') return { ok: false, error: movement.error };
    target = movement.kind === 'found' ? movement.id : null;
  }
  return target === null
    ? createMachineUpdate(state)
    : focusTarget(domain, state, target, follows);
}

function focusTarget<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
  id: ID,
  follows: boolean,
): Result<LinearChoiceUpdate<ID>> {
  const selection = follows ? selectOne(state.selection, id, domain) : state.selection;
  return createMachineUpdate(
    linearChoiceState(createCursorState(id), selection),
    [{ type: 'focus', id }],
  );
}

function chooseTarget<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
  id: ID,
  activate: boolean,
  focus = true,
): Result<LinearChoiceUpdate<ID>> {
  const commands: LinearChoiceCommand<ID>[] = [];
  if (focus && state.cursor.current !== id) commands.push({ type: 'focus', id });
  if (activate) commands.push({ type: 'activate', id });
  return createMachineUpdate(
    linearChoiceState(createCursorState(id), selectOne(state.selection, id, domain)),
    commands,
  );
}

function validateLinearChoiceState<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
): SectileError | null {
  if (state.cursor.current !== null && !domain.contains(state.cursor.current)) {
    return {
      class: 'transition-rejection',
      code: 'linear-choice-cursor-outside-domain',
      message: 'Linear choice cursor must exist in the sequence domain.',
    };
  }
  if (state.selection.size > 1 || state.selection.selected.length !== state.selection.size) {
    return {
      class: 'transition-rejection',
      code: 'invalid-linear-choice-selection',
      message: 'Linear choice selection must contain at most one identity.',
    };
  }
  for (const id of state.selection.selected) {
    if (!domain.contains(id) || !state.selection.has(id)) {
      return {
        class: 'transition-rejection',
        code: 'linear-choice-selection-outside-domain',
        message: 'Linear choice selection must agree with the sequence domain.',
      };
    }
  }
  if (state.selection.anchor !== null && !domain.contains(state.selection.anchor)) {
    return {
      class: 'transition-rejection',
      code: 'linear-choice-anchor-outside-domain',
      message: 'Linear choice anchor must exist in the sequence domain.',
    };
  }
  return null;
}

function linearChoiceState<ID extends StableID>(
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): LinearChoiceState<ID> {
  return Object.freeze({ cursor, selection });
}

function isAvailable<ID extends StableID>(
  domain: Sequence<ID>,
  id: ID,
  policies: LinearChoicePolicies<ID>,
): boolean {
  return domain.contains(id) && policies.eligible?.(id) !== false;
}

function unavailable<ID extends StableID>(id: ID): Result<never> {
  return fail(
    'transition-rejection',
    'linear-choice-target-unavailable',
    'Direct linear choice events require an eligible identity in the domain.',
    { id },
  );
}

function isLinearChoiceEvent(value: unknown): value is LinearChoiceEvent {
  if (typeof value === 'string') {
    return ['next', 'previous', 'first', 'last', 'select', 'activate'].includes(value);
  }
  return typeof value === 'object' && value !== null
    && 'type' in value && 'id' in value && typeof value.id === 'string'
    && (value.type === 'focus' || value.type === 'select' || value.type === 'activate');
}
