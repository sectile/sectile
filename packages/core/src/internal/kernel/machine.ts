import type { Result } from '../../shared.js';
import type { CoreErrorCode } from '../../error-code.js';
import { freezeArray, ok } from './foundation.js';

export interface MachineUpdate<State, Command> {
  readonly state: State;
  readonly commands: readonly Command[];
}

export type EventReducer<State, Event, Command, Code extends string = CoreErrorCode> = (
  state: State,
  event: Event,
) => Result<MachineUpdate<State, Command>, Code>;

export function createMachineUpdate<State, Command extends object>(
  state: State,
  commands: readonly Command[] = [],
): Result<MachineUpdate<State, Command>> {
  const frozenCommands = freezeArray(
    commands.map((command) => Object.freeze({ ...command }) as Command),
  );
  return ok(Object.freeze({ state, commands: frozenCommands }));
}
