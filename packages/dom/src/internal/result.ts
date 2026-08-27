import type { Result } from '@sectile/core';
import {
  createFacadeConnection,
  createSemanticController,
  type FacadeConnection,
  type SemanticController,
  type SemanticControllerOptions,
} from '@sectile/core/adapter-runtime';
import type { TemporalErrorCode } from '@sectile/temporal';

interface DOMFacadeOptions {
  readonly onUpdate?: () => void;
}

interface DOMSnapshotConnection {
  getSnapshot(): { readonly state: unknown };
}

export type DOMTemporalResult<T> = Result<T, TemporalErrorCode>;
export type DOMTemporalController<State, Event, Effect> = SemanticController<State, Event, Effect, TemporalErrorCode>;

export function createDOMTemporalController<State, Event, Command, Effect>(
  options: SemanticControllerOptions<State, Event, Command, Effect, TemporalErrorCode>,
): DOMTemporalResult<DOMTemporalController<State, Event, Effect>> {
  return createSemanticController(options);
}

export function createDOMTemporalFacadeConnection<
  Options extends DOMFacadeOptions,
  Connection extends DOMSnapshotConnection,
>(
  options: Options,
  construct: (options: Options) => DOMTemporalResult<Connection>,
): DOMTemporalResult<FacadeConnection<Connection>> {
  return createFacadeConnection<Options, Connection, TemporalErrorCode>(
    options,
    construct,
  );
}
