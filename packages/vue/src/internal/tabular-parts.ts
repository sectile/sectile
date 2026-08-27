import {
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  type Component,
  type InjectionKey,
  type PropType,
  type VNodeChild,
} from 'vue';
import type { TabularCellAddress, TabularGroupID, TabularHeaderNodeID, TabularRowID } from '@sectile/tabular';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import {
  provideProfile,
  refreshVueProfileController,
  stateOf,
  useProfile,
  type ProfileContext,
  type VueProfileController,
} from './tabular-profile.js';

export interface HostConnection {
  disconnect(): void;
  refresh(): void;
  getProjection(): { readonly generation: number };
  setHeaderCellAttributes?(element: HTMLTableCellElement, options: { readonly headerNodeID: TabularHeaderNodeID }): void;
  setColumnHeaderAttributes?(element: HTMLElement, options: { readonly headerNodeID: TabularHeaderNodeID }): void;
  registerRow(element: HTMLElement, options: { readonly rowID: TabularRowID | TabularGroupID; readonly expectedProjectionGeneration?: number }): { readonly ok: boolean; readonly value?: () => void };
  registerCell(element: HTMLElement, options: { readonly cell: TabularCellAddress; readonly expectedProjectionGeneration?: number }): { readonly ok: boolean; readonly value?: () => void };
  bindSortTrigger(element: HTMLElement, options: { readonly columnID: string; readonly comparator: string }): () => void;
  bindFilterControl(element: HTMLInputElement | HTMLSelectElement, options: unknown): () => void;
  bindSelectionControl?(element: HTMLInputElement, options: unknown): () => void;
  bindRowSelectionControl?(element: HTMLInputElement, options: unknown): () => void;
  bindBulkSelectionControl(element: HTMLElement, options: unknown): () => void;
  bindDisclosure?(element: HTMLElement, options: unknown): () => void;
  bindRowDisclosure?(element: HTMLElement, options: unknown): () => void;
  bindEditor(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, options: unknown): () => void;
  bindColumnResizeHandle(element: HTMLElement, options: unknown): () => void;
}

interface PartConfig<State, Event, Command> {
  readonly profile: 'data-table' | 'data-grid' | 'data-tree-grid';
  readonly prefix: 'DataTable' | 'DataGrid' | 'DataTreeGrid';
  readonly publicKey: InjectionKey<ProfileContext<State, Event, Command, HostConnection>>;
  readonly privateKey: InjectionKey<ProfileContext<State, Event, Command, HostConnection>>;
  connect(element: HTMLElement, controller: VueProfileController<State, Event, Command>, callbacks: { readonly onCommand?: (command: unknown) => void; readonly onSnapshotChange: () => void }): HostConnection;
}

const asProp = { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' };
const asChildProp = { type: Boolean, default: false };
const identityProps = {
  rowID: { type: String, required: true },
  columnID: { type: String, required: true },
};

export function createTabularParts<State, Event, Command>(config: PartConfig<State, Event, Command>): Readonly<Record<string, Component>> {
  const usePublic = (name: string) => useProfile(config.publicKey, `${config.prefix}${name}`);
  const usePrivate = (name: string) => useProfile(config.privateKey, `${config.prefix}${name}`);
  const structural = (suffix: string, part: string, tag: string): Component => defineComponent({
    name: `Sectile${config.prefix}${suffix}`,
    inheritAttrs: false,
    props: { as: { ...asProp, default: tag }, asChild: asChildProp },
    setup(props, { attrs, slots }) {
      const context = usePublic(suffix);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        'data-scope': config.profile,
        'data-part': part,
        role: config.profile === 'data-table' ? undefined : part === 'header' || part === 'body' ? 'rowgroup' : undefined,
      }), { default: () => slots['default']?.(rootSlot(context)) });
    },
  });
  const boundPart = (
    suffix: string,
    part: string,
    tag: string,
    props: Record<string, unknown>,
    bind: (connection: HostConnection, element: HTMLElement, values: Readonly<Record<string, unknown>>) => (() => void) | undefined,
  ): Component => defineComponent({
    name: `Sectile${config.prefix}${suffix}`,
    inheritAttrs: false,
    props: { ...props, as: { ...asProp, default: tag }, asChild: asChildProp },
    setup(runtimeProps, { attrs, slots }) {
      const context = usePrivate(suffix);
      let release: (() => void) | undefined;
      onBeforeUnmount(() => release?.());
      const elementRef = (value: unknown): void => {
        release?.();
        release = undefined;
        if (!(value instanceof HTMLElement) || context.connection.value === null) return;
        release = bind(context.connection.value, value, runtimeProps as Readonly<Record<string, unknown>>);
      };
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: runtimeProps.as,
        asChild: runtimeProps.asChild,
        elementRef,
        'data-scope': config.profile,
        'data-part': part,
        role: config.profile === 'data-table' ? undefined : part === 'row' ? 'row' : part === 'column-header' ? 'columnheader' : part === 'cell' ? 'gridcell' : undefined,
      }), { default: () => slots['default']?.(rootSlot(context)) });
    },
  });

  const Provider = defineComponent({
    name: `Sectile${config.prefix}Provider`,
    props: { controller: { type: Object as PropType<VueProfileController<State, Event, Command>>, required: true } },
    setup(props, { slots }) {
      const context = provideProfile(config.publicKey, config.privateKey, props.controller);
      return (): VNodeChild => slots['default']?.(rootSlot(context));
    },
  });
  const rootTag = config.profile === 'data-table' ? 'table' : 'div';
  const Root = defineComponent({
    name: `Sectile${config.prefix}Root`,
    inheritAttrs: false,
    props: {
      onCommand: { type: Function as PropType<(command: unknown) => void>, default: undefined },
      onError: { type: Function as PropType<(error: unknown) => void>, default: undefined },
      as: { ...asProp, default: rootTag },
      asChild: asChildProp,
    },
    setup(props, { attrs, expose, slots }) {
      const context = usePrivate('Root');
      let element: HTMLElement | null = null;
      const connect = (): void => {
        context.connection.value?.disconnect();
        context.connection.value = null;
        if (element === null) return;
        try {
          context.connection.value = config.connect(element, context.controller, {
            ...(props.onCommand === undefined ? {} : { onCommand: props.onCommand }),
            onSnapshotChange: () => refreshVueProfileController(context.controller),
          });
        } catch (error: unknown) {
          props.onError?.(error);
          if (props.onError === undefined) throw error;
        }
      };
      onMounted(connect);
      onBeforeUnmount(() => { context.connection.value?.disconnect(); context.connection.value = null; });
      expose({ controller: context.controller, refresh: () => context.connection.value?.refresh() });
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: (value: unknown) => { element = value instanceof HTMLElement ? value : null; },
        'data-scope': config.profile,
        'data-part': 'root',
        role: config.profile === 'data-grid' ? 'grid' : config.profile === 'data-tree-grid' ? 'treegrid' : undefined,
      }), { default: () => slots['default']?.(rootSlot(context)) });
    },
  });

  const table = config.profile === 'data-table';
  const Caption = structural('Caption', 'caption', 'caption');
  const Header = structural('Header', 'header', table ? 'thead' : 'div');
  const HeaderRow = defineComponent({
    name: `Sectile${config.prefix}HeaderRow`, inheritAttrs: false,
    props: { depth: { type: Number, required: true }, as: { ...asProp, default: table ? 'tr' : 'div' }, asChild: asChildProp },
    setup(props, { attrs, slots }) { const context = usePublic('HeaderRow'); return () => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: table ? undefined : 'row', 'data-depth': props.depth, 'data-scope': config.profile, 'data-part': 'header-row' }), { default: () => slots['default']?.(rootSlot(context)) }); },
  });
  const ColumnHeader = boundPart('ColumnHeader', 'column-header', table ? 'th' : 'div', {
    headerNodeID: { type: String, required: true },
  }, (connection, element, props) => {
    if (table && element instanceof HTMLTableCellElement) connection.setHeaderCellAttributes?.(element, { headerNodeID: String(props['headerNodeID']) });
    else connection.setColumnHeaderAttributes?.(element, { headerNodeID: String(props['headerNodeID']) });
    return undefined;
  });
  const Body = structural('Body', 'body', table ? 'tbody' : 'div');
  const Row = boundPart('Row', 'row', table ? 'tr' : 'div', { rowID: { type: String, required: true } }, (connection, element, props) => {
    const result = connection.registerRow(element, { rowID: String(props['rowID']), expectedProjectionGeneration: connection.getProjection().generation });
    return result.ok ? result.value : undefined;
  });
  const Cell = boundPart('Cell', 'cell', table ? 'td' : 'div', identityProps, (connection, element, props) => {
    const result = connection.registerCell(element, { cell: { rowID: String(props['rowID']), columnID: String(props['columnID']) }, expectedProjectionGeneration: connection.getProjection().generation });
    return result.ok ? result.value : undefined;
  });
  const SortTrigger = boundPart('SortTrigger', 'sort-trigger', 'button', {
    columnID: { type: String, required: true }, comparator: { type: String, default: 'default' },
  }, (connection, element, props) => connection.bindSortTrigger(element, { columnID: String(props['columnID']), comparator: String(props['comparator']) }));
  const FilterControl = boundPart('FilterControl', 'filter-control', 'input', {
    scope: { type: String as PropType<'global' | 'column'>, required: true }, columnID: { type: String, default: undefined }, id: { type: String, required: true }, predicate: { type: String, required: true },
  }, (connection, element, props) => element instanceof HTMLInputElement || element instanceof HTMLSelectElement ? connection.bindFilterControl(element, props['scope'] === 'column' ? { scope: 'column', columnID: String(props['columnID']), id: String(props['id']), predicate: String(props['predicate']) } : { scope: 'global', id: String(props['id']), predicate: String(props['predicate']) }) : undefined);
  const ColumnResizeHandle = boundPart('ColumnResizeHandle', 'column-resize-handle', 'button', {
    columnID: { type: String, required: true }, minSize: { type: Number, default: undefined }, maxSize: { type: Number, default: undefined },
  }, (connection, element, props) => connection.bindColumnResizeHandle(element, { columnID: String(props['columnID']), ...(typeof props['minSize'] === 'number' ? { minSize: props['minSize'] } : {}), ...(typeof props['maxSize'] === 'number' ? { maxSize: props['maxSize'] } : {}) }));
  const SelectionControl = boundPart(table ? 'SelectionControl' : 'RowSelectionControl', 'selection-control', 'input', {
    rowID: { type: String, required: true }, name: { type: String, required: true }, value: { type: String, required: true }, form: { type: String, default: undefined }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => {
    if (!(element instanceof HTMLInputElement)) return undefined;
    const options = { rowID: String(props['rowID']), name: String(props['name']), value: String(props['value']), ...(typeof props['form'] === 'string' ? { form: props['form'] } : {}), disabled: props['disabled'] === true };
    return table ? connection.bindSelectionControl?.(element, options) : connection.bindRowSelectionControl?.(element, options);
  });
  const BulkSelectionControl = boundPart('BulkSelectionControl', 'bulk-selection-control', 'button', {
    target: { type: Object as PropType<{ readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: string }>, required: true }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => connection.bindBulkSelectionControl(element, { target: props['target'], disabled: props['disabled'] === true }));
  const Disclosure = boundPart(config.profile === 'data-tree-grid' ? 'RowDisclosure' : 'Disclosure', 'disclosure', 'button', {
    rowID: { type: String, required: true }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => config.profile === 'data-tree-grid' ? connection.bindRowDisclosure?.(element, { rowID: String(props['rowID']), disabled: props['disabled'] === true }) : connection.bindDisclosure?.(element, { rowID: String(props['rowID']), disabled: props['disabled'] === true }));
  const Editor = boundPart('Editor', 'editor', 'input', {
    ...identityProps,
    parseValue: { type: Function as PropType<(value: string) => unknown>, default: undefined },
    commitOnChange: { type: Boolean, default: false },
  }, (connection, element, props) => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ? connection.bindEditor(element, { cell: { rowID: String(props['rowID']), columnID: String(props['columnID']) }, ...(typeof props['parseValue'] === 'function' ? { parseValue: props['parseValue'] } : {}), commitOnChange: props['commitOnChange'] === true }) : undefined);

  return Object.freeze({ Provider, Root, Caption, Header, HeaderRow, ColumnHeader, SortTrigger, FilterControl, ColumnResizeHandle, Body, Row, SelectionControl, BulkSelectionControl, Disclosure, Cell, Editor });
}

function rootSlot<State, Event, Command, Connection>(context: ProfileContext<State, Event, Command, Connection>): Readonly<Record<string, unknown>> {
  const state = stateOf(context.snapshot.value);
  const profile = context.snapshot.value as { readonly cursor?: unknown; readonly edit?: unknown };
  return Object.freeze({
    controller: context.controller,
    snapshot: context.snapshot.value,
    acceptedViewState: state.acceptedViewState,
    requestState: state.requestState,
    query: state.query,
    rowSelection: state.rowSelection,
    columnState: state.columnState,
    accessState: state.accessState,
    expansion: state.expansion,
    ...(profile.cursor === undefined ? {} : { cursor: profile.cursor }),
    ...(profile.edit === undefined ? {} : { editState: profile.edit }),
  });
}
