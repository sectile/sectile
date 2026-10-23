import type { Result, StableID } from './shared.js';
import type { TreeNodeInput } from './structures/tree.js';
import type { Sequence } from './structures/sequence.js';
import { unwrap } from './result.js';
import { applyTreeReorderEvent, getTreeReorderHierarchy, tryCreateTreeReorderState, type TreeReorderState } from './reorder.js';
import { applyListboxEvent, rebaseListboxState, tryCreateListboxState, type ListboxEvent, type ListboxPolicies, type ListboxState, type ListboxStateInput } from './internal/composites/listbox.js';
import { fail, normalizeMaxScan, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';

export type TransferSide = 'source' | 'target';
export interface TransferStateInput<ID extends StableID = StableID> {
  readonly sourceID: ID;
  readonly targetID: ID;
  readonly source?: ListboxStateInput<ID>;
  readonly target?: ListboxStateInput<ID>;
}
export interface TransferState<ID extends StableID = StableID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly sourceID: ID;
  readonly targetID: ID;
  readonly source: ListboxState<ID>;
  readonly target: ListboxState<ID>;
}
export interface TransferPolicies<ID extends StableID = StableID> {
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly eligible?: (id: ID) => boolean;
  readonly canMove?: (id: ID, from: TransferSide, to: TransferSide) => boolean;
  readonly capacity?: Readonly<Partial<Record<TransferSide, number>>>;
  readonly maxScan?: number;
}
export type TransferEvent<ID extends StableID = StableID> =
  | { readonly type: 'listbox'; readonly side: TransferSide; readonly event: ListboxEvent<ID> }
  | { readonly type: 'move'; readonly from: TransferSide; readonly ids?: readonly ID[] };
export type TransferCommand<ID extends StableID = StableID> =
  | { readonly type: 'membership-changed'; readonly nodes: readonly TreeNodeInput<ID>[] }
  | { readonly type: 'selection-changed'; readonly side: TransferSide; readonly selected: readonly ID[] }
  | { readonly type: 'focus'; readonly side: TransferSide; readonly id: ID | null }
  | { readonly type: 'activate'; readonly side: TransferSide; readonly id: ID };
export type TransferUpdate<ID extends StableID = StableID> = MachineUpdate<TransferState<ID>, TransferCommand<ID>>;
export interface TransferSyncInput<ID extends StableID = StableID> {
  readonly nodes?: readonly TreeNodeInput<ID>[];
  readonly source?: ListboxStateInput<ID>;
  readonly target?: ListboxStateInput<ID>;
}
export interface TransferControlledParts {
  readonly membership?: boolean;
  readonly sourceSelection?: boolean;
  readonly targetSelection?: boolean;
  readonly sourceCursor?: boolean;
  readonly targetCursor?: boolean;
}
interface TransferOwner<ID extends StableID> {
  readonly order: TreeReorderState<ID>;
  readonly source: Sequence<ID>;
  readonly target: Sequence<ID>;
}
const owners = new WeakMap<object, TransferOwner<StableID>>();
const sides: readonly TransferSide[] = ['source', 'target'];

export function createTransferState<ID extends StableID>(nodes: readonly TreeNodeInput<ID>[], input: TransferStateInput<NoInfer<ID>>): TransferState<ID> {
  return unwrap(tryCreateTransferState(nodes, input));
}
export function tryCreateTransferState<ID extends StableID>(nodes: readonly TreeNodeInput<ID>[], input: TransferStateInput<NoInfer<ID>>): Result<TransferState<ID>> {
  const order = tryCreateTreeReorderState(nodes);
  if (!order.ok) return order;
  const { sourceID, targetID, source, target } = input;
  const owner = createOwner(order.value, sourceID, targetID);
  if (!owner.ok) return owner;
  const left = admitPane(owner.value.source, source);
  if (!left.ok) return left;
  const right = admitPane(owner.value.target, target);
  return right.ok ? ok(transferState(owner.value, sourceID, targetID, left.value, right.value)) : right;
}

/** Borrows the canonical child domain; no topology or item index is reconstructed. */
export function getTransferItems<ID extends StableID>(state: TransferState<ID>, side: TransferSide): Sequence<ID> {
  if (!isSide(side)) throw new TypeError('Transfer side must be source or target.');
  return unwrap(ownerOf(state))[side];
}

export function applyTransferEvent<ID extends StableID>(state: TransferState<ID>, event: TransferEvent<NoInfer<ID>>, policies: TransferPolicies<NoInfer<ID>> = {}): Result<TransferUpdate<ID>> {
  const owner = ownerOf(state);
  if (!owner.ok) return owner;
  const policy = checkPolicies(policies);
  if (!policy.ok) return policy;
  if (event === null || typeof event !== 'object' || (event.type !== 'move' && event.type !== 'listbox')) return invalidEvent();
  if (policies.disabled === true) return createMachineUpdate(state);
  if (event.type === 'move') {
    const { from, ids } = event;
    if (!isSide(from)) return invalidEvent();
    if (policies.readonly === true) return createMachineUpdate(state);
    return move(state, owner.value, from, ids, policies);
  }
  const { side, event: action } = event;
  if (!isSide(side)) return invalidEvent();
  const navigation = action === 'next' || action === 'previous' || action === 'first' || action === 'last'
    || (action !== null && typeof action === 'object' && action.type === 'focus');
  if (policies.readonly === true && !navigation) return createMachineUpdate(state);
  const update = applyListboxEvent(owner.value[side], state[side], action, { ...navigationPolicy(policies), selectionMode: 'multiple', deselectable: true });
  if (!update.ok) return update;
  if (update.value.state === state[side]) return createMachineUpdate(state);
  const next = transferState(owner.value, state.sourceID, state.targetID,
    side === 'source' ? update.value.state : state.source, side === 'target' ? update.value.state : state.target);
  return publish(state, next, update.value.commands.map(command => ({ ...command, side })));
}

/** Accepted source/snapshot replacement; this emits no movement or focus effects. */
export function synchronizeTransferState<ID extends StableID>(state: TransferState<ID>, input: TransferSyncInput<NoInfer<ID>>, policies: TransferPolicies<NoInfer<ID>> = {}): Result<TransferState<ID>> {
  const previous = ownerOf(state);
  if (!previous.ok) return previous;
  const policy = checkPolicies(policies);
  if (!policy.ok) return policy;
  const { nodes, source, target } = input;
  const order = nodes === undefined || nodes === state.nodes ? ok(previous.value.order) : tryCreateTreeReorderState(nodes);
  if (!order.ok) return order;
  const owner = order.value === previous.value.order ? previous : createOwner(order.value, state.sourceID, state.targetID);
  if (!owner.ok) return owner;
  const left = syncPane(owner.value.source, state.source, source, policies);
  if (!left.ok) return left;
  const right = syncPane(owner.value.target, state.target, target, policies);
  if (!right.ok) return right;
  if (owner.value === previous.value && left.value === state.source && right.value === state.target) return ok(state);
  return ok(transferState(owner.value, state.sourceID, state.targetID, left.value, right.value));
}

/** Refused membership keeps the whole transaction; selected panes remain independent. */
export function reconcileTransferState<ID extends StableID>(previous: TransferState<ID>, proposed: TransferState<NoInfer<ID>>, controlled: TransferControlledParts = {}, policies: TransferPolicies<NoInfer<ID>> = {}): Result<TransferState<ID>> {
  const before = ownerOf(previous), after = ownerOf(proposed);
  if (!before.ok) return before;
  if (!after.ok) return after;
  const policy = checkPolicies(policies);
  if (!policy.ok) return policy;
  const { membership = false, sourceSelection = false, targetSelection = false, sourceCursor = false, targetCursor = false } = controlled;
  if ([membership, sourceSelection, targetSelection, sourceCursor, targetCursor].some(value => typeof value !== 'boolean')) return fail('construction', 'invalid-boundary', 'Controlled Transfer parts must be boolean.');
  if (previous.sourceID !== proposed.sourceID || previous.targetID !== proposed.targetID) return fail('construction', 'transfer-bucket-invalid', 'Transfer reconciliation requires the same bucket identities.');
  if (membership && before.value.order !== after.value.order) return ok(previous);
  const panes: ListboxState<ID>[] = [];
  for (const side of sides) {
    const selected = (side === 'source' ? sourceSelection : targetSelection) ? previous[side].selection : proposed[side].selection;
    const cursor = (side === 'source' ? sourceCursor : targetCursor) ? previous[side].cursor : proposed[side].cursor;
    const pane = selected === proposed[side].selection && cursor.current === proposed[side].cursor.current ? proposed[side]
      : selected === previous[side].selection && cursor.current === previous[side].cursor.current ? previous[side]
      : { cursor, selection: selected };
    const rebased = rebaseListboxState(after.value[side], pane, 'multiple', navigationPolicy(policies));
    if (!rebased.ok) return rebased;
    panes.push(rebased.value);
  }
  if (panes[0] === proposed.source && panes[1] === proposed.target) return ok(proposed);
  if (before.value.order === after.value.order && panes[0] === previous.source && panes[1] === previous.target) return ok(previous);
  return ok(transferState(after.value, proposed.sourceID, proposed.targetID, panes[0]!, panes[1]!));
}

function move<ID extends StableID>(state: TransferState<ID>, owner: TransferOwner<ID>, from: TransferSide, requested: readonly ID[] | undefined, policies: TransferPolicies<ID>): Result<TransferUpdate<ID>> {
  const to = from === 'source' ? 'target' : 'source';
  const input = requested === undefined ? state[from].selection.selected : requested;
  if (!Array.isArray(input)) return invalidEvent();
  const count = input.length;
  if (!Number.isSafeInteger(count) || count < 0) return invalidEvent();
  if (count > owner[from].size) return fail('resource-rejection', 'item-ceiling-exceeded', 'Moved items exceed the current source bucket.', { count });
  if (count === 0) return createMachineUpdate(state);
  const capacity = policies.capacity?.[to];
  if (capacity !== undefined && owner[to].size + count > capacity) return fail('transition-rejection', 'transfer-capacity-exceeded', 'The destination cannot accept the complete move.', { to, capacity });
  const ids: ID[] = [];
  for (let index = 0; index < count; index++) {
    const id = input[index]!;
    if (!owner[from].contains(id)) return fail('transition-rejection', 'transfer-item-outside-source', 'Moved identities must be current direct source items.', { id, from });
    ids.push(id);
  }
  for (const id of ids) if (policies.eligible?.(id) === false || policies.canMove?.(id, from, to) === false) {
    return fail('transition-rejection', 'transfer-target-unavailable', 'Every moved item must be eligible for the destination.', { id, from, to });
  }
  const reordered = applyTreeReorderEvent(owner.order, { type: 'move-nodes', ids, parentID: to === 'source' ? state.sourceID : state.targetID });
  if (!reordered.ok) return reordered;
  if (reordered.value.state === owner.order) return createMachineUpdate(state);
  const nextOwner = createOwner(reordered.value.state, state.sourceID, state.targetID);
  if (!nextOwner.ok) return nextOwner;
  const left = rebaseListboxState(nextOwner.value.source, state.source, 'multiple', navigationPolicy(policies));
  if (!left.ok) return left;
  const right = rebaseListboxState(nextOwner.value.target, state.target, 'multiple', navigationPolicy(policies));
  if (!right.ok) return right;
  const next = transferState(nextOwner.value, state.sourceID, state.targetID, left.value, right.value);
  const focus: TransferCommand<ID>[] = state[from].cursor.current === next[from].cursor.current ? [] : [{ type: 'focus', side: from, id: next[from].cursor.current }];
  return publish(state, next, focus);
}

function syncPane<ID extends StableID>(domain: Sequence<ID>, previous: ListboxState<ID>, input: ListboxStateInput<ID> | undefined, policies: TransferPolicies<ID>): Result<ListboxState<ID>> {
  const rebased = rebaseListboxState(domain, previous, 'multiple', navigationPolicy(policies));
  if (!rebased.ok || input === undefined) return rebased;
  const explicit = admitPane(domain, { selected: rebased.value.selection.selected, anchor: rebased.value.selection.anchor,
    current: rebased.value.cursor.current, ...input });
  if (explicit.ok && explicit.value.cursor.current !== null && policies.eligible?.(explicit.value.cursor.current) === false) return fail('construction', 'listbox-target-unavailable', 'An explicit Transfer cursor must be eligible.');
  return explicit;
}
function admitPane<ID extends StableID>(domain: Sequence<ID>, input: ListboxStateInput<ID> = {}): Result<ListboxState<ID>> {
  const { selected, anchor, current } = input;
  let snapshot: ID[] | undefined;
  if (selected !== undefined) {
    if (!Array.isArray(selected)) return fail('construction', 'invalid-boundary', 'Transfer selection requires an array.');
    const count = selected.length;
    if (!Number.isSafeInteger(count) || count < 0) return fail('construction', 'invalid-boundary', 'Transfer selection requires a safe array length.');
    if (count > domain.size) return fail('resource-rejection', 'item-ceiling-exceeded', 'Transfer selection exceeds its pane size.', { count });
    snapshot = [];
    for (let index = 0; index < count; index++) snapshot.push(selected[index]!);
  }
  return tryCreateListboxState(domain, { ...(snapshot === undefined ? {} : { selected: snapshot }),
    ...(anchor === undefined ? {} : { anchor }), ...(current === undefined ? {} : { current }) }, 'multiple');
}
function navigationPolicy<ID extends StableID>(policies: TransferPolicies<ID>): Pick<ListboxPolicies<ID>, 'eligible' | 'maxScan'> {
  return { ...(policies.eligible === undefined ? {} : { eligible: policies.eligible }), ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }) };
}
function publish<ID extends StableID>(before: TransferState<ID>, after: TransferState<ID>, effects: readonly TransferCommand<ID>[]): Result<TransferUpdate<ID>> {
  const commands: TransferCommand<ID>[] = [];
  if (before.nodes !== after.nodes) commands.push({ type: 'membership-changed', nodes: after.nodes });
  for (const side of sides) if (before[side].selection.selected !== after[side].selection.selected) commands.push({ type: 'selection-changed', side, selected: after[side].selection.selected });
  return createMachineUpdate(after, [...commands, ...effects]);
}
function createOwner<ID extends StableID>(order: TreeReorderState<ID>, sourceID: ID, targetID: ID): Result<TransferOwner<ID>> {
  const tree = getTreeReorderHierarchy(order);
  if (sourceID === targetID || !tree.has(sourceID) || !tree.has(targetID) || tree.parentOf(sourceID) !== null || tree.parentOf(targetID) !== null) {
    return fail('construction', 'transfer-bucket-invalid', 'Transfer buckets must be two distinct top-level identities.');
  }
  return ok({ order, source: tree.childrenOf(sourceID)!, target: tree.childrenOf(targetID)! });
}
function transferState<ID extends StableID>(owner: TransferOwner<ID>, sourceID: ID, targetID: ID, source: ListboxState<ID>, target: ListboxState<ID>): TransferState<ID> {
  const state = Object.freeze({ nodes: owner.order.nodes, sourceID, targetID, source, target });
  owners.set(state, owner as TransferOwner<StableID>);
  return state;
}
function ownerOf<ID extends StableID>(state: TransferState<ID>): Result<TransferOwner<ID>> {
  const owner = owners.get(state) as TransferOwner<ID> | undefined;
  return owner ? ok(owner) : fail('construction', 'transfer-state-owner-mismatch', 'Transfer state must be issued by its constructor.');
}
function isSide(value: unknown): value is TransferSide { return value === 'source' || value === 'target'; }
function invalidEvent(): Result<never> { return fail('transition-rejection', 'invalid-transfer-event', 'Transfer requires a pane Listbox event or a move from a known side.'); }
function checkPolicies<ID extends StableID>(policies: TransferPolicies<ID>): Result<void> {
  if ((policies.disabled !== undefined && typeof policies.disabled !== 'boolean') || (policies.readonly !== undefined && typeof policies.readonly !== 'boolean')) return fail('construction', 'invalid-boundary', 'Transfer disabled and readonly policies must be boolean.');
  if ((policies.eligible !== undefined && typeof policies.eligible !== 'function') || (policies.canMove !== undefined && typeof policies.canMove !== 'function')) return fail('construction', 'invalid-eligibility-policy', 'Transfer eligibility policies must be functions.');
  if (policies.capacity !== undefined && (policies.capacity === null || typeof policies.capacity !== 'object' || Array.isArray(policies.capacity))) return fail('construction', 'invalid-boundary', 'Transfer capacity must name source and target limits.');
  const maxScan = normalizeMaxScan(policies.maxScan);
  if (typeof maxScan !== 'number') return { ok: false, error: maxScan };
  for (const side of sides) {
    const capacity = policies.capacity?.[side];
    if (capacity !== undefined && (!Number.isSafeInteger(capacity) || capacity < 0)) return fail('construction', 'invalid-count', 'Transfer capacities must be safe nonnegative integers.', { side, capacity });
  }
  return ok(undefined);
}
