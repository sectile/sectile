import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createTreeView,
  type TreeNodeInput,
  type TreeViewConnection,
  type TreeViewSelectionMode,
} from '@sectile/dom/tree-view';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface TreeViewRootProps {
  readonly nodes: readonly TreeNodeInput<string>[];
  readonly selectionMode?: TreeViewSelectionMode;
  readonly modelValue?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly expandedValues?: readonly string[];
  readonly defaultExpandedValues?: readonly string[];
  readonly highlightedValue?: string | null;
  readonly defaultHighlightedValue?: string | null;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly policies?: TreeViewPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface TreeViewPolicies<ID extends string = string> { readonly eligible?: (id: ID) => boolean }

export type TreeViewEligiblePredicate<ID extends string = string> = NonNullable<TreeViewPolicies<ID>['eligible']>;
export interface TreeViewRootSlotProps { readonly value: readonly string[]; readonly expandedValues: readonly string[]; readonly highlightedValue: string | null; readonly disabled: boolean; readonly: boolean }
export interface TreeViewItemSlotProps extends Omit<TreeViewRootSlotProps, 'value'> { readonly value: string; readonly selectedValues: readonly string[]; readonly selected: boolean; readonly expanded: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface TreeViewPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TreeViewGroupProps extends TreeViewPartProps { readonly for: string }

interface Context {
  readonly state: ComputedRef<TreeViewRootSlotProps>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
  registerDisclosure(element: HTMLElement, id: string): void;
}
const key = Symbol('SectileTreeViewRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const TreeViewRoot = defineComponent({
  name: 'SectileTreeViewRoot', inheritAttrs: false,
  props: {
    nodes: { type: Array as PropType<readonly TreeNodeInput<string>[]>, required: true },
    selectionMode: { type: String as PropType<TreeViewSelectionMode>, default: 'single' },
    modelValue: { type: Array as PropType<readonly string[]>, default: undefined }, defaultValue: { type: Array as PropType<readonly string[]>, default: () => [] },
    expandedValues: { type: Array as PropType<readonly string[]>, default: undefined }, defaultExpandedValues: { type: Array as PropType<readonly string[]>, default: () => [] },
    highlightedValue: { type: String as PropType<string | null>, default: undefined }, defaultHighlightedValue: { type: String as PropType<string | null>, default: null },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false },
    label: { type: String, default: undefined }, policies: { type: Object as PropType<TreeViewPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: readonly string[]): boolean => true, 'update:expandedValues': (_value: readonly string[]): boolean => true, 'update:highlightedValue': (_value: string | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: TreeViewRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const element = shallowRef<HTMLElement>(); const connection = shallowRef<TreeViewConnection<string>>();
    const localValue = shallowRef<readonly string[]>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localExpanded = shallowRef<readonly string[]>(props.expandedValues !== undefined ? props.expandedValues : props.defaultExpandedValues);
    const localHighlight = shallowRef<string | null>(props.highlightedValue !== undefined ? props.highlightedValue : props.defaultHighlightedValue);
    const controlled = {
      value: useControlledStateInvariant('TreeViewRoot', 'modelValue', () => props.modelValue),
      expanded: useControlledStateInvariant('TreeViewRoot', 'expandedValues', () => props.expandedValues),
      highlighted: useControlledStateInvariant('TreeViewRoot', 'highlightedValue', () => props.highlightedValue),
    };
    const state = computed<TreeViewRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      expandedValues: props.expandedValues !== undefined ? props.expandedValues : localExpanded.value,
      highlightedValue: props.highlightedValue !== undefined ? props.highlightedValue : localHighlight.value,
      disabled: props.disabled, readonly: props.readonly,
    }));
    const refreshParts = (): void => {
      if (element.value === undefined || connection.value === undefined) return;
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-view-item]').forEach((node) => { const id = node.dataset['sectileTreeViewItem']; if (id !== undefined) connection.value?.setItemAttributes(node, { id, disabled: node.dataset['disabled'] !== undefined }); });
      element.value.querySelectorAll<HTMLElement>('[data-sectile-tree-view-disclosure]').forEach((node) => { const id = node.dataset['sectileTreeViewDisclosure']; if (id !== undefined) connection.value?.setDisclosureAttributes(node, id); });
    };
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return; localValue.value = snapshot.selection.selected; localExpanded.value = snapshot.expansion.ids; localHighlight.value = snapshot.cursor.current; refreshParts(); };
    const connect = (): void => {
      connection.value?.disconnect(); if (element.value === undefined) return;
      connection.value = createTreeView({
        root: element.value, nodes: props.nodes, selectionMode: props.selectionMode,
        ...(controlled.value ? { value: props.modelValue as readonly string[] } : { defaultValue: localValue.value }),
        ...(controlled.expanded ? { expandedValues: props.expandedValues as readonly string[] } : { defaultExpandedValues: localExpanded.value }),
        ...(controlled.highlighted ? { highlightedValue: props.highlightedValue as string | null } : { defaultHighlightedValue: localHighlight.value }),
        disabledItems: props.disabledItems, disabled: props.disabled, readOnly: props.readonly,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        onValueChange: ({ value }) => { localValue.value = value; emit('update:modelValue', value); },
        onExpandedValuesChange: ({ value }) => { localExpanded.value = value; emit('update:expandedValues', value); },
        onHighlightedValueChange: ({ value }) => { localHighlight.value = value; emit('update:highlightedValue', value); }, onUpdate: refresh,
      });
      connection.value.setTreeAttributes(props.label); refreshParts(); refresh();
    };
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    provide<Context>(key, {
      state, disabledItems,
      registerItem: (node, id, disabled) => connection.value?.setItemAttributes(node, { id, disabled }),
      registerDisclosure: (node, id) => connection.value?.setDisclosureAttributes(node, id),
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.nodes, () => props.selectionMode, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.label, () => props.policies], connect);
    watch([() => props.modelValue, () => props.expandedValues, () => props.highlightedValue], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.expanded ? { expandedValues: props.expandedValues } : {}), ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : {}) });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { element.value = node instanceof HTMLElement ? node : undefined; },
      'data-scope': 'tree-view', 'data-part': 'root',
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type TreeViewValueChangeHandler = (value: readonly string[]) => void;
export type TreeViewExpandedValuesChangeHandler = (value: readonly string[]) => void;
export type TreeViewHighlightedValueChangeHandler = (value: string | null) => void;

export const TreeViewGroup = defineComponent({
  name: 'SectileTreeViewGroup', inheritAttrs: false,
  props: { for: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeViewRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TreeViewGroup');
    const expanded = computed(() => root.state.value.expandedValues.includes(props.for));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, role: 'group', hidden: !expanded.value,
      'data-scope': 'tree-view', 'data-part': 'group', 'data-state': expanded.value ? 'open' : 'closed',
    }), { default: () => slots['default']?.(root.state.value) });
  },
});

export const TreeViewItem = defineComponent({
  name: 'SectileTreeViewItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TreeViewItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('TreeViewItem'); const state = computed<TreeViewItemSlotProps>(() => ({ expandedValues: root.state.value.expandedValues, highlightedValue: root.state.value.highlightedValue, readonly: root.state.value.readonly, value: props.value, selectedValues: root.state.value.value, selected: root.state.value.value.includes(props.value), expanded: root.state.value.expandedValues.includes(props.value), highlighted: root.state.value.highlightedValue === props.value, disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerItem(node, props.value, props.disabled); },
    'data-sectile-tree-view-item': props.value, 'data-scope': 'tree-view', 'data-part': 'item',
    'data-selected': state.value.selected ? '' : undefined, 'data-expanded': state.value.expanded ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
    'data-disabled': state.value.disabled ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export const TreeViewDisclosure = defineComponent({
  name: 'SectileTreeViewDisclosure', inheritAttrs: false,
  props: { for: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: TreeViewItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('TreeViewDisclosure'); const state = computed<TreeViewItemSlotProps>(() => ({ expandedValues: root.state.value.expandedValues, highlightedValue: root.state.value.highlightedValue, readonly: root.state.value.readonly, value: props.for, selectedValues: root.state.value.value, selected: root.state.value.value.includes(props.for), expanded: root.state.value.expandedValues.includes(props.for), highlighted: root.state.value.highlightedValue === props.for, disabled: root.state.value.disabled || root.disabledItems.value.has(props.for) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined, disabled: props.as === 'button' ? state.value.disabled : undefined,
    elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerDisclosure(node, props.for); }, 'data-sectile-tree-view-disclosure': props.for,
    'data-scope': 'tree-view', 'data-part': 'disclosure', 'data-state': state.value.expanded ? 'open' : 'closed',
  }), { default: () => slots['default']?.(state.value) }); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside TreeViewRoot.`); return root; }
export type { TreeNodeInput, TreeViewSelectionMode };
