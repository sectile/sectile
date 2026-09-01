import type { Result, SectileError, StableID } from './shared.js';
import type { CoreErrorCode } from './error-code.js';
import { sameStableIDOrder, tryNormalizeStableIDs } from './identity.js';
import { tryCreateSequence } from './structures/sequence.js';
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

function prepareControllerEvent<State, Event, Command, Effect, Code extends string>(
  current: RevisionSnapshot<State>,
  expectedRevision: number,
  event: Event,
  reducer: EventReducer<State, Event, Command, Code>,
  reconcile: (previous: State, proposed: State) => Result<State, Code>,
  toEffect: (command: Command) => Effect,
): {
  readonly result: RevisionResult<State, Effect, CoreErrorCode | Code>;
  readonly proposed: State;
} {
  const semantic = applyRevisionedEvent(current, expectedRevision, event, reducer);
  if (!semantic.ok) return { result: semantic, proposed: current.state };
  const committed = reconcile(current.state, semantic.snapshot.state);
  if (!committed.ok) {
    return {
      result: rejectRevisionInput(current, committed.error),
      proposed: semantic.snapshot.state,
    };
  }
  const snapshot = Object.freeze({
    revision: semantic.snapshot.revision,
    state: committed.value,
  });
  return {
    result: mapRevisionCommands(
      Object.freeze({ ok: true as const, snapshot, commands: semantic.commands }),
      toEffect,
    ),
    proposed: semantic.snapshot.state,
  };
}

export function synchronizeControllerState<State, Code extends string>(
  current: RevisionSnapshot<State>,
  state: Result<State, Code>,
): Result<RevisionSnapshot<State>, CoreErrorCode | Code> {
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

export interface SemanticController<State, Event, Effect, Code extends string = CoreErrorCode> {
  getSnapshot(): RevisionSnapshot<State>;
  replace(state: Result<State, Code>): Result<RevisionSnapshot<State>, CoreErrorCode | Code>;
  handle(event: Event, expectedRevision?: number): RevisionResult<State, Effect, CoreErrorCode | Code>;
  reject<Code extends string>(code: Code, message: string, details?: Readonly<Record<string, unknown>>): RevisionResult<State, Effect, Code>;
}

export interface SemanticControllerOptions<State, Event, Command, Effect, Code extends string = CoreErrorCode> {
  readonly initial: Result<State, Code>;
  readonly reducer: EventReducer<State, Event, Command, Code>;
  readonly reconcile?: (previous: State, proposed: State) => Result<State, Code>;
  readonly publishEffect?: (effect: Effect) => void;
  readonly notify?: (previous: State, proposed: State) => void;
  readonly toEffect: (command: Command) => Effect;
  readonly interaction?: InteractionStateInput | undefined;
  readonly interactionIntent?: (event: Event) => 'navigate' | 'mutate';
}

export type HostInputDecoder<HostInput, Event> = (input: HostInput) => Event | null;
export type HostEffectProjector<Command, HostEffect> = (command: Command) => HostEffect;

export interface HostAdapter<State, HostInput, HostEffect, Code extends string = CoreErrorCode> {
  getSnapshot(): RevisionSnapshot<State>;
  replace(state: Result<State, Code>): Result<RevisionSnapshot<State>, CoreErrorCode | Code>;
  handleInput(input: HostInput, expectedRevision?: number): RevisionResult<State, HostEffect, CoreErrorCode | Code> | null;
  reject<Code extends string>(code: Code, message: string, details?: Readonly<Record<string, unknown>>): RevisionResult<State, HostEffect, Code>;
}

export interface HostAdapterOptions<State, HostInput, Event, Command, HostEffect, Code extends string = CoreErrorCode>
  extends Omit<SemanticControllerOptions<State, Event, Command, HostEffect, Code>, 'toEffect'> {
  readonly decode: HostInputDecoder<HostInput, Event>;
  readonly project: HostEffectProjector<Command, HostEffect>;
}

export function createSemanticController<State, Event, Command, Effect, Code extends string = CoreErrorCode>(
  options: SemanticControllerOptions<State, Event, Command, Effect, Code>,
): Result<SemanticController<State, Event, Effect, Code>, CoreErrorCode | Code> {
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
      replace: (state: Result<State, Code>): Result<RevisionSnapshot<State>, CoreErrorCode | Code> => {
        const next = synchronizeControllerState(current, state);
        if (next.ok) current = next.value;
        return next;
      },
      handle: (
        event: Event,
        expectedRevision = current.revision,
      ): RevisionResult<State, Effect, CoreErrorCode | Code> => {
        const permitted = requireInteraction(
          interaction.value,
          options.interactionIntent?.(event) ?? 'mutate',
        );
        if (!permitted.ok) return rejectRevisionInput(current, permitted.error);
        const previous = current;
        const prepared = prepareControllerEvent(
          current,
          expectedRevision,
          event,
          options.reducer,
          options.reconcile ?? ((_previous, proposed) => ({ ok: true, value: proposed })),
          options.toEffect,
        );
        if (!prepared.result.ok) return prepared.result;
        current = prepared.result.snapshot;
        publishControllerUpdate(
          prepared.result.commands,
          options.publishEffect,
          options.notify,
          previous.state,
          prepared.proposed,
        );
        return prepared.result;
      },
      reject: <Code extends string>(
        code: Code,
        message: string,
        details?: Readonly<Record<string, unknown>>,
      ): RevisionResult<State, Effect, Code> => rejectRevisionInput(current, {
        class: 'transition-rejection',
        code,
        message,
        ...(details === undefined ? {} : { details }),
      }),
    }),
  };
}

export function createHostAdapter<State, HostInput, Event, Command, HostEffect, Code extends string = CoreErrorCode>(
  options: HostAdapterOptions<State, HostInput, Event, Command, HostEffect, Code>,
): Result<HostAdapter<State, HostInput, HostEffect, Code>, CoreErrorCode | Code> {
  const controller = createSemanticController({
    initial: options.initial,
    reducer: options.reducer,
    toEffect: options.project,
    ...(options.reconcile === undefined ? {} : { reconcile: options.reconcile }),
    ...(options.publishEffect === undefined ? {} : { publishEffect: options.publishEffect }),
    ...(options.notify === undefined ? {} : { notify: options.notify }),
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
    ...(options.interactionIntent === undefined ? {} : { interactionIntent: options.interactionIntent }),
  });
  if (!controller.ok) return controller;
  return {
    ok: true,
    value: Object.freeze({
      getSnapshot: (): RevisionSnapshot<State> => controller.value.getSnapshot(),
      replace: (state: Result<State, Code>): Result<RevisionSnapshot<State>, CoreErrorCode | Code> => controller.value.replace(state),
      handleInput: (
        input: HostInput,
        expectedRevision?: number,
      ): RevisionResult<State, HostEffect, CoreErrorCode | Code> | null => {
        const event = options.decode(input);
        if (event === null) return null;
        return controller.value.handle(event, expectedRevision);
      },
      reject: <Code extends string>(
        code: Code,
        message: string,
        details?: Readonly<Record<string, unknown>>,
      ): RevisionResult<State, HostEffect, Code> => controller.value.reject(code, message, details),
    }),
  };
}

export interface ControlledComponentController<
  State,
  Event,
  Command,
  Value,
  Code extends string = CoreErrorCode,
> {
  getSnapshot(): RevisionSnapshot<State>;
  syncControlledValue(value: Value): Result<RevisionSnapshot<State>, CoreErrorCode | Code>;
  handle(event: Event, expectedRevision?: number): RevisionResult<State, Command, CoreErrorCode | Code>;
}

export interface ControlledComponentControllerOptions<
  State,
  Event,
  Command,
  Value,
  Code extends string = CoreErrorCode,
> {
  readonly controlled: boolean;
  readonly initial: Result<State, Code>;
  readonly reducer: EventReducer<State, Event, Command, Code>;
  readonly create: (value: Value, reference: State) => Result<State, Code>;
  readonly read: (state: State) => Value;
  readonly onChange?: (value: Value, previous: Value) => void;
  readonly interaction?: InteractionStateInput;
  readonly interactionIntent?: (event: Event) => 'navigate' | 'mutate';
}

export function createControlledComponentController<
  State,
  Event,
  Command extends object,
  Value,
  Code extends string = CoreErrorCode,
>(
  options: ControlledComponentControllerOptions<State, Event, Command, Value, Code>,
): Result<ControlledComponentController<State, Event, Command, Value, Code>, CoreErrorCode | Code> {
  const runtime = createSemanticController<State, Event, Command, Command, Code>({
    initial: options.initial,
    reducer: options.reducer,
    reconcile: (previous, proposed) => options.create(
      options.controlled ? options.read(previous) : options.read(proposed),
      proposed,
    ),
    notify: (previous, proposed) => {
      const before = options.read(previous);
      const after = options.read(proposed);
      if (!Object.is(before, after)) options.onChange?.(after, before);
    },
    toEffect: (command) => command,
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
    ...(options.interactionIntent === undefined
      ? {}
      : { interactionIntent: options.interactionIntent }),
  });
  if (!runtime.ok) return runtime;
  const getSnapshot = (): RevisionSnapshot<State> => runtime.value.getSnapshot();
  const syncControlledValue = (
    value: Value,
  ): Result<RevisionSnapshot<State>, CoreErrorCode | Code> => {
    if (!options.controlled) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'uncontrolled-controller-sync',
          message: 'An uncontrolled component cannot be synchronized externally.',
        },
      };
    }
    return runtime.value.replace(options.create(value, getSnapshot().state));
  };
  return {
    ok: true,
    value: Object.freeze({
      getSnapshot,
      syncControlledValue,
      handle: (event: Event, expectedRevision?: number) => runtime.value.handle(event, expectedRevision),
    }),
  };
}

export interface CollectionComponentController<
  Domain,
  State,
  Event,
  Command,
  Code extends string = CoreErrorCode,
> {
  getDomain(): Domain;
  getSnapshot(): RevisionSnapshot<State>;
  replaceDomain(domain: Domain): Result<RevisionSnapshot<State>, CoreErrorCode | Code>;
  replaceState(state: Result<State, Code>): Result<RevisionSnapshot<State>, CoreErrorCode | Code>;
  handle(event: Event, expectedRevision?: number): RevisionResult<State, Command, CoreErrorCode | Code>;
}

export interface CollectionComponentControllerOptions<
  Domain,
  State,
  Event,
  Command,
  Code extends string = CoreErrorCode,
> {
  readonly domain: Domain;
  readonly initial: (domain: Domain) => Result<State, Code>;
  readonly reducer: (domain: Domain, state: State, event: Event) => Result<{
    readonly state: State;
    readonly commands: readonly Command[];
  }, Code>;
  readonly reconcile: (domain: Domain, previous: State, proposed: State) => Result<State, Code>;
  readonly replaceDomain: (domain: Domain, previous: State) => Result<State, Code>;
  readonly notify?: (previous: State, proposed: State) => void;
  readonly interaction?: InteractionStateInput;
  readonly interactionIntent?: (event: Event) => 'navigate' | 'mutate';
}

export function createCollectionComponentController<
  Domain,
  State,
  Event,
  Command extends object,
  Code extends string = CoreErrorCode,
>(
  options: CollectionComponentControllerOptions<Domain, State, Event, Command, Code>,
): Result<CollectionComponentController<Domain, State, Event, Command, Code>, CoreErrorCode | Code> {
  let domain = options.domain;
  const runtime = createSemanticController<State, Event, Command, Command, Code>({
    initial: options.initial(domain),
    reducer: (state, event) => options.reducer(domain, state, event),
    reconcile: (previous, proposed) => options.reconcile(domain, previous, proposed),
    toEffect: (command) => command,
    ...(options.notify === undefined ? {} : { notify: options.notify }),
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
    ...(options.interactionIntent === undefined
      ? {}
      : { interactionIntent: options.interactionIntent }),
  });
  if (!runtime.ok) return runtime;
  const replaceDomain = (
    nextDomain: Domain,
  ): Result<RevisionSnapshot<State>, CoreErrorCode | Code> => {
    if (Object.is(domain, nextDomain)) return { ok: true, value: runtime.value.getSnapshot() };
    const previous = runtime.value.getSnapshot().state;
    const next = options.replaceDomain(nextDomain, previous);
    if (!next.ok) return next;
    const replaced = runtime.value.replace(next);
    if (replaced.ok) {
      domain = nextDomain;
      options.notify?.(previous, replaced.value.state);
    }
    return replaced;
  };
  return {
    ok: true,
    value: Object.freeze({
      getDomain: (): Domain => domain,
      getSnapshot: (): RevisionSnapshot<State> => runtime.value.getSnapshot(),
      replaceDomain,
      replaceState: (state: Result<State, Code>) => runtime.value.replace(state),
      handle: (event: Event, expectedRevision?: number) => runtime.value.handle(event, expectedRevision),
    }),
  };
}

export interface IdentityDomain<ID extends StableID> {
  contains(id: ID): boolean;
}

export type CollectionSelectionMode = 'single' | 'multiple';

export interface ReconciledCollectionIdentities<ID extends StableID> {
  readonly selected: readonly ID[];
  readonly current: ID | null;
  readonly selectionChanged: boolean;
  readonly currentChanged: boolean;
}

export interface ReconcileCollectionIdentitiesOptions {
  readonly preserveNullCurrent?: boolean;
}

export function tryReconcileCollectionIdentities<ID extends StableID>(
  items: readonly ID[],
  selected: readonly ID[],
  current: ID | null,
  disabledItems: readonly ID[],
  mode: CollectionSelectionMode,
  options: ReconcileCollectionIdentitiesOptions = {},
): Result<ReconciledCollectionIdentities<ID>> {
  if (mode !== 'single' && mode !== 'multiple') {
    return {
      ok: false,
      error: {
        class: 'construction',
        code: 'invalid-selection-mode',
        message: 'Collection selection mode must be single or multiple.',
      },
    };
  }
  const domain = tryCreateSequence(items);
  if (!domain.ok) return domain;
  const normalizedSelection = tryNormalizeStableIDs(selected);
  if (!normalizedSelection.ok) return normalizedSelection;
  const disabled = tryCreateDisabledIdentitySet(domain.value, disabledItems);
  if (!disabled.ok) return disabled;
  const requested = new Set(normalizedSelection.value);
  const selectedInDomain = domain.value.ids.filter((id) => requested.has(id));
  const nextSelected = Object.freeze(
    mode === 'single' ? selectedInDomain.slice(0, 1) : selectedInDomain,
  );
  const nextCurrent = current === null && options.preserveNullCurrent === true
    ? null
    : current !== null && domain.value.contains(current) && !disabled.value.has(current)
      ? current
      : nextSelected.find((id) => !disabled.value.has(id))
        ?? domain.value.ids.find((id) => !disabled.value.has(id))
        ?? null;
  return {
    ok: true,
    value: Object.freeze({
      selected: nextSelected,
      current: nextCurrent,
      selectionChanged: !sameStableIDOrder(selected, nextSelected),
      currentChanged: current !== nextCurrent,
    }),
  };
}

export function tryCreateDisabledIdentitySet<ID extends StableID>(
  domain: IdentityDomain<ID>,
  ids: readonly ID[] = [],
): Result<ReadonlySet<ID>> {
  const disabled = new Set(ids);
  for (const id of disabled) {
    if (!domain.contains(id)) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'disabled-item-outside-domain',
          message: 'Every disabled item must exist in the component domain.',
          details: { id },
        },
      };
    }
  }
  return { ok: true, value: disabled };
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
  Code extends string = CoreErrorCode,
>(
  options: Options,
  construct: (options: Options) => Result<Connection, Code>,
): Result<FacadeConnection<Connection>, Code> {
  const subscribers = new Set<FacadeSnapshotListener<Connection>>();
  let connection: Connection | undefined;
  let active = true;
  const onUpdate = (): void => {
    if (!active) return;
    let firstError: unknown;
    let hasError = false;
    if (connection !== undefined) {
      let snapshot: SnapshotOf<Connection> | undefined;
      try { snapshot = connection.getSnapshot() as SnapshotOf<Connection>; }
      catch (error) { hasError = true; firstError = error; }
      if (snapshot !== undefined) {
        for (const subscriber of [...subscribers]) {
          try { subscriber(snapshot); }
          catch (error) {
            if (!hasError) { hasError = true; firstError = error; }
          }
        }
      }
    }
    try { options.onUpdate?.(); }
    catch (error) {
      if (!hasError) { hasError = true; firstError = error; }
    }
    if (hasError) throw firstError;
  };
  const constructed = construct({ ...options, onUpdate } as Options);
  if (!constructed.ok) return constructed;
  connection = constructed.value;
  const target = connection as Connection & Record<PropertyKey, unknown>;
  const forwardedMethods = new Map<PropertyKey, (...args: readonly unknown[]) => unknown>();
  const inactiveUnsubscribe = (): void => undefined;
  const send = (input: unknown): boolean => active && Boolean(callFirst(target, ['handleEvent', 'handleKeyboardInput', 'handleKeyboardEvent', 'handleBeforeInput'], input));
  const update = (input: unknown): unknown => active
    ? callFirst(target, ['syncControlledValues', 'syncControlledValue', 'syncWindow'], input)
    : destroyedConnectionResult();
  const subscribe = (listener: FacadeSnapshotListener<Connection>): (() => void) => {
    if (!active) return inactiveUnsubscribe;
    subscribers.add(listener);
    return (): void => { subscribers.delete(listener); };
  };
  const destroy = (): void => {
    if (!active) return;
    active = false;
    const disconnect = target['disconnect'];
    if (typeof disconnect === 'function') Reflect.apply(disconnect, target, []);
    subscribers.clear();
  };
  const facade = new Proxy(target, {
    get: (_target, property) => {
      if (property === 'state') return connection?.getSnapshot().state;
      if (property === 'send') return send;
      if (property === 'update') return update;
      if (property === 'subscribe') return subscribe;
      if (property === 'destroy') return destroy;
      const value = Reflect.get(target, property, target);
      const ownDescriptor = Reflect.getOwnPropertyDescriptor(target, property);
      if (ownDescriptor !== undefined && ownDescriptor.configurable === false) return value;
      if (typeof value !== 'function') return value;
      const existing = forwardedMethods.get(property);
      if (existing !== undefined) return existing;
      const forwarded = (...args: readonly unknown[]): unknown => {
        if (active || isPostDestroyRead(property)) return Reflect.apply(value, target, args);
        if (typeof property === 'string' && property.startsWith('handle')) return false;
        if (typeof property === 'string' && property.startsWith('sync')) {
          return destroyedConnectionResult();
        }
        return undefined;
      };
      forwardedMethods.set(property, forwarded);
      return forwarded;
    },
  });
  return { ok: true, value: facade as unknown as FacadeConnection<Connection> };
}

function publishControllerUpdate<State, Effect>(
  effects: readonly Effect[],
  publishEffect: ((effect: Effect) => void) | undefined,
  notify: ((previous: State, proposed: State) => void) | undefined,
  previous: State,
  proposed: State,
): void {
  let firstError: unknown;
  let hasError = false;
  if (publishEffect !== undefined) {
    for (const effect of effects) {
      try { publishEffect(effect); }
      catch (error) {
        if (!hasError) { hasError = true; firstError = error; }
      }
    }
  }
  try { notify?.(previous, proposed); }
  catch (error) {
    if (!hasError) { hasError = true; firstError = error; }
  }
  if (hasError) throw firstError;
}

function destroyedConnectionResult(): Result<never> {
  return {
    ok: false,
    error: {
      class: 'resource-rejection',
      code: 'connection-destroyed',
      message: 'A destroyed facade connection cannot be updated.',
    },
  };
}

function isPostDestroyRead(property: PropertyKey): boolean {
  return property === 'getSnapshot'
    || (typeof property === 'string' && property.startsWith('get'));
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
