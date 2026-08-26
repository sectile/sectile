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

export interface TreeGridRootProps {
  readonly rows: readonly TreeGridRowInput<string, string>[];
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

interface Context {
  readonly state: ComputedRef<TreeGridRootSlotProps>;
  registerRow(element: HTMLElement, rowIndex: number, level: number, expanded: boolean | undefined): void;
  registerCell(element: HTMLElement, id: string, columnIndex: number): void;
  registerDisclosure(element: HTMLElement, id: string): void;
  registerEditor(element: HTMLInputElement, id: string, label: string | undefined): void;
}
const key = Symbol('SectileTreeGridRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const TreeGridRoot = defineComponent({
  name: 'SectileTreeGridRoot', inheritAttrs: false,
  props: {
    rows: { type: Array as PropType<readonly TreeGridRowInput<string, string>[]>, required: true },
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
    const element = shallowRef<HTMLElement>(); const connection = shallowRef<TreeGridConnection<string, string>>();
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
    const refreshParts = (): void => {
      if (element.value === undefined || connection.value === undefined) return;
      connection.value.setGridAttributes(props.rows.length, Math.max(0, ...props.rows.map((row) => row.cells.length)));
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-grid-row]').forEach((node) => connection.value?.setRowAttributes(node, { rowIndex: numberData(node.dataset['rowIndex'], 1), level: numberData(node.dataset['level'], 1), ...(node.dataset['expandable'] === undefined ? {} : { expanded: node.dataset['expanded'] !== undefined }) }));
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-grid-cell]').forEach((node) => { const id = node.dataset['sectileTreeGridCell']; if (id !== undefined) connection.value?.setCellAttributes(node, { id, columnIndex: numberData(node.dataset['columnIndex'], 1) }); });
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-grid-disclosure]').forEach((node) => { const id = node.dataset['sectileTreeGridDisclosure']; if (id !== undefined) connection.value?.setDisclosureAttributes(node, id); });
      element.value.querySelectorAll<HTMLInputElement>('[data-sectile-tree-grid-editor]').forEach((node) => { const id = node.dataset['sectileTreeGridEditor']; if (id !== undefined) connection.value?.bindEditor(node, { id, ...(node.getAttribute('aria-label') === null ? {} : { label: node.getAttribute('aria-label') as string }) }); });
    };
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return; localValue.value = snapshot.selection.selected[0] ?? null; localExpanded.value = snapshot.expansion.ids; localHighlight.value = snapshot.cursor.current; localEditMode.value = snapshot.editMode; refreshParts(); };
    const connect = (): void => {
      connection.value?.disconnect(); if (element.value === undefined) return;
      const cells = props.rows.flatMap((row) => row.cells.filter((id): id is string => id !== null));
      const branches = collectionBranchIDs(props.rows);
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
        root: element.value, rows: props.rows, getCellValue: props.getCellValue, setCellValue: props.setCellValue,
        ...(controlled.value ? { value } : { defaultValue: value }),
        ...(controlled.expanded ? { expandedValue: expanded } : { defaultExpandedValue: expanded }),
        ...(controlled.highlighted ? { highlightedValue: reconciled.current } : { defaultHighlightedValue: reconciled.current }),
        ...(controlled.editMode ? { editMode } : { defaultEditMode: editMode }),
        disabled: props.disabled, readOnly: props.readonly, ...(props.policies === undefined ? {} : { policies: props.policies }),
        onValueChange: ({ value }) => { localValue.value = value; emit('update:modelValue', value); }, onExpandedValueChange: ({ value }) => { localExpanded.value = value; emit('update:expandedValue', value); },
        onHighlightedValueChange: ({ value }) => { localHighlight.value = value; emit('update:highlightedValue', value); }, onEditModeChange: ({ value }) => { localEditMode.value = value; emit('update:editMode', value); }, onUpdate: refresh,
      });
      refreshParts(); refresh();
    };
    provide<Context>(key, {
      state, registerRow: (node, rowIndex, level, expanded) => connection.value?.setRowAttributes(node, { rowIndex, level, ...(expanded === undefined ? {} : { expanded }) }),
      registerCell: (node, id, columnIndex) => connection.value?.setCellAttributes(node, { id, columnIndex }), registerDisclosure: (node, id) => connection.value?.setDisclosureAttributes(node, id),
      registerEditor: (node, id, label) => connection.value?.bindEditor(node, { id, ...(label === undefined ? {} : { label }) }),
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.rows, () => props.getCellValue, () => props.setCellValue, () => props.disabled, () => props.readonly, () => props.policies], connect);
    watch([() => props.modelValue, () => props.expandedValue, () => props.highlightedValue, () => props.editMode], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.expanded ? { expandedValue: props.expandedValue } : {}), ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : {}), ...(controlled.editMode ? { editMode: props.editMode } : {}) });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { element.value = node instanceof HTMLElement ? node : undefined; }, 'data-scope': 'tree-grid', 'data-part': 'root', 'data-edit-mode': state.value.editMode }), { default: () => slots['default']?.(state.value) });
  },
});

export type TreeGridValueChangeHandler = (value: string | null) => void;
export type TreeGridExpandedValueChangeHandler = (value: readonly string[]) => void;
export type TreeGridHighlightedValueChangeHandler = (value: string | null) => void;
export type TreeGridEditModeChangeHandler = (value: TreeGridEditMode) => void;

export const TreeGridRow = defineComponent({
  name: 'SectileTreeGridRow', inheritAttrs: false,
  props: { value: { type: String, required: true }, rowIndex: { type: Number, required: true }, level: { type: Number, default: 1 }, expandable: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeGridRowSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('TreeGridRow'); const state = computed<TreeGridRowSlotProps>(() => ({ ...root.state.value, value: props.value, expanded: root.state.value.expandedValue.includes(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerRow(node, props.rowIndex, props.level, props.expandable ? state.value.expanded : undefined); },
    'data-sectile-tree-grid-row': props.value, 'data-row-index': props.rowIndex, 'data-level': props.level, 'data-expandable': props.expandable ? '' : undefined,
    'data-expanded': props.expandable && state.value.expanded ? '' : undefined, 'data-scope': 'tree-grid', 'data-part': 'row',
  }), { default: () => slots['default']?.(state.value) }); },
});

export const TreeGridCell = defineComponent({
  name: 'SectileTreeGridCell', inheritAttrs: false,
  props: { value: { type: String, required: true }, columnIndex: { type: Number, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeGridCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('TreeGridCell'); const state = computed<TreeGridCellSlotProps>(() => ({ ...root.state.value, value: props.value, selected: root.state.value.value === props.value, highlighted: root.state.value.highlightedValue === props.value, editing: root.state.value.highlightedValue === props.value && root.state.value.editMode === 'editing' })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerCell(node, props.value, props.columnIndex); },
    'data-sectile-tree-grid-cell': props.value, 'data-column-index': props.columnIndex, 'data-scope': 'tree-grid', 'data-part': 'cell',
    'data-selected': state.value.selected ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined, 'data-editing': state.value.editing ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export const TreeGridDisclosure = defineComponent({ name: 'SectileTreeGridDisclosure', inheritAttrs: false, props: { for: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: TreeGridRowSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('TreeGridDisclosure'); const state = computed<TreeGridRowSlotProps>(() => ({ ...root.state.value, value: props.for, expanded: root.state.value.expandedValue.includes(props.for) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined, disabled: props.as === 'button' ? root.state.value.disabled : undefined, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerDisclosure(node, props.for); }, 'data-sectile-tree-grid-disclosure': props.for, 'data-scope': 'tree-grid', 'data-part': 'disclosure', 'data-state': state.value.expanded ? 'open' : 'closed' }), { default: () => slots['default']?.(state.value) }); } });

export const TreeGridEditor = defineComponent({
  name: 'SectileTreeGridEditor', inheritAttrs: false,
  props: { for: { type: String, required: true }, label: { type: String, default: undefined } },
  setup(props, { attrs }) { const root = useRoot('TreeGridEditor'); const editing = computed(() => root.state.value.highlightedValue === props.for && root.state.value.editMode === 'editing'); return (): VNodeChild => h('input', mergeProps(attrs, { ref: (node: unknown) => { if (node instanceof HTMLInputElement) root.registerEditor(node, props.for, props.label); }, hidden: !editing.value, disabled: root.state.value.disabled, readonly: root.state.value.readonly, 'aria-label': props.label, 'data-sectile-tree-grid-editor': props.for, 'data-scope': 'tree-grid', 'data-part': 'editor' })); },
});

function numberData(value: string | undefined, fallback: number): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside TreeGridRoot.`); return root; }
export type { TreeGridEditMode, TreeGridPolicies, TreeGridRowInput };
