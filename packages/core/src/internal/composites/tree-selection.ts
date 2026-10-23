import { unwrap } from '../../result.js';
import type { Result, StableID } from '../../shared.js';
import type { CheckedValue as CheckboxValue } from '../state/checked.js';
import { createSelectionState, isCanonicalSelectionState, type SelectionState } from '../state/selection.js';
import { tryCreateSequence, type Sequence } from '../../structures/sequence.js';
import type { Tree } from '../../structures/tree.js';
import { bindCanonicalState, hasCanonicalState, fail, ok, validateSafeCeiling, validateStableID } from '../kernel/foundation.js';

export interface TreeSelectionOptions<ID extends StableID = StableID> {
  /** Terminal-leaf values; disabled selected leaves remain preserved. */
  readonly selected?: readonly ID[];
  readonly disabled?: readonly ID[];
  /** Defaults to subtree. Self disables only the named node's action. */
  readonly disabledPropagation?: 'self' | 'subtree';
}
export interface TreeSelectionUpdate<ID extends StableID = StableID> {
  readonly selected: readonly ID[];
  /** Changed checked values; order is unspecified. */
  readonly changed: readonly ID[];
}
/** Live owner-local projection. Previously returned selected arrays are immutable. */
export interface TreeSelection<ID extends StableID = StableID> {
  readonly size: number;
  readonly selected: readonly ID[];
  /** Parents aggregate eligible leaves; a disabled leaf keeps its own value. */
  getChecked(id: ID): CheckboxValue | null;
  isDisabled(id: ID): boolean | null;
  /** Admit external leaf values without changing this live projection. */
  normalize(selected: readonly ID[]): Result<readonly ID[]>;
  /** Accept this model's canonical checked selection without copying its values. */
  accept(selection: SelectionState<ID>): Result<TreeSelectionUpdate<ID>>;
  /** Accept controlled leaf values atomically; old returned arrays stay unchanged. */
  replace(selected: readonly ID[]): Result<TreeSelectionUpdate<ID>>;
  /** Propose a subtree change without accepting it into this projection. */
  propose(id: ID, checked: boolean): Result<readonly ID[]>;
}
interface Node<ID extends StableID> {
  readonly id: ID; readonly parent: ID | null; readonly start: number; readonly end: number;
  readonly depth: number; readonly leaf: boolean; readonly blocked: boolean;
  eligible: number;
}
const empty: readonly never[] = /* @__PURE__ */ Object.freeze([]);

export function createTreeSelection<ID extends StableID>(tree: Tree<ID>, options: TreeSelectionOptions<ID> = {}): TreeSelection<ID> {
  return unwrap(tryCreateTreeSelection(tree, options));
}
export function tryCreateTreeSelection<ID extends StableID>(tree: Tree<ID>, options: TreeSelectionOptions<ID> = {}): Result<TreeSelection<ID>> {
  if (!tree || typeof tree.preorder !== 'function' || !options || typeof options !== 'object') {
    return fail('construction', 'invalid-boundary', 'Tree selection requires a tree and options.');
  }
  const { selected = empty, disabled = empty, disabledPropagation: propagation = 'subtree' } = options;
  if (!Array.isArray(selected) || !Array.isArray(disabled) || propagation !== 'self' && propagation !== 'subtree') {
    return fail('construction', 'invalid-boundary', 'Tree selection requires a tree, leaf arrays and a disabled propagation policy.');
  }
  const order = tree.preorder(), size = order.size, ceiling = validateSafeCeiling(order.maxItems, 'maxItems');
  if (ceiling) return { ok: false, error: ceiling };
  if (!Number.isSafeInteger(size) || size < 0 || size > order.maxItems || size !== tree.size) {
    return fail('construction', 'invalid-boundary', 'Tree selection requires a bounded preorder domain.');
  }
  const disabledSize = disabled.length, selectedSize = selected.length;
  if (disabledSize > order.maxItems || selectedSize > order.maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Tree selection input exceeds the tree domain ceiling.');
  }
  const unavailable = new Set<ID>();
  for (let index = 0; index < disabledSize; index++) {
    const id = disabled[index]!;
    if (!order.contains(id)) return fail('construction', 'tree-selection-disabled-outside-tree', 'Disabled identities must belong to the tree.');
    unavailable.add(id);
  }
  const requested = snapshotIDs(selected, selectedSize);
  const nodes = new Map<ID, Node<ID>>(), stack: Node<ID>[] = [], leaves: ID[] = [];
  for (let index = 0; index < size; index++) {
    const id = order.at(index), error = validateStableID(id, order.maxIDCodeUnits);
    if (error) return { ok: false, error };
    const value = id as ID, interval = tree.subtreeIntervalOf(value), parent = tree.parentOf(value);
    while (stack.length && stack[stack.length - 1]!.end <= index) stack.pop();
    const ancestor = stack[stack.length - 1];
    if (nodes.has(value) || !interval || interval.start !== index || !Number.isSafeInteger(interval.endExclusive)
      || interval.endExclusive <= index || interval.endExclusive > (ancestor?.end ?? size) || parent !== (ancestor?.id ?? null)) {
      return fail('construction', 'invalid-boundary', 'Tree selection requires coherent parent and subtree facts.');
    }
    const leaf = interval.endExclusive === index + 1;
    const blocked = unavailable.has(value) || propagation === 'subtree' && ancestor?.blocked === true;
    const node: Node<ID> = { id: value, parent, start: index, end: interval.endExclusive, depth: (ancestor?.depth ?? 0) + 1,
      leaf, blocked, eligible: leaf && !blocked ? 1 : 0 };
    nodes.set(value, node); stack.push(node); if (leaf) leaves.push(value);
  }
  for (let index = size - 1; index >= 0; index--) {
    const node = nodes.get(order.at(index)!)!;
    if (node.parent !== null) nodes.get(node.parent)!.eligible += node.eligible;
    Object.freeze(node);
  }
  const domain = tryCreateSequence(leaves, { maxItems: order.maxItems, maxIDCodeUnits: order.maxIDCodeUnits });
  if (!domain.ok) return domain;
  const selection = createSelectionState(domain.value, 'multiple', { selected: requested });
  if (!selection.ok) return selection;
  return ok(bindCanonicalState(tree, new TreeSelectionProjection(order, domain.value, nodes, selection.value)));
}

/** Internal provenance and proposal ports for the TreeView transition owner. */
export function ownsTreeSelection<ID extends StableID>(tree: Tree<ID>, selection: TreeSelection<ID>): boolean {
  return selection instanceof TreeSelectionProjection && hasCanonicalState(tree, selection);
}
export function normalizeTreeSelectionState<ID extends StableID>(
  tree: Tree<ID>, selection: TreeSelection<ID>, input: { readonly selected?: readonly ID[] },
): Result<SelectionState<ID>> {
  if (!(selection instanceof TreeSelectionProjection) || !hasCanonicalState(tree, selection)) {
    return fail('construction', 'tree-selection-owner-mismatch', 'Checked selection must belong to the same tree.');
  }
  return selection.normalizeState(input.selected ?? selection.selected);
}
export function proposeTreeSelectionToggle<ID extends StableID>(
  tree: Tree<ID>, selection: TreeSelection<ID>, accepted: readonly ID[], id: ID,
): Result<SelectionState<ID>> {
  if (!(selection instanceof TreeSelectionProjection) || !hasCanonicalState(tree, selection)) {
    return fail('transition-rejection', 'tree-selection-owner-mismatch', 'Checked selection must belong to the same tree.');
  }
  const before = selection.selected;
  if (before.length !== accepted.length || before.some((value, index) => value !== accepted[index])) {
    return fail('transition-rejection', 'tree-selection-stale', 'Checked selection must match the accepted TreeView values.');
  }
  const result = selection.proposeState(id, selection.getChecked(id) !== true);
  return selection.selected === before ? result
    : fail('transition-rejection', 'tree-selection-stale', 'Checked selection changed while proposing a subtree.');
}

class TreeSelectionProjection<ID extends StableID> implements TreeSelection<ID> {
  public readonly size: number;
  readonly #order: Sequence<ID>;
  readonly #leaves: Sequence<ID>;
  readonly #nodes: ReadonlyMap<ID, Node<ID>>;
  #selection: SelectionState<ID>;
  #counts: Map<ID, number>;
  #replacing = false;
  public constructor(order: Sequence<ID>, leaves: Sequence<ID>, nodes: ReadonlyMap<ID, Node<ID>>, selection: SelectionState<ID>) {
    this.size = order.size; this.#order = order; this.#leaves = leaves; this.#nodes = nodes; this.#selection = selection;
    this.#counts = this.#fold(selection); Object.freeze(this);
  }
  public get selected(): readonly ID[] { return this.#selection.selected; }
  public getChecked(id: ID): CheckboxValue | null {
    const node = this.#nodes.get(id); return node ? this.#value(node, this.#selection, this.#counts) : null;
  }
  public isDisabled(id: ID): boolean | null {
    const node = this.#nodes.get(id); return node ? node.blocked || node.eligible === 0 : null;
  }
  public propose(id: ID, checked: boolean): Result<readonly ID[]> {
    const result = this.proposeState(id, checked);
    return result.ok ? ok(result.value.selected) : result;
  }
  public proposeState(id: ID, checked: boolean): Result<SelectionState<ID>> {
    const node = this.#nodes.get(id);
    if (!node || typeof checked !== 'boolean') return fail('transition-rejection', 'tree-selection-target-outside-tree', 'The checked target must belong to the tree and use a boolean value.');
    if (node.blocked || node.eligible === 0) return fail('transition-rejection', 'tree-selection-target-disabled', 'The checked target has no eligible action.');
    const selected = new Set(this.#selection.selected); let changed = false;
    for (let index = node.start; index < node.end; index++) {
      const child = this.#nodes.get(this.#order.at(index)!)!;
      if (!child.leaf || child.blocked || selected.has(child.id) === checked) continue;
      changed = true; if (checked) selected.add(child.id); else selected.delete(child.id);
    }
    if (!changed) return ok(this.#selection);
    return createSelectionState(this.#leaves, 'multiple', { selected: [...selected] });
  }
  public normalize(selected: readonly ID[]): Result<readonly ID[]> {
    const admitted = this.normalizeState(selected);
    return admitted.ok ? ok(admitted.value.selected) : admitted;
  }
  public normalizeState(selected: readonly ID[]): Result<SelectionState<ID>> {
    if (this.#replacing) return fail('transition-rejection', 'tree-selection-reentrant', 'Tree selection is already admitting a controlled value.');
    this.#replacing = true;
    try {
      return this.#admit(selected);
    } finally { this.#replacing = false; }
  }
  #admit(selected: readonly ID[]): Result<SelectionState<ID>> {
    if (selected === this.#selection.selected) return ok(this.#selection);
    if (!Array.isArray(selected)) return fail('transition-rejection', 'invalid-boundary', 'Tree selection requires an array of leaf identities.');
    const size = selected.length;
    if (size > this.#leaves.maxItems) return fail('resource-rejection', 'item-ceiling-exceeded', 'Tree selection input exceeds the tree domain ceiling.');
    const admitted = createSelectionState(this.#leaves, 'multiple', { selected: snapshotIDs(selected, size) });
    if (!admitted.ok) return { ok: false, error: { ...admitted.error, class: 'transition-rejection' } };
    const previous = this.#selection.selected, next = admitted.value.selected;
    return ok(previous.length === next.length && previous.every((id, index) => id === next[index]) ? this.#selection : admitted.value);
  }
  public accept(selection: SelectionState<ID>): Result<TreeSelectionUpdate<ID>> {
    if (this.#replacing) return fail('transition-rejection', 'tree-selection-reentrant', 'Tree selection is already admitting a controlled value.');
    this.#replacing = true;
    try {
      if (!isCanonicalSelectionState(selection, this.#leaves) || selection.anchor !== null) {
        return fail('transition-rejection', 'tree-selection-owner-mismatch', 'Accepted selection must belong to this checked model without a range anchor.');
      }
      return this.#publish(selection);
    } finally { this.#replacing = false; }
  }
  public replace(selected: readonly ID[]): Result<TreeSelectionUpdate<ID>> {
    if (this.#replacing) return fail('transition-rejection', 'tree-selection-reentrant', 'Tree selection is already admitting a controlled value.');
    this.#replacing = true;
    try {
      const admitted = this.#admit(selected);
      if (!admitted.ok) return admitted;
      return this.#publish(admitted.value);
    } finally { this.#replacing = false; }
  }
  #publish(next: SelectionState<ID>): Result<TreeSelectionUpdate<ID>> {
    const previous = this.#selection;
    if (next === previous) return ok(Object.freeze({ selected: this.selected, changed: empty }));
    const changed = [...previous.selected.filter(id => !next.has(id)), ...next.selected.filter(id => !previous.has(id))];
    if (!changed.length) return ok(Object.freeze({ selected: this.selected, changed: empty }));
    let work = 0;
    for (const id of changed) { const node = this.#nodes.get(id)!; if (!node.blocked) work += node.depth; if (work >= this.size) break; }
    const affected: ID[] = [];
    if (work >= this.size) {
      const counts = this.#fold(next);
      for (let index = 0; index < this.size; index++) {
        const node = this.#nodes.get(this.#order.at(index)!)!;
        if (this.#value(node, previous, this.#counts) !== this.#value(node, next, counts)) affected.push(node.id);
      }
      this.#counts = counts;
    } else {
      const before = new Map<ID, CheckboxValue>();
      for (const id of changed) {
        const leaf = this.#nodes.get(id)!;
        before.set(id, this.#value(leaf, previous, this.#counts));
        if (leaf.blocked) continue;
        const delta = next.has(id) ? 1 : -1;
        for (let node: Node<ID> | undefined = leaf; node; node = node.parent === null ? undefined : this.#nodes.get(node.parent)) {
          if (!before.has(node.id)) before.set(node.id, this.#value(node, previous, this.#counts));
          this.#counts.set(node.id, (this.#counts.get(node.id) ?? 0) + delta);
        }
      }
      for (const [id, value] of before) if (value !== this.#value(this.#nodes.get(id)!, next, this.#counts)) affected.push(id);
    }
    this.#selection = next;
    return ok(Object.freeze({ selected: this.selected, changed: Object.freeze(affected) }));
  }
  #value(node: Node<ID>, selection: SelectionState<ID>, counts: ReadonlyMap<ID, number>): CheckboxValue {
    if (node.leaf) return selection.has(node.id);
    const count = counts.get(node.id) ?? 0;
    return count === 0 ? false : count === node.eligible ? true : 'mixed';
  }
  #fold(selection: SelectionState<ID>): Map<ID, number> {
    const counts = new Map<ID, number>();
    for (let index = this.size - 1; index >= 0; index--) {
      const node = this.#nodes.get(this.#order.at(index)!)!;
      const count = node.leaf ? (!node.blocked && selection.has(node.id) ? 1 : 0) : counts.get(node.id) ?? 0;
      counts.set(node.id, count);
      if (node.parent !== null) counts.set(node.parent, (counts.get(node.parent) ?? 0) + count);
    }
    return counts;
  }
}

// A boundary array's iterator is not an authority to exceed its admitted length.
function snapshotIDs<ID extends StableID>(values: readonly ID[], size: number): ID[] {
  const result: ID[] = [];
  for (let index = 0; index < size; index++) result.push(values[index]!);
  return result;
}
