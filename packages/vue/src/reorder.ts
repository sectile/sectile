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
  type DefineSetupFnComponent,
  type EmitsToProps,
  type PropType,
  type PublicProps,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createReorder,
  type ReorderOrientation,
  type SequenceReorderConnection,
  type TreeReorderConnection,
  type TreeReorderOptions,
  type TreeReorderDropTarget as NativeDropTarget,
  type ReorderInteractionSnapshot,
  type ReorderInteractionChange,
} from '@sectile/dom/reorder';
import {
  createSequenceReorderState,
  createTreeReorderState,
  getSequenceReorderOrder,
  getTreeReorderHierarchy,
  applyTreeReorderEvent,
} from '@sectile/core/reorder';
import { unwrap, failResult } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostActive, useHostDirection } from './host-provider.js';
import { useNextTickTask } from './internal/scheduled-task.js';

export type TreeReorderNode<ID extends string = string> = Omit<TreeReorderOptions<ID>['nodes'][number], 'parentID'> & { readonly parentID: NoInfer<ID> | null };
export interface SequenceReorderRootProps<ID extends string = string> {
  readonly items: readonly ID[];
  readonly keyboardMode?: 'immediate' | 'preview';
  readonly controlled?: boolean;
  readonly handleOnly?: boolean;
  readonly label?: string;
  readonly roleDescription?: string;
  readonly orientation?: ReorderOrientation;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface TreeReorderRootProps<ID extends string = string> {
  readonly nodes: readonly TreeReorderNode<ID>[];
  readonly keyboardMode?: 'immediate' | 'preview';
  readonly controlled?: boolean;
  readonly handleOnly?: boolean;
  readonly label?: string;
  readonly roleDescription?: string;
  readonly orientation?: ReorderOrientation;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly layout?: 'tree' | 'columns';
  readonly direction?: 'ltr' | 'rtl';
  readonly policies?: TreeReorderOptions<NoInfer<ID>>['policies'];
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ReorderRootSlotProps<ID extends string = string> {
  readonly items: readonly ID[];
  readonly disabled: boolean;
  readonly interaction: ReorderInteractionSnapshot<ID>;
  getPreviewState: SequenceReorderConnection<ID>['getPreviewState'];
  cancelInteraction(): void;
  refreshDropTarget(): void;
}
export interface TreeReorderRootSlotProps<ID extends string = string> {
  readonly nodes: readonly TreeReorderNode<ID>[];
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly interaction: ReorderInteractionSnapshot<ID>;
  getPreviewState: TreeReorderConnection<ID>['getPreviewState'];
  cancelInteraction(): void;
  refreshDropTarget(): void;
  getChildren(parentID: NoInfer<ID> | null): readonly ID[];
  getParent(id: NoInfer<ID>): ID | null;
  canMove(id: NoInfer<ID>, target: TreeReorderTarget<NoInfer<ID>>): boolean;
}
export interface ReorderItemSlotProps<ID extends string = string> {
  readonly value: ID;
  readonly position: number;
  readonly level: number;
  readonly setSize: number;
}
export interface ReorderItemProps<ID extends string = string> {
  readonly value: ID;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export type SequenceReorderRootEmits<ID extends string = string> = { 'update:items': [items: readonly NoInfer<ID>[]]; 'interaction-change': [change: ReorderInteractionChange<NoInfer<ID>>] };
export type TreeReorderRootEmits<ID extends string = string> = { 'update:nodes': [nodes: readonly TreeReorderNode<NoInfer<ID>>[]]; 'interaction-change': [change: ReorderInteractionChange<NoInfer<ID>>] };
export type { ReorderInteractionSnapshot, ReorderInteractionChange } from '@sectile/dom/reorder';
export interface SequenceReorderRootSlots<ID extends string = string> { default?: (state: ReorderRootSlotProps<ID>) => VNodeChild }
export interface TreeReorderRootSlots<ID extends string = string> { default?: (state: TreeReorderRootSlotProps<ID>) => VNodeChild }
export type TreeReorderTarget<ID extends string = string> = NativeDropTarget<ID>;
export interface TreeReorderExpose<ID extends string = string> {
  readonly element: HTMLElement | null;
  move(id: NoInfer<ID>, target: TreeReorderTarget<NoInfer<ID>>): boolean;
  canMove(id: NoInfer<ID>, target: TreeReorderTarget<NoInfer<ID>>): boolean;
  focus(id?: NoInfer<ID>): void;
}
export interface TreeReorderDropTargetProps<ID extends string = string> extends NativeDropTarget<ID> {
  readonly label?: string; readonly as?: PrimitiveAs; readonly asChild?: boolean;
}

export interface ReorderHandleProps {
  readonly label: string;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface ReorderContext {
  position(id: string): number;
  level(id: string): number;
  size(id: string): number;
  disabled(): boolean;
  register(element: HTMLElement, id: string): void;
  unregister(element: HTMLElement, id: string): void;
}
interface TreeContext extends ReorderContext {
  columns(): boolean;
  getChildren(parentID: string | null): readonly string[];
  getParent(id: string): string | null;
  registerTarget(element: HTMLElement, target: NativeDropTarget<string>): void;
  unregisterTarget(element: HTMLElement): void;
}
const emptyItems: readonly string[] = /* @__PURE__ */ Object.freeze([]);
const idleInteraction: ReorderInteractionSnapshot<string> = /* @__PURE__ */ Object.freeze({ sourceID: null, input: null, target: null, allowed: false, clientPoint: null });
function previewPort<State>(source: { getPreviewState(): Result<State>; cancelInteraction(): void; refreshDropTarget(): void }) {
  let port: typeof source | undefined = source;
  return { value: {
    getPreviewState: (): Result<State> => port?.getPreviewState() ?? failResult('transition-rejection', 'invalid-boundary', 'Reorder component is unmounted.'),
    cancelInteraction: (): void => { port?.cancelInteraction(); }, refreshDropTarget: (): void => { port?.refreshDropTarget(); },
  }, retire: (): void => { port = undefined; } };
}
function treeContextPort(source: TreeContext) {
  let port: TreeContext | undefined = source;
  const value: TreeContext = { position: id => port?.position(id) ?? 0, level: id => port?.level(id) ?? 0, size: id => port?.size(id) ?? 0,
    disabled: () => port?.disabled() ?? true, columns: () => port?.columns() ?? false,
    getChildren: parent => port?.getChildren(parent) ?? emptyItems, getParent: id => port?.getParent(id) ?? null,
    register: (element,id) => port?.register(element,id), unregister: (element,id) => port?.unregister(element,id),
    registerTarget: (element,target) => port?.registerTarget(element,target), unregisterTarget: element => port?.unregisterTarget(element) };
  return { value, retire: (): void => { port = undefined; } };
}
function treeExposure(source: TreeReorderExpose) {
  let port: TreeReorderExpose | undefined = source;
  const value: TreeReorderExpose = { get element() { return port?.element ?? null; }, move: (id,target) => port?.move(id,target) ?? false,
    canMove: (id,target) => port?.canMove(id,target) ?? false, focus: id => port?.focus(id) };
  return { value, retire: (): void => { port = undefined; } };
}

const sequenceKey = /* @__PURE__ */ Symbol('SectileSequenceReorderRoot');
const treeKey = /* @__PURE__ */ Symbol('SectileTreeReorderRoot');

const rootProps = {
  keyboardMode: { type: String as PropType<'immediate' | 'preview'>, default: 'immediate' },
  handleOnly: { type: Boolean, default: false },
  label: { type: String, default: undefined },
  roleDescription: { type: String, default: undefined },
  controlled: { type: Boolean, default: false },
  orientation: { type: String as PropType<ReorderOrientation>, default: 'vertical' },
  disabled: { type: Boolean, default: false },
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

const SequenceRootImplementation = /* @__PURE__ */ defineComponent({
  name: 'SectileSequenceReorderRoot',
  inheritAttrs: false,
  props: /* @__PURE__ */ Object.assign({}, rootProps, {
    items: { type: Array as PropType<readonly string[]>, required: true as const },
  }),
  emits: { 'update:items': (_items: readonly string[]): boolean => true, 'interaction-change': (_change: ReorderInteractionChange<string>): boolean => true },
  slots: Object as SlotsType<{ default: (props: ReorderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>();
    const connection = shallowRef<SequenceReorderConnection<string>>();
    const current = shallowRef(createSequenceReorderState(props.items));
    const interaction = shallowRef(idleInteraction);
    const active = useHostActive();
    const preview = previewPort({ getPreviewState: () => connection.value?.getPreviewState() ?? { ok: true, value: current.value },
      cancelInteraction: () => connection.value?.cancelInteraction(), refreshDropTarget: () => connection.value?.refreshDropTarget() });
    const registrations = new Map<string, HTMLElement>();
    const connect = (): void => {
      connection.value?.disconnect();
      connection.value = undefined; interaction.value = idleInteraction;
      if (root.value === undefined || !active.value) return;
      connection.value = createReorder({
        root: root.value,
        ids: props.controlled ? props.items : current.value.ids,
        keyboardMode: props.keyboardMode,
        controlled: props.controlled,
        handleOnly: props.handleOnly,
        ...reorderLabelOptions(props, attrs),
        orientation: props.orientation,
        disabled: props.disabled,
        onOrderChange: (items) => {
          if (!props.controlled) current.value = connection.value!.getSnapshot().state;
          emit('update:items', items);
        },
        onInteractionChange: change => emit('interaction-change', change),
        onUpdate: () => { if (connection.value) { current.value = connection.value.getSnapshot().state; interaction.value = connection.value.getInteractionSnapshot(); } },
      });
      for (const [id, element] of registrations) connection.value.setItemAttributes(element, id);
      current.value = connection.value.getSnapshot().state;
    };
    const items = computed(() => current.value.ids);
    provide<ReorderContext>(sequenceKey, {
      position: (id) => (getSequenceReorderOrder(current.value).indexOf(id) ?? -1) + 1,
      level: () => 1,
      size: () => current.value.ids.length,
      disabled: () => props.disabled,
      register: (element, id) => {
        registrations.set(id, element);
        connection.value?.setItemAttributes(element, id);
      },
      unregister: (element, id) => {
        if (registrations.get(id) === element) registrations.delete(id);
        connection.value?.removeItem(element);
      },
    });
    onMounted(connect);
    onBeforeUnmount(() => { preview.retire(); const previous = connection.value; connection.value = undefined;
      try { previous?.disconnect(); } finally { root.value = undefined; registrations.clear(); } });
    watch([active, () => props.keyboardMode, () => props.orientation, () => props.disabled, () => props.controlled, () => props.handleOnly, () => props.label, () => props.roleDescription], connect);
    watch(() => props.items, (items) => {
      current.value = connection.value === undefined
        ? createSequenceReorderState(items)
        : unwrap(connection.value.syncOrder(items)).state;
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element instanceof HTMLElement ? element : undefined; },
      'data-scope': 'sequence-reorder',
      'data-part': 'root',
      role: 'list',
      'aria-label': props.label ?? attrs['aria-label'],
      'aria-roledescription': props.roleDescription ?? attrs['aria-roledescription'] ?? 'sortable',
      'data-orientation': props.orientation,
    }), { default: () => slots['default']?.({ items: items.value, disabled: props.disabled, interaction: interaction.value,
      ...preview.value }) });
  },
});

export const SequenceReorderItem = /* @__PURE__ */ defineComponent({
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
    const elementRef = useReorderItemRef(root, () => props.value);
    const position = computed(() => root.position(props.value));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef,
      'data-scope': 'sequence-reorder',
      'data-part': 'item',
      'data-value': props.value,
      role: 'listitem',
      'aria-posinset': position.value || undefined,
      'aria-setsize': root.size(props.value),
    }), { default: () => slots['default']?.({ value: props.value, position: position.value, level: 1, setSize: root.size(props.value) }) });
  },
});

type SequenceProps<ID extends string> = SequenceReorderRootProps<ID> & PublicProps & EmitsToProps<SequenceReorderRootEmits<ID>>;
type SequenceInstance<ID extends string> = InstanceType<DefineSetupFnComponent<SequenceReorderRootProps<ID>, SequenceReorderRootEmits<ID>, SlotsType<SequenceReorderRootSlots<ID>>>>;
export const SequenceReorderRoot: new<const ID extends string = string>(props: SequenceProps<ID>) => Omit<SequenceInstance<ID>, '$props'> & { readonly $props: SequenceProps<ID> } = SequenceRootImplementation as unknown as new<const ID extends string = string>(props: SequenceProps<ID>) => Omit<SequenceInstance<ID>, '$props'> & { readonly $props: SequenceProps<ID> };

const TreeRootImplementation = /* @__PURE__ */ defineComponent({
  name: 'SectileTreeReorderRoot',
  inheritAttrs: false,
  props: /* @__PURE__ */ Object.assign({}, rootProps, {
    nodes: { type: Array as PropType<readonly TreeReorderNode[]>, required: true as const },
    readonly: { type: Boolean, default: false },
    layout: { type: String as PropType<'tree' | 'columns'>, default: 'tree' },
    direction: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
    policies: { type: Object as PropType<TreeReorderOptions<string>['policies']>, default: undefined },
  }),
  emits: { 'update:nodes': (_nodes: readonly TreeReorderNode[]): boolean => true, 'interaction-change': (_change: ReorderInteractionChange<string>): boolean => true },
  slots: Object as SlotsType<{ default: (props: TreeReorderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots, expose }) {
    const root = shallowRef<HTMLElement>();
    const connection = shallowRef<TreeReorderConnection<string>>();
    const current = shallowRef(createTreeReorderState(props.nodes, props.layout === 'columns' ? { maxDepth: 1 } : undefined));
    const interaction = shallowRef(idleInteraction);
    const preview = previewPort({ getPreviewState: () => connection.value?.getPreviewState() ?? { ok: true, value: current.value },
      cancelInteraction: () => connection.value?.cancelInteraction(), refreshDropTarget: () => connection.value?.refreshDropTarget() });
    const registrations = new Map<string, HTMLElement>();
    const targets = new Map<HTMLElement, NativeDropTarget<string>>();
    const active = useHostActive(), inheritedDirection = useHostDirection();
    const direction = computed(() => props.direction ?? inheritedDirection.value);
    let alive = true, mounted = false, generation = 0;
    let connectedElement: HTMLElement | undefined;
    let pendingFocus: { id: string; previous: HTMLElement } | undefined;
    const repairFocus = useNextTickTask(() => {
      const pending = pendingFocus; pendingFocus = undefined;
      if (!alive || !active.value || !pending || !root.value) return;
      const focused = root.value.ownerDocument.activeElement;
      if (focused !== pending.previous && focused !== root.value.ownerDocument.body && focused !== null) return;
      const replacement = registrations.get(pending.id);
      if (replacement && root.value.contains(replacement) && getTreeReorderHierarchy(current.value).has(pending.id)) replacement.focus();
      else if (props.layout === 'columns') root.value.focus();
    });
    const retire = (): void => {
      generation += 1;
      const previous = connection.value;
      connection.value = undefined; connectedElement = undefined;
      interaction.value = idleInteraction;
      previous?.disconnect();
    };
    const validTarget = (target: NativeDropTarget<string>): boolean => applyTreeReorderEvent(current.value, {
      type: 'move-nodes', ids: [], parentID: target.parentID, beforeID: target.beforeID ?? null,
    }).ok;
    const projectTargets = (): void => {
      const native = connection.value;
      if (!native) return;
      for (const [element, target] of targets) {
        if (!alive || connection.value !== native) break;
        if (validTarget(target)) native.setDropTarget(element, target);
        else native.removeDropTarget(element);
      }
    };
    const connect = (force = false): void => {
      if (!force && connection.value && connectedElement === root.value && active.value) return;
      retire();
      if (!alive || !mounted || !active.value || !root.value) return;
      const expected = generation;
      const isCurrent = (): boolean => alive && expected === generation;
      try {
        const native = createReorder({
          root: root.value,
          nodes: props.controlled ? props.nodes : current.value.nodes,
          controlled: props.controlled, handleOnly: props.handleOnly,
          keyboardMode: props.keyboardMode,
          ...reorderLabelOptions(props, attrs),
          orientation: props.orientation, disabled: props.disabled,
          readOnly: props.readonly, layout: props.layout, direction: direction.value,
          ...(props.policies === undefined ? {} : { policies: props.policies }),
          onOrderChange: (nodes) => {
            if (!isCurrent()) return;
            if (connection.value) current.value = connection.value.getSnapshot().state;
            emit('update:nodes', nodes);
          },
          onInteractionChange: change => { if (isCurrent()) emit('interaction-change', change); },
          onUpdate: () => { if (isCurrent() && connection.value) { current.value = connection.value.getSnapshot().state; interaction.value = connection.value.getInteractionSnapshot(); } },
        });
        if (!isCurrent()) { native.disconnect(); return; }
        connection.value = native; connectedElement = root.value;
        current.value = native.getSnapshot().state;
        for (const [id, element] of registrations) {
          if (!isCurrent()) break;
          native.setItemAttributes(element, id);
        }
        if (isCurrent()) projectTargets();
      } catch (error) {
        try { retire(); } catch { /* Preserve the acquisition failure. */ }
        throw error;
      }
    };
    const nodes = computed(() => current.value.nodes);
    const context = treeContextPort({
      position: (id) => {
        const tree = getTreeReorderHierarchy(current.value);
        if (!tree.has(id)) return 0;
        const parentID = tree.parentOf(id);
        const siblings = parentID === null ? tree.roots : tree.childrenOf(parentID)!;
        return siblings.indexOf(id)! + 1;
      },
      level: (id) => (getTreeReorderHierarchy(current.value).depthOf(id) ?? -1) + 1,
      size: (id) => {
        const tree = getTreeReorderHierarchy(current.value);
        if (!tree.has(id)) return 0;
        const parentID = tree.parentOf(id);
        return (parentID === null ? tree.roots : tree.childrenOf(parentID)!).size;
      },
      disabled: () => props.disabled || props.readonly,
      columns: () => props.layout === 'columns',
      getChildren: (parentID) => {
        const tree = getTreeReorderHierarchy(current.value);
        return (parentID === null ? tree.roots : tree.childrenOf(parentID))?.ids ?? emptyItems;
      },
      getParent: (id) => getTreeReorderHierarchy(current.value).parentOf(id) ?? null,
      register: (element, id) => {
        if (!alive) return;
        registrations.set(id, element);
        connection.value?.setItemAttributes(element, id);
      },
      unregister: (element, id) => {
        if (!alive) return;
        const focused = element.ownerDocument.activeElement;
        if (active.value && focused !== null && (focused === element || element.contains(focused))) {
          pendingFocus = { id, previous: element }; repairFocus.schedule();
        }
        if (registrations.get(id) === element) registrations.delete(id);
        connection.value?.removeItem(element);
      },
      registerTarget: (element, target) => {
        if (!alive) return;
        const position = { parentID: target.parentID, ...(target.beforeID === undefined ? {} : { beforeID: target.beforeID }) };
        if (!alive) return;
        targets.set(element, position);
        if (validTarget(position)) connection.value?.setDropTarget(element, position);
        else connection.value?.removeDropTarget(element);
      },
      unregisterTarget: (element) => {
        if (!alive) return;
        targets.delete(element); connection.value?.removeDropTarget(element);
      },
    });
    provide<TreeContext>(treeKey, context.value);
    const canReorder = (): boolean => alive && active.value && !props.disabled && !props.readonly;
    const exposure = treeExposure({
      get element() { return root.value ?? null; },
      move: (id, target) => canReorder() && (connection.value?.handleEvent({ type: 'move-node', id, parentID: target.parentID, beforeID: target.beforeID ?? null }) ?? false),
      canMove: (id, target) => canReorder() && (connection.value?.canMove(id, target) ?? false),
      focus: (id) => {
        if (!alive || !active.value) return;
        const element = id === undefined ? root.value : registrations.get(id);
        if (element && root.value?.contains(element)) element.focus();
      },
    });
    expose(exposure.value);
    onMounted(() => { mounted = true; connect(); });
    onBeforeUnmount(() => {
      alive = false; pendingFocus = undefined; repairFocus.cancel();
      preview.retire();
      exposure.retire(); context.retire();
      try { retire(); } finally { registrations.clear(); targets.clear(); root.value = undefined; }
    });
    watch(root, () => connect(), { flush: 'post' });
    watch(active, () => {
      pendingFocus = undefined; repairFocus.cancel(); connect();
    }, { flush: 'post' });
    watch([() => props.keyboardMode, () => props.orientation, () => props.disabled, () => props.readonly, () => props.controlled, () => props.handleOnly,
      () => props.label, () => props.roleDescription, () => props.layout, () => props.policies, direction], () => connect(true), { flush: 'post' });
    watch(() => props.nodes, (nodes) => {
      current.value = connection.value === undefined
        ? createTreeReorderState(nodes, props.layout === 'columns' ? { maxDepth: 1 } : undefined)
        : unwrap(connection.value.syncOrder(nodes)).state;
      projectTargets();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = typeof HTMLElement !== 'undefined' && element instanceof HTMLElement ? element : undefined; },
      role: props.layout === 'columns' ? 'list' : 'tree',
      tabindex: props.layout === 'columns' ? -1 : undefined,
      dir: direction.value,
      'aria-label': props.label ?? attrs['aria-label'],
      'aria-roledescription': props.roleDescription ?? attrs['aria-roledescription'] ?? 'sortable',
      'data-scope': 'tree-reorder',
      'data-part': 'root',
      'data-orientation': props.orientation,
      'data-layout': props.layout,
      'data-readonly': props.readonly ? '' : undefined,
    }), { default: () => slots['default']?.({ nodes: nodes.value, disabled: props.disabled, readonly: props.readonly,
      interaction: interaction.value, ...preview.value,
      getChildren: context.value.getChildren, getParent: context.value.getParent, canMove: exposure.value.canMove }) });
  },
});

type TreeProps<ID extends string> = TreeReorderRootProps<ID> & PublicProps & EmitsToProps<TreeReorderRootEmits<ID>>;
type TreeInstance<ID extends string> = InstanceType<DefineSetupFnComponent<TreeReorderRootProps<ID>, TreeReorderRootEmits<ID>, SlotsType<TreeReorderRootSlots<ID>>>> & TreeReorderExpose<ID>;
export const TreeReorderRoot: new<const ID extends string = string>(props: TreeProps<ID>) => Omit<TreeInstance<ID>, '$props'> & { readonly $props: TreeProps<ID> } = TreeRootImplementation as unknown as new<const ID extends string = string>(props: TreeProps<ID>) => Omit<TreeInstance<ID>, '$props'> & { readonly $props: TreeProps<ID> };

export const TreeReorderItem = /* @__PURE__ */ defineComponent({
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
    const elementRef = useReorderItemRef(root, () => props.value);
    const position = computed(() => root.position(props.value));
    const level = computed(() => root.level(props.value));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef,
      role: root.columns() ? 'listitem' : 'treeitem',
      'data-scope': 'tree-reorder',
      'data-part': 'item',
      'data-value': props.value,
      'data-level': level.value,
      'aria-level': level.value || undefined,
      'aria-posinset': position.value || undefined,
      'aria-setsize': root.size(props.value),
    }), { default: () => slots['default']?.({ value: props.value, position: position.value, level: level.value, setSize: root.size(props.value) }) });
  },
});

function reorderLabelOptions(
  props: { readonly label: string | undefined; readonly roleDescription: string | undefined },
  attrs: Readonly<Record<string, unknown>>,
): Pick<TreeReorderOptions<string>, 'label' | 'roleDescription'> {
  const label = props.label ?? attrs['aria-label'];
  const roleDescription = props.roleDescription ?? attrs['aria-roledescription'];
  return { ...(typeof label === 'string' ? { label } : {}),
    ...(typeof roleDescription === 'string' ? { roleDescription } : {}) };
}

function useReorderItemRef(
  root: Pick<ReorderContext, 'register' | 'unregister'>,
  value: () => string,
): (element: unknown) => void {
  let current: HTMLElement | undefined;
  let registeredID: string | undefined;
  const release = (): void => {
    if (current !== undefined && registeredID !== undefined) root.unregister(current, registeredID);
    current = undefined;
    registeredID = undefined;
  };
  onBeforeUnmount(release);
  watch(value, () => {
    if (current === undefined) return;
    root.unregister(current, registeredID!);
    registeredID = value();
    root.register(current, registeredID);
  });
  return (element) => {
    const next = element instanceof HTMLElement ? element : undefined;
    if (next === current) return;
    release();
    current = next;
    if (current !== undefined) {
      registeredID = value();
      root.register(current, registeredID);
    }
  };
}

function useSequenceContext(part: string): ReorderContext {
  const context = inject<ReorderContext>(sequenceKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside SequenceReorderRoot.`);
  return context;
}
function useTreeContext(part: string): TreeContext {
  const context = inject<TreeContext>(treeKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside TreeReorderRoot.`);
  return context;
}

export const TreeReorderDropTarget = /* @__PURE__ */ defineComponent({
  name: 'SectileTreeReorderDropTarget', inheritAttrs: false,
  props: {
    parentID: { type: String as PropType<string | null>, default: null },
    beforeID: { type: String as PropType<string | null>, default: undefined },
    label: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const root = useTreeContext('TreeReorderDropTarget');
    let current: HTMLElement | undefined;
    const release = (): void => {
      const previous = current; current = undefined;
      if (previous) root.unregisterTarget(previous);
    };
    const register = (): void => {
      if (current) root.registerTarget(current, { parentID: props.parentID,
        ...(props.beforeID === undefined ? {} : { beforeID: props.beforeID }) });
    };
    onBeforeUnmount(release);
    watch([() => props.parentID, () => props.beforeID], register, { flush: 'post' });
    const elementRef = (element: unknown): void => {
      const next = typeof HTMLElement !== 'undefined' && element instanceof HTMLElement ? element : undefined;
      if (next === current) return;
      release(); current = next; register();
    };
    return (): VNodeChild => h(Primitive, mergeProps({
      role: root.columns() ? 'list' : 'group',
    }, attrs, {
      as: props.as, asChild: props.asChild, elementRef,
      'aria-label': props.label ?? attrs['aria-label'],
      'data-scope': 'tree-reorder', 'data-part': 'drop-target',
    }), slots);
  },
});

function createReorderHandle(name: string, scope: 'sequence' | 'tree') {
  return defineComponent({
    name, inheritAttrs: false,
    props: {
      label: { type: String, required: true },
      disabled: { type: Boolean, default: false },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
      asChild: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
      const root = scope === 'sequence' ? useSequenceContext(name) : useTreeContext(name);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        type: props.as === 'button' ? 'button' : undefined,
        disabled: props.disabled || root.disabled(),
        'aria-label': props.label,
        'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End',
        'data-sectile-reorder-handle': '',
        'data-scope': scope === 'sequence' ? 'sequence-reorder' : 'tree-reorder',
        'data-part': 'handle',
      }), slots);
    },
  });
}
export const SequenceReorderHandle = /* @__PURE__ */ createReorderHandle('SectileSequenceReorderHandle', 'sequence');
export const TreeReorderHandle = /* @__PURE__ */ createReorderHandle('SectileTreeReorderHandle', 'tree');

export type { ReorderOrientation };
