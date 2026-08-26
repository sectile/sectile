import type { Result, SectileError } from './shared.js';
import type { SectileErrorCode } from './error-code.js';
import {
  tryCreateInteractionState,
  requireInteraction,
  type InteractionStateInput,
} from './interaction.js';
import {
  applyRevisionedEvent,
  tryCreateRevisionSnapshot,
  mapRevisionCommands,
  rejectRevisionInput,
  type EventReducer,
  type RevisionResult,
  type RevisionSnapshot,
} from './revision.js';

export function applyControllerEvent<State, Event, Command, Effect>(
  current: RevisionSnapshot<State>,
  expectedRevision: number,
  event: Event,
  reducer: EventReducer<State, Event, Command>,
  reconcile: (previous: State, proposed: State) => Result<State>,
  notify: (previous: State, proposed: State) => void,
  toEffect: (command: Command) => Effect,
): RevisionResult<State, Effect> {
  const semantic = applyRevisionedEvent(current, expectedRevision, event, reducer);
  if (!semantic.ok) return semantic;
  const committed = reconcile(current.state, semantic.snapshot.state);
  if (!committed.ok) return rejectRevisionInput(current, committed.error);
  const snapshot = Object.freeze({
    revision: semantic.snapshot.revision,
    state: committed.value,
  });
  notify(current.state, semantic.snapshot.state);
  return mapRevisionCommands(
    Object.freeze({ ok: true as const, snapshot, commands: semantic.commands }),
    toEffect,
  );
}

export function synchronizeControllerState<State>(
  current: RevisionSnapshot<State>,
  state: Result<State>,
): Result<RevisionSnapshot<State>> {
  if (!state.ok) return state;
  if (current.revision === Number.MAX_SAFE_INTEGER) {
    return {
      ok: false,
      error: {
        class: 'resource-rejection',
        code: 'revision-ceiling-reached',
        message: 'Controller revision cannot advance beyond the safe-integer ceiling.',
        details: { revision: current.revision },
      },
    };
  }
  return tryCreateRevisionSnapshot(state.value, current.revision + 1);
}

export type ControlledFieldCodeName =
  | 'edit-mode'
  | 'expanded-value'
  | 'expanded-values'
  | 'highlighted-value'
  | 'input-state'
  | 'open'
  | 'value';

type ControlledFieldErrorCode =
  | `controlled-${ControlledFieldCodeName}-required`
  | `uncontrolled-${ControlledFieldCodeName}-update`;

export function controlledFieldError(
  controlled: boolean,
  provided: boolean,
  codeName: ControlledFieldCodeName,
  label: string,
): SectileError<ControlledFieldErrorCode> | null {
  if (controlled === provided) return null;
  const code: ControlledFieldErrorCode = controlled
    ? `controlled-${codeName}-required`
    : `uncontrolled-${codeName}-update`;
  return {
    class: 'construction',
    code,
    message: controlled
      ? `Controlled ${label} sync requires its external value.`
      : `Uncontrolled ${label} cannot be synchronized externally.`,
  };
}

export interface SemanticController<State, Event, Effect> {
  getSnapshot(): RevisionSnapshot<State>;
  replace(state: Result<State>): Result<RevisionSnapshot<State>>;
  handle(event: Event, expectedRevision?: number): RevisionResult<State, Effect>;
  reject(code: SectileErrorCode, message: string, details?: Readonly<Record<string, unknown>>): RevisionResult<State, Effect>;
}

export interface SemanticControllerOptions<State, Event, Command, Effect> {
  readonly initial: Result<State>;
  readonly reducer: EventReducer<State, Event, Command>;
  readonly reconcile?: (previous: State, proposed: State) => Result<State>;
  readonly notify?: (previous: State, proposed: State) => void;
  readonly toEffect: (command: Command) => Effect;
  readonly interaction?: InteractionStateInput | undefined;
  readonly interactionIntent?: (event: Event) => 'navigate' | 'mutate';
}

export type HostInputDecoder<HostInput, Event> = (input: HostInput) => Event | null;
export type HostEffectProjector<Command, HostEffect> = (command: Command) => HostEffect;

export interface HostAdapter<State, HostInput, HostEffect> {
  getSnapshot(): RevisionSnapshot<State>;
  replace(state: Result<State>): Result<RevisionSnapshot<State>>;
  handleInput(input: HostInput, expectedRevision?: number): RevisionResult<State, HostEffect> | null;
  reject(code: SectileErrorCode, message: string, details?: Readonly<Record<string, unknown>>): RevisionResult<State, HostEffect>;
}

export interface HostAdapterOptions<State, HostInput, Event, Command, HostEffect>
  extends Omit<SemanticControllerOptions<State, Event, Command, HostEffect>, 'toEffect'> {
  readonly decode: HostInputDecoder<HostInput, Event>;
  readonly project: HostEffectProjector<Command, HostEffect>;
}

export function createSemanticController<State, Event, Command, Effect>(
  options: SemanticControllerOptions<State, Event, Command, Effect>,
): Result<SemanticController<State, Event, Effect>> {
  if (!options.initial.ok) return options.initial;
  const interaction = tryCreateInteractionState(options.interaction);
  if (!interaction.ok) return interaction;
  const snapshot = tryCreateRevisionSnapshot(options.initial.value);
  if (!snapshot.ok) return snapshot;
  let current = snapshot.value;
  return {
    ok: true,
    value: Object.freeze({
      getSnapshot: (): RevisionSnapshot<State> => current,
      replace: (state: Result<State>): Result<RevisionSnapshot<State>> => {
        const next = synchronizeControllerState(current, state);
        if (next.ok) current = next.value;
        return next;
      },
      handle: (
        event: Event,
        expectedRevision = current.revision,
      ): RevisionResult<State, Effect> => {
        const permitted = requireInteraction(
          interaction.value,
          options.interactionIntent?.(event) ?? 'mutate',
        );
        if (!permitted.ok) return rejectRevisionInput(current, permitted.error);
        const result = applyControllerEvent(
          current,
          expectedRevision,
          event,
          options.reducer,
          options.reconcile ?? ((_previous, proposed) => ({ ok: true, value: proposed })),
          options.notify ?? (() => undefined),
          options.toEffect,
        );
        if (result.ok) current = result.snapshot;
        return result;
      },
      reject: (
        code: SectileErrorCode,
        message: string,
        details?: Readonly<Record<string, unknown>>,
      ): RevisionResult<State, Effect> => rejectRevisionInput(current, {
        class: 'transition-rejection',
        code,
        message,
        ...(details === undefined ? {} : { details }),
      }),
    }),
  };
}

export function createHostAdapter<State, HostInput, Event, Command, HostEffect>(
  options: HostAdapterOptions<State, HostInput, Event, Command, HostEffect>,
): Result<HostAdapter<State, HostInput, HostEffect>> {
  const controller = createSemanticController({
    initial: options.initial,
    reducer: options.reducer,
    toEffect: options.project,
    ...(options.reconcile === undefined ? {} : { reconcile: options.reconcile }),
    ...(options.notify === undefined ? {} : { notify: options.notify }),
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
    ...(options.interactionIntent === undefined ? {} : { interactionIntent: options.interactionIntent }),
  });
  if (!controller.ok) return controller;
  return {
    ok: true,
    value: Object.freeze({
      getSnapshot: (): RevisionSnapshot<State> => controller.value.getSnapshot(),
      replace: (state: Result<State>): Result<RevisionSnapshot<State>> => controller.value.replace(state),
      handleInput: (
        input: HostInput,
        expectedRevision?: number,
      ): RevisionResult<State, HostEffect> | null => {
        const event = options.decode(input);
        if (event === null) return null;
        return controller.value.handle(event, expectedRevision);
      },
      reject: (
        code: SectileErrorCode,
        message: string,
        details?: Readonly<Record<string, unknown>>,
      ): RevisionResult<State, HostEffect> => controller.value.reject(code, message, details),
    }),
  };
}

interface SnapshotConnection {
  getSnapshot(): { readonly state: unknown };
}

interface FacadeOptions {
  readonly onUpdate?: () => void;
}

type SnapshotOf<Connection extends SnapshotConnection> = ReturnType<Connection['getSnapshot']>;
export type FacadeSnapshotListener<Connection extends SnapshotConnection> = (snapshot: SnapshotOf<Connection>) => void;
type StateOf<Connection extends SnapshotConnection> = SnapshotOf<Connection>['state'];
type SendInput<Connection> = Connection extends { handleEvent(input: infer Input): boolean }
  ? Input
  : Connection extends { handleKeyboardInput(input: infer Input): boolean }
    ? Input
    : Connection extends { handleKeyboardEvent(input: infer Input): boolean }
      ? Input
      : Connection extends { handleBeforeInput(input: infer Input): boolean }
        ? Input
        : never;
type UpdateInput<Connection> = Connection extends { syncControlledValues(input: infer Input): unknown }
  ? Input
  : Connection extends { syncControlledValue(input: infer Input): unknown }
    ? Input
    : Connection extends { syncWindow(input: infer Input): unknown }
      ? Input
      : never;
type UpdateResult<Connection> = Connection extends { syncControlledValues(input: infer _Input): infer Output }
  ? Output
  : Connection extends { syncControlledValue(input: infer _Input): infer Output }
    ? Output
    : Connection extends { syncWindow(input: infer _Input): infer Output }
      ? Output
      : never;

export type FacadeConnection<Connection extends SnapshotConnection> = Connection & {
  readonly state: StateOf<Connection>;
  send(input: SendInput<Connection>): boolean;
  update(input: UpdateInput<Connection>): UpdateResult<Connection>;
  subscribe(listener: FacadeSnapshotListener<Connection>): () => void;
  destroy(): void;
};

export function createFacadeConnection<
  Options extends FacadeOptions,
  Connection extends SnapshotConnection,
>(
  options: Options,
  construct: (options: Options) => Result<Connection>,
): Result<FacadeConnection<Connection>> {
  const subscribers = new Set<FacadeSnapshotListener<Connection>>();
  let connection: Connection | undefined;
  let active = true;
  const onUpdate = (): void => {
    options.onUpdate?.();
    if (connection === undefined) return;
    const snapshot = connection.getSnapshot() as SnapshotOf<Connection>;
    for (const subscriber of subscribers) subscriber(snapshot);
  };
  const constructed = construct({ ...options, onUpdate } as Options);
  if (!constructed.ok) return constructed;
  connection = constructed.value;
  const target = connection as Connection & Record<PropertyKey, unknown>;
  const facade = new Proxy(target, {
    get: (_target, property) => {
      if (property === 'state') return connection?.getSnapshot().state;
      if (property === 'send') return (input: unknown): boolean => active && Boolean(callFirst(target, ['handleEvent', 'handleKeyboardInput', 'handleKeyboardEvent', 'handleBeforeInput'], input));
      if (property === 'update') return (input: unknown): unknown => callFirst(target, ['syncControlledValues', 'syncControlledValue', 'syncWindow'], input);
      if (property === 'subscribe') return (listener: FacadeSnapshotListener<Connection>): (() => void) => {
        subscribers.add(listener);
        return (): void => { subscribers.delete(listener); };
      };
      if (property === 'destroy') return (): void => {
        if (!active) return;
        active = false;
        const disconnect = target['disconnect'];
        if (typeof disconnect === 'function') Reflect.apply(disconnect, target, []);
        subscribers.clear();
      };
      const value = Reflect.get(target, property, target);
      const ownDescriptor = Reflect.getOwnPropertyDescriptor(target, property);
      if (ownDescriptor !== undefined && ownDescriptor.configurable === false) return value;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { ok: true, value: facade as unknown as FacadeConnection<Connection> };
}

function callFirst(
  target: Record<PropertyKey, unknown>,
  names: readonly string[],
  input: unknown,
): unknown {
  for (const name of names) {
    const method = target[name];
    if (typeof method === 'function') return Reflect.apply(method, target, [input]);
  }
  throw new TypeError(`The connection does not implement ${names.join(' or ')}.`);
}
