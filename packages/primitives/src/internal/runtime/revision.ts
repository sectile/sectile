import type { Result, SectileError } from '../../shared.js';
import { fail, freezeArray, ok } from '../kernel/foundation.js';

export interface MachineTransition<State, Command> {
  readonly state: State;
  readonly commands: readonly Command[];
}

export type MachineReducer<State, Input, Command> = (
  state: State,
  input: Input,
) => Result<MachineTransition<State, Command>>;

export interface RevisionEnvelope<State> {
  readonly revision: number;
  readonly state: State;
}

export type RevisionedResult<State, Command> =
  | {
      readonly ok: true;
      readonly envelope: RevisionEnvelope<State>;
      readonly commands: readonly Command[];
    }
  | {
      readonly ok: false;
      readonly envelope: RevisionEnvelope<State>;
      readonly commands: readonly [];
      readonly error: SectileError;
    };

export function createRevisionEnvelope<State>(
  state: State,
  revision = 0,
): Result<RevisionEnvelope<State>> {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return fail(
      'construction',
      'invalid-revision',
      'Machine revision must be a non-negative safe integer.',
      { revision },
    );
  }
  return ok(envelope(revision, state));
}

export function stepRevisioned<State, Input, Command>(
  current: RevisionEnvelope<State>,
  expectedRevision: number,
  input: Input,
  reducer: MachineReducer<State, Input, Command>,
): RevisionedResult<State, Command> {
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

  const transition = reducer(current.state, input);
  if (!transition.ok) return rejected(current, transition.error);
  return Object.freeze({
    ok: true,
    envelope: envelope(current.revision + 1, transition.value.state),
    commands: freezeArray(transition.value.commands),
  });
}

function envelope<State>(revision: number, state: State): RevisionEnvelope<State> {
  return Object.freeze({ revision, state });
}

function rejected<State, Command>(
  current: RevisionEnvelope<State>,
  error: SectileError,
): RevisionedResult<State, Command> {
  return Object.freeze({
    ok: false,
    envelope: current,
    commands: Object.freeze([]) as readonly [],
    error,
  });
}
