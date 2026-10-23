import { computed, defineComponent, h, mergeProps, onBeforeUnmount, onBeforeUpdate, onMounted, onUpdated, shallowRef, watch,
  type DefineSetupFnComponent, type EmitsToProps, type PropType, type PublicProps, type SlotsType, type VNodeChild } from 'vue';
import type { CheckboxValue } from '@sectile/core/checkbox';
import { createTree, type TreeNodeInput } from '@sectile/core/tree';
import { unwrap } from '@sectile/core/result';
import { connectCheckboxTree, createCheckboxTreeController, type CheckboxTreeController, type CheckboxTreeConnection } from '@sectile/dom/checkbox-tree';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { reconcileCollectionState, sameIDs } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { createTreeGroup, createTreeItem, createTreeDisclosure, provideTreeParts } from './internal/tree-parts.js';
import { useHostActive } from './host-provider.js';
import type { TreeViewRootSlotProps, TreeViewItemSlotProps, TreeViewPartProps, TreeViewGroupProps } from './tree-view.js';

export interface CheckboxTreeRootProps<ID extends string = string> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly modelValue?: readonly NoInfer<ID>[];
  readonly defaultValue?: readonly NoInfer<ID>[];
  readonly expandedValues?: readonly NoInfer<ID>[];
  readonly defaultExpandedValues?: readonly NoInfer<ID>[];
  readonly highlightedValue?: NoInfer<ID> | null;
  readonly defaultHighlightedValue?: NoInfer<ID> | null;
  readonly disabledItems?: readonly NoInfer<ID>[];
  readonly disabledPropagation?: 'self' | 'subtree';
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export type CheckboxTreeRootSlotProps<ID extends string = string> = Omit<TreeViewRootSlotProps, 'value' | 'expandedValues' | 'highlightedValue'> & {
  readonly value: readonly ID[]; readonly expandedValues: readonly ID[]; readonly highlightedValue: ID | null;
};
export interface CheckboxTreeItemProps extends TreeViewPartProps { readonly value: string; readonly disabled?: never }
export interface CheckboxTreeItemSlotProps extends TreeViewItemSlotProps { readonly checked: CheckboxValue }
export type CheckboxTreeGroupProps = TreeViewGroupProps;
export interface CheckboxTreeDisclosureProps extends TreeViewPartProps { readonly for: string }
export type CheckboxTreeEmits<ID extends string = string> = {
  'update:modelValue': [value: readonly NoInfer<ID>[]];
  'update:expandedValues': [value: readonly NoInfer<ID>[]];
  'update:highlightedValue': [value: NoInfer<ID> | null];
};
export interface CheckboxTreeSlots<ID extends string = string> { default?: (state: CheckboxTreeRootSlotProps<ID>) => VNodeChild }
export interface CheckboxTreeExpose { readonly element: HTMLElement | null; focus(options?: FocusOptions): void }

interface Owner {
  readonly nodes: readonly TreeNodeInput<string>[];
  readonly disabledItems: readonly string[];
  readonly propagation: 'self' | 'subtree';
  readonly disabled: boolean;
  readonly readonly: boolean;
}
const empty: readonly string[] = /* @__PURE__ */ Object.freeze([]);
const noItems: Pick<ReadonlySet<string>, 'has'> = /* @__PURE__ */ Object.freeze({ has: (_id: string): boolean => false });
function sameOwner(owner: Owner, props: Required<Pick<CheckboxTreeRootProps, 'nodes' | 'disabledItems' | 'disabledPropagation' | 'disabled' | 'readonly'>>): boolean {
  return owner.propagation === props.disabledPropagation && owner.disabled === props.disabled && owner.readonly === props.readonly
    && sameIDs(owner.disabledItems, props.disabledItems) && owner.nodes.length === props.nodes.length
    && owner.nodes.every((node, index) => node.id === props.nodes[index]?.id && node.parentID === props.nodes[index]?.parentID);
}

const CheckboxTreeRootImplementation = /* @__PURE__ */ defineComponent({
  name: 'SectileCheckboxTreeRoot', inheritAttrs: false,
  props: {
    nodes: { type: Array as PropType<readonly TreeNodeInput<string>[]>, required: true },
    modelValue: { type: Array as PropType<readonly string[]>, default: undefined }, defaultValue: { type: Array as PropType<readonly string[]>, default: () => empty },
    expandedValues: { type: Array as PropType<readonly string[]>, default: undefined }, defaultExpandedValues: { type: Array as PropType<readonly string[]>, default: () => empty },
    highlightedValue: { type: String as PropType<string | null>, default: undefined }, defaultHighlightedValue: { type: String as PropType<string | null>, default: null },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => empty }, disabledPropagation: { type: String as PropType<'self' | 'subtree'>, default: 'subtree' },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: String,
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: readonly string[]): boolean => true, 'update:expandedValues': (_value: readonly string[]): boolean => true, 'update:highlightedValue': (_value: string | null): boolean => true },
  slots: Object as SlotsType<CheckboxTreeSlots>,
  setup(props, { attrs, emit, slots, expose }) {
    const element = shallowRef<HTMLElement>(), controller = shallowRef<CheckboxTreeController<string>>();
    const accepted = shallowRef<ReturnType<CheckboxTreeController<string>['getSnapshot']>>();
    const items = new Map<HTMLElement, string>(), disclosures = new Map<HTMLElement, string>();
    const active = useHostActive();
    let connection: CheckboxTreeConnection<string> | undefined, owner: Owner | undefined, generation = 0, mounted = false, alive = true, restoreFocus = false;
    let previousElement: HTMLElement | undefined, elementHadFocus = false;
    const controlled = {
      value: useControlledStateInvariant('CheckboxTreeRoot', 'modelValue', () => props.modelValue),
      expanded: useControlledStateInvariant('CheckboxTreeRoot', 'expandedValues', () => props.expandedValues),
      highlighted: useControlledStateInvariant('CheckboxTreeRoot', 'highlightedValue', () => props.highlightedValue),
    };
    const publish = (): void => { accepted.value = controller.value?.getSnapshot(); };
    const refreshParts = (): void => {
      if (!connection) return;
      for (const [node, id] of items) connection.setItemAttributes(node, { id });
      for (const [node, id] of disclosures) connection.setDisclosureAttributes(node, id);
    };
    const refresh = (): void => { publish(); refreshParts(); };
    const retire = (): void => { connection?.disconnect(); connection = undefined; };
    const attach = (): void => {
      retire();
      if (!alive || !mounted || !active.value || !element.value || !controller.value) {
        if (!active.value || !alive) restoreFocus = false;
        return;
      }
      connection = connectCheckboxTree({ root: element.value, controller: controller.value, disabled: props.disabled, readOnly: props.readonly, onUpdate: refresh });
      connection.setTreeAttributes(props.label); refreshParts();
    };
    const build = (): void => {
      if (!alive || owner && sameOwner(owner, props)) return;
      const previous = controller.value?.getSnapshot().state;
      const requestedValue = controlled.value ? props.modelValue as readonly string[] : previous?.selection.selected ?? props.defaultValue;
      const requestedExpanded = controlled.expanded ? props.expandedValues as readonly string[] : previous?.expansion.ids ?? props.defaultExpandedValues;
      const requestedHighlight = controlled.highlighted ? props.highlightedValue as string | null : previous ? previous.cursor.current : props.defaultHighlightedValue;
      const tree = createTree(props.nodes);
      const value = previous ? reconcileCollectionState(tree.preorder().ids.filter(id => tree.isLeaf(id) === true), requestedValue, null, empty, 'multiple', { preserveNullCurrent: true }).selected : requestedValue;
      const expanded = tree.normalizeExpansion(requestedExpanded).ids;
      const nextGeneration = generation + 1;
      const current = (): boolean => alive && generation === nextGeneration;
      const next = unwrap(createCheckboxTreeController({ tree,
        ...(controlled.value ? { value } : { defaultValue: value }),
        ...(controlled.expanded ? { expandedValues: expanded } : { defaultExpandedValues: expanded }),
        ...(controlled.highlighted ? { highlightedValue: null } : { defaultHighlightedValue: null }),
        disabledItems: props.disabledItems, disabledPropagation: props.disabledPropagation, disabled: props.disabled, readOnly: props.readonly,
        onValueChange: ({ value: proposed }) => { if (current()) { publish(); emit('update:modelValue', proposed); } },
        onExpandedValuesChange: ({ value: proposed }) => { if (current()) { publish(); emit('update:expandedValues', proposed); } },
        onHighlightedValueChange: ({ value: proposed }) => { if (current()) { publish(); emit('update:highlightedValue', proposed); } },
      }));
      const visible = tree.visible(expanded).ids;
      const highlighted = reconcileCollectionState(visible, empty, requestedHighlight, visible.filter(id => next.isDisabled(id) !== false), 'multiple', { preserveNullCurrent: true }).current;
      if (controlled.highlighted) unwrap(next.syncControlledValues({
        ...(controlled.value ? { value: next.getSnapshot().state.selection.selected } : {}),
        ...(controlled.expanded ? { expandedValues: expanded } : {}), highlightedValue: highlighted,
      }));
      else if (highlighted !== null && !props.disabled) {
        const focused = next.handleEvent({ type: 'focus', id: highlighted });
        if (!focused.ok) throw new TypeError(focused.error.message);
      }
      restoreFocus = active.value && element.value !== undefined && element.value.contains(element.value.ownerDocument.activeElement);
      retire(); generation = nextGeneration; controller.value = next;
      owner = { nodes: props.nodes.map(node => ({ id: node.id, parentID: node.parentID })), disabledItems: [...props.disabledItems], propagation: props.disabledPropagation, disabled: props.disabled, readonly: props.readonly };
      publish(); attach();
      const state = next.getSnapshot().state;
      if (current() && !sameIDs(requestedValue, state.selection.selected) && (previous || controlled.value)) emit('update:modelValue', state.selection.selected);
      if (current() && !sameIDs(requestedExpanded, state.expansion.ids) && (previous || controlled.expanded)) emit('update:expandedValues', state.expansion.ids);
      if (current() && requestedHighlight !== state.cursor.current && (previous || controlled.highlighted)) emit('update:highlightedValue', state.cursor.current);
    };
    build();
    const state = computed<TreeViewRootSlotProps>(() => ({
      value: accepted.value?.state.selection.selected ?? empty, expandedValues: accepted.value?.state.expansion.ids ?? empty,
      highlightedValue: accepted.value?.state.cursor.current ?? null, disabled: props.disabled || !active.value, readonly: props.readonly,
    }));
    provideTreeParts({ scope: 'checkbox-tree', state,
      selectedItems: computed(() => accepted.value?.state.selection ?? noItems),
      expandedItems: computed(() => accepted.value?.state.expansion ?? noItems), disabledItems: computed(() => noItems),
      checking: {
        getChecked: (id) => { accepted.value; return controller.value?.getChecked(id) ?? null; },
        isDisabled: (id) => { accepted.value; return controller.value?.isDisabled(id) ?? null; },
        levelOf: (id) => (controller.value?.tree.depthOf(id) ?? 0) + 1,
        isLeaf: (id) => controller.value?.tree.isLeaf(id) !== false,
      },
      registerItem: (node, id) => { if (!alive) return; items.set(node, id); connection?.setItemAttributes(node, { id }); },
      unregisterItem: (node, id) => { if (items.get(node) !== id) return; items.delete(node); connection?.releaseItem(node, id); },
      registerDisclosure: (node, id) => { if (!alive) return; disclosures.set(node, id); connection?.setDisclosureAttributes(node, id); },
      unregisterDisclosure: (node, id) => { if (disclosures.get(node) === id) disclosures.delete(node); },
    });
    expose({ get element() { return element.value ?? null; }, focus(options?: FocusOptions) { if (alive && active.value) element.value?.focus(options); } });
    onMounted(() => { mounted = true; attach(); });
    onBeforeUpdate(() => { previousElement = element.value; elementHadFocus = element.value?.contains(element.value.ownerDocument.activeElement) ?? false; });
    onUpdated(() => {
      if ((restoreFocus || elementHadFocus && previousElement !== element.value) && alive && active.value) connection?.focusCurrent();
      restoreFocus = false; previousElement = undefined; elementHadFocus = false;
    });
    onBeforeUnmount(() => { alive = false; mounted = false; generation++; retire(); items.clear(); disclosures.clear(); controller.value = undefined; accepted.value = undefined; element.value = undefined; });
    watch([active, element], attach, { flush: 'sync' });
    watch([() => props.nodes, () => props.disabledItems, () => props.disabledPropagation, () => props.disabled, () => props.readonly], build);
    watch(() => props.label, label => connection?.setTreeAttributes(label));
    watch([() => props.modelValue, () => props.expandedValues, () => props.highlightedValue], () => {
      if (!alive || !controller.value) return;
      const values = { ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.expanded ? { expandedValues: props.expandedValues } : {}), ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : {}) };
      const result = connection ? connection.syncControlledValues(values) : controller.value.syncControlledValues(values);
      if (!result.ok) throw new TypeError(result.error.message);
      if (!connection) publish();
    }, { flush: 'post' });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => { element.value = typeof HTMLElement !== 'undefined' && node instanceof HTMLElement ? node : undefined; },
      role: 'tree', 'aria-label': props.label, 'aria-multiselectable': 'true', 'aria-disabled': state.value.disabled ? 'true' : undefined, 'aria-readonly': props.readonly ? 'true' : undefined,
      tabindex: state.value.disabled || state.value.highlightedValue !== null ? -1 : 0,
      'data-scope': 'checkbox-tree', 'data-part': 'root',
    }), { default: () => slots.default?.(state.value) });
  },
});

type RootProps<ID extends string> = CheckboxTreeRootProps<ID> & PublicProps & EmitsToProps<CheckboxTreeEmits<ID>>;
type RootInstance<ID extends string> = InstanceType<DefineSetupFnComponent<CheckboxTreeRootProps<ID>, CheckboxTreeEmits<ID>, SlotsType<CheckboxTreeSlots<ID>>>> & CheckboxTreeExpose;
export const CheckboxTreeRoot: new <const ID extends string = string>(props: RootProps<ID>) => Omit<RootInstance<ID>, '$props'> & { readonly $props: RootProps<ID> } = CheckboxTreeRootImplementation as unknown as new <const ID extends string = string>(props: RootProps<ID>) => Omit<RootInstance<ID>, '$props'> & { readonly $props: RootProps<ID> };
export const CheckboxTreeGroup = /* @__PURE__ */ createTreeGroup('SectileCheckboxTreeGroup', 'checkbox-tree');
export const CheckboxTreeItem: DefineSetupFnComponent<CheckboxTreeItemProps, {}, SlotsType<{ default?: (state: CheckboxTreeItemSlotProps) => VNodeChild }>> = /* @__PURE__ */ createTreeItem('SectileCheckboxTreeItem', 'checkbox-tree') as unknown as DefineSetupFnComponent<CheckboxTreeItemProps, {}, SlotsType<{ default?: (state: CheckboxTreeItemSlotProps) => VNodeChild }>>;
export const CheckboxTreeDisclosure: DefineSetupFnComponent<CheckboxTreeDisclosureProps, {}, SlotsType<{ default?: (state: CheckboxTreeItemSlotProps) => VNodeChild }>> = /* @__PURE__ */ createTreeDisclosure('SectileCheckboxTreeDisclosure', 'checkbox-tree') as unknown as DefineSetupFnComponent<CheckboxTreeDisclosureProps, {}, SlotsType<{ default?: (state: CheckboxTreeItemSlotProps) => VNodeChild }>>;
