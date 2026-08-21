import type { Result } from '../../shared.js';
import { freezeArray, ok } from './foundation.js';

export interface MachineUpdate<State, Command> {
  readonly state: State;
  readonly commands: readonly Command[];
}

export type EventReducer<State, Event, Command> = (
  state: State,
  event: Event,
) => Result<MachineUpdate<State, Command>>;

export function createMachineUpdate<State, Command extends object>(
  state: State,
  commands: readonly Command[] = [],
): Result<MachineUpdate<State, Command>> {
  const frozenCommands = freezeArray(
    commands.map((command) => Object.freeze({ ...command }) as Command),
  );
  return ok(Object.freeze({ state, commands: frozenCommands }));
}
