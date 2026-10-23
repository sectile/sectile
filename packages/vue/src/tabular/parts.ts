import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  watch,
  provide,
  shallowRef,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { TabularCellAddress, TabularColumnID, TabularGroupID, TabularHeaderNodeID, TabularRow, TabularRowID, TabularSnapshot } from '@sectile/tabular';
import { getAllMatchingSelectionState, rowSelectionContains } from '@sectile/tabular/data-table';
import type { DataGridState } from '@sectile/tabular/data-grid';
import type { DataTableConnectionOptions, DataTableColumnSizeState } from '@sectile/dom/tabular';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import { provideProfile, useProfile, type ProfileContext } from './context.js';
import { refreshVueProfileController, snapshotOf, stateOf, type VueProfileController } from './controller.js';

export interface HostConnection {
  disconnect(): void;
  refresh(): void;
  getProjection(): { readonly generation: number };
  getColumnSizeState(): DataTableColumnSizeState;
  setHeaderCellAttributes?(element: HTMLTableCellElement, options: HeaderReference): void;
  setColumnHeaderAttributes?(element: HTMLElement, options: HeaderReference): void;
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
  syncControlledValues?(values: Readonly<Record<string, unknown>>): { readonly ok: boolean };
}

type HostColumnSizeOptions = Pick<DataTableConnectionOptions, 'columnSizes' | 'defaultColumnSizes' | 'onColumnSizesChange'>;

export interface TabularHost {
  readonly columnSizes: Readonly<ShallowRef<Readonly<Record<string, number>>>>;
  getOptions(): HostColumnSizeOptions;
  connectionChanged(connection: HostConnection | null): void;
  synchronizeColumnSizes(values: Readonly<Record<string, number>>, controlled: object): void;
}

export function createTabularHost(initialOptions: HostColumnSizeOptions): TabularHost {
  let options = initialOptions;
  let connection: HostConnection | null = null;
  const columnSizes = shallowRef(options.columnSizes ?? options.defaultColumnSizes ?? Object.freeze({}));
  return {
    columnSizes,
    getOptions: () => options,
    connectionChanged: (value) => {
      connection = value;
      if (value !== null) columnSizes.value = value.getColumnSizeState().values;
    },
    synchronizeColumnSizes: (values, controlled) => {
      const result = connection?.syncControlledValues?.({ ...controlled, columnSizes: values });
      if (result !== undefined && !result.ok) throw new TypeError('Controlled Tabular column sizes failed to synchronize.');
      options = Object.freeze({ ...options, columnSizes: values });
      if (connection === null) columnSizes.value = values;
    },
  };
}

type HeaderReference =
  | { readonly columnID: TabularColumnID; readonly headerNodeID?: never }
  | { readonly headerNodeID: TabularHeaderNodeID; readonly columnID?: never };

interface PartConfig<State, Event, Command> {
  readonly profile: 'data-table' | 'data-grid' | 'data-tree-grid';
  readonly prefix: 'DataTable' | 'DataGrid' | 'DataTreeGrid';
  readonly publicKey: InjectionKey<ProfileContext<State, Event, Command, HostConnection>>;
  readonly privateKey: InjectionKey<ProfileContext<State, Event, Command, HostConnection>>;
  connect(element: HTMLElement, controller: VueProfileController<State, Event, Command>, callbacks: { readonly onCommand?: (command: unknown) => void; readonly onSnapshotChange: () => void }): HostConnection;
  connectionChanged?(controller: VueProfileController<State, Event, Command>, connection: HostConnection | null): void;
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
    seedAttributes?: (values: Readonly<Record<string, unknown>>, snapshot: TabularSnapshot, as: PrimitiveAs | undefined, profile: State) => Readonly<Record<string, unknown>>,
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
      let element: HTMLElement | null = null;
      const rebind = (): void => {
        release?.();
        release = undefined;
        if (element === null || context.connection.value === null) return;
        release = bind(context.connection.value, element, values());
      };
      const elementRef = (value: unknown): void => {
        element = value instanceof HTMLElement ? value : null;
        rebind();
      };
      // Children mount before Root connects. Reconfigure only when the host,
      // identity or authored binding options change, not on every row snapshot.
      watch([context.connection,
        ...Object.keys(props).map(key => () => (runtimeProps as Readonly<Record<string, unknown>>)[key]),
        ...(rowAware ? [() => inheritedRow?.value.id] : []),
        ...(suffix === 'ColumnHeader' ? [context.snapshot] : []),
      ], rebind, { flush: 'post' });
      onBeforeUnmount(() => { element = null; release?.(); release = undefined; });
      // Seed SSR/hydration semantics without per-row selection subscriptions.
      // The existing DOM connection publishes live control state.
      return (): VNodeChild => {
        const profile = seedAttributes && (suffix === 'BulkSelectionControl' || suffix === 'Editor' || runtimeProps.as === 'input' && !runtimeProps.asChild)
          ? context.controller.getSnapshot() : undefined;
        return h(Primitive, mergeProps(attrs, {
          ...(seedAttributes && profile !== undefined
            ? seedAttributes(values(), snapshotOf(profile), runtimeProps.asChild ? undefined : runtimeProps.as, profile) : undefined),
          as: runtimeProps.as,
          asChild: runtimeProps.asChild,
          elementRef,
          'data-scope': config.profile,
          'data-part': part,
          role: suffix === 'BulkSelectionControl' ? 'checkbox' : config.profile === 'data-table' ? undefined : part === 'row' ? 'row' : part === 'column-header' ? 'columnheader' : part === 'cell' ? 'gridcell' : undefined,
        }), { default: () => slots['default']?.(partSlot(context, inheritedRow)) });
      };
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
      // External controlled values and accepted source responses publish through
      // Vue; refresh registered DOM recipients after their render has committed.
      watch(context.snapshot, () => context.connection.value?.refresh(), { flush: 'post' });
      const connect = (): void => {
        config.connectionChanged?.(context.controller, null);
        context.connection.value?.disconnect();
        context.connection.value = null;
        if (element === null) return;
        try {
          context.connection.value = config.connect(element, context.controller, {
            ...(props.onCommand === undefined ? {} : { onCommand: props.onCommand }),
            onSnapshotChange: () => {
              config.connectionChanged?.(context.controller, context.connection.value);
              refreshVueProfileController(context.controller);
            },
          });
          config.connectionChanged?.(context.controller, context.connection.value);
        } catch (error: unknown) {
          props.onError?.(error);
          if (props.onError === undefined) throw error;
        }
      };
      onMounted(connect);
      onBeforeUnmount(() => { config.connectionChanged?.(context.controller, null); context.connection.value?.disconnect(); context.connection.value = null; });
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
    column: { type: String, default: undefined },
    header: { type: String, default: undefined },
  }, (connection, element, props) => {
    const column = props['column'];
    const header = props['header'];
    if ((column === undefined) === (header === undefined)) {
      throw new TypeError(`${config.prefix}ColumnHeader requires exactly one of column or header.`);
    }
    const reference: HeaderReference = column === undefined
      ? { headerNodeID: String(header) }
      : { columnID: String(column) };
    if (table && element instanceof HTMLTableCellElement) connection.setHeaderCellAttributes?.(element, reference);
    else connection.setColumnHeaderAttributes?.(element, reference);
    return undefined;
  });
  const Row = boundPart('Row', 'row', table ? 'tr' : 'div', { rowID: { type: String, required: true } }, (connection, element, props) => {
    const result = connection.registerRow(element, { rowID: String(props['rowID']), expectedProjectionGeneration: connection.getProjection().generation });
    return result.ok ? result.value : undefined;
  });
  const AutomaticRow = defineComponent({
    name: `Sectile${config.prefix}AutomaticRow`,
    inheritAttrs: false,
    props: { row: { type: Object as PropType<TabularRow>, required: true } },
    setup(props, { attrs, slots }) {
      provide(rowKey, computed(() => props.row));
      return (): VNodeChild => h(Row, mergeProps(attrs, {
        as: table ? 'tr' : 'div',
        asChild: false,
        rowID: props.row.id,
        'data-row-id': props.row.id,
        'data-row-kind': props.row.kind,
        'data-context-only': props.row.kind === 'group' && props.row.contextOnly === true ? '' : undefined,
      }), { default: () => slots['default']?.() });
    },
  });
  const Body = defineComponent({
    name: `Sectile${config.prefix}Body`,
    inheritAttrs: false,
    props: { manual: { type: Boolean, default: false }, rowAttributes: { type: Object as PropType<Readonly<Record<string, unknown>>>, default: undefined }, as: { ...asProp, default: table ? 'tbody' : 'div' }, asChild: asChildProp },
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
        return rows.map((row, rowIndex) => h(AutomaticRow, { ...props.rowAttributes, key: row.id, row }, {
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
  }, true, (props, snapshot) => ({
    type: 'checkbox', checked: rowSelectionContains(snapshot.state.rowSelection, String(props['rowID'])),
    name: snapshot.state.rowSelection.kind === 'explicit-rows' ? String(props['name']) : undefined,
    value: props['value'] === undefined ? String(props['rowID']) : String(props['value']),
    form: props['form'], disabled: props['disabled'] === true,
  }));
  const BulkSelectionControl = boundPart('BulkSelectionControl', 'bulk-selection-control', 'button', {
    target: { type: Object as PropType<{ readonly kind: 'all-matching' } | { readonly kind: 'group-leaves'; readonly groupID: string }>, required: true }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => connection.bindBulkSelectionControl(element, { target: props['target'], disabled: props['disabled'] === true }), false,
  (props, snapshot, as) => {
    const state = (props['target'] as { readonly kind: string }).kind === 'all-matching'
      ? getAllMatchingSelectionState(snapshot) : 'unchecked';
    const disabled = props['disabled'] === true;
    return { role: 'checkbox', 'aria-checked': state === 'indeterminate' ? 'mixed' : String(state === 'checked'),
      'aria-disabled': String(disabled), 'data-state': state,
      ...(as === 'input' ? { type: 'checkbox', checked: state === 'checked', indeterminate: state === 'indeterminate', disabled }
        : as === 'button' ? { type: 'button', disabled } : as === undefined ? { disabled } : { tabindex: disabled ? -1 : 0 }),
    };
  });
  const Disclosure = boundPart(config.profile === 'data-tree-grid' ? 'RowDisclosure' : 'Disclosure', 'disclosure', 'button', {
    rowID: { type: String, default: undefined }, disabled: { type: Boolean, default: false },
  }, (connection, element, props) => config.profile === 'data-tree-grid' ? connection.bindRowDisclosure?.(element, { rowID: String(props['rowID']), disabled: props['disabled'] === true }) : connection.bindDisclosure?.(element, { rowID: String(props['rowID']), disabled: props['disabled'] === true }), true);
  const Editor = boundPart('Editor', 'editor', 'input', {
    ...identityProps,
    parseValue: { type: Function as PropType<(value: string) => unknown>, default: undefined },
    commitOnChange: { type: Boolean, default: false },
  }, (connection, element, props) => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ? connection.bindEditor(element, { cell: { rowID: String(props['rowID']), columnID: String(props['column']) }, ...(typeof props['parseValue'] === 'function' ? { parseValue: props['parseValue'] } : {}), commitOnChange: props['commitOnChange'] === true }) : undefined, true,
  table ? undefined : (props, _snapshot, _as, profile) => {
    const edit = (profile as Pick<DataGridState, 'edit'>).edit;
    return { hidden: edit.kind !== 'editing' || edit.cell.rowID !== String(props['rowID']) || edit.cell.columnID !== String(props['column']) };
  });

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
