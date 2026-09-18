import { computed, inject, provide, shallowRef, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue';
import type { TabularAcceptedViewState, TabularAccessState, TabularColumnState, TabularQuery, TabularRequestState, TabularRowSelection } from '@sectile/tabular';
import { stateOf, type VueProfileController } from './controller.js';

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
