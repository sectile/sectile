import type { Result } from '@sectile/core';
import {
  tryCreateInteractionState,
  requireInteraction,
  type InteractionStateInput,
} from '@sectile/core/interaction';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type EventReducer,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import { applyControllerEvent, synchronizeControllerState } from './controller.js';

export interface SemanticController<State, Event, Effect> {
  getSnapshot(): RevisionSnapshot<State>;
  replace(state: Result<State>): Result<RevisionSnapshot<State>>;
  handle(event: Event, expectedRevision?: number): RevisionResult<State, Effect>;
  reject(code: string, message: string, details?: Readonly<Record<string, unknown>>): RevisionResult<State, Effect>;
}

export interface SemanticControllerOptions<State, Event, Command, Effect> {
  readonly initial: Result<State>;
  readonly reducer: EventReducer<State, Event, Command>;
  readonly reconcile?: (previous: State, proposed: State) => Result<State>;
  readonly notify?: (previous: State, proposed: State) => void;
  readonly toEffect: (command: Command) => Effect;
  readonly interaction?: InteractionStateInput | undefined;
  readonly interactionIntent?: (event: Event) => 'navigate' | 'mutate';
}

export function createSemanticController<State, Event, Command, Effect>(
  options: SemanticControllerOptions<State, Event, Command, Effect>,
): Result<SemanticController<State, Event, Effect>> {
  if (!options.initial.ok) return options.initial;
  const interaction = tryCreateInteractionState(options.interaction);
  if (!interaction.ok) return interaction;
  const snapshot = tryCreateRevisionSnapshot(options.initial.value);
  if (!snapshot.ok) return snapshot;
  let current = snapshot.value;
  return {
    ok: true,
    value: Object.freeze({
      getSnapshot: (): RevisionSnapshot<State> => current,
      replace: (state: Result<State>): Result<RevisionSnapshot<State>> => {
        const next = synchronizeControllerState(current, state);
        if (next.ok) current = next.value;
        return next;
      },
      handle: (
        event: Event,
        expectedRevision = current.revision,
      ): RevisionResult<State, Effect> => {
        const permitted = requireInteraction(
          interaction.value,
          options.interactionIntent?.(event) ?? 'mutate',
        );
        if (!permitted.ok) return rejectRevisionInput(current, permitted.error);
        const result = applyControllerEvent(
          current,
          expectedRevision,
          event,
          options.reducer,
          options.reconcile ?? ((_previous, proposed) => ({ ok: true, value: proposed })),
          options.notify ?? (() => undefined),
          options.toEffect,
        );
        if (result.ok) current = result.snapshot;
        return result;
      },
      reject: (
        code: string,
        message: string,
        details?: Readonly<Record<string, unknown>>,
      ): RevisionResult<State, Effect> => rejectRevisionInput(current, {
        class: 'transition-rejection',
        code,
        message,
        ...(details === undefined ? {} : { details }),
      }),
    }),
  };
}
