import type { Tree } from '../../structures/tree.js';
import type { CoreErrorCode } from '../../error-code.js';
import type { Result, StableID } from '../../shared.js';
import { bindCanonicalState, fail, freezeArray, hasCanonicalState, ok } from '../kernel/foundation.js';

export type CascadeChoiceEvent<ID extends StableID = StableID> =
  | 'next' | 'previous' | 'first' | 'last'
  | 'right' | 'left' | 'select'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select'; readonly id: ID };

export type CascadeChoiceCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select-value'; readonly id: ID };

export interface CascadeChoiceState<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly highlighted: ID | null;
  readonly path: readonly ID[];
}

export interface CascadeChoiceStateInput<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly highlighted?: ID | null;
  readonly path?: readonly ID[];
}

export interface CascadeChoicePolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly selectable?: (id: ID, leaf: boolean) => boolean;
}

export interface CascadeChoiceUpdate<ID extends StableID = StableID> {
  readonly state: CascadeChoiceState<ID>;
  readonly commands: readonly CascadeChoiceCommand<ID>[];
}

export type CascadeChoiceActivity = 'none' | 'focus' | 'branch' | 'commit';

export interface CascadeChoiceTransition<ID extends StableID = StableID> extends CascadeChoiceUpdate<ID> {
  readonly activity: CascadeChoiceActivity;
}

export interface CascadeChoiceErrorProfile {
  readonly label: string;
  readonly valueOutsideTree: CoreErrorCode;
  readonly highlightOutsideTree: CoreErrorCode;
  readonly pathOutsideTree: CoreErrorCode;
  readonly leafInPath: CoreErrorCode;
  readonly invalidPath: CoreErrorCode;
  readonly targetUnavailable: CoreErrorCode;
  readonly targetDisabled: CoreErrorCode;
  readonly targetUnselectable: CoreErrorCode;
}

export function tryCreateCascadeChoiceState<ID extends StableID>(
  tree: Tree<ID>,
  input: CascadeChoiceStateInput<ID>,
  errors: CascadeChoiceErrorProfile,
): Result<CascadeChoiceState<ID>> {
  const value = input.value ?? null;
  const highlighted = input.highlighted ?? value;
  if (value !== null && !tree.has(value)) {
    return fail('construction', errors.valueOutsideTree, `${errors.label} value must exist in the tree.`, { value });
  }
  if (highlighted !== null && !tree.has(highlighted)) {
    return fail('construction', errors.highlightOutsideTree, `${errors.label} highlight must exist in the tree.`, { highlighted });
  }
  const inferredPath = value === null ? [] : ancestors(tree, value);
  const path = input.path === undefined ? inferredPath : [...input.path];
  const pathError = validatePath(tree, path, errors);
  if (pathError !== null) return pathError;
  return ok(choiceState(tree, { value, highlighted, path }));
}

export function getCascadeChoiceColumns<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeChoiceState<ID>,
): readonly (readonly ID[])[] {
  const columns: (readonly ID[])[] = [tree.roots.ids];
  for (const id of state.path) {
    const children = tree.childrenOf(id)?.ids ?? [];
    if (children.length > 0) columns.push(children);
  }
  return freezeArray(columns.map((column) => freezeArray(column)));
}

export function getCascadeChoiceValuePath<ID extends StableID>(
  tree: Tree<ID>,
  value: ID | null,
): readonly ID[] {
  return value === null
    ? freezeArray([])
    : freezeArray([...ancestors(tree, value), value]);
}

export function applyCascadeChoiceEvent<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeChoiceState<ID>,
  event: CascadeChoiceEvent<ID>,
  policies: CascadeChoicePolicies<ID>,
  errors: CascadeChoiceErrorProfile,
): Result<CascadeChoiceTransition<ID>> {
  if (!hasCanonicalState(tree, state)) {
    const validation = tryCreateCascadeChoiceState(tree, state, errors);
    if (!validation.ok) return { ok: false, error: { ...validation.error, class: 'transition-rejection' } };
  }
  if (typeof event === 'object') {
    if (!tree.has(event.id)) {
      return fail('transition-rejection', errors.targetUnavailable, `${errors.label} target must exist in the tree.`);
    }
    if (!isEligible(event.id, policies)) {
      return fail('transition-rejection', errors.targetDisabled, `${errors.label} target must be eligible.`);
    }
    return event.type === 'focus'
      ? focus(tree, state, event.id)
      : choose(tree, state, event.id, policies, errors);
  }
  if (event === 'left') {
    const parent = state.highlighted === null ? null : tree.parentOf(state.highlighted);
    if (parent === null) return transition(state);
    return focus(tree, choiceState(tree, state, { path: ancestors(tree, parent) }), parent);
  }
  if (event === 'right') {
    if (state.highlighted === null || tree.isLeaf(state.highlighted) !== false) return transition(state);
    const child = firstEligible(tree.childrenOf(state.highlighted)?.ids ?? [], policies);
    if (child === null) return transition(state);
    return focus(tree, choiceState(tree, state, { path: [...ancestors(tree, state.highlighted), state.highlighted] }), child);
  }
  if (event === 'select') {
    return state.highlighted === null
      ? transition(state)
      : choose(tree, state, state.highlighted, policies, errors);
  }
  const siblings = siblingsOf(tree, state.highlighted, state.path);
  const eligible = siblings.filter((id) => isEligible(id, policies));
  if (eligible.length === 0) return transition(state);
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

function focus<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeChoiceState<ID>,
  id: ID,
): Result<CascadeChoiceTransition<ID>> {
  if (id === state.highlighted) return transition(state, [], 'focus');
  return transition(choiceState(tree, state, { highlighted: id }), [{ type: 'focus', id }], 'focus');
}

function choose<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeChoiceState<ID>,
  id: ID,
  policies: CascadeChoicePolicies<ID>,
  errors: CascadeChoiceErrorProfile,
): Result<CascadeChoiceTransition<ID>> {
  const leaf = tree.isLeaf(id) === true;
  if ((policies.selectable?.(id, leaf) ?? leaf) === true) {
    const next = choiceState(tree, state, { value: id, highlighted: id, path: ancestors(tree, id) });
    return transition(next, [{ type: 'select-value', id }], 'commit');
  }
  if (leaf) {
    return fail('transition-rejection', errors.targetUnselectable, `${errors.label} policy rejected the target.`);
  }
  const child = firstEligible(tree.childrenOf(id)?.ids ?? [], policies);
  const next = choiceState(tree, state, {
    highlighted: child ?? id,
    path: [...ancestors(tree, id), id],
  });
  return transition(next, child === null ? [] : [{ type: 'focus', id: child }], 'branch');
}

function validatePath<ID extends StableID>(
  tree: Tree<ID>,
  path: readonly ID[],
  errors: CascadeChoiceErrorProfile,
): Result<never> | null {
  for (let index = 0; index < path.length; index += 1) {
    const id = path[index];
    if (id === undefined || !tree.has(id)) {
      return fail('construction', errors.pathOutsideTree, `Every ${errors.label.toLowerCase()} path item must exist in the tree.`);
    }
    if (tree.isLeaf(id) !== false) {
      return fail('construction', errors.leafInPath, `${errors.label} paths may contain only branches.`, { id });
    }
    const expectedParent = index === 0 ? null : path[index - 1];
    if (tree.parentOf(id) !== expectedParent) {
      return fail('construction', errors.invalidPath, `${errors.label} path must form a direct root-to-branch chain.`);
    }
  }
  return null;
}

function choiceState<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeChoiceState<ID>,
  patch: Partial<CascadeChoiceState<ID>> = {},
): CascadeChoiceState<ID> {
  return bindCanonicalState(tree, Object.freeze({
    value: patch.value === undefined ? state.value : patch.value,
    highlighted: patch.highlighted === undefined ? state.highlighted : patch.highlighted,
    path: freezeArray(patch.path ?? state.path),
  }));
}

function transition<ID extends StableID>(
  state: CascadeChoiceState<ID>,
  commands: readonly CascadeChoiceCommand<ID>[] = [],
  activity: CascadeChoiceActivity = 'none',
): Result<CascadeChoiceTransition<ID>> {
  return ok(Object.freeze({
    state,
    commands: freezeArray(commands.map((command) => Object.freeze({ ...command }))),
    activity,
  }));
}

function ancestors<ID extends StableID>(tree: Tree<ID>, id: ID): readonly ID[] {
  return freezeArray([...(tree.ancestorsOf(id) ?? [])].reverse());
}

function siblingsOf<ID extends StableID>(
  tree: Tree<ID>,
  highlighted: ID | null,
  path: readonly ID[],
): readonly ID[] {
  if (highlighted !== null) {
    const parent = tree.parentOf(highlighted);
    return parent === null ? tree.roots.ids : tree.childrenOf(parent)?.ids ?? [];
  }
  const parent = path[path.length - 1];
  return parent === undefined ? tree.roots.ids : tree.childrenOf(parent)?.ids ?? [];
}

function firstEligible<ID extends StableID>(
  ids: readonly ID[],
  policies: CascadeChoicePolicies<ID>,
): ID | null {
  return ids.find((id) => isEligible(id, policies)) ?? null;
}

function isEligible<ID extends StableID>(id: ID, policies: CascadeChoicePolicies<ID>): boolean {
  return policies.eligible?.(id) ?? true;
}
