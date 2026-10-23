import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createTreeGrid,
  type TreeGridConnection,
  type TreeGridEditMode,
  type TreeGridPolicies,
  type TreeGridRowInput,
} from '@sectile/dom/tree-grid';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { collectionBranchIDs, reconcileCollectionState, sameIDs } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import {
  conditionalPresenceProps,
  useConditionalPresence,
  type ConditionalPresenceProps,
} from './presence/conditional-presence.js';

export interface TreeGridRootProps {
  readonly rows: readonly TreeGridRowInput<string, string>[];
  /** Column labels rendered by TreeGridHeader; data row indexes remain one-based. */
  readonly headers?: readonly string[];
  readonly getCellValue: (id: string) => string;
  readonly setCellValue: (id: string, value: string) => void;
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly expandedValue?: readonly string[];
  readonly defaultExpandedValue?: readonly string[];
  readonly highlightedValue?: string | null;
  readonly defaultHighlightedValue?: string | null;
  readonly editMode?: TreeGridEditMode;
  readonly defaultEditMode?: TreeGridEditMode;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly policies?: TreeGridPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type TreeGridCellValueResolver = NonNullable<TreeGridRootProps['getCellValue']>;
export type TreeGridCellValueSetter = NonNullable<TreeGridRootProps['setCellValue']>;
export interface TreeGridRootSlotProps { readonly value: string | null; readonly expandedValue: readonly string[]; readonly highlightedValue: string | null; readonly editMode: TreeGridEditMode; readonly disabled: boolean; readonly: boolean }
export interface TreeGridRowSlotProps extends TreeGridRootSlotProps { readonly value: string; readonly expanded: boolean }
export interface TreeGridCellSlotProps extends TreeGridRootSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly editing: boolean }
export interface TreeGridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TreeGridHeaderCellProps extends TreeGridPartProps { readonly columnIndex: number }
export interface TreeGridHeaderCellSlotProps { readonly columnIndex: number; readonly label: string }
export interface TreeGridGroupProps extends TreeGridPartProps, ConditionalPresenceProps { readonly for: string }
export interface TreeGridEditorProps extends ConditionalPresenceProps { readonly for: string; readonly label?: string }

interface Context {
  readonly state: ComputedRef<TreeGridRootSlotProps>;
  readonly expandedRows: ComputedRef<ReadonlySet<string>>;
  readonly headers: ComputedRef<readonly string[]>;
  readonly headerCount: ComputedRef<number>;
  registerRow(element: HTMLElement, rowIndex: number, level: number, expanded: boolean | undefined): void;
  registerCell(element: HTMLElement, id: string, columnIndex: number): void;
  registerDisclosure(element: HTMLElement, id: string): void;
  registerEditor(element: HTMLInputElement, id: string, label: string | undefined): void;
  unregisterEditor(element: HTMLInputElement): void;
  setEditorFocused(element: HTMLInputElement, focused: boolean): void;
  setEditorComposing(element: HTMLInputElement, composing: boolean): void;
  handleEditorKeydown(event: KeyboardEvent): void;
}
interface TreeGridConnectionOwner {
  readonly rows: readonly TreeGridRowInput<string, string>[];
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly eligible: TreeGridPolicies<string>['eligible'];
  readonly boundary: TreeGridPolicies<string>['boundary'];
  readonly maxScan: number | undefined;
}
const key = Symbol('SectileTreeGridRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const TreeGridRoot = defineComponent({
  name: 'SectileTreeGridRoot', inheritAttrs: false,
  props: {
    rows: { type: Array as PropType<readonly TreeGridRowInput<string, string>[]>, required: true },
    headers: { type: Array as PropType<readonly string[]>, default: () => [] },
    getCellValue: { type: Function as PropType<TreeGridCellValueResolver>, required: true }, setCellValue: { type: Function as PropType<TreeGridCellValueSetter>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    expandedValue: { type: Array as PropType<readonly string[]>, default: undefined }, defaultExpandedValue: { type: Array as PropType<readonly string[]>, default: () => [] },
    highlightedValue: { type: String as PropType<string | null>, default: undefined }, defaultHighlightedValue: { type: String as PropType<string | null>, default: null },
    editMode: { type: String as PropType<TreeGridEditMode>, default: undefined }, defaultEditMode: { type: String as PropType<TreeGridEditMode>, default: 'navigation' },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, policies: { type: Object as PropType<TreeGridPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string | null): boolean => true, 'update:expandedValue': (_value: readonly string[]): boolean => true, 'update:highlightedValue': (_value: string | null): boolean => true, 'update:editMode': (_value: TreeGridEditMode): boolean => true },
  slots: Object as SlotsType<{ default: (props: TreeGridRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const dataColumnCount = computed(() => maxTreeGridColumnCount(props.rows));
    const headers = computed(() => props.headers);
    const headerCount = computed(() => headers.value.length === 0 ? 0 : 1);
    const columnCount = computed(() => {
      if (headerCount.value && headers.value.length < dataColumnCount.value) {
        throw new TypeError('TreeGrid headers must label every data column.');
      }
      return Math.max(dataColumnCount.value, headers.value.length);
    });
    const element = shallowRef<HTMLElement>(); const connection = shallowRef<TreeGridConnection<string, string>>();
    let connectionOwner: TreeGridConnectionOwner | undefined;
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localExpanded = shallowRef<readonly string[]>(props.expandedValue !== undefined ? props.expandedValue : props.defaultExpandedValue);
    const localHighlight = shallowRef<string | null>(props.highlightedValue !== undefined ? props.highlightedValue : props.defaultHighlightedValue);
    const localEditMode = shallowRef<TreeGridEditMode>(props.editMode ?? props.defaultEditMode);
    const controlled = {
      value: useControlledStateInvariant('TreeGridRoot', 'modelValue', () => props.modelValue),
      expanded: useControlledStateInvariant('TreeGridRoot', 'expandedValue', () => props.expandedValue),
      highlighted: useControlledStateInvariant('TreeGridRoot', 'highlightedValue', () => props.highlightedValue),
      editMode: useControlledStateInvariant('TreeGridRoot', 'editMode', () => props.editMode),
    };
    const state = computed<TreeGridRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      expandedValue: props.expandedValue !== undefined ? props.expandedValue : localExpanded.value,
      highlightedValue: props.highlightedValue !== undefined ? props.highlightedValue : localHighlight.value,
      editMode: props.editMode ?? localEditMode.value, disabled: props.disabled, readonly: props.readonly,
    }));
    const expandedRows = computed<ReadonlySet<string>>(
      () => new Set(state.value.expandedValue),
    );
    const refreshParts = (): void => {
      if (element.value === undefined || connection.value === undefined) return;
      connection.value.setGridAttributes(
        props.rows.length + headerCount.value,
        columnCount.value,
      );
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-grid-row]').forEach((node) => connection.value?.setRowAttributes(node, { rowIndex: numberData(node.dataset['rowIndex'], 1) + headerCount.value, level: numberData(node.dataset['level'], 1), ...(node.dataset['expandable'] === undefined ? {} : { expanded: node.dataset['expanded'] !== undefined }) }));
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-grid-cell]').forEach((node) => { const id = node.dataset['sectileTreeGridCell']; if (id !== undefined) connection.value?.setCellAttributes(node, { id, columnIndex: numberData(node.dataset['columnIndex'], 1) }); });
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-grid-disclosure]').forEach((node) => { const id = node.dataset['sectileTreeGridDisclosure']; if (id !== undefined) connection.value?.setDisclosureAttributes(node, id); });
      element.value.querySelectorAll<HTMLInputElement>('[data-sectile-tree-grid-editor]').forEach((node) => { const id = node.dataset['sectileTreeGridEditor']; if (id !== undefined) connection.value?.bindEditor(node, { id, ...(node.getAttribute('aria-label') === null ? {} : { label: node.getAttribute('aria-label') as string }) }); });
    };
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return; localValue.value = snapshot.selection.selected[0] ?? null; localExpanded.value = snapshot.expansion.ids; localHighlight.value = snapshot.cursor.current; localEditMode.value = snapshot.editMode; refreshParts(); };
    const connect = (): void => {
      const nextOwner = snapshotTreeGridConnectionOwner(props);
      if (
        connection.value !== undefined
        && connectionOwner !== undefined
        && sameTreeGridConnectionOwner(connectionOwner, nextOwner)
      ) return;
      connection.value?.disconnect(); if (element.value === undefined) return;
      const cells = nextOwner.rows.flatMap((row) => row.cells.filter((id): id is string => id !== null));
      const branches = collectionBranchIDs(nextOwner.rows);
      const requestedValue = controlled.value ? props.modelValue as string | null : localValue.value;
      const requestedExpanded = controlled.expanded ? props.expandedValue as readonly string[] : localExpanded.value;
      const requestedHighlight = controlled.highlighted ? props.highlightedValue as string | null : localHighlight.value;
      const reconciled = reconcileCollectionState(
        cells,
        requestedValue === null ? [] : [requestedValue],
        requestedHighlight,
        [],
        'single',
        { preserveNullCurrent: true },
      );
      const expanded = reconcileCollectionState(
        branches,
        requestedExpanded,
        null,
        [],
        'multiple',
        { preserveNullCurrent: true },
      ).selected;
      const value = reconciled.selected[0] ?? null;
      const requestedEditMode = controlled.editMode ? props.editMode as TreeGridEditMode : localEditMode.value;
      const editMode = reconciled.current === null && requestedEditMode === 'editing'
        ? 'navigation'
        : requestedEditMode;
      localValue.value = value;
      localExpanded.value = expanded;
      localHighlight.value = reconciled.current;
      localEditMode.value = editMode;
      if (controlled.value && requestedValue !== value) emit('update:modelValue', value);
      if (controlled.expanded && !sameIDs(requestedExpanded, expanded)) emit('update:expandedValue', expanded);
      if (controlled.highlighted && requestedHighlight !== reconciled.current) emit('update:highlightedValue', reconciled.current);
      if (controlled.editMode && props.editMode !== editMode) emit('update:editMode', editMode);
      connection.value = createTreeGrid({
        root: element.value,
        rows: nextOwner.rows,
        getCellValue: (id) => props.getCellValue(id),
        setCellValue: (id, value) => props.setCellValue(id, value),
        ...(controlled.value ? { value } : { defaultValue: value }),
        ...(controlled.expanded ? { expandedValue: expanded } : { defaultExpandedValue: expanded }),
        ...(controlled.highlighted ? { highlightedValue: reconciled.current } : { defaultHighlightedValue: reconciled.current }),
        ...(controlled.editMode ? { editMode } : { defaultEditMode: editMode }),
        disabled: nextOwner.disabled, readOnly: nextOwner.readonly, ...(props.policies === undefined ? {} : { policies: props.policies }),
        onValueChange: ({ value }) => { localValue.value = value; emit('update:modelValue', value); }, onExpandedValueChange: ({ value }) => { localExpanded.value = value; emit('update:expandedValue', value); },
        onHighlightedValueChange: ({ value }) => { localHighlight.value = value; emit('update:highlightedValue', value); }, onEditModeChange: ({ value }) => { localEditMode.value = value; emit('update:editMode', value); }, onUpdate: refresh,
      });
      connectionOwner = nextOwner;
      refreshParts(); refresh();
    };
    let mounted = false;
    let editorFocused: HTMLInputElement | undefined;
    let editorComposing: HTMLInputElement | undefined;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const editorActive = (): boolean => editorFocused !== undefined || editorComposing !== undefined;
    const requestConnect = (): void => {
      if (editorActive()) {
        reconnectPending = true;
        return;
      }
      connect();
    };
    const schedulePendingConnect = (): void => {
      if (editorActive() || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || editorActive()) return;
        reconnectPending = false;
        connect();
      }, 0);
    };
    const setEditorFocused = (node: HTMLInputElement, focused: boolean): void => {
      if (focused) editorFocused = node;
      else if (editorFocused === node) editorFocused = undefined;
      schedulePendingConnect();
    };
    const setEditorComposing = (node: HTMLInputElement, composing: boolean): void => {
      if (composing) editorComposing = node;
      else if (editorComposing === node) editorComposing = undefined;
      schedulePendingConnect();
    };
    provide<Context>(key, {
      state, expandedRows, headers, headerCount,
      registerRow: (node, rowIndex, level, expanded) => connection.value?.setRowAttributes(node, { rowIndex: rowIndex + headerCount.value, level, ...(expanded === undefined ? {} : { expanded }) }),
      registerCell: (node, id, columnIndex) => connection.value?.setCellAttributes(node, { id, columnIndex }), registerDisclosure: (node, id) => connection.value?.setDisclosureAttributes(node, id),
      registerEditor: (node, id, label) => connection.value?.bindEditor(node, { id, ...(label === undefined ? {} : { label }) }),
      unregisterEditor: (node) => {
        connection.value?.unbindEditor(node);
        setEditorFocused(node, false);
        setEditorComposing(node, false);
      },
      setEditorFocused,
      setEditorComposing,
      handleEditorKeydown: (event) => {
        if (connection.value?.handleKeyboardEvent(event) !== true) return;
        event.preventDefault();
        event.stopPropagation();
      },
    });
    onMounted(() => {
      mounted = true;
      connect();
    });
    onBeforeUnmount(() => {
      mounted = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      editorFocused = undefined;
      editorComposing = undefined;
      connection.value?.disconnect();
    });
    watch([() => props.rows, () => props.getCellValue, () => props.setCellValue, () => props.disabled, () => props.readonly, () => props.policies], requestConnect);
    watch(headers, refreshParts, { flush: 'post' });
    watch([() => props.modelValue, () => props.expandedValue, () => props.highlightedValue, () => props.editMode], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.expanded ? { expandedValue: props.expandedValue } : {}), ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : {}), ...(controlled.editMode ? { editMode: props.editMode } : {}) });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { element.value = node instanceof HTMLElement ? node : undefined; },
      role: 'treegrid', 'aria-rowcount': props.rows.length + headerCount.value, 'aria-colcount': columnCount.value, 'data-column-count': columnCount.value,
      'data-scope': 'tree-grid', 'data-part': 'root', 'data-edit-mode': state.value.editMode,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type TreeGridValueChangeHandler = (value: string | null) => void;
export type TreeGridExpandedValueChangeHandler = (value: readonly string[]) => void;
export type TreeGridHighlightedValueChangeHandler = (value: string | null) => void;
export type TreeGridEditModeChangeHandler = (value: TreeGridEditMode) => void;

/** Authored alongside data rows; the root owns the count and data-index offset. */
export const TreeGridHeader = defineComponent({
  name: 'SectileTreeGridHeader', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: { readonly headers: readonly string[] }) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TreeGridHeader');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, role: 'row', 'aria-rowindex': 1, hidden: root.headerCount.value === 0,
      'data-scope': 'tree-grid', 'data-part': 'header',
    }), { default: () => slots['default']?.({ headers: root.headers.value })
      ?? root.headers.value.map((_label, index) => h(TreeGridHeaderCell, { key: index, columnIndex: index + 1 })) });
  },
});

export const TreeGridHeaderCell = defineComponent({
  name: 'SectileTreeGridHeaderCell', inheritAttrs: false,
  props: { columnIndex: { type: Number, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeGridHeaderCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TreeGridHeaderCell');
    return (): VNodeChild => {
      const label = root.headers.value[props.columnIndex - 1] ?? '';
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, role: 'columnheader', 'aria-colindex': props.columnIndex,
        'data-scope': 'tree-grid', 'data-part': 'headerCell',
      }), { default: () => slots['default']?.({ columnIndex: props.columnIndex, label }) ?? label });
    };
  },
});

export const TreeGridRow = defineComponent({
  name: 'SectileTreeGridRow', inheritAttrs: false,
  props: { value: { type: String, required: true }, rowIndex: { type: Number, required: true }, level: { type: Number, default: 1 }, expandable: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeGridRowSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('TreeGridRow'); const state = computed<TreeGridRowSlotProps>(() => ({ ...root.state.value, value: props.value, expanded: root.expandedRows.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerRow(node, props.rowIndex, props.level, props.expandable ? state.value.expanded : undefined); },
    role: 'row', 'aria-rowindex': props.rowIndex + root.headerCount.value, 'aria-level': props.level,
    'aria-expanded': props.expandable ? state.value.expanded : undefined,
    'data-sectile-tree-grid-row': props.value, 'data-row-index': props.rowIndex, 'data-level': props.level, 'data-expandable': props.expandable ? '' : undefined,
    'data-expanded': props.expandable && state.value.expanded ? '' : undefined, 'data-scope': 'tree-grid', 'data-part': 'row',
  }), { default: () => slots['default']?.(state.value) }); },
});

/** Rowgroup visibility borrows the root expansion owner and the shared Presence lifecycle. */
export const TreeGridGroup = defineComponent({
  name: 'SectileTreeGridGroup', inheritAttrs: false,
  props: { for: { type: String, required: true }, ...partProps, ...conditionalPresenceProps },
  slots: Object as SlotsType<{ default: (props: TreeGridRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TreeGridGroup'), expanded = computed(() => root.expandedRows.value.has(props.for));
    const presence = useConditionalPresence(expanded, computed(() => props.forcePresent));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: presence.register, role: 'rowgroup', hidden: presence.hidden.value,
      ...(!expanded.value && presence.present.value ? { inert: true, 'aria-hidden': 'true' } : {}),
      'data-scope': 'tree-grid', 'data-part': 'group', 'data-state': expanded.value ? 'open' : 'closed',
    }), { default: () => slots['default']?.(root.state.value) });
  },
});

export const TreeGridCell = defineComponent({
  name: 'SectileTreeGridCell', inheritAttrs: false,
  props: { value: { type: String, required: true }, columnIndex: { type: Number, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeGridCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('TreeGridCell'); const state = computed<TreeGridCellSlotProps>(() => ({ ...root.state.value, value: props.value, selected: root.state.value.value === props.value, highlighted: root.state.value.highlightedValue === props.value, editing: root.state.value.highlightedValue === props.value && root.state.value.editMode === 'editing' })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerCell(node, props.value, props.columnIndex); },
    role: 'gridcell', 'aria-colindex': props.columnIndex, 'aria-selected': state.value.selected,
    'data-sectile-tree-grid-cell': props.value, 'data-column-index': props.columnIndex, 'data-scope': 'tree-grid', 'data-part': 'cell',
    'data-selected': state.value.selected ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined, 'data-editing': state.value.editing ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export const TreeGridDisclosure = defineComponent({ name: 'SectileTreeGridDisclosure', inheritAttrs: false, props: { for: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: TreeGridRowSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('TreeGridDisclosure'); const state = computed<TreeGridRowSlotProps>(() => ({ ...root.state.value, value: props.for, expanded: root.expandedRows.value.has(props.for) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined, disabled: props.as === 'button' ? root.state.value.disabled : undefined, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerDisclosure(node, props.for); }, 'data-sectile-tree-grid-disclosure': props.for, 'data-scope': 'tree-grid', 'data-part': 'disclosure', 'data-state': state.value.expanded ? 'open' : 'closed' }), { default: () => slots['default']?.(state.value) }); } });

export const TreeGridEditor = defineComponent({
  name: 'SectileTreeGridEditor', inheritAttrs: false,
  props: { for: { type: String, required: true }, label: { type: String, default: undefined }, ...conditionalPresenceProps },
  setup(props, { attrs }) {
    const root = useRoot('TreeGridEditor');
    const editing = computed(() => root.state.value.highlightedValue === props.for && root.state.value.editMode === 'editing');
    const forcePresent = computed(() => props.forcePresent);
    const presence = useConditionalPresence(editing, forcePresent);
    let registeredInput: HTMLInputElement | undefined;
    const register = (node: unknown): void => {
      const element = presence.register(node);
      const input = element?.tagName === 'INPUT' ? element as HTMLInputElement : undefined;
      if (registeredInput !== undefined && registeredInput !== input) root.unregisterEditor(registeredInput);
      registeredInput = input;
      if (input !== undefined) root.registerEditor(input, props.for, props.label);
    };
    const setFocused = (focused: boolean): void => {
      if (registeredInput !== undefined) root.setEditorFocused(registeredInput, focused);
    };
    const setComposing = (composing: boolean): void => {
      if (registeredInput !== undefined) root.setEditorComposing(registeredInput, composing);
    };
    onBeforeUnmount(() => {
      if (registeredInput !== undefined) root.unregisterEditor(registeredInput);
      registeredInput = undefined;
    });
    return (): VNodeChild => {
      const inactivePresent = !editing.value && presence.present.value;
      return h('input', mergeProps(attrs, {
        ref: register,
        hidden: presence.hidden.value,
        tabindex: inactivePresent ? -1 : undefined,
        onKeydown: root.handleEditorKeydown,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onCompositionstart: () => setComposing(true),
        onCompositionend: () => setComposing(false),
        ...(inactivePresent ? { inert: true, 'aria-hidden': 'true' } : {}),
        disabled: root.state.value.disabled,
        readonly: root.state.value.readonly,
        'aria-label': props.label,
        'data-sectile-tree-grid-editor': props.for,
        'data-scope': 'tree-grid',
        'data-part': 'editor',
        'data-state': editing.value ? 'editing' : 'idle',
      }));
    };
  },
});

function numberData(value: string | undefined, fallback: number): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function maxTreeGridColumnCount(
  rows: readonly TreeGridRowInput<string, string>[],
): number {
  let maximum = 0;
  for (const row of rows) maximum = Math.max(maximum, row.cells.length);
  return maximum;
}
function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside TreeGridRoot.`); return root; }

function snapshotTreeGridConnectionOwner(
  props: Readonly<{
    rows: readonly TreeGridRowInput<string, string>[];
    getCellValue: TreeGridCellValueResolver;
    setCellValue: TreeGridCellValueSetter;
    disabled: boolean;
    readonly: boolean;
    policies: TreeGridPolicies<string> | undefined;
  }>,
): TreeGridConnectionOwner {
  return Object.freeze({
    rows: Object.freeze(props.rows.map((row) => Object.freeze({
      id: row.id,
      parentID: row.parentID,
      cells: Object.freeze([...row.cells]),
    }))),
    disabled: props.disabled,
    readonly: props.readonly,
    eligible: props.policies?.eligible,
    boundary: props.policies?.boundary,
    maxScan: props.policies?.maxScan,
  });
}

function sameTreeGridConnectionOwner(
  left: TreeGridConnectionOwner,
  right: TreeGridConnectionOwner,
): boolean {
  if (
    left.rows.length !== right.rows.length
    || left.disabled !== right.disabled
    || left.readonly !== right.readonly
    || left.eligible !== right.eligible
    || left.boundary !== right.boundary
    || left.maxScan !== right.maxScan
  ) return false;
  for (let rowIndex = 0; rowIndex < left.rows.length; rowIndex += 1) {
    const leftRow = left.rows[rowIndex]!;
    const rightRow = right.rows[rowIndex]!;
    if (
      leftRow.id !== rightRow.id
      || leftRow.parentID !== rightRow.parentID
      || leftRow.cells.length !== rightRow.cells.length
    ) return false;
    for (let column = 0; column < leftRow.cells.length; column += 1) {
      if (leftRow.cells[column] !== rightRow.cells[column]) return false;
    }
  }
  return true;
}
export type { TreeGridEditMode, TreeGridPolicies, TreeGridRowInput };
