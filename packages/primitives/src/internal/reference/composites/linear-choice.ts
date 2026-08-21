import type { BoundaryPolicy, StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import type {
  LinearChoiceCommand,
  LinearChoiceEvent,
  LinearChoicePolicies,
  LinearChoiceState,
  LinearChoiceStateInput,
  LinearChoiceUpdate,
} from '../../composites/linear-choice.js';
import { ReferenceSelectionState, referenceSelectOne } from '../state/selection.js';

interface ReferenceRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection' | 'resource-rejection';
  readonly errorCode: string;
}

export type ReferenceLinearChoiceResult<ID extends StableID> =
  | { readonly ok: true; readonly value: LinearChoiceUpdate<ID> }
  | ReferenceRejection;

export function createReferenceLinearChoiceState<ID extends StableID>(
  domain: Sequence<ID>,
  input: LinearChoiceStateInput<ID> = {},
): LinearChoiceState<ID> {
  const current = input.current ?? null;
  if (current !== null && !domain.ids.includes(current)) throw new TypeError('cursor outside domain');
  const selected = [...new Set(input.selected ?? [])];
  if (selected.length > 1 || selected.some((id) => !domain.ids.includes(id))) {
    throw new TypeError('selection outside domain');
  }
  const anchor = input.anchor ?? null;
  if (anchor !== null && !domain.ids.includes(anchor)) throw new TypeError('anchor outside domain');
  return referenceState(current, new ReferenceSelectionState(selected, anchor));
}

export function applyReferenceLinearChoiceEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
  event: LinearChoiceEvent<ID>,
  policies: LinearChoicePolicies<ID> = {},
): ReferenceLinearChoiceResult<ID> {
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap') return rejected('invalid-linear-choice-boundary');
  const follows = policies.selectionFollowsFocus ?? false;
  if (typeof follows !== 'boolean') return rejected('invalid-selection-follows-focus');
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return rejected('invalid-eligibility-policy');
  }
  const eligible = policies.eligible ?? (() => true);

  if (typeof event === 'object') {
    if (!domain.ids.includes(event.id) || !eligible(event.id)) {
      return rejected('linear-choice-target-unavailable');
    }
    if (event.type === 'focus') {
      const selection = follows
        ? referenceSelectOne(state.selection, event.id, referenceDomain(domain.ids))
        : state.selection;
      return accepted(referenceState(event.id, selection), [{ type: 'focus', id: event.id }]);
    }
    return referenceChoose(domain, state, event.id, event.type === 'activate', true);
  }

  if (event === 'next' || event === 'previous' || event === 'first' || event === 'last') {
    const direction = event === 'next' || event === 'first' ? 1 : -1;
    const target = event === 'first' || event === 'last' || state.cursor.current === null
      ? referenceEdge(domain.ids, direction, eligible, policies.maxScan)
      : referenceMove(
          domain.ids,
          state.cursor.current,
          direction,
          boundary,
          eligible,
          policies.maxScan,
        );
    if (!target.ok) return target;
    if (target.id === null) return accepted(state);
    const selection = follows
      ? referenceSelectOne(state.selection, target.id, referenceDomain(domain.ids))
      : state.selection;
    return accepted(referenceState(target.id, selection), [{ type: 'focus', id: target.id }]);
  }
  const current = state.cursor.current;
  if (current === null) return rejected('no-cursor');
  return referenceChoose(domain, state, current, event === 'activate', false);
}

function referenceChoose<ID extends StableID>(
  domain: Sequence<ID>,
  state: LinearChoiceState<ID>,
  id: ID,
  activate: boolean,
  focus: boolean,
): ReferenceLinearChoiceResult<ID> {
  const commands: LinearChoiceCommand<ID>[] = [];
  if (focus && state.cursor.current !== id) commands.push({ type: 'focus', id });
  if (activate) commands.push({ type: 'activate', id });
  return accepted(referenceState(
    id,
    referenceSelectOne(state.selection, id, referenceDomain(domain.ids)),
  ), commands);
}

function referenceEdge<ID extends StableID>(
  ids: readonly ID[],
  direction: -1 | 1,
  eligible: (id: ID) => boolean,
  maxScan: number | undefined,
): { readonly ok: true; readonly id: ID | null } | ReferenceRejection {
  if (maxScan !== undefined && (!Number.isSafeInteger(maxScan) || maxScan < 0)) {
    return rejectedResource('invalid-scan-ceiling');
  }
  const ceiling = maxScan ?? Number.MAX_SAFE_INTEGER;
  let scanned = 0;
  for (let offset = 0; offset < ids.length; offset += 1) {
    if (scanned >= ceiling) return rejectedResource('scan-ceiling-reached');
    const id = ids[direction > 0 ? offset : ids.length - 1 - offset];
    if (id === undefined) continue;
    scanned += 1;
    if (eligible(id)) return { ok: true, id };
  }
  return { ok: true, id: null };
}

function referenceMove<ID extends StableID>(
  ids: readonly ID[],
  current: ID,
  direction: -1 | 1,
  boundary: BoundaryPolicy,
  eligible: (id: ID) => boolean,
  maxScan: number | undefined,
): { readonly ok: true; readonly id: ID | null } | ReferenceRejection {
  if (maxScan !== undefined && (!Number.isSafeInteger(maxScan) || maxScan < 0)) {
    return rejectedResource('invalid-scan-ceiling');
  }
  const start = ids.indexOf(current);
  if (start < 0) return rejected('linear-choice-cursor-outside-domain');
  const ceiling = maxScan ?? Number.MAX_SAFE_INTEGER;
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

function referenceState<ID extends StableID>(
  current: ID | null,
  selection: LinearChoiceState<ID>['selection'],
): LinearChoiceState<ID> {
  return Object.freeze({ cursor: Object.freeze({ current }), selection });
}

function referenceDomain<ID extends StableID>(ids: readonly ID[]) {
  return {
    contains: (id: ID) => ids.includes(id),
    indexOf: (id: ID) => {
      const index = ids.indexOf(id);
      return index < 0 ? null : index;
    },
    at: (index: number) => ids[index] ?? null,
    size: ids.length,
  };
}

function accepted<ID extends StableID>(
  state: LinearChoiceState<ID>,
  commands: readonly LinearChoiceCommand<ID>[] = [],
): ReferenceLinearChoiceResult<ID> {
  return { ok: true, value: Object.freeze({ state, commands: Object.freeze(commands) }) };
}

function rejected(errorCode: string): ReferenceRejection {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}

function rejectedResource(errorCode: string): ReferenceRejection {
  return { ok: false, errorClass: 'resource-rejection', errorCode };
}
