import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { unwrap } from './result.js';
import {
  applySequencePatch,
  tryCreateSequence,
  type Sequence,
  type SequencePatch,
} from './structures/sequence.js';
import { tryCreateTree, type Tree, type TreeNodeInput } from './structures/tree.js';
import type { Result, StableID } from './shared.js';

export interface SequenceReorderState<ID extends StableID = StableID> {
  readonly ids: readonly ID[];
}

export type SequenceReorderEvent<ID extends StableID = StableID> =
  | { readonly type: 'move-before'; readonly id: ID; readonly targetID: ID }
  | { readonly type: 'move-after'; readonly id: ID; readonly targetID: ID }
  | { readonly type: 'move-to-start'; readonly id: ID }
  | { readonly type: 'move-to-end'; readonly id: ID };

export type SequenceReorderCommand<ID extends StableID = StableID> = {
  readonly type: 'sequence-order-changed';
  readonly patch: SequencePatch<ID>;
};

export type SequenceReorderUpdate<ID extends StableID = StableID> =
  MachineUpdate<SequenceReorderState<ID>, SequenceReorderCommand<ID>>;

export interface TreeReorderState<ID extends StableID = StableID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
}

export interface TreeReorderConstraints {
  /** Per-call depth bound (root0), not retained in state; omitted means unrestricted. */
  readonly maxDepth?: number;
}
export interface TreeReorderMove<ID extends StableID = StableID> {
  readonly id: ID; readonly previousParentID: ID | null; readonly parentID: ID | null;
}
export interface TreeReorderPolicies<ID extends StableID = StableID> extends TreeReorderConstraints {
  /** Roots may reorder, but cannot become children and children cannot become roots. */
  readonly preserveRoots?: boolean;
  readonly canMove?: (move: TreeReorderMove<ID>) => boolean;
  /** Direct-child limit. Queried once only when destination membership increases. */
  readonly capacity?: (parentID: ID | null) => number | undefined;
}
interface CapturedTreePolicies<ID extends StableID> {
  readonly maxDepth: number | undefined; readonly preserveRoots: boolean;
  readonly canMove: TreeReorderPolicies<ID>['canMove']; readonly capacity: TreeReorderPolicies<ID>['capacity'];
}

export type TreeReorderEvent<ID extends StableID = StableID> =
  | { readonly type: 'move-node'; readonly id: ID; readonly parentID: ID | null; readonly beforeID?: ID | null }
  /** Moves disjoint subtree roots in supplied order, publishing one atomic update. */
  | { readonly type: 'move-nodes'; readonly ids: readonly ID[]; readonly parentID: ID | null; readonly beforeID?: ID | null };

export type TreeReorderCommand<ID extends StableID = StableID> = {
  readonly type: 'tree-order-changed';
  readonly nodes: readonly TreeNodeInput<ID>[];
};

export type TreeReorderUpdate<ID extends StableID = StableID> =
  MachineUpdate<TreeReorderState<ID>, TreeReorderCommand<ID>>;

interface TreeReorderOwner<ID extends StableID> {
  readonly tree: Tree<ID>;
  readonly positions: ReadonlyMap<ID, number>;
}

const sequenceReorderOwners = new WeakMap<object, Sequence<StableID>>();
const treeReorderOwners = new WeakMap<object, TreeReorderOwner<StableID>>();

export function createSequenceReorderState<ID extends StableID>(
  ids: readonly ID[],
): SequenceReorderState<ID> {
  return unwrap(tryCreateSequenceReorderState(ids));
}

export function tryCreateSequenceReorderState<ID extends StableID>(
  ids: readonly ID[],
): Result<SequenceReorderState<ID>> {
  const sequence = tryCreateSequence(ids);
  return sequence.ok
    ? ok(sequenceReorderState(sequence.value))
    : sequence;
}

/** Borrows the retained order; structural caller states are validated in O(n). */
export function getSequenceReorderOrder<ID extends StableID>(
  state: SequenceReorderState<ID>,
): Sequence<ID> {
  const owner = sequenceReorderOwners.get(state) as Sequence<ID> | undefined;
  if (owner !== undefined) return owner;
  return getSequenceReorderOrder(unwrap(tryCreateSequenceReorderState(state.ids)));
}

export function applySequenceReorderEvent<ID extends StableID>(
  state: SequenceReorderState<ID>,
  event: SequenceReorderEvent<ID>,
): Result<SequenceReorderUpdate<ID>> {
  let sequence = sequenceReorderOwners.get(state) as Sequence<ID> | undefined;
  if (sequence === undefined) {
    const valid = tryCreateSequenceReorderState(state.ids);
    if (!valid.ok) return transitionFailure(valid);
    sequence = sequenceReorderOwners.get(valid.value) as Sequence<ID>;
  }
  const type = event.type;
  const id = event.id;
  const targetID = type === 'move-before' || type === 'move-after' ? event.targetID : null;
  const sourceIndex = sequence.indexOf(id);
  if (sourceIndex === null) return missingID(id);
  if (targetID !== null && id === targetID) return createMachineUpdate(state);
  let destination: number;
  if (type === 'move-to-start') destination = 0;
  else if (type === 'move-to-end') destination = sequence.size - 1;
  else {
    const targetIndex = sequence.indexOf(targetID as ID);
    if (targetIndex === null) return missingID(targetID as ID);
    const postRemovalTarget = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    destination = postRemovalTarget + (type === 'move-after' ? 1 : 0);
  }
  const patch = Object.freeze({
    type: 'move' as const,
    from: sourceIndex,
    to: destination,
    count: 1,
  });
  const nextSequence = applySequencePatch(sequence, patch);
  if (nextSequence === sequence) return createMachineUpdate(state);
  const next = sequenceReorderState(nextSequence);
  return createMachineUpdate(next, [{
    type: 'sequence-order-changed',
    patch,
  }]);
}

export function createTreeReorderState<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
  constraints?: TreeReorderConstraints,
): TreeReorderState<ID> {
  return unwrap(tryCreateTreeReorderState(nodes, constraints));
}

export function tryCreateTreeReorderState<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
  constraints?: TreeReorderConstraints,
): Result<TreeReorderState<ID>> {
  if (constraints !== undefined && (constraints === null || typeof constraints !== 'object' || Array.isArray(constraints))) return fail('construction', 'invalid-boundary', 'Tree constraints require a record.');
  const maxDepth = constraints?.maxDepth;
  if (maxDepth !== undefined && (!Number.isSafeInteger(maxDepth) || maxDepth < 0)) return fail('construction', 'invalid-boundary', 'Maximum tree depth must be a nonnegative safe integer.');
  const tree = tryCreateTree(nodes);
  if (!tree.ok) return tree;
  if (maxDepth !== undefined) for (const id of tree.value.preorder().ids) {
    if (tree.value.depthOf(id)! > maxDepth) return fail('construction', 'reorder-tree-depth-exceeded', 'Hierarchy exceeds maximum tree depth.', { id, maxDepth });
  }
  return ok(treeReorderState(freezeNodes(nodes), tree.value));
}

/** Borrows the retained hierarchy; structural caller states are validated in O(n). */
export function getTreeReorderHierarchy<ID extends StableID>(
  state: TreeReorderState<ID>,
): Tree<ID> {
  const owner = treeReorderOwners.get(state) as TreeReorderOwner<ID> | undefined;
  if (owner !== undefined) return owner.tree;
  return getTreeReorderHierarchy(unwrap(tryCreateTreeReorderState(state.nodes)));
}

/** Advisory admission only; commit rechecks policy. Borrows canonical indexes without building a next Tree. */
export function canMoveTreeReorderNode<ID extends StableID>(
  state: TreeReorderState<ID>,
  event: Extract<TreeReorderEvent<NoInfer<ID>>, { readonly type: 'move-node' }>,
  policies?: TreeReorderPolicies<NoInfer<ID>>,
): boolean {
  let policy: CapturedTreePolicies<ID> | undefined;
  if (policies !== undefined) {
    const captured = captureTreePolicies(policies); if (!captured.ok) return false;
    policy = captured.value;
  }
  let owner = treeReorderOwners.get(state) as TreeReorderOwner<ID> | undefined;
  if (owner === undefined) {
    const valid = tryCreateTreeReorderState(state.nodes); if (!valid.ok) return false;
    owner = treeReorderOwners.get(valid.value) as TreeReorderOwner<ID>;
  }
  const { id, parentID, beforeID = null } = event;
  return checkTreeNodeMove(owner.tree, id, parentID, beforeID, policy).ok;
}

export function applyTreeReorderEvent<ID extends StableID>(
  state: TreeReorderState<ID>,
  event: TreeReorderEvent<ID>,
  policies?: TreeReorderPolicies<NoInfer<ID>>,
): Result<TreeReorderUpdate<ID>> {
  let policy: CapturedTreePolicies<ID> | undefined;
  if (policies !== undefined) {
    const captured = captureTreePolicies(policies); if (!captured.ok) return captured;
    policy = captured.value;
  }
  let owner = treeReorderOwners.get(state) as TreeReorderOwner<ID> | undefined;
  let canonicalState = state;
  if (owner === undefined) {
    const valid = tryCreateTreeReorderState(state.nodes);
    if (!valid.ok) return transitionFailure(valid);
    canonicalState = valid.value;
    owner = treeReorderOwners.get(canonicalState) as TreeReorderOwner<ID>;
  }
  if (event.type === 'move-nodes') {
    return moveTreeNodes(state, canonicalState, owner, event.ids, event.parentID, event.beforeID ?? null, policy);
  }
  const { tree, positions } = owner;
  const id = event.id;
  const parentID = event.parentID;
  const beforeID = event.beforeID ?? null;
  const allowed = checkTreeNodeMove(tree, id, parentID, beforeID, policy);
  if (!allowed.ok) return allowed;
  if (beforeID === id) return createMachineUpdate(state);

  const sourceIndex = positions.get(id)!;
  const nodes = [...canonicalState.nodes];
  nodes.splice(sourceIndex, 1);
  let destination: number;
  if (beforeID !== null) {
    destination = postRemovalIndex(positions.get(beforeID)!, sourceIndex);
  } else {
    const siblings = parentID === null ? tree.roots : tree.childrenOf(parentID)!;
    let lastSibling = siblings.at(siblings.size - 1);
    if (lastSibling === id) lastSibling = siblings.at(siblings.size - 2);
    if (lastSibling !== null) {
      destination = postRemovalIndex(positions.get(lastSibling)!, sourceIndex) + 1;
    } else if (parentID === null) {
      destination = nodes.length;
    } else {
      destination = postRemovalIndex(positions.get(parentID)!, sourceIndex) + 1;
    }
  }
  if (destination === sourceIndex && tree.parentOf(id) === parentID) {
    return createMachineUpdate(state);
  }
  nodes.splice(destination, 0, Object.freeze({ id, parentID }));
  Object.freeze(nodes);
  const nextTree = tryCreateTree(nodes);
  if (!nextTree.ok) return transitionFailure(nextTree);
  const next = treeReorderState(nodes, nextTree.value);
  return createMachineUpdate(next, [{ type: 'tree-order-changed', nodes: next.nodes }]);
}

function moveTreeNodes<ID extends StableID>(
  original: TreeReorderState<ID>,
  canonical: TreeReorderState<ID>,
  owner: TreeReorderOwner<ID>,
  ids: readonly ID[],
  parentID: ID | null,
  beforeID: ID | null,
  policy?: CapturedTreePolicies<ID>,
): Result<TreeReorderUpdate<ID>> {
  const { tree, positions } = owner;
  if (!Array.isArray(ids)) return fail('transition-rejection', 'invalid-boundary', 'Moved roots require an array.');
  const count = ids.length;
  if (!Number.isSafeInteger(count) || count < 0) return fail('transition-rejection', 'invalid-boundary', 'Moved roots require a safe array length.');
  if (parentID !== null && !tree.has(parentID)) return missingID(parentID);
  if (beforeID !== null && (!tree.has(beforeID) || tree.parentOf(beforeID) !== parentID)) {
    return fail('transition-rejection', 'reorder-tree-sibling-invalid', 'beforeID must identify a sibling under the requested parent.', { beforeID, parentID });
  }
  if (count > tree.size) {
    return fail('transition-rejection', 'reorder-tree-ids-duplicate', 'A move cannot contain more roots than the current tree.', { count });
  }
  if (count === 0) return createMachineUpdate(original);
  const moving = new Set<ID>();
  const roots: TreeNodeInput<ID>[] = [];
  for (let index = 0; index < count; index++) {
    const id = ids[index]!;
    if (!tree.has(id)) return missingID(id);
    if (moving.has(id)) return fail('transition-rejection', 'reorder-tree-ids-duplicate', 'Each moved root must occur once.', { id });
    if (parentID !== null && isWithinSubtree(tree, id, parentID)) {
      return fail('transition-rejection', 'reorder-tree-cycle', 'A tree node cannot move below itself or one of its descendants.', { id, parentID });
    }
    moving.add(id);
    const source = canonical.nodes[positions.get(id)!]!;
    roots.push(source.parentID === parentID ? source : Object.freeze({ id, parentID }));
  }
  if (beforeID !== null && moving.has(beforeID)) {
    return fail('transition-rejection', 'reorder-tree-sibling-invalid', 'The insertion anchor must not be a moved root.', { beforeID, parentID });
  }
  let selectedEnd = 0;
  for (const id of tree.preorder().ids) {
    if (!moving.has(id)) continue;
    const interval = tree.subtreeIntervalOf(id)!;
    if (interval.start < selectedEnd) {
      return fail('transition-rejection', 'reorder-tree-move-overlap', 'Moved roots must not contain one another.', { id });
    }
    selectedEnd = interval.endExclusive;
  }
  if (policy !== undefined) {
    const allowed = checkTreeMove(tree, moving, parentID, policy); if (!allowed.ok) return allowed;
  }
  const siblings = parentID === null ? tree.roots : tree.childrenOf(parentID)!;
  const first = siblings.indexOf(roots[0]!.id);
  if (first !== null && roots.every((node, index) => node.parentID === parentID && siblings.at(first + index) === node.id)
    && (beforeID === null ? first + count === siblings.size : siblings.at(first + count) === beforeID)) {
    return createMachineUpdate(original);
  }
  let boundary: number;
  if (beforeID !== null) boundary = positions.get(beforeID)!;
  else {
    let last: ID | null = null;
    for (let index = siblings.size - 1; index >= 0; index--) {
      const id = siblings.at(index)!;
      if (!moving.has(id)) { last = id; break; }
    }
    boundary = last !== null ? positions.get(last)! + 1 : parentID === null ? canonical.nodes.length : positions.get(parentID)! + 1;
  }
  const nodes: TreeNodeInput<ID>[] = [];
  for (let index = 0; index <= canonical.nodes.length; index++) {
    if (index === boundary) for (const root of roots) nodes.push(root);
    const node = canonical.nodes[index];
    if (node !== undefined && !moving.has(node.id)) nodes.push(node);
  }
  if (nodes.every((node, index) => node.id === canonical.nodes[index]!.id && node.parentID === canonical.nodes[index]!.parentID)) return createMachineUpdate(original);
  Object.freeze(nodes);
  const nextTree = tryCreateTree(nodes);
  if (!nextTree.ok) return transitionFailure(nextTree);
  const next = treeReorderState(nodes, nextTree.value);
  return createMachineUpdate(next, [{ type: 'tree-order-changed', nodes: next.nodes }]);
}

function captureTreePolicies<ID extends StableID>(policies: TreeReorderPolicies<ID>): Result<CapturedTreePolicies<ID>> {
  if (policies === null || typeof policies !== 'object' || Array.isArray(policies)) return fail('transition-rejection', 'invalid-boundary', 'Tree move policies require a record.');
  const { maxDepth, preserveRoots, canMove, capacity } = policies;
  if ((maxDepth !== undefined && (!Number.isSafeInteger(maxDepth) || maxDepth < 0))
    || (preserveRoots !== undefined && typeof preserveRoots !== 'boolean')
    || (canMove !== undefined && typeof canMove !== 'function') || (capacity !== undefined && typeof capacity !== 'function')) {
    return fail('transition-rejection', 'invalid-boundary', 'Invalid tree move depth, root preservation, permission or capacity policy.');
  }
  return ok({ maxDepth, preserveRoots: preserveRoots === true, canMove, capacity });
}

function checkTreeNodeMove<ID extends StableID>(tree: Tree<ID>, id: ID, parentID: ID | null, beforeID: ID | null,
  policy: CapturedTreePolicies<ID> | undefined): Result<void> {
  if (!tree.has(id)) return missingID(id);
  if (parentID !== null && !tree.has(parentID)) return missingID(parentID);
  if (parentID !== null && isWithinSubtree(tree, id, parentID)) {
    return fail('transition-rejection', 'reorder-tree-cycle', 'A tree node cannot move below itself or one of its descendants.', { id, parentID });
  }
  if (beforeID === id) return ok(undefined);
  if (beforeID !== null && (!tree.has(beforeID) || tree.parentOf(beforeID) !== parentID)) {
    return fail('transition-rejection', 'reorder-tree-sibling-invalid', 'beforeID must identify a sibling under the requested parent.', { beforeID, parentID });
  }
  return policy === undefined ? ok(undefined) : checkTreeMove(tree, id, parentID, policy);
}

/** Preflight borrows canonical depth/child/subtree indexes; no next Tree is built on rejection. */
function checkTreeMove<ID extends StableID>(tree: Tree<ID>, moved: ID | ReadonlySet<ID>, parentID: ID | null,
  policy: CapturedTreePolicies<ID>): Result<void> {
  const nextDepth = parentID === null ? 0 : tree.depthOf(parentID)! + 1;
  let incoming = 0;
  const check = (id: ID): Result<void> | undefined => {
    const previousParentID = tree.parentOf(id) ?? null;
    if (policy.preserveRoots && (previousParentID === null) !== (parentID === null)) {
      return fail('transition-rejection', 'reorder-tree-move-rejected', 'Move would change root membership.', { id, previousParentID, parentID });
    }
    if (policy.maxDepth !== undefined) {
      const delta = nextDepth - tree.depthOf(id)!, interval = tree.subtreeIntervalOf(id)!, ids = tree.preorder().ids;
      for (let index = interval.start; index < interval.endExclusive; index++) {
        if (tree.depthOf(ids[index]!)! + delta > policy.maxDepth) return fail('transition-rejection', 'reorder-tree-depth-exceeded',
          'Moved subtree would exceed maximum tree depth.', { id, parentID, maxDepth: policy.maxDepth });
      }
    }
    if (policy.canMove !== undefined && policy.canMove({ id, previousParentID, parentID }) !== true) {
      return fail('transition-rejection', 'reorder-tree-move-rejected', 'Move permission was refused.', { id, previousParentID, parentID });
    }
    if (previousParentID !== parentID) incoming++;
    return undefined;
  };
  if (typeof moved === 'object') { for (const id of moved) { const failure = check(id); if (failure) return failure; } }
  else { const failure = check(moved); if (failure) return failure; }
  if (incoming > 0 && policy.capacity !== undefined) {
    const capacity = policy.capacity(parentID);
    if (capacity !== undefined) {
      if (!Number.isSafeInteger(capacity) || capacity < 0) return fail('transition-rejection', 'invalid-boundary', 'Destination capacity must be a nonnegative safe integer.');
      const size = parentID === null ? tree.roots.size : tree.childrenOf(parentID)!.size;
      if (size + incoming > capacity) return fail('transition-rejection', 'reorder-tree-capacity-exceeded', 'Move would exceed destination capacity.', { parentID, capacity, size, incoming });
    }
  }
  return ok(undefined);
}

function sequenceReorderState<ID extends StableID>(
  sequence: Sequence<ID>,
): SequenceReorderState<ID> {
  const state = Object.freeze({ ids: sequence.ids });
  sequenceReorderOwners.set(state, sequence as Sequence<StableID>);
  return state;
}

function treeReorderState<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
  tree: Tree<ID>,
): TreeReorderState<ID> {
  const positions = new Map<ID, number>();
  for (let index = 0; index < nodes.length; index += 1) {
    positions.set(nodes[index]!.id, index);
  }
  const state = Object.freeze({ nodes });
  treeReorderOwners.set(state, {
    tree,
    positions,
  } as TreeReorderOwner<StableID>);
  return state;
}

function isWithinSubtree<ID extends StableID>(
  tree: Tree<ID>,
  root: ID,
  candidate: ID,
): boolean {
  const rootInterval = tree.subtreeIntervalOf(root)!;
  const candidateInterval = tree.subtreeIntervalOf(candidate)!;
  return candidateInterval.start >= rootInterval.start
    && candidateInterval.start < rootInterval.endExclusive;
}

function postRemovalIndex(index: number, removedIndex: number): number {
  return index > removedIndex ? index - 1 : index;
}

function missingID<ID extends StableID>(id: ID): Result<never> {
  return fail(
    'transition-rejection',
    'reorder-id-missing',
    'Reorder identity must exist in the current domain.',
    { id },
  );
}

function freezeNodes<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
): readonly TreeNodeInput<ID>[] {
  return Object.freeze(nodes.map((node) => Object.freeze({ ...node })));
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}
