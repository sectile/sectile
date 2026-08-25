import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { unwrap } from './result.js';
import { tryCreateSequence } from './structures/sequence.js';
import { tryCreateTree, type TreeNodeInput } from './structures/tree.js';
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
  readonly ids: readonly ID[];
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
    ? ok(Object.freeze({ ids: Object.freeze([...sequence.value.ids]) }))
    : sequence;
}

export function applySequenceReorderEvent<ID extends StableID>(
  state: SequenceReorderState<ID>,
  event: SequenceReorderEvent<ID>,
): Result<SequenceReorderUpdate<ID>> {
  const valid = tryCreateSequenceReorderState(state.ids);
  if (!valid.ok) return transitionFailure(valid);
  const sourceIndex = state.ids.indexOf(event.id);
  if (sourceIndex < 0) return missingID(event.id);
  if ((event.type === 'move-before' || event.type === 'move-after') && event.id === event.targetID) {
    return createMachineUpdate(state);
  }
  const ids = state.ids.filter((id) => id !== event.id);
  let destination: number;
  if (event.type === 'move-to-start') destination = 0;
  else if (event.type === 'move-to-end') destination = ids.length;
  else {
    const targetIndex = ids.indexOf(event.targetID);
    if (targetIndex < 0) return missingID(event.targetID);
    destination = targetIndex + (event.type === 'move-after' ? 1 : 0);
  }
  ids.splice(destination, 0, event.id);
  if (ids.every((id, index) => id === state.ids[index])) return createMachineUpdate(state);
  const next = Object.freeze({ ids: Object.freeze(ids) });
  return createMachineUpdate(next, [{ type: 'sequence-order-changed', ids: next.ids }]);
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
  return ok(Object.freeze({ nodes: freezeNodes(nodes) }));
}

export function applyTreeReorderEvent<ID extends StableID>(
  state: TreeReorderState<ID>,
  event: TreeReorderEvent<ID>,
): Result<TreeReorderUpdate<ID>> {
  const tree = tryCreateTree(state.nodes);
  if (!tree.ok) return transitionFailure(tree);
  if (!tree.value.has(event.id)) return missingID(event.id);
  if (event.parentID !== null && !tree.value.has(event.parentID)) return missingID(event.parentID);
  if (
    event.parentID === event.id
    || (event.parentID !== null && tree.value.ancestorsOf(event.parentID)?.includes(event.id) === true)
  ) {
    return fail(
      'transition-rejection',
      'reorder-tree-cycle',
      'A tree node cannot move below itself or one of its descendants.',
      { id: event.id, parentID: event.parentID },
    );
  }
  const beforeID = event.beforeID ?? null;
  if (beforeID === event.id) return createMachineUpdate(state);
  if (
    beforeID !== null
    && (!tree.value.has(beforeID) || tree.value.parentOf(beforeID) !== event.parentID)
  ) {
    return fail(
      'transition-rejection',
      'reorder-tree-sibling-invalid',
      'beforeID must identify a sibling under the requested parent.',
      { beforeID, parentID: event.parentID },
    );
  }

  const moving = state.nodes.find((node) => node.id === event.id)!;
  const remaining = state.nodes.filter((node) => node.id !== event.id);
  let destination: number;
  if (beforeID !== null) {
    destination = remaining.findIndex((node) => node.id === beforeID);
  } else {
    const siblingIndices = remaining.flatMap((node, index) => (
      node.parentID === event.parentID ? [index] : []
    ));
    if (siblingIndices.length > 0) destination = siblingIndices.at(-1)! + 1;
    else if (event.parentID === null) destination = remaining.length;
    else destination = remaining.findIndex((node) => node.id === event.parentID) + 1;
  }
  const nodes = [...remaining];
  nodes.splice(destination, 0, Object.freeze({ id: moving.id, parentID: event.parentID }));
  const nextTree = tryCreateTree(nodes);
  if (!nextTree.ok) return transitionFailure(nextTree);
  if (sameNodes(state.nodes, nodes)) return createMachineUpdate(state);
  const next = Object.freeze({ nodes: freezeNodes(nodes) });
  return createMachineUpdate(next, [{ type: 'tree-order-changed', nodes: next.nodes }]);
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

function sameNodes<ID extends StableID>(
  left: readonly TreeNodeInput<ID>[],
  right: readonly TreeNodeInput<ID>[],
): boolean {
  return left.length === right.length && left.every((node, index) => (
    node.id === right[index]?.id && node.parentID === right[index]?.parentID
  ));
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}
