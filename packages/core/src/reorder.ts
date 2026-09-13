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

export interface TreeReorderEvent<ID extends StableID = StableID> {
  readonly type: 'move-node';
  readonly id: ID;
  readonly parentID: ID | null;
  readonly beforeID?: ID | null;
}

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
): TreeReorderState<ID> {
  return unwrap(tryCreateTreeReorderState(nodes));
}

export function tryCreateTreeReorderState<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
): Result<TreeReorderState<ID>> {
  const tree = tryCreateTree(nodes);
  if (!tree.ok) return tree;
  return ok(treeReorderState(freezeNodes(nodes), tree.value));
}

export function applyTreeReorderEvent<ID extends StableID>(
  state: TreeReorderState<ID>,
  event: TreeReorderEvent<ID>,
): Result<TreeReorderUpdate<ID>> {
  let owner = treeReorderOwners.get(state) as TreeReorderOwner<ID> | undefined;
  let canonicalState = state;
  if (owner === undefined) {
    const valid = tryCreateTreeReorderState(state.nodes);
    if (!valid.ok) return transitionFailure(valid);
    canonicalState = valid.value;
    owner = treeReorderOwners.get(canonicalState) as TreeReorderOwner<ID>;
  }
  const { tree, positions } = owner;
  const id = event.id;
  const parentID = event.parentID;
  const beforeID = event.beforeID ?? null;
  if (!tree.has(id)) return missingID(id);
  if (parentID !== null && !tree.has(parentID)) return missingID(parentID);
  if (parentID !== null && isWithinSubtree(tree, id, parentID)) {
    return fail(
      'transition-rejection',
      'reorder-tree-cycle',
      'A tree node cannot move below itself or one of its descendants.',
      { id, parentID },
    );
  }
  if (beforeID === id) return createMachineUpdate(state);
  if (
    beforeID !== null
    && (!tree.has(beforeID) || tree.parentOf(beforeID) !== parentID)
  ) {
    return fail(
      'transition-rejection',
      'reorder-tree-sibling-invalid',
      'beforeID must identify a sibling under the requested parent.',
      { beforeID, parentID },
    );
  }

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
