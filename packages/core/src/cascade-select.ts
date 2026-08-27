import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Tree } from './structures/tree.js';
import { fail, freezeArray, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applyCascadeChoiceEvent,
  getCascadeChoiceColumns,
  getCascadeChoiceValuePath,
  tryCreateCascadeChoiceState,
  type CascadeChoiceErrorProfile,
  type CascadeChoiceEvent,
  type CascadeChoiceState,
} from './internal/composites/cascade-choice.js';

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

export type CascadeSelectEligiblePredicate<ID extends StableID = StableID> = NonNullable<CascadeSelectPolicies<ID>['eligible']>;
export type CascadeSelectSelectablePredicate<ID extends StableID = StableID> = NonNullable<CascadeSelectPolicies<ID>['selectable']>;

export interface CascadeSelectUpdate<ID extends StableID = StableID> {
  readonly state: CascadeSelectState<ID>;
  readonly commands: readonly CascadeSelectCommand<ID>[];
}

const errors: CascadeChoiceErrorProfile = Object.freeze({
  label: 'Cascade select',
  valueOutsideTree: 'cascade-select-value-outside-tree',
  highlightOutsideTree: 'cascade-select-highlight-outside-tree',
  pathOutsideTree: 'cascade-select-path-outside-tree',
  leafInPath: 'cascade-select-leaf-in-path',
  invalidPath: 'invalid-cascade-select-path',
  targetUnavailable: 'cascade-select-target-unavailable',
  targetDisabled: 'cascade-select-target-disabled',
  targetUnselectable: 'cascade-select-target-unselectable',
});

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
  const choice = tryCreateCascadeChoiceState(tree, input, errors);
  if (!choice.ok) return choice;
  return ok(createSelectState(input.open ?? false, choice.value));
}

export function getCascadeSelectColumns<ID extends StableID>(
  tree: Tree<ID>,
  state: CascadeSelectState<ID>,
): readonly (readonly ID[])[] {
  return getCascadeChoiceColumns(tree, state);
}

export function getCascadeSelectValuePath<ID extends StableID>(
  tree: Tree<ID>,
  value: ID | null,
): readonly ID[] {
  return getCascadeChoiceValuePath(tree, value);
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
    return createMachineUpdate(open === state.open ? state : createSelectState(open, state));
  }
  const result = applyCascadeChoiceEvent(
    tree,
    state,
    event as CascadeChoiceEvent<ID>,
    policies,
    errors,
  );
  if (!result.ok) return result;
  const { activity, state: choice, commands: choiceCommands } = result.value;
  const open = activity === 'commit'
    ? false
    : activity === 'focus' || activity === 'branch'
      ? true
      : state.open;
  const commands: CascadeSelectCommand<ID>[] = [...choiceCommands];
  if (activity === 'focus' && choiceCommands.length === 0 && !state.open && choice.highlighted !== null) {
    commands.push({ type: 'focus', id: choice.highlighted });
  }
  if (activity === 'commit') commands.push({ type: 'close-popup' });
  const next = sameChoiceState(state, choice) && open === state.open
    ? state
    : createSelectState(open, choice);
  return createMachineUpdate(next, commands);
}

function createSelectState<ID extends StableID>(
  open: boolean,
  choice: CascadeChoiceState<ID>,
): CascadeSelectState<ID> {
  return Object.freeze({
    open,
    value: choice.value,
    highlighted: choice.highlighted,
    path: freezeArray(choice.path),
  });
}

function sameChoiceState<ID extends StableID>(
  state: CascadeSelectState<ID>,
  choice: CascadeChoiceState<ID>,
): boolean {
  return state.value === choice.value
    && state.highlighted === choice.highlighted
    && state.path.length === choice.path.length
    && state.path.every((id, index) => id === choice.path[index]);
}
