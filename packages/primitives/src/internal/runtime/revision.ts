import type { Result, SectileError } from '../../shared.js';
import { fail, freezeArray, ok } from '../kernel/foundation.js';
import type { EventReducer } from '../kernel/machine.js';

export type { EventReducer, MachineUpdate } from '../kernel/machine.js';

export interface RevisionSnapshot<State> {
  readonly revision: number;
  readonly state: State;
}

export type RevisionResult<State, Command> =
  | {
      readonly ok: true;
      readonly snapshot: RevisionSnapshot<State>;
      readonly commands: readonly Command[];
    }
  | {
      readonly ok: false;
      readonly snapshot: RevisionSnapshot<State>;
      readonly commands: readonly [];
      readonly error: SectileError;
    };

export function createRevisionSnapshot<State>(
  state: State,
  revision = 0,
): Result<RevisionSnapshot<State>> {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return fail(
      'construction',
      'invalid-revision',
      'Machine revision must be a non-negative safe integer.',
      { revision },
    );
  }
  return ok(snapshot(revision, state));
}

export function applyRevisionedEvent<State, Event, Command>(
  current: RevisionSnapshot<State>,
  expectedRevision: number,
  event: Event,
  reducer: EventReducer<State, Event, Command>,
): RevisionResult<State, Command> {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    return rejected(current, {
      class: 'transition-rejection',
      code: 'invalid-expected-revision',
      message: 'Expected revision must be a non-negative safe integer.',
      details: { expectedRevision },
    });
  }
  if (expectedRevision !== current.revision) {
    return rejected(current, {
      class: 'transition-rejection',
      code: 'stale-revision',
      message: 'Expected revision does not match the current machine revision.',
      details: { expectedRevision, currentRevision: current.revision },
    });
  }
  if (typeof reducer !== 'function') {
    return rejected(current, {
      class: 'transition-rejection',
      code: 'invalid-machine-reducer',
      message: 'Revisioned machine reducer must be a function.',
    });
  }
  if (current.revision === Number.MAX_SAFE_INTEGER) {
    return rejected(current, {
      class: 'resource-rejection',
      code: 'revision-ceiling-reached',
      message: 'Machine revision cannot advance beyond the safe-integer ceiling.',
      details: { revision: current.revision },
    });
  }

  const update = reducer(current.state, event);
  if (!update.ok) return rejected(current, update.error);
  return Object.freeze({
    ok: true,
    snapshot: snapshot(current.revision + 1, update.value.state),
    commands: freezeArray(update.value.commands),
  });
}

export function mapRevisionCommands<State, Command, Effect>(
  result: RevisionResult<State, Command>,
  toEffect: (command: Command) => Effect,
): RevisionResult<State, Effect> {
  if (!result.ok) return result;
  return Object.freeze({
    ok: true,
    snapshot: result.snapshot,
    commands: freezeArray(result.commands.map(toEffect)),
  });
}

export function rejectRevisionInput<State, Command = never>(
  current: RevisionSnapshot<State>,
  error: SectileError,
): RevisionResult<State, Command> {
  return rejected(current, error);
}

function snapshot<State>(revision: number, state: State): RevisionSnapshot<State> {
  return Object.freeze({ revision, state });
}

function rejected<State, Command>(
  current: RevisionSnapshot<State>,
  error: SectileError,
): RevisionResult<State, Command> {
  return Object.freeze({
    ok: false,
    snapshot: current,
    commands: Object.freeze([]) as readonly [],
    error,
  });
}
