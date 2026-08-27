import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { TreeNodeInput } from '@sectile/core/tree';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import { collectionBranchIDs } from './collection.js';

export interface CascadeChoiceRootState {
  readonly value: string | null;
  readonly valuePath: readonly string[];
  readonly highlightedValue: string | null;
  readonly path: readonly string[];
  readonly columns: readonly (readonly string[])[];
  readonly disabled: boolean;
  readonly readonly: boolean;
}

export interface CascadeChoiceColumnProps {
  readonly depth: number;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface CascadeChoiceColumnSlotProps {
  readonly depth: number;
  readonly items: readonly string[];
  readonly parentValue: string | null;
}

export interface CascadeChoiceItemProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface CascadeChoiceItemSlotProps {
  readonly value: string;
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly expanded: boolean;
  readonly branch: boolean;
  readonly disabled: boolean;
}

export interface CascadeChoicePartProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface CascadeChoiceRootContext<State extends CascadeChoiceRootState = CascadeChoiceRootState> {
  readonly state: ComputedRef<State>;
  readonly label: ComputedRef<string | undefined>;
  readonly textValue: ComputedRef<(id: string) => string>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly branchItems: ComputedRef<ReadonlySet<string>>;
  registerColumn(element: HTMLElement, depth: number, label?: string): void;
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
}

export interface CascadeChoiceItemContext {
  readonly state: ComputedRef<CascadeChoiceItemSlotProps>;
}

export const cascadeChoicePartProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
  asChild: { type: Boolean, default: false },
};

export function createCascadeChoiceParts<State extends CascadeChoiceRootState>(options: {
  readonly scope: 'cascade-list' | 'cascade-select';
  readonly componentName: 'CascadeList' | 'CascadeSelect';
  readonly itemAttribute: 'data-sectile-cascade-list-id' | 'data-sectile-cascade-select-id';
  readonly rootKey: InjectionKey<CascadeChoiceRootContext<State>>;
  readonly itemKey: InjectionKey<CascadeChoiceItemContext>;
}) {
  const useRoot = (part: string): CascadeChoiceRootContext<State> => {
    const root = inject(options.rootKey);
    if (root === undefined) throw new TypeError(`${part} must be used inside ${options.componentName}Root.`);
    return root;
  };
  const useItem = (part: string): CascadeChoiceItemContext => {
    const item = inject(options.itemKey);
    if (item === undefined) throw new TypeError(`${part} must be used inside ${options.componentName}Item.`);
    return item;
  };

  const Column = defineComponent({
    name: `Sectile${options.componentName}Column`,
    inheritAttrs: false,
    props: {
      depth: { type: Number, required: true },
      label: { type: String, default: undefined },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
      asChild: { type: Boolean, default: false },
    },
    slots: Object as SlotsType<{ default: (props: CascadeChoiceColumnSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(`${options.componentName}Column`);
      const state = computed<CascadeChoiceColumnSlotProps>(() => ({
        depth: props.depth,
        items: root.state.value.columns[props.depth] ?? [],
        parentValue: props.depth === 0 ? null : root.state.value.path[props.depth - 1] ?? null,
      }));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: (node: unknown) => {
          if (node instanceof HTMLElement) root.registerColumn(node, props.depth, props.label);
        },
        role: 'listbox',
        'aria-label': props.label ?? root.label.value,
        'aria-orientation': 'vertical',
        hidden: state.value.items.length === 0,
        'data-scope': options.scope,
        'data-part': 'column',
        'data-depth': String(props.depth),
      }), { default: () => slots['default']?.(state.value) });
    },
  });

  const Item = defineComponent({
    name: `Sectile${options.componentName}Item`,
    inheritAttrs: false,
    props: {
      value: { type: String, required: true },
      disabled: { type: Boolean, default: false },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
      asChild: { type: Boolean, default: false },
    },
    slots: Object as SlotsType<{ default: (props: CascadeChoiceItemSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(`${options.componentName}Item`);
      const state = computed<CascadeChoiceItemSlotProps>(() => ({
        value: props.value,
        selected: root.state.value.value === props.value,
        highlighted: root.state.value.highlightedValue === props.value,
        expanded: root.state.value.path.includes(props.value),
        branch: root.branchItems.value.has(props.value),
        disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value),
      }));
      provide<CascadeChoiceItemContext>(options.itemKey, { state });
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: (node: unknown) => {
          if (node instanceof HTMLElement) root.registerItem(node, props.value, state.value.disabled);
        },
        role: 'option',
        tabindex: state.value.disabled ? -1 : state.value.highlighted ? 0 : -1,
        'aria-selected': String(state.value.selected),
        'aria-disabled': state.value.disabled ? 'true' : undefined,
        'aria-haspopup': state.value.branch ? 'listbox' : undefined,
        'aria-expanded': state.value.branch ? String(state.value.expanded) : undefined,
        [options.itemAttribute]: props.value,
        'data-scope': options.scope,
        'data-part': 'item',
        'data-state': state.value.selected ? 'checked' : 'unchecked',
        'data-selected': state.value.selected ? '' : undefined,
        'data-highlighted': state.value.highlighted ? '' : undefined,
        'data-expanded': state.value.expanded ? '' : undefined,
        'data-disabled': state.value.disabled ? '' : undefined,
      }), { default: () => slots['default']?.(state.value) });
    },
  });

  const ItemIndicator = defineComponent({
    name: `Sectile${options.componentName}ItemIndicator`,
    inheritAttrs: false,
    props: cascadeChoicePartProps,
    slots: Object as SlotsType<{ default: (props: CascadeChoiceItemSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const item = useItem(`${options.componentName}ItemIndicator`);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        hidden: !item.state.value.selected,
        'aria-hidden': 'true',
        'data-scope': options.scope,
        'data-part': 'item-indicator',
      }), { default: () => slots['default']?.(item.state.value) });
    },
  });

  const ItemChevron = defineComponent({
    name: `Sectile${options.componentName}ItemChevron`,
    inheritAttrs: false,
    props: cascadeChoicePartProps,
    slots: Object as SlotsType<{ default: (props: CascadeChoiceItemSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const item = useItem(`${options.componentName}ItemChevron`);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        hidden: !item.state.value.branch,
        'aria-hidden': 'true',
        'data-scope': options.scope,
        'data-part': 'item-chevron',
      }), { default: () => slots['default']?.(item.state.value) });
    },
  });

  return Object.freeze({ Column, Item, ItemIndicator, ItemChevron });
}

export function initialCascadeColumns(
  nodes: readonly TreeNodeInput<string>[],
  path: readonly string[] = [],
): readonly (readonly string[])[] {
  const columns: string[][] = [nodes.filter((node) => node.parentID === null).map((node) => node.id)];
  for (const id of path) {
    const children = nodes.filter((node) => node.parentID === id).map((node) => node.id);
    if (children.length > 0) columns.push(children);
  }
  return columns;
}

export function cascadeItemPath(
  nodes: readonly TreeNodeInput<string>[],
  value: string | null,
): readonly string[] {
  if (value === null) return [];
  const parents = new Map(nodes.map((node) => [node.id, node.parentID]));
  if (!parents.has(value)) return [];
  const path: string[] = [value];
  let current = parents.get(value) ?? null;
  while (current !== null) {
    path.push(current);
    current = parents.get(current) ?? null;
  }
  return path.reverse();
}

export function cascadeBranchItems(nodes: readonly TreeNodeInput<string>[]): ReadonlySet<string> {
  return new Set(collectionBranchIDs(nodes));
}
