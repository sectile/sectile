import { unwrap } from '../../result.js';
import type { BoundaryPolicy, Result, SectileError, StableID } from '../../shared.js';
import type { Sequence } from '../../structures/sequence.js';
import { bindCanonicalState, fail, hasCanonicalState, ok } from '../kernel/foundation.js';
import { findEligibleFromEdge } from '../kernel/indexed-sequence.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';

export type LinearActionEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'invoke'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'invoke'; readonly id: ID };

export type LinearActionCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'invoke'; readonly id: ID };

export interface LinearActionState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
}

export interface LinearActionStateInput<ID extends StableID = StableID> {
  readonly current?: ID | null;
}

export interface LinearActionPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly boundary?: BoundaryPolicy;
  readonly maxScan?: number;
}

export interface LinearActionUpdate<ID extends StableID = StableID> {
  readonly state: LinearActionState<ID>;
  readonly commands: readonly LinearActionCommand<ID>[];
}

export function createLinearActionState<ID extends StableID>(
  domain: Sequence<ID>,
  input: LinearActionStateInput<ID> = {},
): LinearActionState<ID> {
  return unwrap(tryCreateLinearActionState(domain, input));
}

export function tryCreateLinearActionState<ID extends StableID>(
  domain: Sequence<ID>,
  input: LinearActionStateInput<ID> = {},
): Result<LinearActionState<ID>> {
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) {
    return fail(
      'construction',
      'linear-action-cursor-outside-domain',
      'Linear action cursor must exist in the sequence domain.',
      { current },
    );
  }
  return ok(linearActionState(domain, current));
}

export function applyLinearActionEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearActionState<ID>,
  event: LinearActionEvent<ID>,
  policies: LinearActionPolicies<ID> = {},
): Result<LinearActionUpdate<ID>> {
  const stateError = hasCanonicalState(domain, state)
    ? null
    : validateState(domain, state);
  if (stateError !== null) return { ok: false, error: stateError };
  if (!isLinearActionEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-linear-action-event',
      'Linear action event is not part of the accepted vocabulary.',
      { event },
    );
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') {
    return fail(
      'transition-rejection',
      'invalid-linear-action-boundary',
      'Linear action boundary must be stop or wrap.',
      { boundary },
    );
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-eligibility-policy',
      'Linear action eligibility policy must be a function.',
    );
  }
  if (typeof event === 'object') {
    if (!domain.contains(event.id) || policies.eligible?.(event.id) === false) {
      return fail(
        'transition-rejection',
        'linear-action-target-unavailable',
        'Direct linear action events require an eligible identity in the domain.',
        { id: event.id },
      );
    }
    return event.type === 'focus'
      ? focus(domain, event.id)
      : invoke(domain, state, event.id, true);
  }
  if (event === 'invoke') {
    return state.cursor.current === null
      ? fail('transition-rejection', 'no-cursor', 'Linear action invocation requires a cursor.')
      : invoke(domain, state, state.cursor.current, false);
  }
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
  return target === null ? createMachineUpdate(state) : focus(domain, target);
}

function focus<ID extends StableID>(domain: Sequence<ID>, id: ID): Result<LinearActionUpdate<ID>> {
  return createMachineUpdate(linearActionState(domain, id), [{ type: 'focus', id }]);
}

function invoke<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearActionState<ID>,
  id: ID,
  direct: boolean,
): Result<LinearActionUpdate<ID>> {
  const commands: LinearActionCommand<ID>[] = [];
  if (direct && state.cursor.current !== id) commands.push({ type: 'focus', id });
  commands.push({ type: 'invoke', id });
  return createMachineUpdate(linearActionState(domain, id), commands);
}

function linearActionState<ID extends StableID>(domain: Sequence<ID>, current: ID | null): LinearActionState<ID> {
  return bindCanonicalState(domain, Object.freeze({ cursor: createCursorState(current) }));
}

function validateState<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearActionState<ID>,
): SectileError | null {
  return state.cursor.current === null || domain.contains(state.cursor.current)
    ? null
    : {
        class: 'transition-rejection',
        code: 'linear-action-cursor-outside-domain',
        message: 'Linear action cursor must exist in the sequence domain.',
      };
}

function isLinearActionEvent(value: unknown): value is LinearActionEvent {
  if (typeof value === 'string') {
    return ['next', 'previous', 'first', 'last', 'invoke'].includes(value);
  }
  return typeof value === 'object' && value !== null
    && 'type' in value && 'id' in value && typeof value.id === 'string'
    && (value.type === 'focus' || value.type === 'invoke');
}
