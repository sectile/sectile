import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Tree } from './structures/tree.js';
import { ok } from './internal/kernel/foundation.js';
import {
  applyCascadeChoiceEvent,
  getCascadeChoiceColumns,
  getCascadeChoiceValuePath,
  tryCreateCascadeChoiceState,
  type CascadeChoiceCommand,
  type CascadeChoiceErrorProfile,
  type CascadeChoiceEvent,
  type CascadeChoicePolicies,
  type CascadeChoiceState,
  type CascadeChoiceStateInput,
  type CascadeChoiceUpdate,
} from './internal/composites/cascade-choice.js';

export type CascadeListEvent<ID extends StableID = StableID> = CascadeChoiceEvent<ID>;
export type CascadeListCommand<ID extends StableID = StableID> = CascadeChoiceCommand<ID>;
export type CascadeListState<ID extends StableID = StableID> = CascadeChoiceState<ID>;
export type CascadeListStateInput<ID extends StableID = StableID> = CascadeChoiceStateInput<ID>;
export type CascadeListPolicies<ID extends StableID = StableID> = CascadeChoicePolicies<ID>;
export type CascadeListEligiblePredicate<ID extends StableID = StableID> = NonNullable<CascadeListPolicies<ID>['eligible']>;
export type CascadeListSelectablePredicate<ID extends StableID = StableID> = NonNullable<CascadeListPolicies<ID>['selectable']>;
export type CascadeListUpdate<ID extends StableID = StableID> = CascadeChoiceUpdate<ID>;

const errors: CascadeChoiceErrorProfile = Object.freeze({
  label: 'Cascade list',
  valueOutsideTree: 'cascade-list-value-outside-tree',
  highlightOutsideTree: 'cascade-list-highlight-outside-tree',
  pathOutsideTree: 'cascade-list-path-outside-tree',
  leafInPath: 'cascade-list-leaf-in-path',
  invalidPath: 'invalid-cascade-list-path',
  targetUnavailable: 'cascade-list-target-unavailable',
  targetDisabled: 'cascade-list-target-disabled',
  targetUnselectable: 'cascade-list-target-unselectable',
});

export function createCascadeListState<ID extends StableID>(
  tree: Tree<ID>,
  input: CascadeListStateInput<ID> = {},
): CascadeListState<ID> {
  return unwrap(tryCreateCascadeListState(tree, input));
}

export function tryCreateCascadeListState<ID extends StableID>(
  tree: Tree<ID>,
  input: CascadeListStateInput<ID> = {},
): Result<CascadeListState<ID>> {
  return tryCreateCascadeChoiceState(tree, input, errors);
}

export function getCascadeListColumns<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeListState<ID>,
): readonly (readonly ID[])[] {
  return getCascadeChoiceColumns(tree, state);
}

export function getCascadeListValuePath<ID extends StableID>(
  tree: Tree<ID>,
  value: ID | null,
): readonly ID[] {
  return getCascadeChoiceValuePath(tree, value);
}

export function applyCascadeListEvent<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeListState<ID>,
  event: CascadeListEvent<ID>,
  policies: CascadeListPolicies<ID> = {},
): Result<CascadeListUpdate<ID>> {
  const result = applyCascadeChoiceEvent(tree, state, event, policies, errors);
  if (!result.ok) return result;
  return ok(Object.freeze({ state: result.value.state, commands: result.value.commands }));
}
