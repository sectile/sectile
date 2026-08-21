import type { BoundaryPolicy, StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import type {
  LinearActionCommand,
  LinearActionEvent,
  LinearActionPolicies,
  LinearActionState,
  LinearActionStateInput,
  LinearActionUpdate,
} from '../../composites/linear-action.js';

interface ReferenceRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection' | 'resource-rejection';
  readonly errorCode: string;
}

export type ReferenceLinearActionResult<ID extends StableID> =
  | { readonly ok: true; readonly value: LinearActionUpdate<ID> }
  | ReferenceRejection;

export function createReferenceLinearActionState<ID extends StableID>(
  domain: Sequence<ID>,
  input: LinearActionStateInput<ID> = {},
): LinearActionState<ID> {
  const current = input.current ?? null;
  if (current !== null && !domain.ids.includes(current)) throw new TypeError('cursor outside domain');
  return state(current);
}

export function applyReferenceLinearActionEvent<ID extends StableID>(
  domain: Sequence<ID>,
  currentState: LinearActionState<ID>,
  event: LinearActionEvent<ID>,
  policies: LinearActionPolicies<ID> = {},
): ReferenceLinearActionResult<ID> {
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') return rejected('invalid-linear-action-boundary');
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return rejected('invalid-eligibility-policy');
  }
  const eligible = policies.eligible ?? (() => true);
  if (typeof event === 'object') {
    if (!domain.ids.includes(event.id) || !eligible(event.id)) {
      return rejected('linear-action-target-unavailable');
    }
    if (event.type === 'focus') return accepted(state(event.id), [{ type: 'focus', id: event.id }]);
    const commands: LinearActionCommand<ID>[] = [];
    if (currentState.cursor.current !== event.id) commands.push({ type: 'focus', id: event.id });
    commands.push({ type: 'invoke', id: event.id });
    return accepted(state(event.id), commands);
  }
  if (event === 'invoke') {
    const current = currentState.cursor.current;
    return current === null
      ? rejected('no-cursor')
      : accepted(state(current), [{ type: 'invoke', id: current }]);
  }
  const direction = event === 'next' || event === 'first' ? 1 : -1;
  const target = event === 'first' || event === 'last' || currentState.cursor.current === null
    ? edge(domain.ids, direction, eligible, policies.maxScan)
    : move(
        domain.ids,
        currentState.cursor.current,
        direction,
        boundary,
        eligible,
        policies.maxScan,
      );
  if (!target.ok) return target;
  return target.id === null
    ? accepted(currentState)
    : accepted(state(target.id), [{ type: 'focus', id: target.id }]);
}

function edge<ID extends StableID>(
  ids: readonly ID[],
  direction: -1 | 1,
  eligible: (id: ID) => boolean,
  maxScan: number | undefined,
): { readonly ok: true; readonly id: ID | null } | ReferenceRejection {
  const ceiling = validCeiling(maxScan);
  if (ceiling === null) return rejectedResource('invalid-scan-ceiling');
  for (let scanned = 0; scanned < ids.length; scanned += 1) {
    if (scanned >= ceiling) return rejectedResource('scan-ceiling-reached');
    const id = ids[direction > 0 ? scanned : ids.length - 1 - scanned];
    if (id !== undefined && eligible(id)) return { ok: true, id };
  }
  return { ok: true, id: null };
}

function move<ID extends StableID>(
  ids: readonly ID[],
  current: ID,
  direction: -1 | 1,
  boundary: BoundaryPolicy,
  eligible: (id: ID) => boolean,
  maxScan: number | undefined,
): { readonly ok: true; readonly id: ID | null } | ReferenceRejection {
  const ceiling = validCeiling(maxScan);
  if (ceiling === null) return rejectedResource('invalid-scan-ceiling');
  const start = ids.indexOf(current);
  if (start < 0) return rejected('linear-action-cursor-outside-domain');
  const limit = boundary === 'wrap' ? Math.max(0, ids.length - 1) : ids.length;
  let scanned = 0;
  for (let offset = 1; offset <= limit; offset += 1) {
    const raw = start + direction * offset;
    if (boundary === 'stop' && (raw < 0 || raw >= ids.length)) break;
    if (scanned >= ceiling) return rejectedResource('scan-ceiling-reached');
    const index = boundary === 'wrap' ? ((raw % ids.length) + ids.length) % ids.length : raw;
    const id = ids[index];
    if (id === undefined) continue;
    scanned += 1;
    if (eligible(id)) return { ok: true, id };
  }
  return { ok: true, id: null };
}

function validCeiling(value: number | undefined): number | null {
  return value === undefined
    ? Number.MAX_SAFE_INTEGER
    : Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function state<ID extends StableID>(current: ID | null): LinearActionState<ID> {
  return Object.freeze({ cursor: Object.freeze({ current }) });
}

function accepted<ID extends StableID>(
  next: LinearActionState<ID>,
  commands: readonly LinearActionCommand<ID>[] = [],
): ReferenceLinearActionResult<ID> {
  return { ok: true, value: Object.freeze({ state: next, commands: Object.freeze(commands) }) };
}

function rejected(errorCode: string): ReferenceRejection {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}

function rejectedResource(errorCode: string): ReferenceRejection {
  return { ok: false, errorClass: 'resource-rejection', errorCode };
}
