import type { BoundaryPolicy, StableID } from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import {
  DEFAULT_LISTBOX_SELECTION_MODE,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
  type ListboxState,
  type ListboxStateInput,
  type ListboxTypeaheadOptions,
  type ListboxUpdate,
} from '../../composites/listbox.js';
import { ReferenceSelectionState, referenceClearSelection, referenceSelectOne, referenceToggleMultipleSelection } from '../state/selection.js';
import type { SelectionMode } from '../../state/selection.js';

interface ReferenceRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection' | 'resource-rejection';
  readonly errorCode: string;
}

export type ReferenceListboxResult<ID extends StableID> =
  | { readonly ok: true; readonly value: ListboxUpdate<ID> }
  | ReferenceRejection;

type ReferenceTargetResult<ID extends StableID> =
  | { readonly ok: true; readonly id: ID | null }
  | ReferenceRejection;

export function createReferenceListboxState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ListboxStateInput<ID> = {},
  selectionMode: SelectionMode = DEFAULT_LISTBOX_SELECTION_MODE,
): ListboxState<ID> {
  const current = input.current ?? null;
  if (current !== null && referenceIndexOf(domain, current) === null) {
    throw new TypeError('reference listbox cursor outside domain');
  }
  const selected = [...new Set(input.selected ?? [])];
  if (selectionMode === 'single' && selected.length > 1) {
    throw new TypeError('reference single listbox selection cardinality');
  }
  for (const id of selected) {
    if (referenceIndexOf(domain, id) === null) {
      throw new TypeError('reference listbox selection outside domain');
    }
  }
  const anchor = input.anchor ?? null;
  if (anchor !== null && referenceIndexOf(domain, anchor) === null) {
    throw new TypeError('reference listbox anchor outside domain');
  }
  return referenceState(current, new ReferenceSelectionState(selected, anchor));
}

export function applyReferenceListboxEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: ListboxState<ID>,
  event: ListboxEvent<ID>,
  policies: ListboxPolicies<ID> = {},
): ReferenceListboxResult<ID> {
  const boundary = policies.boundary ?? 'stop';
  const selectionFollowsFocus = policies.selectionFollowsFocus ?? false;
  const selectionMode = policies.selectionMode ?? DEFAULT_LISTBOX_SELECTION_MODE;
  const eligible = policies.eligible ?? (() => true);

  if (typeof event === 'object') {
    if (referenceIndexOf(domain, event.id) === null || !eligible(event.id)) {
      return referenceRejected('transition-rejection', 'listbox-target-unavailable');
    }
    if (event.type === 'focus') {
      const selection = selectionFollowsFocus
        ? referenceSelectOne(state.selection, event.id, domain)
        : state.selection;
      return referenceAccepted(referenceState(event.id, selection), [
        { type: 'focus', id: event.id },
      ]);
    }
    if (event.type === 'toggle') {
      return referenceAccepted(referenceState(
        event.id,
        referenceSelectForMode(state.selection, event.id, domain, selectionMode),
      ), [{ type: 'focus', id: event.id }]);
    }
    return referenceAccepted(
      referenceState(event.id, referenceSelectOne(state.selection, event.id, domain)),
      [{ type: 'focus', id: event.id }, { type: 'activate', id: event.id }],
    );
  }

  if (event === 'next' || event === 'previous') {
    const direction = event === 'next' ? 1 : -1;
    const target = referenceTarget(
      domain,
      state.cursor.current,
      direction,
      boundary,
      eligible,
      policies.maxScan,
    );
    if (!target.ok) return target;
    if (target.id === null) return referenceAccepted(state);
    const selection = selectionFollowsFocus
      ? referenceSelectOne(state.selection, target.id, domain)
      : state.selection;
    return referenceAccepted(
      referenceState(target.id, selection),
      [{ type: 'focus', id: target.id }],
    );
  }

  if (event === 'first' || event === 'last') {
    const target = referenceTarget(
      domain,
      null,
      event === 'first' ? 1 : -1,
      'stop',
      eligible,
      policies.maxScan,
    );
    if (!target.ok) return target;
    if (target.id === null || target.id === state.cursor.current) return referenceAccepted(state);
    const selection = selectionFollowsFocus
      ? referenceSelectOne(state.selection, target.id, domain)
      : state.selection;
    return referenceAccepted(referenceState(target.id, selection), [
      { type: 'focus', id: target.id },
    ]);
  }

  if (event === 'toggle') {
    const current = state.cursor.current;
    if (current === null) return referenceRejected('transition-rejection', 'no-cursor');
    return referenceAccepted(
      referenceState(
        current,
        referenceSelectForMode(state.selection, current, domain, selectionMode),
      ),
    );
  }

  if (event === 'activate') {
    const current = state.cursor.current;
    if (current === null) return referenceRejected('transition-rejection', 'no-cursor');
    return referenceAccepted(
      referenceState(current, referenceSelectOne(state.selection, current, domain)),
      [{ type: 'activate', id: current }],
    );
  }

  return referenceAccepted(
    referenceState(state.cursor.current, referenceClearSelection(state.selection)),
  );
}

export function findReferenceListboxTypeaheadMatch<ID extends StableID>(
  domain: Sequence<ID>,
  current: ID | null,
  query: string,
  options: ListboxTypeaheadOptions<ID>,
): ID | null {
  if (query.length === 0 || domain.size === 0) return null;
  const normalize = options.normalize ?? ((text: string) => text.toLowerCase());
  const needle = normalize(query);
  if (needle.length === 0) return null;
  const start = current === null ? 0 : ((referenceIndexOf(domain, current) as number) + 1) % domain.size;
  const eligible = options.eligible ?? (() => true);
  const limit = options.maxScan ?? Number.MAX_SAFE_INTEGER;
  let scanned = 0;
  for (let offset = 0; offset < domain.size; offset += 1) {
    if (scanned === limit) throw new RangeError('reference typeahead scan ceiling reached');
    const id = domain.at((start + offset) % domain.size);
    scanned += 1;
    if (id !== null && eligible(id) && normalize(options.textValue(id)).startsWith(needle)) {
      return id;
    }
  }
  return null;
}

function referenceSelectForMode<ID extends StableID>(
  state: ListboxState<ID>['selection'],
  id: ID,
  domain: Sequence<ID>,
  mode: SelectionMode,
): ListboxState<ID>['selection'] {
  return mode === 'single'
    ? referenceSelectOne(state, id, domain)
    : referenceToggleMultipleSelection(state, id, domain);
}

function referenceTarget<ID extends StableID>(
  domain: Sequence<ID>,
  current: ID | null,
  direction: -1 | 1,
  boundary: BoundaryPolicy,
  eligible: (id: ID) => boolean,
  requestedMaxScan: number | undefined,
): ReferenceTargetResult<ID> {
  if (
    requestedMaxScan !== undefined &&
    (!Number.isSafeInteger(requestedMaxScan) || requestedMaxScan < 0)
  ) {
    return referenceRejected('resource-rejection', 'invalid-scan-ceiling');
  }
  const maxScan = requestedMaxScan ?? Number.MAX_SAFE_INTEGER;
  const currentIndex = current === null ? null : referenceIndexOf(domain, current);
  if (current !== null && currentIndex === null) {
    return referenceRejected('transition-rejection', 'listbox-cursor-outside-domain');
  }
  const candidates: number[] = [];
  if (currentIndex === null) {
    if (direction > 0) {
      for (let index = 0; index < domain.size; index += 1) candidates.push(index);
    } else {
      for (let index = domain.size - 1; index >= 0; index -= 1) candidates.push(index);
    }
  } else if (direction > 0) {
    for (let index = currentIndex + 1; index < domain.size; index += 1) candidates.push(index);
    if (boundary === 'wrap') {
      for (let index = 0; index < currentIndex; index += 1) candidates.push(index);
    }
  } else {
    for (let index = currentIndex - 1; index >= 0; index -= 1) candidates.push(index);
    if (boundary === 'wrap') {
      for (let index = domain.size - 1; index > currentIndex; index -= 1) candidates.push(index);
    }
  }
  let scanned = 0;
  for (const index of candidates) {
    if (scanned === maxScan) {
      return referenceRejected('resource-rejection', 'scan-ceiling-reached');
    }
    const id = domain.at(index);
    scanned += 1;
    if (id !== null && eligible(id)) return { ok: true, id };
  }
  return { ok: true, id: null };
}

function referenceIndexOf<ID extends StableID>(domain: Sequence<ID>, id: ID): number | null {
  for (let index = 0; index < domain.size; index += 1) {
    if (domain.at(index) === id) return index;
  }
  return null;
}

function referenceState<ID extends StableID>(
  current: ID | null,
  selection: ListboxState<ID>['selection'],
): ListboxState<ID> {
  return Object.freeze({ cursor: Object.freeze({ current }), selection });
}

function referenceAccepted<ID extends StableID>(
  state: ListboxState<ID>,
  commands: readonly ListboxCommand<ID>[] = [],
): ReferenceListboxResult<ID> {
  return {
    ok: true,
    value: Object.freeze({ state, commands: Object.freeze([...commands]) }),
  };
}

function referenceRejected(
  errorClass: 'transition-rejection' | 'resource-rejection',
  errorCode: string,
): ReferenceRejection {
  return { ok: false, errorClass, errorCode };
}
