import type { Result } from '@sectile/core';
import type { MachineUpdate } from '@sectile/core/revision';
import { freezeArray, ok } from './foundation.js';

export function createMachineUpdate<State, Command extends object>(
  state: State,
  commands: readonly Command[] = [],
): Result<MachineUpdate<State, Command>> {
  return ok(Object.freeze({
    state,
    commands: freezeArray(commands.map((command) => Object.freeze({ ...command }) as Command)),
  }));
}
