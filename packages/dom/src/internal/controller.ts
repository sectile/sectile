import type { Result } from '@sectile/core';
import {
  applyRevisionedEvent,
  tryCreateRevisionSnapshot,
  mapRevisionCommands,
  rejectRevisionInput,
  type EventReducer,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';

export function applyControllerEvent<State, Event, Command, Effect>(
  current: RevisionSnapshot<State>,
  expectedRevision: number,
  event: Event,
  reducer: EventReducer<State, Event, Command>,
  reconcile: (previous: State, proposed: State) => Result<State>,
  notify: (previous: State, proposed: State) => void,
  toEffect: (command: Command) => Effect,
): RevisionResult<State, Effect> {
  const semantic = applyRevisionedEvent(current, expectedRevision, event, reducer);
  if (!semantic.ok) return semantic;
  const committed = reconcile(current.state, semantic.snapshot.state);
  if (!committed.ok) return rejectRevisionInput(current, committed.error);
  const snapshot = Object.freeze({
    revision: semantic.snapshot.revision,
    state: committed.value,
  });
  notify(current.state, semantic.snapshot.state);
  return mapRevisionCommands(
    Object.freeze({ ok: true as const, snapshot, commands: semantic.commands }),
    toEffect,
  );
}

export function synchronizeControllerState<State>(
  current: RevisionSnapshot<State>,
  state: Result<State>,
): Result<RevisionSnapshot<State>> {
  if (!state.ok) return state;
  if (current.revision === Number.MAX_SAFE_INTEGER) {
    return {
      ok: false,
      error: {
        class: 'resource-rejection',
        code: 'revision-ceiling-reached',
        message: 'Controller revision cannot advance beyond the safe-integer ceiling.',
        details: { revision: current.revision },
      },
    };
  }
  return tryCreateRevisionSnapshot(state.value, current.revision + 1);
}

export function sameControllerState<State>(left: State, right: State): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
