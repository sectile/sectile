import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createReorder,
  type ReorderOrientation,
  type SequenceReorderConnection,
  type TreeReorderConnection,
  type TreeReorderOptions,
} from '@sectile/dom/reorder';
import { Primitive, type PrimitiveAs } from './primitive.js';

export type TreeReorderNode = TreeReorderOptions<string>['nodes'][number];
export interface SequenceReorderRootProps {
  readonly items: readonly string[];
  readonly orientation?: ReorderOrientation;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface TreeReorderRootProps {
  readonly nodes: readonly TreeReorderNode[];
  readonly orientation?: ReorderOrientation;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ReorderRootSlotProps {
  readonly items: readonly string[];
  readonly disabled: boolean;
}
export interface TreeReorderRootSlotProps {
  readonly nodes: readonly TreeReorderNode[];
  readonly disabled: boolean;
}
export interface ReorderItemSlotProps {
  readonly value: string;
  readonly position: number;
}
export interface ReorderItemProps {
  readonly value: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface SequenceContext {
  readonly items: ComputedRef<readonly string[]>;
  register(element: HTMLElement, id: string): void;
}
interface TreeContext {
  readonly nodes: ComputedRef<readonly TreeReorderNode[]>;
  register(element: HTMLElement, id: string): void;
}

const sequenceKey = Symbol('SectileSequenceReorderRoot');
const treeKey = Symbol('SectileTreeReorderRoot');

const rootProps = {
  orientation: { type: String as PropType<ReorderOrientation>, default: 'vertical' },
  disabled: { type: Boolean, default: false },
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const SequenceReorderRoot = defineComponent({
  name: 'SectileSequenceReorderRoot',
  inheritAttrs: false,
  props: {
    ...rootProps,
    items: { type: Array as PropType<readonly string[]>, required: true },
  },
  emits: { 'update:items': (_items: readonly string[]): boolean => true },
  slots: Object as SlotsType<{ default: (props: ReorderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>();
    const connection = shallowRef<SequenceReorderConnection<string>>();
    const current = shallowRef<readonly string[]>(props.items);
    const registrations = new Map<string, HTMLElement>();
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === undefined) return;
      connection.value = createReorder({
        root: root.value,
        ids: props.items,
        orientation: props.orientation,
        disabled: props.disabled,
        onOrderChange: (items) => {
          current.value = items;
          emit('update:items', items);
        },
      });
      for (const [id, element] of registrations) connection.value.setItemAttributes(element, id);
      current.value = connection.value.getSnapshot().state.ids;
    };
    const items = computed(() => current.value);
    provide<SequenceContext>(sequenceKey, {
      items,
      register: (element, id) => {
        registrations.set(id, element);
        connection.value?.setItemAttributes(element, id);
      },
    });
    onMounted(connect);
    onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.orientation, () => props.disabled], connect);
    watch(() => props.items, (items) => {
      const result = connection.value?.syncOrder(items);
      current.value = result?.ok === true ? result.value.state.ids : items;
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element instanceof HTMLElement ? element : undefined; },
      'data-scope': 'sequence-reorder',
      'data-part': 'root',
      'data-orientation': props.orientation,
    }), { default: () => slots['default']?.({ items: items.value, disabled: props.disabled }) });
  },
});

export const SequenceReorderItem = defineComponent({
  name: 'SectileSequenceReorderItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: ReorderItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useSequenceContext('SequenceReorderItem');
    const position = computed(() => root.items.value.indexOf(props.value) + 1);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { if (element instanceof HTMLElement) root.register(element, props.value); },
      'data-scope': 'sequence-reorder',
      'data-part': 'item',
      'data-value': props.value,
    }), { default: () => slots['default']?.({ value: props.value, position: position.value }) });
  },
});

export const TreeReorderRoot = defineComponent({
  name: 'SectileTreeReorderRoot',
  inheritAttrs: false,
  props: {
    ...rootProps,
    nodes: { type: Array as PropType<readonly TreeReorderNode[]>, required: true },
  },
  emits: { 'update:nodes': (_nodes: readonly TreeReorderNode[]): boolean => true },
  slots: Object as SlotsType<{ default: (props: TreeReorderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>();
    const connection = shallowRef<TreeReorderConnection<string>>();
    const current = shallowRef<readonly TreeReorderNode[]>(props.nodes);
    const registrations = new Map<string, HTMLElement>();
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === undefined) return;
      connection.value = createReorder({
        root: root.value,
        nodes: props.nodes,
        orientation: props.orientation,
        disabled: props.disabled,
        onOrderChange: (nodes) => {
          current.value = nodes;
          emit('update:nodes', nodes);
        },
      });
      for (const [id, element] of registrations) connection.value.setItemAttributes(element, id);
      current.value = connection.value.getSnapshot().state.nodes;
    };
    const nodes = computed(() => current.value);
    provide<TreeContext>(treeKey, {
      nodes,
      register: (element, id) => {
        registrations.set(id, element);
        connection.value?.setItemAttributes(element, id);
      },
    });
    onMounted(connect);
    onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.orientation, () => props.disabled], connect);
    watch(() => props.nodes, (nodes) => {
      const result = connection.value?.syncOrder(nodes);
      current.value = result?.ok === true ? result.value.state.nodes : nodes;
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element instanceof HTMLElement ? element : undefined; },
      role: 'tree',
      'data-scope': 'tree-reorder',
      'data-part': 'root',
      'data-orientation': props.orientation,
    }), { default: () => slots['default']?.({ nodes: nodes.value, disabled: props.disabled }) });
  },
});

export const TreeReorderItem = defineComponent({
  name: 'SectileTreeReorderItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: ReorderItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useTreeContext('TreeReorderItem');
    const position = computed(() => root.nodes.value.findIndex((node) => node.id === props.value) + 1);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { if (element instanceof HTMLElement) root.register(element, props.value); },
      role: 'treeitem',
      'data-scope': 'tree-reorder',
      'data-part': 'item',
      'data-value': props.value,
    }), { default: () => slots['default']?.({ value: props.value, position: position.value }) });
  },
});

function useSequenceContext(part: string): SequenceContext {
  const context = inject<SequenceContext>(sequenceKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside SequenceReorderRoot.`);
  return context;
}
function useTreeContext(part: string): TreeContext {
  const context = inject<TreeContext>(treeKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside TreeReorderRoot.`);
  return context;
}

export type { ReorderOrientation };
