import type { Result } from '../../shared.js';
import type { CoreErrorCode } from '../../error-code.js';
import { ok } from './foundation.js';

const emptyCommands = Object.freeze([]) as readonly object[];

export interface MachineUpdate<State, Command> {
  readonly state: State;
  readonly commands: readonly Command[];
}

export type EventReducer<State, Event, Command, Code extends string = CoreErrorCode> = (
  state: State,
  event: Event,
) => Result<MachineUpdate<State, Command>, Code>;

export function createMachineUpdate<
  State,
  Command extends object,
  Code extends string = CoreErrorCode,
>(
  state: State,
  commands: readonly Command[] = [],
): Result<MachineUpdate<State, Command>, Code> {
  const frozenCommands = commands.length === 0
    ? emptyCommands as readonly Command[]
    : Object.freeze(commands.map((command) => Object.freeze({ ...command }) as Command));
  return ok<MachineUpdate<State, Command>, Code>(
    Object.freeze({ state, commands: frozenCommands }),
  );
}
