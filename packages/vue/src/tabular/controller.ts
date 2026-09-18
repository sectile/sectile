import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { TabularAcceptedViewState, TabularAccessState, TabularColumnState, TabularControlledValues, TabularQuery, TabularRequestState, TabularResult, TabularRowSelection, TabularSnapshot, TabularViewResponse } from '@sectile/tabular';

export interface SemanticController<State, Event, Command, ControlledValues extends TabularControlledValues = TabularControlledValues> {
  getSnapshot(): State;
  dispatch(event: Event, expectedRevision?: number): TabularResult<{ readonly snapshot: State; readonly commands: readonly Command[] }>;
  synchronizeView(response: TabularViewResponse): TabularResult<State>;
  syncControlledValues(values: ControlledValues): TabularResult<State>;
  requestView(): TabularResult<State>;
  abandonRequest(requestID: number): TabularResult<State>;
  subscribeCommands(listener: (command: Command) => void): () => void;
  attachRequestExecutor(listener: (command: Extract<Command, { readonly type: 'request-view' }>) => void): TabularResult<() => void>;
  dispose(): void;
}

export interface VueProfileController<State, Event, Command, ControlledValues extends TabularControlledValues = TabularControlledValues> extends SemanticController<State, Event, Command, ControlledValues> {
  readonly snapshot: Readonly<ShallowRef<State>>;
  readonly acceptedViewState: ComputedRef<TabularAcceptedViewState>;
  readonly requestState: ComputedRef<TabularRequestState>;
}

const semantics = new WeakMap<object, SemanticController<unknown, unknown, unknown>>();

const refreshers = new WeakMap<object, () => void>();

export function createVueProfileController<State, Event, Command, ControlledValues extends TabularControlledValues = TabularControlledValues>(
  semantic: SemanticController<State, Event, Command, ControlledValues>,
): VueProfileController<State, Event, Command, ControlledValues> {
  const snapshot = shallowRef(semantic.getSnapshot()) as ShallowRef<State>;
  const refresh = (): void => { snapshot.value = semantic.getSnapshot(); };
  const controller: VueProfileController<State, Event, Command, ControlledValues> = Object.freeze({
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
    syncControlledValues: (values: ControlledValues) => {
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
