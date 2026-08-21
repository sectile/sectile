import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import {
  applyLinearChoiceEvent,
  createLinearChoiceState,
  type LinearChoiceCommand,
  type LinearChoiceEvent,
  type LinearChoicePolicies,
  type LinearChoiceState,
  type LinearChoiceStateInput,
  type LinearChoiceUpdate,
} from './internal/composites/linear-choice.js';

export type TabsActivationMode = 'manual' | 'automatic';
export type TabsEvent<ID extends StableID = StableID> = LinearChoiceEvent<ID>;
export type TabsCommand<ID extends StableID = StableID> = LinearChoiceCommand<ID>;
export type TabsState<ID extends StableID = StableID> = LinearChoiceState<ID>;
export type TabsStateInput<ID extends StableID = StableID> = LinearChoiceStateInput<ID>;
export type TabsUpdate<ID extends StableID = StableID> = LinearChoiceUpdate<ID>;

export interface TabsPolicies<ID extends StableID = StableID>
  extends Omit<LinearChoicePolicies<ID>, 'selectionFollowsFocus'> {
  readonly activation?: TabsActivationMode;
}

export function createTabsState<ID extends StableID>(
  domain: Sequence<ID>,
  input: TabsStateInput<ID> = {},
): Result<TabsState<ID>> {
  return createLinearChoiceState(domain, input);
}

export function applyTabsEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: TabsState<ID>,
  event: TabsEvent<ID>,
  policies: TabsPolicies<ID> = {},
): Result<TabsUpdate<ID>> {
  const activation = policies.activation ?? 'manual';
  if (activation !== 'manual' && activation !== 'automatic') {
    return {
      ok: false,
      error: {
        class: 'transition-rejection',
        code: 'invalid-tabs-activation',
        message: 'Tabs activation must be manual or automatic.',
        details: { activation },
      },
    };
  }
  return applyLinearChoiceEvent(domain, state, event, {
    ...policies,
    selectionFollowsFocus: activation === 'automatic',
  });
}
