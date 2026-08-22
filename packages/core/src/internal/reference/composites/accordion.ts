import type { StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import type {
  AccordionCommand, AccordionEvent, AccordionPolicies, AccordionState, AccordionStateInput,
} from '../../../accordion.js';

export type ReferenceAccordionResult<ID extends StableID> =
  | { readonly ok: true; readonly value: { readonly state: AccordionState<ID>; readonly commands: readonly AccordionCommand<ID>[] } }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function createReferenceAccordionState<ID extends StableID>(
  domain: Sequence<ID>, input: AccordionStateInput<ID> = {}, policies: AccordionPolicies<ID> = {},
): ReferenceAccordionResult<ID> {
  const current = input.current ?? null;
  const openIDs = input.openIDs ?? [];
  if (current !== null && !domain.ids.includes(current)) return rejected('construction', 'accordion-cursor-outside-domain');
  if (new Set(openIDs).size !== openIDs.length || openIDs.some((id) => !domain.ids.includes(id))) {
    return rejected('construction', 'invalid-accordion-open-set');
  }
  if ((policies.expansion ?? 'single') === 'single' && openIDs.length > 1) {
    return rejected('construction', 'accordion-single-expansion');
  }
  if (policies.collapsible === false && domain.size > 0 && openIDs.length === 0) {
    return rejected('construction', 'accordion-open-item-required');
  }
  return { ok: true, value: { state: state(current, openIDs), commands: [] } };
}

export function applyReferenceAccordionEvent<ID extends StableID>(
  domain: Sequence<ID>, currentState: AccordionState<ID>, event: AccordionEvent<ID>,
  policies: AccordionPolicies<ID> = {},
): ReferenceAccordionResult<ID> {
  const valid = createReferenceAccordionState(domain, currentState, policies);
  if (!valid.ok) return rejected('transition-rejection', valid.errorCode);
  if (typeof event === 'string' && ['next', 'previous', 'first', 'last'].includes(event)) {
    const target = move(domain.ids, currentState.cursor.current, event, policies);
    return target === null
      ? accepted(currentState, [])
      : accepted(state(target, currentState.openIDs), [{ type: 'focus', id: target }]);
  }
  if (typeof event === 'object' && event.type === 'focus') {
    if (!available(domain.ids, event.id, policies)) return rejected('transition-rejection', 'linear-action-target-unavailable');
    return accepted(state(event.id, currentState.openIDs), [{ type: 'focus', id: event.id }]);
  }
  const target = typeof event === 'object' ? event.id : currentState.cursor.current;
  if (target === null) return rejected('transition-rejection', 'no-cursor');
  if (!available(domain.ids, target, policies)) return rejected('transition-rejection', 'accordion-target-unavailable');
  const open = typeof event === 'object' && event.type === 'set-open'
    ? event.open : !currentState.has(target);
  if (!open && policies.collapsible === false && currentState.openIDs.length === 1 && currentState.has(target)) {
    return rejected('transition-rejection', 'accordion-collapse-forbidden');
  }
  const openIDs = open
    ? policies.expansion === 'multiple'
      ? currentState.has(target) ? currentState.openIDs : [...currentState.openIDs, target]
      : [target]
    : currentState.openIDs.filter((id) => id !== target);
  const commands: AccordionCommand<ID>[] = [];
  if (currentState.cursor.current !== target) commands.push({ type: 'focus', id: target });
  if (currentState.has(target) !== open) commands.push({ type: 'open-changed', id: target, open });
  return accepted(state(target, openIDs), commands);
}

function move<ID extends StableID>(
  ids: readonly ID[], current: ID | null, event: string, policies: AccordionPolicies<ID>,
): ID | null {
  const eligible = ids.filter((id) => policies.eligible?.(id) !== false);
  if (eligible.length === 0) return null;
  if (event === 'first') return eligible[0] ?? null;
  if (event === 'last') return eligible.at(-1) ?? null;
  if (current === null) return event === 'next' ? eligible[0] ?? null : eligible.at(-1) ?? null;
  const index = ids.indexOf(current);
  const direction = event === 'next' ? 1 : -1;
  for (let offset = 1; offset <= ids.length; offset += 1) {
    let candidate = index + offset * direction;
    if (policies.boundary === 'wrap') candidate = (candidate + ids.length) % ids.length;
    else if (candidate < 0 || candidate >= ids.length) return null;
    if (candidate === index) return null;
    const id = ids[candidate];
    if (id !== undefined && policies.eligible?.(id) !== false) return id;
  }
  return null;
}

function state<ID extends StableID>(current: ID | null, openIDs: readonly ID[]): AccordionState<ID> {
  const ids = Object.freeze([...openIDs]);
  return Object.freeze({ cursor: Object.freeze({ current }), openIDs: ids, has: (id: ID) => ids.includes(id) });
}
function available<ID extends StableID>(ids: readonly ID[], id: ID, policies: AccordionPolicies<ID>): boolean {
  return ids.includes(id) && policies.eligible?.(id) !== false;
}
function accepted<ID extends StableID>(state: AccordionState<ID>, commands: readonly AccordionCommand<ID>[]): ReferenceAccordionResult<ID> {
  return { ok: true, value: { state, commands } };
}
function rejected<ID extends StableID>(errorClass: string, errorCode: string): ReferenceAccordionResult<ID> {
  return { ok: false, errorClass, errorCode };
}
