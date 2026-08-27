import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  shallowRef,
  type ComputedRef,
  type InjectionKey,
  type ShallowRef,
} from 'vue';
import type {
  TabularAcceptedViewState,
  TabularAccessState,
  TabularColumnState,
  TabularControlledValues,
  TabularQuery,
  TabularRequest,
  TabularRequestState,
  TabularResult,
  TabularRowSelection,
  TabularSnapshot,
  TabularViewResponse,
} from '@sectile/tabular';

export interface SemanticController<State, Event, Command> {
  getSnapshot(): State;
  dispatch(event: Event, expectedRevision?: number): TabularResult<{ readonly snapshot: State; readonly commands: readonly Command[] }>;
  synchronizeView(response: TabularViewResponse): TabularResult<State>;
  syncControlledValues(values: TabularControlledValues): TabularResult<State>;
  requestView(): TabularResult<State>;
  abandonRequest(requestID: number): TabularResult<State>;
  subscribeCommands(listener: (command: Command) => void): () => void;
  attachRequestExecutor(listener: (command: Extract<Command, { readonly type: 'request-view' }>) => void): TabularResult<() => void>;
  dispose(): void;
}

export interface VueProfileController<State, Event, Command> extends SemanticController<State, Event, Command> {
  readonly snapshot: Readonly<ShallowRef<State>>;
  readonly acceptedViewState: ComputedRef<TabularAcceptedViewState>;
  readonly requestState: ComputedRef<TabularRequestState>;
}

const semantics = new WeakMap<object, SemanticController<unknown, unknown, unknown>>();
const refreshers = new WeakMap<object, () => void>();

export function createVueProfileController<State, Event, Command>(
  semantic: SemanticController<State, Event, Command>,
): VueProfileController<State, Event, Command> {
  const snapshot = shallowRef(semantic.getSnapshot()) as ShallowRef<State>;
  const refresh = (): void => { snapshot.value = semantic.getSnapshot(); };
  const controller: VueProfileController<State, Event, Command> = Object.freeze({
    snapshot: snapshot as Readonly<ShallowRef<State>>,
    acceptedViewState: computed(() => stateOf(snapshot.value).acceptedViewState),
    requestState: computed(() => stateOf(snapshot.value).requestState),
    getSnapshot: () => semantic.getSnapshot(),
    dispatch: (event: Event, revision?: number) => {
      const result = semantic.dispatch(event, revision);
      if (result.ok) refresh();
      return result;
    },
    synchronizeView: (response: TabularViewResponse) => {
      const result = semantic.synchronizeView(response);
      if (result.ok) refresh();
      return result;
    },
    syncControlledValues: (values: TabularControlledValues) => {
      const result = semantic.syncControlledValues(values);
      if (result.ok) refresh();
      return result;
    },
    requestView: () => {
      const result = semantic.requestView();
      if (result.ok) refresh();
      return result;
    },
    abandonRequest: (requestID: number) => {
      const result = semantic.abandonRequest(requestID);
      if (result.ok) refresh();
      return result;
    },
    subscribeCommands: (listener: (command: Command) => void) => semantic.subscribeCommands(listener),
    attachRequestExecutor: (listener: (command: Extract<Command, { readonly type: 'request-view' }>) => void) => semantic.attachRequestExecutor(listener),
    dispose: () => semantic.dispose(),
  });
  semantics.set(controller, semantic as SemanticController<unknown, unknown, unknown>);
  refreshers.set(controller, refresh);
  return controller;
}

export function refreshVueProfileController<State, Event, Command>(controller: VueProfileController<State, Event, Command>): void {
  refreshers.get(controller)?.();
}

export function semanticController<State, Event, Command>(controller: VueProfileController<State, Event, Command>): SemanticController<State, Event, Command> {
  const semantic = semantics.get(controller) as SemanticController<State, Event, Command> | undefined;
  if (semantic === undefined) throw new TypeError('Unknown Vue Tabular controller.');
  return semantic;
}

export function aliasVueProfileController<State, Event, Command>(
  alias: VueProfileController<State, Event, Command>,
  source: VueProfileController<State, Event, Command>,
): void {
  const semantic = semantics.get(source);
  const refresh = refreshers.get(source);
  if (semantic !== undefined) semantics.set(alias, semantic);
  if (refresh !== undefined) refreshers.set(alias, refresh);
}

export function stateOf(value: unknown): TabularSnapshot['state'] {
  const candidate = value as { readonly state?: TabularSnapshot['state']; readonly tabular?: TabularSnapshot };
  const state = candidate.tabular?.state ?? candidate.state;
  if (state === undefined) throw new TypeError('Invalid Tabular profile snapshot.');
  return state;
}

export interface ProfileContext<State, Event, Command, Connection> {
  readonly controller: VueProfileController<State, Event, Command>;
  readonly snapshot: Readonly<ShallowRef<State>>;
  readonly acceptedViewState: ComputedRef<TabularAcceptedViewState>;
  readonly requestState: ComputedRef<TabularRequestState>;
  readonly query: ComputedRef<TabularQuery>;
  readonly rowSelection: ComputedRef<TabularRowSelection>;
  readonly columnState: ComputedRef<TabularColumnState>;
  readonly accessState: ComputedRef<TabularAccessState>;
  readonly connection: ShallowRef<Connection | null>;
}

export function provideProfile<State, Event, Command, Connection>(
  publicKey: InjectionKey<ProfileContext<State, Event, Command, Connection>>,
  privateKey: InjectionKey<ProfileContext<State, Event, Command, Connection>>,
  controller: VueProfileController<State, Event, Command>,
): ProfileContext<State, Event, Command, Connection> {
  const connection = shallowRef<Connection | null>(null);
  const context: ProfileContext<State, Event, Command, Connection> = Object.freeze({
    controller,
    snapshot: controller.snapshot,
    acceptedViewState: controller.acceptedViewState,
    requestState: controller.requestState,
    query: computed(() => stateOf(controller.snapshot.value).query),
    rowSelection: computed(() => stateOf(controller.snapshot.value).rowSelection),
    columnState: computed(() => stateOf(controller.snapshot.value).columnState),
    accessState: computed(() => stateOf(controller.snapshot.value).accessState),
    connection,
  });
  const publicContext = Object.freeze({
    controller: context.controller,
    snapshot: context.snapshot,
    acceptedViewState: context.acceptedViewState,
    requestState: context.requestState,
    query: context.query,
    rowSelection: context.rowSelection,
    columnState: context.columnState,
    accessState: context.accessState,
  }) as ProfileContext<State, Event, Command, Connection>;
  provide(publicKey, publicContext);
  provide(privateKey, context);
  return context;
}

export function useProfile<State, Event, Command, Connection>(
  key: InjectionKey<ProfileContext<State, Event, Command, Connection>>,
  name: string,
): ProfileContext<State, Event, Command, Connection> {
  const context = inject(key);
  if (context === undefined) throw new TypeError(`${name} must be used inside its matching Provider.`);
  return context;
}

export type SourceStatus = 'idle' | 'loading' | 'success' | 'error';
export type SourceResolver = (request: TabularRequest, context: { readonly signal: AbortSignal }) => TabularViewResponse | Promise<TabularViewResponse>;
export interface SourceOptions {
  readonly onError?: (error: unknown) => void;
  readonly onStatusChange?: (status: SourceStatus) => void;
}
export interface SourceReturn {
  readonly status: Readonly<ShallowRef<SourceStatus>>;
  readonly error: Readonly<ShallowRef<unknown | null>>;
  reload(): void;
  cancel(): void;
  replaceResolver(resolver: SourceResolver): void;
  dispose(): void;
}

export function useProfileSource<State, Event, Command>(
  controller: VueProfileController<State, Event, Command>,
  initialResolver: SourceResolver,
  options: SourceOptions = {},
): SourceReturn {
  const status = shallowRef<SourceStatus>('idle');
  const error = shallowRef<unknown | null>(null);
  let resolver = initialResolver;
  let active: { readonly requestID: number; readonly abort: AbortController } | null = null;
  let mounted = false;
  let disposed = false;
  let queued: TabularRequest | null = null;

  const setStatus = (next: SourceStatus): void => {
    status.value = next;
    options.onStatusChange?.(next);
  };
  const abandon = (requestID: number): void => { controller.abandonRequest(requestID); };
  const cancel = (): void => {
    const current = active;
    active = null;
    queued = null;
    if (current !== null) {
      current.abort.abort();
      abandon(current.requestID);
    }
    if (!disposed) setStatus('idle');
  };
  const execute = (request: TabularRequest): void => {
    if (!mounted || disposed) { queued = request; return; }
    if (active !== null) {
      active.abort.abort();
      abandon(active.requestID);
    }
    const abort = new AbortController();
    active = { requestID: request.requestID, abort };
    error.value = null;
    setStatus('loading');
    Promise.resolve().then(() => resolver(request, { signal: abort.signal })).then((response) => {
      if (disposed || abort.signal.aborted || active?.requestID !== request.requestID) return;
      const synchronized = controller.synchronizeView(response);
      if (!synchronized.ok) {
        active = null;
        error.value = synchronized.error;
        setStatus('error');
        options.onError?.(synchronized.error);
        return;
      }
      active = null;
      setStatus('success');
    }, (reason: unknown) => {
      if (disposed || abort.signal.aborted || active?.requestID !== request.requestID) return;
      active = null;
      abandon(request.requestID);
      error.value = reason;
      setStatus('error');
      options.onError?.(reason);
    });
  };
  const attached = controller.attachRequestExecutor((command) => execute((command as unknown as { readonly request: TabularRequest }).request));
  if (!attached.ok) throw new TypeError(attached.error.message);
  const releaseExecutor = attached.value;
  const reload = (): void => {
    const requested = controller.requestView();
    if (!requested.ok) throw new TypeError(requested.error.message);
  };
  const replaceResolver = (next: SourceResolver): void => {
    cancel();
    resolver = next;
    const replaced = controller.dispatch({ type: 'replace-source' } as Event);
    if (!replaced.ok) throw new TypeError(replaced.error.message);
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancel();
    releaseExecutor();
  };

  onMounted(() => {
    mounted = true;
    const pending = queued ?? controller.requestState.value.pendingRequest;
    queued = null;
    if (pending !== null) execute(pending);
  });
  onBeforeUnmount(dispose);
  return Object.freeze({ status: readonly(status), error: readonly(error), reload, cancel, replaceResolver, dispose });
}

export function controlledValues(options: {
  readonly query?: { readonly value: TabularQuery };
  readonly rowSelection?: { readonly value: TabularRowSelection };
  readonly columnState?: { readonly value: TabularColumnState };
  readonly accessState?: { readonly value: TabularAccessState };
  readonly expansion?: { readonly value: readonly string[] };
}): TabularControlledValues {
  return Object.freeze({
    ...(options.query === undefined ? {} : { query: options.query.value }),
    ...(options.rowSelection === undefined ? {} : { rowSelection: options.rowSelection.value }),
    ...(options.columnState === undefined ? {} : { columnState: options.columnState.value }),
    ...(options.accessState === undefined ? {} : { accessState: options.accessState.value }),
    ...(options.expansion === undefined ? {} : { expansion: options.expansion.value }),
  });
}
