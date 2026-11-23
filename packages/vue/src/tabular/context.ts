import { computed, inject, provide, shallowRef, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue';
import type { TabularAcceptedViewState, TabularAccessState, TabularColumnState, TabularQuery, TabularRequestState, TabularRow, TabularRowSelection } from '@sectile/tabular';
import { stateOf, type VueProfileController } from './controller.js';
import { captureCollectionSlot } from '../internal/collection.js';

const NO_ROWS: readonly TabularRow[] = Object.freeze([]);

interface ProfileSlots {
  readonly rows: readonly TabularRow[];
  root(): Readonly<Record<string, unknown>>;
  row<Fields extends object>(fields: Fields): Readonly<Record<string, unknown>> & Readonly<Fields>;
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
  readonly slots: ProfileSlots;
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
    slots: createProfileSlots(controller),
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

function createProfileSlots<State, Event, Command>(controller: VueProfileController<State, Event, Command>): ProfileSlots {
  const slot = captureCollectionSlot(() => {
    const snapshot = controller.snapshot.value;
    const state = stateOf(snapshot);
    const profile = snapshot as { readonly cursor?: unknown; readonly edit?: unknown };
    return {
      controller,
      snapshot,
      acceptedViewState: state.acceptedViewState,
      requestState: state.requestState,
      query: state.query,
      rowSelection: state.rowSelection,
      columnState: state.columnState,
      accessState: state.accessState,
      expansion: state.expansion,
      rows: state.acceptedViewState.kind === 'none' ? NO_ROWS : state.acceptedViewState.view.rows,
      ...(profile.cursor === undefined ? {} : { cursor: profile.cursor }),
      ...(profile.edit === undefined ? {} : { editState: profile.edit }),
    };
  });
  return {
    get rows() { return slot.value.rows; },
    root: () => slot.value,
    row: (local) => slot.with(local),
  };
}

export function useProfile<State, Event, Command, Connection>(
  key: InjectionKey<ProfileContext<State, Event, Command, Connection>>,
  name: string,
): ProfileContext<State, Event, Command, Connection> {
  const context = inject(key);
  if (context === undefined) throw new TypeError(`${name} must be used inside its matching Provider.`);
  return context;
}
