export {
  applyRevisionedEvent,
  createRevisionSnapshot,
  mapRevisionCommands,
  rejectRevisionInput,
  type EventReducer,
  type MachineUpdate,
  type RevisionSnapshot,
  type RevisionResult,
} from './internal/runtime/revision.js';

export { tryCreateRevisionSnapshot } from './internal/runtime/revision.js';
export { createMachineUpdate } from './internal/kernel/machine.js';
