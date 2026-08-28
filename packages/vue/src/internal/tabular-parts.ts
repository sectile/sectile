import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { TabularCellAddress, TabularGroupID, TabularHeaderNodeID, TabularRow, TabularRowID } from '@sectile/tabular';
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
  bindSelectionControl?(element: HTMLElement, options: unknown): () => void;
  bindRowSelectionControl?(element: HTMLElement, options: unknown): () => void;
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

type TabularAutomaticBodySlotProps = Readonly<Record<string, unknown>> & {
  readonly row: TabularRow;
  readonly rowIndex: number;
  readonly isGroup: boolean;
};

const asProp = { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' };
const asChildProp = { type: Boolean, default: false };
const identityProps = {
  rowID: { type: String, default: undefined },
  column: { type: String, required: true },
};

export function createTabularParts<State, Event, Command>(config: PartConfig<State, Event, Command>): Readonly<Record<string, Component>> {
  const rowKey: InjectionKey<ComputedRef<TabularRow>> = Symbol(`Sectile${config.prefix}Row`);
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
    rowAware = false,
  ): Component => defineComponent({
    name: `Sectile${config.prefix}${suffix}`,
    inheritAttrs: false,
    props: { ...props, as: { ...asProp, default: tag }, asChild: asChildProp },
    setup(runtimeProps, { attrs, slots }) {
      const context = usePrivate(suffix);
      const inheritedRow = rowAware ? inject(rowKey, null) : null;
      const values = (): Readonly<Record<string, unknown>> => {
        const resolved = runtimeProps as unknown as Readonly<Record<string, unknown>>;
        if (!rowAware || resolved['rowID'] !== undefined) return resolved;
        const row = inheritedRow?.value;
        if (row === undefined) throw new TypeError(`${config.prefix}${suffix} requires rowID outside automatic ${config.prefix}Body.`);
        return Object.freeze({ ...resolved, rowID: row.id });
      };
      let release: (() => void) | undefined;
      onBeforeUnmount(() => release?.());
      const elementRef = (value: unknown): void => {
        release?.();
        release = undefined;
        if (!(value instanceof HTMLElement) || context.connection.value === null) return;
        release = bind(context.connection.value, value, values());
      };
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: runtimeProps.as,
        asChild: runtimeProps.asChild,
        elementRef,
        'data-scope': config.profile,
        'data-part': part,
        role: config.profile === 'data-table' ? undefined : part === 'row' ? 'row' : part === 'column-header' ? 'columnheader' : part === 'cell' ? 'gridcell' : undefined,
      }), { default: () => slots['default']?.(partSlot(context, inheritedRow)) });
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
    props: { as: { ...asProp, default: table ? 'tr' : 'div' }, asChild: asChildProp },
    setup(props, { attrs, slots }) { const context = usePublic('HeaderRow'); return () => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: table ? undefined : 'row', 'data-scope': config.profile, 'data-part': 'header-row' }), { default: () => slots['default']?.(rootSlot(context)) }); },
  });
  const ColumnHeader = boundPart('ColumnHeader', 'column-header', table ? 'th' : 'div', {
    headerNodeID: { type: String, required: true },
  }, (connection, element, props) => {
    if (table && element instanceof HTMLTableCellElement) connection.setHeaderCellAttributes?.(element, { headerNodeID: String(props['headerNodeID']) });
    else connection.setColumnHeaderAttributes?.(element, { headerNodeID: String(props['headerNodeID']) });
    return undefined;
  });
  const Row = boundPart('Row', 'row', table ? 'tr' : 'div', { rowID: { type: String, required: true } }, (connection, element, props) => {
    const result = connection.registerRow(element, { rowID: String(props['rowID']), expectedProjectionGeneration: connection.getProjection().generation });
    return result.ok ? result.value : undefined;
  });
  const AutomaticRow = defineComponent({
    name: `Sectile${config.prefix}AutomaticRow`,
    props: { row: { type: Object as PropType<TabularRow>, required: true } },
    setup(props, { slots }) {
      provide(rowKey, computed(() => props.row));
      return (): VNodeChild => h(Row, {
        rowID: props.row.id,
        'data-row-id': props.row.id,
        'data-row-kind': props.row.kind,
        ...(props.row.contextOnly === true ? { 'data-context-only': '' } : {}),
      }, { default: () => slots['default']?.() });
    },
  });
  const Body = defineComponent({
    name: `Sectile${config.prefix}Body`,
    inheritAttrs: false,
    props: { manual: { type: Boolean, default: false }, as: { ...asProp, default: table ? 'tbody' : 'div' }, asChild: asChildProp },
    slots: Object as SlotsType<{
      default: (props: TabularAutomaticBodySlotProps) => VNodeChild;
      empty: (props: Readonly<Record<string, unknown>>) => VNodeChild;
    }>,
    setup(props, { attrs, slots }) {
      const context = usePublic('Body');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        'data-scope': config.profile,
        'data-part': 'body',
        role: table ? undefined : 'rowgroup',
      }), { default: () => {
        const root = rootSlot(context);
        if (props.manual) return (slots['default'] as ((props: Readonly<Record<string, unknown>>) => VNodeChild) | undefined)?.(root);
        const rows = root['rows'] as readonly TabularRow[];
        if (rows.length === 0) return slots['empty']?.(root);
        return rows.map((row, rowIndex) => h(AutomaticRow, { key: row.id, row }, {
          default: () => slots['default']?.(Object.freeze({ ...root, row, rowIndex, isGroup: row.kind === 'group' })),
        }));
      } });
    },
  });
  const Cell = boundPart('Cell', 'cell', table ? 'td' : 'div', identityProps, (connection, element, props) => {
    const result = connection.registerCell(element, { cell: { rowID: String(props['rowID']), columnID: String(props['column']) }, expectedProjectionGeneration: connection.getProjection().generation });
    return result.ok ? result.value : undefined;
  }, true);
  const SortTrigger = boundPart('SortTrigger', 'sort-trigger', 'button', {
    column: { type: String, required: true }, comparator: { type: String, default: 'default' },
  }, (connection, element, props) => connection.bindSortTrigger(element, { columnID: String(props['column']), comparator: String(props['comparator']) }));
  const FilterControl = boundPart('FilterControl', 'filter-control', 'input', {
    scope: { type: String as PropType<'global' | 'column'>, required: true }, column: { type: String, default: undefined }, id: { type: String, required: true }, predicate: { type: String, required: true },
  }, (connection, element, props) => element instanceof HTMLInputElement || element instanceof HTMLSelectElement ? connection.bindFilterControl(element, props['scope'] === 'column' ? { scope: 'column', columnID: String(props['column']), id: String(props['id']), predicate: String(props['predicate']) } : { scope: 'global', id: String(props['id']), predicate: String(props['predicate']) }) : undefined);
  const ColumnResizeHandle = boundPart('ColumnResizeHandle', 'column-resize-handle', 'button', {
    column: { type: String, required: true }, minSize: { type: Number, default: undefined }, maxSize: { type: Number, default: undefined },
  }, (connection, element, props) => connection.bindColumnResizeHandle(element, { columnID: String(props['column']), ...(typeof props['minSize'] === 'number' ? { minSize: props['minSize'] } : {}), ...(typeof props['maxSize'] === 'number' ? { maxSize: props['maxSize'] } : {}) }));
  const SelectionControl = boundPart(table ? 'SelectionControl' : 'RowSelectionControl', 'selection-control', 'input', {
    rowID: { type: String, default: undefined }, name: { type: String, required: true }, value: { type: String, default: undefined }, form: { type: String, default: undefined }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => {
    const rowID = String(props['rowID']);
    const options = { rowID, name: String(props['name']), value: props['value'] === undefined ? rowID : String(props['value']), ...(typeof props['form'] === 'string' ? { form: props['form'] } : {}), disabled: props['disabled'] === true };
    return table ? connection.bindSelectionControl?.(element, options) : connection.bindRowSelectionControl?.(element, options);
  }, true);
  const BulkSelectionControl = boundPart('BulkSelectionControl', 'bulk-selection-control', 'button', {
    target: { type: Object as PropType<{ readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: string }>, required: true }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => connection.bindBulkSelectionControl(element, { target: props['target'], disabled: props['disabled'] === true }));
  const Disclosure = boundPart(config.profile === 'data-tree-grid' ? 'RowDisclosure' : 'Disclosure', 'disclosure', 'button', {
    rowID: { type: String, default: undefined }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => config.profile === 'data-tree-grid' ? connection.bindRowDisclosure?.(element, { rowID: String(props['rowID']), disabled: props['disabled'] === true }) : connection.bindDisclosure?.(element, { rowID: String(props['rowID']), disabled: props['disabled'] === true }), true);
  const Editor = boundPart('Editor', 'editor', 'input', {
    ...identityProps,
    parseValue: { type: Function as PropType<(value: string) => unknown>, default: undefined },
    commitOnChange: { type: Boolean, default: false },
  }, (connection, element, props) => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ? connection.bindEditor(element, { cell: { rowID: String(props['rowID']), columnID: String(props['column']) }, ...(typeof props['parseValue'] === 'function' ? { parseValue: props['parseValue'] } : {}), commitOnChange: props['commitOnChange'] === true }) : undefined, true);

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
    rows: state.acceptedViewState.kind === 'none' ? Object.freeze([]) : state.acceptedViewState.view.rows,
    ...(profile.cursor === undefined ? {} : { cursor: profile.cursor }),
    ...(profile.edit === undefined ? {} : { editState: profile.edit }),
  });
}

function partSlot<State, Event, Command, Connection>(
  context: ProfileContext<State, Event, Command, Connection>,
  row: ComputedRef<TabularRow> | null,
): Readonly<Record<string, unknown>> {
  const root = rootSlot(context);
  return row === null ? root : Object.freeze({ ...root, row: row.value, isGroup: row.value.kind === 'group' });
}
