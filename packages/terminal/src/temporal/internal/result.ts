import type { Result } from '@sectile/core';
import {
  createFacadeConnection,
  createSemanticController,
  type FacadeConnection,
  type SemanticController,
  type SemanticControllerOptions,
} from '@sectile/core/adapter-runtime';
import type { TemporalErrorCode } from '@sectile/temporal';

interface TerminalFacadeOptions {
  readonly onUpdate?: () => void;
}

interface TerminalSnapshotConnection {
  getSnapshot(): { readonly state: unknown };
}

export type TerminalTemporalResult<T> = Result<T, TemporalErrorCode>;
export type TerminalTemporalController<State, Event, Effect> = SemanticController<State, Event, Effect, TemporalErrorCode>;

export function createTerminalTemporalController<State, Event, Command, Effect>(
  options: SemanticControllerOptions<State, Event, Command, Effect, TemporalErrorCode>,
): TerminalTemporalResult<TerminalTemporalController<State, Event, Effect>> {
  return createSemanticController(options);
}

export function createTerminalTemporalFacadeConnection<
  Options extends TerminalFacadeOptions,
  Connection extends TerminalSnapshotConnection,
>(
  options: Options,
  construct: (options: Options) => TerminalTemporalResult<Connection>,
): TerminalTemporalResult<FacadeConnection<Connection>> {
  return createFacadeConnection<Options, Connection, TemporalErrorCode>(
    options,
    construct,
  );
}
