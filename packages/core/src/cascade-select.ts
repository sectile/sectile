import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Tree } from './structures/tree.js';
import { fail, freezeArray, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';

export type CascadeSelectEvent<ID extends StableID = StableID> =
  | 'open' | 'close' | 'toggle' | 'next' | 'previous' | 'first' | 'last'
  | 'right' | 'left' | 'select'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select'; readonly id: ID };

export type CascadeSelectCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select-value'; readonly id: ID }
  | { readonly type: 'close-popup' };

export interface CascadeSelectState<ID extends StableID = StableID> {
  readonly open: boolean;
  readonly value: ID | null;
  readonly highlighted: ID | null;
  /** Open branch IDs from the root to the deepest visible column. */
  readonly path: readonly ID[];
}

export interface CascadeSelectStateInput<ID extends StableID = StableID> {
  readonly open?: boolean;
  readonly value?: ID | null;
  readonly highlighted?: ID | null;
  readonly path?: readonly ID[];
}

export interface CascadeSelectPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  /** Defaults to leaf-only selection. */
  readonly selectable?: (id: ID, leaf: boolean) => boolean;
}

export interface CascadeSelectUpdate<ID extends StableID = StableID> {
  readonly state: CascadeSelectState<ID>;
  readonly commands: readonly CascadeSelectCommand<ID>[];
}

export function createCascadeSelectState<ID extends StableID>(
  tree: Tree<ID>,
  input: CascadeSelectStateInput<ID> = {},
): CascadeSelectState<ID> {
  return unwrap(tryCreateCascadeSelectState(tree, input));
}

export function tryCreateCascadeSelectState<ID extends StableID>(
  tree: Tree<ID>,
  input: CascadeSelectStateInput<ID> = {},
): Result<CascadeSelectState<ID>> {
  if (input.open !== undefined && typeof input.open !== 'boolean') {
    return fail('construction', 'invalid-cascade-select-open', 'Cascade select open state must be boolean.');
  }
  const value = input.value ?? null;
  const highlighted = input.highlighted ?? value;
  if (value !== null && !tree.has(value)) {
    return fail('construction', 'cascade-select-value-outside-tree', 'Cascade select value must exist in the tree.', { value });
  }
  if (highlighted !== null && !tree.has(highlighted)) {
    return fail('construction', 'cascade-select-highlight-outside-tree', 'Cascade select highlight must exist in the tree.', { highlighted });
  }
  const inferredPath = value === null ? [] : [...(tree.ancestorsOf(value) ?? [])].reverse();
  const path = input.path === undefined ? inferredPath : [...input.path];
  const pathError = validatePath(tree, path);
  if (pathError !== null) return pathError;
  return ok(Object.freeze({ open: input.open ?? false, value, highlighted, path: freezeArray(path) }));
}

export function getCascadeSelectColumns<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeSelectState<ID>,
): readonly (readonly ID[])[] {
  const columns: (readonly ID[])[] = [tree.roots.ids];
  for (const id of state.path) {
    const children = tree.childrenOf(id)?.ids ?? [];
    if (children.length > 0) columns.push(children);
  }
  return freezeArray(columns.map((column) => freezeArray(column)));
}

export function getCascadeSelectValuePath<ID extends StableID>(
  tree: Tree<ID>,
  value: ID | null,
): readonly ID[] {
  return value === null
    ? freezeArray([])
    : freezeArray([...(tree.ancestorsOf(value) ?? [])].reverse().concat(value));
}

export function applyCascadeSelectEvent<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeSelectState<ID>,
  event: CascadeSelectEvent<ID>,
  policies: CascadeSelectPolicies<ID> = {},
): Result<CascadeSelectUpdate<ID>> {
  const valid = tryCreateCascadeSelectState(tree, state);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (event === 'open' || event === 'close' || event === 'toggle') {
    const open = event === 'toggle' ? !state.open : event === 'open';
    return createMachineUpdate(open === state.open ? state : cascadeState(state, { open }));
  }
  if (typeof event === 'object') {
    if (!tree.has(event.id)) return fail('transition-rejection', 'cascade-select-target-unavailable', 'Cascade select target must exist in the tree.');
    if (!isEligible(event.id, policies)) return fail('transition-rejection', 'cascade-select-target-disabled', 'Cascade select target must be eligible.');
    return event.type === 'focus'
      ? focus(tree, state, event.id)
      : choose(tree, state, event.id, policies);
  }
  if (event === 'left') {
    const parent = state.highlighted === null ? null : tree.parentOf(state.highlighted);
    if (parent === null) return createMachineUpdate(state);
    return focus(tree, cascadeState(state, { path: ancestors(tree, parent) }), parent);
  }
  if (event === 'right') {
    if (state.highlighted === null || tree.isLeaf(state.highlighted) !== false) return createMachineUpdate(state);
    const child = firstEligible(tree.childrenOf(state.highlighted)?.ids ?? [], policies);
    if (child === null) return createMachineUpdate(state);
    return focus(tree, cascadeState(state, { path: [...ancestors(tree, state.highlighted), state.highlighted] }), child);
  }
  if (event === 'select') {
    return state.highlighted === null ? createMachineUpdate(state) : choose(tree, state, state.highlighted, policies);
  }
  const siblings = siblingsOf(tree, state.highlighted, state.path);
  const eligible = siblings.filter((id) => isEligible(id, policies));
  if (eligible.length === 0) return createMachineUpdate(state);
  const currentIndex = state.highlighted === null ? -1 : eligible.indexOf(state.highlighted);
  let next: ID;
  if (event === 'first') next = eligible[0] as ID;
  else if (event === 'last') next = eligible[eligible.length - 1] as ID;
  else {
    const delta = event === 'next' ? 1 : -1;
    const fallback = delta > 0 ? 0 : eligible.length - 1;
    const index = currentIndex < 0 ? fallback : Math.min(eligible.length - 1, Math.max(0, currentIndex + delta));
    next = eligible[index] as ID;
  }
  return focus(tree, state, next);
}

function focus<ID extends StableID>(tree: Tree<ID>, state: CascadeSelectState<ID>, id: ID): Result<CascadeSelectUpdate<ID>> {
  if (id === state.highlighted && state.open) return createMachineUpdate(state);
  return createMachineUpdate(cascadeState(state, { open: true, highlighted: id }), [{ type: 'focus', id }]);
}

function choose<ID extends StableID>(tree: Tree<ID>, state: CascadeSelectState<ID>, id: ID, policies: CascadeSelectPolicies<ID>): Result<CascadeSelectUpdate<ID>> {
  const leaf = tree.isLeaf(id) === true;
  if ((policies.selectable?.(id, leaf) ?? leaf) === true) {
    const next = cascadeState(state, { open: false, value: id, highlighted: id, path: ancestors(tree, id) });
    return createMachineUpdate(next, [{ type: 'select-value', id }, { type: 'close-popup' }]);
  }
  if (leaf) return fail('transition-rejection', 'cascade-select-target-unselectable', 'Cascade select policy rejected the target.');
  const child = firstEligible(tree.childrenOf(id)?.ids ?? [], policies);
  const path = [...ancestors(tree, id), id];
  const next = cascadeState(state, { open: true, highlighted: child ?? id, path });
  return createMachineUpdate(next, child === null ? [] : [{ type: 'focus', id: child }]);
}

function validatePath<ID extends StableID>(tree: Tree<ID>, path: readonly ID[]): Result<never> | null {
  for (let index = 0; index < path.length; index += 1) {
    const id = path[index];
    if (id === undefined || !tree.has(id)) return fail('construction', 'cascade-select-path-outside-tree', 'Every cascade select path item must exist in the tree.');
    if (tree.isLeaf(id) !== false) return fail('construction', 'cascade-select-leaf-in-path', 'Cascade select paths may contain only branches.', { id });
    const expectedParent = index === 0 ? null : path[index - 1];
    if (tree.parentOf(id) !== expectedParent) return fail('construction', 'invalid-cascade-select-path', 'Cascade select path must form a direct root-to-branch chain.');
  }
  return null;
}

function cascadeState<ID extends StableID>(state: CascadeSelectState<ID>, patch: Partial<CascadeSelectState<ID>>): CascadeSelectState<ID> {
  return Object.freeze({
    open: patch.open ?? state.open,
    value: patch.value === undefined ? state.value : patch.value,
    highlighted: patch.highlighted === undefined ? state.highlighted : patch.highlighted,
    path: freezeArray(patch.path ?? state.path),
  });
}

function ancestors<ID extends StableID>(tree: Tree<ID>, id: ID): readonly ID[] {
  return freezeArray([...(tree.ancestorsOf(id) ?? [])].reverse());
}

function siblingsOf<ID extends StableID>(tree: Tree<ID>, highlighted: ID | null, path: readonly ID[]): readonly ID[] {
  if (highlighted !== null) {
    const parent = tree.parentOf(highlighted);
    return parent === null ? tree.roots.ids : tree.childrenOf(parent)?.ids ?? [];
  }
  const parent = path[path.length - 1];
  return parent === undefined ? tree.roots.ids : tree.childrenOf(parent)?.ids ?? [];
}

function firstEligible<ID extends StableID>(ids: readonly ID[], policies: CascadeSelectPolicies<ID>): ID | null {
  return ids.find((id) => isEligible(id, policies)) ?? null;
}

function isEligible<ID extends StableID>(id: ID, policies: CascadeSelectPolicies<ID>): boolean {
  return policies.eligible?.(id) ?? true;
}
