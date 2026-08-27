import type { Result, StableID } from '@sectile/core';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import type { TerminalKeyboardInput } from '../keyboard.js';

export type TerminalCascadeChoiceEvent<ID extends StableID = StableID> =
  | 'next' | 'previous' | 'first' | 'last'
  | 'right' | 'left' | 'select'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select'; readonly id: ID };

export interface TerminalCascadeChoicePolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly selectable?: (id: ID, leaf: boolean) => boolean;
}

export interface TerminalCascadeChoiceDomain<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  readonly disabledItems: ReadonlySet<ID>;
}

export function tryCreateTerminalCascadeChoiceDomain<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
  disabledItems: readonly ID[] | undefined,
  label: 'cascade list' | 'cascade select',
): Result<TerminalCascadeChoiceDomain<ID>> {
  const tree = tryCreateTree(nodes);
  if (!tree.ok) return tree;
  const disabled = new Set(disabledItems ?? []);
  for (const id of disabled) {
    if (!tree.value.has(id)) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'disabled-item-outside-domain',
          message: `Every disabled ${label} item must exist in the tree.`,
          details: { id },
        },
      };
    }
  }
  return { ok: true, value: Object.freeze({ tree: tree.value, disabledItems: disabled }) };
}

export function withDisabledCascadeChoicePolicies<ID extends StableID, Policies extends TerminalCascadeChoicePolicies<ID>>(
  policies: Policies | undefined,
  disabledItems: ReadonlySet<ID>,
): Policies {
  const suppliedEligibility = policies?.eligible;
  return {
    ...policies,
    eligible: (id: ID) => !disabledItems.has(id) && (suppliedEligibility?.(id) ?? true),
  } as Policies;
}

export function toTerminalCascadeChoiceEvent<ID extends StableID>(
  input: TerminalKeyboardInput,
): TerminalCascadeChoiceEvent<ID> | null {
  if (input.key === 'down') return 'next';
  if (input.key === 'up') return 'previous';
  if (input.key === 'right') return 'right';
  if (input.key === 'left') return 'left';
  if (input.key === 'home') return 'first';
  if (input.key === 'end') return 'last';
  if (input.key === 'enter' || input.key === 'space') return 'select';
  return null;
}
