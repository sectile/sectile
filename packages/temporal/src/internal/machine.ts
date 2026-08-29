import type { TemporalResult } from '../error.js';
import {
  createMachineUpdate as createCoreMachineUpdate,
  type MachineUpdate,
} from '@sectile/core/revision';
import type { TemporalErrorCode } from '../error.js';

export function createMachineUpdate<State, Command extends object>(
  state: State,
  commands: readonly Command[] = [],
): TemporalResult<MachineUpdate<State, Command>> {
  return createCoreMachineUpdate<State, Command, TemporalErrorCode>(state, commands);
}
