import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createGridControl, type GridConnection, type GridEditMode, type GridPolicies } from '@sectile/dom/grid';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface GridRootProps {
  readonly rows: readonly (readonly (string | null)[])[];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly highlightedValue?: string | null;
  readonly defaultHighlightedValue?: string | null;
  readonly editMode?: GridEditMode;
  readonly defaultEditMode?: GridEditMode;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly policies?: GridPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface GridRootSlotProps { readonly value: string | null; readonly highlightedValue: string | null; readonly editMode: GridEditMode; readonly disabled: boolean; readonly: boolean }
export interface GridCellSlotProps extends GridRootSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface GridPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<GridRootSlotProps>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  registerCell(element: HTMLElement, id: string, disabled: boolean): void;
}
const key = Symbol('SectileGridRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const GridRoot = defineComponent({
  name: 'SectileGridRoot', inheritAttrs: false,
  props: {
    rows: { type: Array as PropType<readonly (readonly (string | null)[])[]>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    highlightedValue: { type: String as PropType<string | null>, default: undefined }, defaultHighlightedValue: { type: String as PropType<string | null>, default: null },
    editMode: { type: String as PropType<GridEditMode>, default: undefined }, defaultEditMode: { type: String as PropType<GridEditMode>, default: 'navigation' },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false },
    label: { type: String, default: undefined }, policies: { type: Object as PropType<GridPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string | null): boolean => true, 'update:highlightedValue': (_value: string | null): boolean => true,
    'update:editMode': (_value: GridEditMode): boolean => true, 'edit-start': (_value: string): boolean => true,
    'edit-commit': (_value: string): boolean => true, 'edit-cancel': (_value: string): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: GridRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const element = shallowRef<HTMLElement>(); const connection = shallowRef<GridConnection<string>>();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localHighlight = shallowRef<string | null>(props.highlightedValue !== undefined ? props.highlightedValue : props.defaultHighlightedValue);
    const localEditMode = shallowRef<GridEditMode>(props.editMode ?? props.defaultEditMode);
    const controlled = {
      value: useControlledStateInvariant('GridRoot', 'modelValue', () => props.modelValue),
      highlighted: useControlledStateInvariant('GridRoot', 'highlightedValue', () => props.highlightedValue),
      editMode: useControlledStateInvariant('GridRoot', 'editMode', () => props.editMode),
    };
    const state = computed<GridRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      highlightedValue: props.highlightedValue !== undefined ? props.highlightedValue : localHighlight.value,
      editMode: props.editMode ?? localEditMode.value, disabled: props.disabled, readonly: props.readonly,
    }));
    const refreshParts = (): void => { if (element.value === undefined || connection.value === undefined) return; element.value.querySelectorAll<HTMLElement>('[data-sectile-grid-cell]').forEach((node) => { const id = node.dataset['sectileGridCell']; if (id !== undefined) connection.value?.setCellAttributes(node, id, { disabled: node.dataset['sectileGridItemDisabled'] !== undefined }); }); };
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return; localValue.value = snapshot.selection.selected[0] ?? null; localHighlight.value = snapshot.cursor.current; localEditMode.value = snapshot.editMode; refreshParts(); };
    const connect = (): void => {
      connection.value?.disconnect(); if (element.value === undefined) return;
      const items = props.rows.flatMap((row) => row.filter((id): id is string => id !== null));
      const requestedValue = controlled.value ? props.modelValue as string | null : localValue.value;
      const requestedHighlight = controlled.highlighted ? props.highlightedValue as string | null : localHighlight.value;
      const reconciled = reconcileCollectionState(
        items,
        requestedValue === null ? [] : [requestedValue],
        requestedHighlight,
        props.disabledItems,
        'single',
        { preserveNullCurrent: true },
      );
      const value = reconciled.selected[0] ?? null;
      const requestedEditMode = controlled.editMode ? props.editMode as GridEditMode : localEditMode.value;
      const editMode = reconciled.current === null && requestedEditMode === 'editing'
        ? 'navigation'
        : requestedEditMode;
      localValue.value = value;
      localHighlight.value = reconciled.current;
      localEditMode.value = editMode;
      if (controlled.value && requestedValue !== value) emit('update:modelValue', value);
      if (controlled.highlighted && requestedHighlight !== reconciled.current) emit('update:highlightedValue', reconciled.current);
      if (controlled.editMode && props.editMode !== editMode) emit('update:editMode', editMode);
      connection.value = createGridControl({
        root: element.value, rows: props.rows,
        ...(controlled.value ? { value } : { defaultValue: value }),
        ...(controlled.highlighted ? { highlightedValue: reconciled.current } : { defaultHighlightedValue: reconciled.current }),
        ...(controlled.editMode ? { editMode } : { defaultEditMode: editMode }),
        disabledItems: props.disabledItems, disabled: props.disabled, readOnly: props.readonly,
        ...(props.label === undefined ? {} : { label: props.label }), ...(props.policies === undefined ? {} : { policies: props.policies }),
        onValueChange: (value) => { localValue.value = value; emit('update:modelValue', value); }, onHighlightedValueChange: (value) => { localHighlight.value = value; emit('update:highlightedValue', value); },
        onEditModeChange: (value) => { localEditMode.value = value; emit('update:editMode', value); }, onEditStart: (id) => emit('edit-start', id),
        onEditCommit: (id) => emit('edit-commit', id), onEditCancel: (id) => emit('edit-cancel', id), onUpdate: refresh,
      });
      refreshParts(); refresh();
    };
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    provide<Context>(key, { state, disabledItems, registerCell: (node, id, disabled) => connection.value?.setCellAttributes(node, id, { disabled }) });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.rows, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.label, () => props.policies], connect);
    watch([() => props.modelValue, () => props.highlightedValue, () => props.editMode], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : {}), ...(controlled.editMode ? { editMode: props.editMode } : {}) });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { element.value = node instanceof HTMLElement ? node : undefined; },
      'data-scope': 'grid', 'data-part': 'root', 'data-edit-mode': state.value.editMode,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type GridValueChangeHandler = (value: string | null) => void;
export type GridHighlightedValueChangeHandler = (value: string | null) => void;
export type GridEditModeChangeHandler = (value: GridEditMode) => void;
export type GridEditStartHandler = (value: string) => void;
export type GridEditCommitHandler = (value: string) => void;
export type GridEditCancelHandler = (value: string) => void;

export const GridRow = defineComponent({ name: 'SectileGridRow', inheritAttrs: false, props: partProps, slots: Object as SlotsType<{ default: (props: GridRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('GridRow'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: 'row', 'data-scope': 'grid', 'data-part': 'row' }), { default: () => slots['default']?.(root.state.value) }); } });

export const GridCell = defineComponent({
  name: 'SectileGridCell', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: GridCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('GridCell'); const state = computed<GridCellSlotProps>(() => ({ ...root.state.value, value: props.value, selected: root.state.value.value === props.value, highlighted: root.state.value.highlightedValue === props.value, disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerCell(node, props.value, props.disabled); },
    'data-sectile-grid-cell': props.value, 'data-sectile-grid-item-disabled': props.disabled ? '' : undefined, 'data-scope': 'grid', 'data-part': 'cell', 'data-selected': state.value.selected ? '' : undefined,
    'data-highlighted': state.value.highlighted ? '' : undefined, 'data-disabled': state.value.disabled ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside GridRoot.`); return root; }
export type { GridEditMode, GridPolicies };
