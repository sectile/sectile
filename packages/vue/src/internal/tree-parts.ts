import { computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, provide,
  type ComputedRef, type PropType, type SlotsType, type VNodeChild } from 'vue';
import type { CheckboxValue } from '@sectile/core/checkbox';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import type { TreeViewRootSlotProps, TreeViewItemSlotProps } from '../tree-view.js';
import { conditionalPresenceProps, useConditionalPresence } from '../presence/conditional-presence.js';

export interface TreePartContext {
  readonly scope: 'tree-view' | 'checkbox-tree' | 'tree-select';
  readonly state: ComputedRef<TreeViewRootSlotProps>;
  readonly selectedItems: ComputedRef<Pick<ReadonlySet<string>, 'has'>>;
  readonly expandedItems: ComputedRef<Pick<ReadonlySet<string>, 'has'>>;
  readonly disabledItems: ComputedRef<Pick<ReadonlySet<string>, 'has'>>;
  readonly checking?: {
    getChecked(id: string): CheckboxValue | null;
    isDisabled(id: string): boolean | null;
    levelOf(id: string): number;
    isLeaf(id: string): boolean;
  };
  readonly selecting?: {
    levelOf(id: string): number;
    isLeaf(id: string): boolean;
    isVisible(id: string): boolean;
    elementID(id: string): string;
  };
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
  unregisterItem?(element: HTMLElement, id: string): void;
  registerDisclosure(element: HTMLElement, id: string): void;
  unregisterDisclosure?(element: HTMLElement, id: string): void;
}

const key = /* @__PURE__ */ Symbol('SectileTreeParts');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };
export function provideTreeParts(context: TreePartContext): void { provide(key, context); }
function useRoot(part: string, scope: TreePartContext['scope']): TreePartContext {
  const root = inject<TreePartContext>(key);
  if (!root || root.scope !== scope) throw new TypeError(`${part.replace(/^Sectile/u, '')} must be used inside ${scope === 'tree-view' ? 'TreeViewRoot' : scope === 'checkbox-tree' ? 'CheckboxTreeRoot' : 'TreeSelectRoot'}.`);
  return root;
}
function itemState(root: TreePartContext, id: string, disabled = false): TreeViewItemSlotProps & { readonly checked?: CheckboxValue } {
  const state = root.state.value;
  return {
    expandedValues: state.expandedValues, highlightedValue: state.highlightedValue, readonly: state.readonly,
    value: id, selectedValues: state.value, selected: root.selectedItems.value.has(id),
    expanded: root.expandedItems.value.has(id), highlighted: state.highlightedValue === id,
    disabled: state.disabled || (root.checking ? root.checking.isDisabled(id) !== false : disabled || root.disabledItems.value.has(id)),
    ...(root.checking ? { checked: root.checking.getChecked(id) ?? false } : {}),
  };
}

export function createTreeGroup(name: string, scope: TreePartContext['scope']) {
  return defineComponent({
    name, inheritAttrs: false,
    props: { for: { type: String, required: true }, ...partProps, ...conditionalPresenceProps },
    slots: Object as SlotsType<{ default: (props: TreeViewRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(name, scope);
      const expanded = computed(() => root.expandedItems.value.has(props.for));
      const presence = useConditionalPresence(expanded, computed(() => props.forcePresent));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: presence.register,
        role: 'group', hidden: presence.hidden.value,
        ...(!expanded.value && presence.present.value ? { inert: true, 'aria-hidden': 'true' } : {}),
        'data-scope': scope, 'data-part': 'group', 'data-state': expanded.value ? 'open' : 'closed',
      }), { default: () => slots['default']?.(root.state.value) });
    },
  });
}

export function createTreeItem(name: string, scope: TreePartContext['scope']) {
  return defineComponent({
    name, inheritAttrs: false,
    props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
    slots: Object as SlotsType<{ default: (props: TreeViewItemSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(name, scope), state = computed(() => itemState(root, props.value, props.disabled));
      let element: HTMLElement | undefined, registeredID: string | undefined;
      const release = (): void => {
        if (element && registeredID !== undefined) root.unregisterItem?.(element, registeredID);
        element = undefined; registeredID = undefined;
      };
      onBeforeUnmount(release);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (node: unknown) => {
          if (node !== element || registeredID !== props.value) release();
          if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
            element = node; registeredID = props.value; root.registerItem(node, props.value, props.disabled);
          }
        },
        [`data-sectile-${scope}-item`]: props.value, 'data-scope': scope, 'data-part': 'item',
        'data-selected': state.value.selected ? '' : undefined, 'data-expanded': state.value.expanded ? '' : undefined,
        'data-highlighted': state.value.highlighted ? '' : undefined, 'data-disabled': state.value.disabled ? '' : undefined,
        ...(root.checking || root.selecting ? {
          role: 'treeitem', 'aria-level': (root.checking ?? root.selecting)!.levelOf(props.value),
          ...(root.selecting ? { id: root.selecting.elementID(props.value), hidden: !root.selecting.isVisible(props.value), 'aria-selected': state.value.selected } : { 'aria-checked': state.value.checked }),
          'aria-expanded': (root.checking ?? root.selecting)!.isLeaf(props.value) ? undefined : state.value.expanded,
          'aria-disabled': state.value.disabled ? 'true' : undefined,
          tabindex: !root.selecting && state.value.highlighted && !state.value.disabled ? 0 : -1,
          ...(root.checking ? { 'data-state': state.value.checked === 'mixed' ? 'indeterminate' : state.value.checked ? 'checked' : 'unchecked' } : {}),
        } : {}),
      }), { default: () => slots['default']?.(state.value) });
    },
  });
}

export function createTreeDisclosure(name: string, scope: TreePartContext['scope']) {
  return defineComponent({
    name, inheritAttrs: false,
    props: { for: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: TreeViewItemSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(name, scope), state = computed(() => itemState(root, props.for));
      let element: HTMLElement | undefined, registeredID: string | undefined;
      const release = (): void => {
        if (element && registeredID !== undefined) root.unregisterDisclosure?.(element, registeredID);
        element = undefined; registeredID = undefined;
      };
      onBeforeUnmount(release);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        disabled: props.as === 'button' ? state.value.disabled : undefined,
        elementRef: (node: unknown) => {
          if (node !== element || registeredID !== props.for) release();
          if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
            element = node; registeredID = props.for; root.registerDisclosure(node, props.for);
          }
        },
        [`data-sectile-${scope}-disclosure`]: props.for, 'data-scope': scope, 'data-part': 'disclosure',
        'data-state': state.value.expanded ? 'open' : 'closed',
        ...(root.checking || root.selecting ? { 'aria-expanded': props.as === 'button' ? state.value.expanded : undefined,
          'aria-disabled': props.as === 'button' && state.value.disabled ? 'true' : undefined,
          'aria-hidden': props.as === 'button' ? undefined : 'true' } : {}),
      }), { default: () => slots['default']?.(state.value) });
    },
  });
}
