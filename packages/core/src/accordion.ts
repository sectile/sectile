import { unwrap } from './result.js';
import type { BoundaryPolicy, Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applyLinearActionEvent,
  createLinearActionState,
  type LinearActionPolicies,
} from './internal/composites/linear-action.js';
import { createCursorState, type CursorState } from './internal/state/cursor.js';

export type AccordionEvent<ID extends StableID = StableID> =
  | 'next' | 'previous' | 'first' | 'last' | 'toggle'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'toggle'; readonly id: ID }
  | { readonly type: 'set-open'; readonly id: ID; readonly open: boolean };
export type AccordionCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'open-changed'; readonly id: ID; readonly open: boolean };
export interface AccordionState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
  readonly openIDs: readonly ID[];
  has(id: ID): boolean;
}
export interface AccordionStateInput<ID extends StableID = StableID> {
  readonly current?: ID | null;
  readonly openIDs?: readonly ID[];
}
export interface AccordionPolicies<ID extends StableID = StableID>
  extends LinearActionPolicies<ID> {
  readonly expansion?: 'single' | 'multiple';
  readonly collapsible?: boolean;
}
export interface AccordionUpdate<ID extends StableID = StableID> {
  readonly state: AccordionState<ID>;
  readonly commands: readonly AccordionCommand<ID>[];
}

export function createAccordionState<ID extends StableID>(
  domain: Sequence<ID>,
  input: AccordionStateInput<ID> = {},
  policies: AccordionPolicies<ID> = {},
): AccordionState<ID> {
  return unwrap(tryCreateAccordionState(domain, input, policies));
}

export function tryCreateAccordionState<ID extends StableID>(
  domain: Sequence<ID>,
  input: AccordionStateInput<ID> = {},
  policies: AccordionPolicies<ID> = {},
): Result<AccordionState<ID>> {
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) {
    return fail('construction', 'accordion-cursor-outside-domain', 'Accordion cursor must exist in its domain.');
  }
  const expansion = policies.expansion ?? 'single';
  const collapsible = policies.collapsible ?? true;
  if (!validPolicies(expansion, collapsible)) {
    return fail('construction', 'invalid-accordion-policy', 'Accordion expansion and collapsible policies are invalid.');
  }
  const openIDs = input.openIDs ?? [];
  const unique = new Set(openIDs);
  if (unique.size !== openIDs.length || openIDs.some((id) => !domain.contains(id))) {
    return fail('construction', 'invalid-accordion-open-set', 'Accordion open identities must be unique domain members.');
  }
  if (expansion === 'single' && openIDs.length > 1) {
    return fail('construction', 'accordion-single-expansion', 'Single accordion state permits at most one open item.');
  }
  if (!collapsible && domain.size > 0 && openIDs.length === 0) {
    return fail('construction', 'accordion-open-item-required', 'A non-collapsible accordion requires an open item.');
  }
  return ok(accordionState(current, openIDs));
}

export function applyAccordionEvent<ID extends StableID>(
  domain: Sequence<ID>, state: AccordionState<ID>, event: AccordionEvent<ID>,
  policies: AccordionPolicies<ID> = {},
): Result<AccordionUpdate<ID>> {
  const normalized = tryCreateAccordionState(domain, {
    current: state.cursor.current, openIDs: state.openIDs,
  }, policies);
  if (!normalized.ok) return { ok: false, error: { ...normalized.error, class: 'transition-rejection' } };
  if (typeof event === 'string' && ['next', 'previous', 'first', 'last'].includes(event)) {
    const moved = applyLinearActionEvent(
      domain, { cursor: state.cursor }, event as 'next' | 'previous' | 'first' | 'last', policies,
    );
    if (!moved.ok) return moved;
    return createMachineUpdate(
      accordionState(moved.value.state.cursor.current, state.openIDs),
      moved.value.commands.map((command) => ({ type: 'focus' as const, id: command.id })),
    );
  }
  if (typeof event === 'object' && event.type === 'focus') {
    const moved = applyLinearActionEvent(domain, { cursor: state.cursor }, event, policies);
    if (!moved.ok) return moved;
    return createMachineUpdate(
      accordionState(event.id, state.openIDs), [{ type: 'focus', id: event.id }],
    );
  }
  const target = typeof event === 'object' ? event.id : state.cursor.current;
  if (target === null) return fail('transition-rejection', 'no-cursor', 'Accordion toggle requires a cursor.');
  if (!domain.contains(target) || policies.eligible?.(target) === false) {
    return fail('transition-rejection', 'accordion-target-unavailable', 'Accordion target must be eligible.');
  }
  const open = typeof event === 'object' && event.type === 'set-open'
    ? event.open
    : !state.has(target);
  if (typeof open !== 'boolean') {
    return fail('transition-rejection', 'invalid-accordion-event', 'Accordion event is not accepted.');
  }
  if (!open && policies.collapsible === false && state.openIDs.length === 1 && state.has(target)) {
    return fail('transition-rejection', 'accordion-collapse-forbidden', 'The last open item cannot collapse.');
  }
  const nextOpen = open
    ? policies.expansion === 'multiple'
      ? state.has(target) ? state.openIDs : [...state.openIDs, target]
      : [target]
    : state.openIDs.filter((id) => id !== target);
  const cursorChanged = state.cursor.current !== target;
  const openChanged = state.has(target) !== open;
  const commands: AccordionCommand<ID>[] = [];
  if (cursorChanged) commands.push({ type: 'focus', id: target });
  if (openChanged) commands.push({ type: 'open-changed', id: target, open });
  return createMachineUpdate(accordionState(target, nextOpen), commands);
}

function accordionState<ID extends StableID>(current: ID | null, openIDs: readonly ID[]): AccordionState<ID> {
  const ids = Object.freeze([...openIDs]);
  const membership = new Set(ids);
  return Object.freeze({ cursor: createCursorState(current), openIDs: ids, has: (id: ID) => membership.has(id) });
}

function validPolicies(expansion: unknown, collapsible: unknown): expansion is 'single' | 'multiple' {
  return (expansion === 'single' || expansion === 'multiple') && typeof collapsible === 'boolean';
}
