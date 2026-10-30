import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  callWithAsyncErrorHandling,
  defineComponent,
  ErrorCodes,
  getCurrentInstance,
  h,
  isRef,
  isVNode,
  mergeProps,
  onBeforeUnmount,
  shallowRef,
  watch,
  unref,
  type Component,
  type ComponentInternalInstance,
  type AnchorHTMLAttributes,
  type DefineSetupFnComponent,
  type PublicProps,
  type PropType,
  type Slots,
  type SlotsType,
  type ShallowRef,
  type WatchStopHandle,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from 'vue';
import { getAnchorAttributes, guardAnchorActivation, type AnchorOptions } from '@sectile/dom/attributes';

export type PrimitiveAs = string | Component;

export interface PrimitiveProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
  readonly elementRef?: (element: unknown) => void;
}

export interface PrimitiveElementExpose {
  readonly element: Element | null;
}

export type PrimitiveElementRefHandler = NonNullable<PrimitiveProps['elementRef']>;

const primitiveComponent = /* @__PURE__ */ defineComponent({
  name: 'SectilePrimitive',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
    elementRef: { type: Function as PropType<PrimitiveElementRefHandler>, default: undefined },
  },
  setup(props, { attrs, slots, expose }) {
    const element = shallowRef<Element | null>(null);
    expose(primitiveElementExpose(element));
    let adoptedComponent: ComponentElementInstance | undefined;
    let stopElementWatch: WatchStopHandle | undefined;
    const publishElement = (value: unknown): void => {
      const current = value ?? null;
      element.value = current as Element | null;
      props.elementRef?.(current);
    };
    const setElement = (value: unknown): void => {
      const component = componentElementInstance(value);
      if (component !== undefined && component === adoptedComponent) return;
      stopElementWatch?.(); stopElementWatch = undefined;
      adoptedComponent = component;
      if (component === undefined) publishElement(value ?? null);
      else stopElementWatch = watch(() => resolvePrimitiveElement(component), publishElement, { immediate: true, flush: 'post' });
    };
    const deliverComponentElement = (): void => {
      if (adoptedComponent !== undefined) {
        publishElement(resolvePrimitiveElement(adoptedComponent));
      }
    };
    onBeforeUnmount(() => {
      stopElementWatch?.(); stopElementWatch = undefined;
      adoptedComponent = undefined; element.value = null;
    });
    return (): VNodeChild => renderPrimitive(props, mergeProps(
      attrs,
      { ref: setElement, onVnodeUpdated: deliverComponentElement },
    ), slots);
  },
});

export const Primitive = primitiveComponent as typeof primitiveComponent & {
  new(): InstanceType<typeof primitiveComponent> & PrimitiveElementExpose;
};

// A saved exposure retains only this reference, never a component setup scope.
function primitiveElementExpose(element: ShallowRef<Element | null>): PrimitiveElementExpose {
  return { get element() { return element.value; } };
}

export function renderPrimitive(
  props: Pick<Required<PrimitiveProps>, 'as' | 'asChild'>,
  attributes: Readonly<Record<string, unknown>>,
  slots: Slots,
  projectAttributes?: (attributes: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>,
): VNodeChild {
  if (!props.asChild) {
    if (projectAttributes) attributes = projectAttributes(attributes);
    if (typeof props.as !== 'string') return h(props.as, attributes, slots);
    return h(
      props.as,
      attributes,
      htmlVoidElements.has(props.as.toLowerCase()) ? undefined : slots['default']?.() ?? [],
    );
  }
  const children = slots['default']?.() ?? [];
  return adoptSingleElement(children, guardAdoptedEventHandlers(attributes), projectAttributes === undefined ? undefined : (child, incoming) => {
    const projected = projectAttributes(mergeProps(child.props ?? {}, incoming));
    const adopted = cloneVNode(child, projected, true);
    // Adoption owns refs/block flags; projection must not duplicate child listeners/classes.
    adopted.props = projected;
    return adopted;
  });
}

const htmlVoidElements = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function guardAdoptedEventHandlers(
  attributes: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  let guarded: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(attributes)) {
    if (!/^on[^a-z]/u.test(key) || (typeof value !== 'function' && !Array.isArray(value))) continue;
    guarded ??= { ...attributes };
    guarded[key] = guardAdoptedEventHandler(value);
  }
  return guarded ?? attributes;
}

function guardAdoptedEventHandler(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(guardAdoptedEventHandler);
  if (typeof value !== 'function') return value;
  return (...args: unknown[]): unknown => {
    const event = args[0];
    if (typeof event === 'object' && event !== null
      && 'defaultPrevented' in event && event.defaultPrevented === true) return undefined;
    return Reflect.apply(value, undefined, args);
  };
}

interface AdoptionState {
  elementCount: number;
  unsupportedCount: number;
  readonly clones: WeakMap<VNode, VNode>;
  readonly project?: (value: VNode, attributes: Readonly<Record<string, unknown>>) => VNode;
}

type FragmentVNode = VNode & {
  dynamicChildren?: VNode[] | null;
  slotScopeIds?: string[] | null;
};

function adoptSingleElement(
  children: readonly VNode[],
  attributes: Readonly<Record<string, unknown>>,
  project?: AdoptionState['project'],
): VNodeChild {
  const state: AdoptionState = {
    elementCount: 0,
    unsupportedCount: 0,
    clones: new WeakMap(),
    ...(project === undefined ? {} : { project }),
  };
  const adopted = adoptArray(children, attributes, state);
  if (state.elementCount !== 1 || state.unsupportedCount !== 0) {
    const unsupported = state.unsupportedCount === 0
      ? ''
      : ` and ${state.unsupportedCount} unsupported non-element node${state.unsupportedCount === 1 ? '' : 's'}`;
    throw new TypeError(
      `A Sectile primitive with asChild requires exactly one element child; received ${state.elementCount}${unsupported}.`,
    );
  }
  return adopted.length === 1 ? adopted[0] as VNodeChild : adopted;
}

function adoptArray(
  values: readonly unknown[],
  attributes: Readonly<Record<string, unknown>>,
  state: AdoptionState,
): VNodeArrayChildren {
  let changed = false;
  const adopted = values.map((value) => {
    const next = adoptValue(value, attributes, state);
    if (next !== value) changed = true;
    return next;
  });
  return (changed ? adopted : values) as VNodeArrayChildren;
}

function adoptValue(
  value: unknown,
  attributes: Readonly<Record<string, unknown>>,
  state: AdoptionState,
): unknown {
  if (Array.isArray(value)) return adoptArray(value, attributes, state);
  if (!isVNode(value)) {
    if (value !== null && value !== undefined && value !== false
      && String(value).trim().length > 0) state.unsupportedCount += 1;
    return value;
  }
  if (value.type === Comment) return value;
  if (value.type === Text) {
    if (String(value.children ?? '').trim().length > 0) state.unsupportedCount += 1;
    return value;
  }
  if (value.type === Fragment) return adoptFragment(value, attributes, state);
  if (!isElementCandidate(value)) {
    state.unsupportedCount += 1;
    return value;
  }
  state.elementCount += 1;
  const adopted = state.project?.(value, attributes) ?? cloneVNode(value, attributes, true);
  state.clones.set(value, adopted);
  return adopted;
}

function adoptFragment(
  value: VNode,
  attributes: Readonly<Record<string, unknown>>,
  state: AdoptionState,
): VNode {
  if (!Array.isArray(value.children)) {
    if (value.children !== null && String(value.children).trim().length > 0) {
      state.unsupportedCount += 1;
    }
    return value;
  }
  const children = adoptArray(value.children, attributes, state);
  if (children === value.children) return value;
  const adopted = cloneVNode(value) as FragmentVNode;
  adopted.children = children;
  const dynamicChildren = (value as FragmentVNode).dynamicChildren;
  if (dynamicChildren !== undefined && dynamicChildren !== null) {
    adopted.dynamicChildren = dynamicChildren.map((child) => state.clones.get(child) ?? child);
  }
  state.clones.set(value, adopted);
  return adopted;
}

function isElementCandidate(value: VNode): boolean {
  // Vue shape flags: element = 1, functional component = 2, stateful component = 4.
  return (value.shapeFlag & 0b111) !== 0;
}

interface ComponentElementInstance {
  readonly $?: {
    readonly exposed?: Record<string, unknown> | null;
    readonly subTree?: VNode;
  };
}

function resolvePrimitiveElement(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  const instance = componentElementInstance(value);
  if (instance === undefined) return value;

  let renderer = instance.$;
  while (renderer !== undefined) {
    const exposed = renderer.exposed;
    if (exposed !== undefined && exposed !== null
      && Object.prototype.hasOwnProperty.call(exposed, 'element')) {
      const published = exposed['element'];
      const element = isRef(published) ? unref(published) : published;
      return element == null ? null : requireRendererElement(element, 'exposed `element`');
    }
    const subTree = renderer.subTree;
    if (subTree === undefined || !isElementCandidate(subTree)) {
      throw new TypeError(
        'A component adopted by a Sectile primitive must expose `element` or render one element root.',
      );
    }
    if (subTree.component === null) return requireRendererElement(subTree.el, 'single root');
    renderer = subTree.component;
  }
  return null;
}

function componentElementInstance(value: unknown): ComponentElementInstance | undefined {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return undefined;
  const candidate = value as ComponentElementInstance;
  return candidate.$ === undefined ? undefined : candidate;
}

function requireRendererElement(value: unknown, source: string): unknown {
  const valid = typeof Element === 'undefined'
    ? typeof value === 'object' && value !== null
    : value instanceof Element;
  if (valid) return value;
  throw new TypeError(
    `A component adopted by a Sectile primitive has an invalid ${source}; expected an Element.`,
  );
}

interface AnchorNativeAttributes extends /* @vue-ignore */ Omit<AnchorHTMLAttributes,
  keyof AnchorOptions | 'role' | 'tabindex' | 'aria-current' | 'aria-disabled'> {}
export type AnchorProps = AnchorNativeAttributes & {
  readonly [K in keyof AnchorOptions]?: AnchorOptions[K] | undefined;
} & { readonly asChild?: boolean };
export interface AnchorSlotState { readonly disabled: boolean; readonly current: AnchorOptions['current'] }
export interface AnchorContentSlotState extends AnchorSlotState { readonly children: VNodeChild }
export interface AnchorSlots {
  default?: (state: AnchorSlotState) => VNodeChild;
  leading?: (state: AnchorSlotState) => VNodeChild;
  trailing?: (state: AnchorSlotState) => VNodeChild;
  content?: (state: AnchorContentSlotState) => VNodeChild;
}
export interface AnchorExpose extends PrimitiveElementExpose {
  readonly element: HTMLAnchorElement | null;
  focus(options?: FocusOptions): void;
}
type AnchorInstance = InstanceType<DefineSetupFnComponent<AnchorProps, {}, SlotsType<AnchorSlots>>> & AnchorExpose;
type AnchorCallback = (event: MouseEvent) => unknown;
interface AnchorCallbackGroup { readonly once: number; readonly callbacks: AnchorCallback[] }
interface AnchorPacket { readonly disabled: boolean; readonly groups: AnchorCallbackGroup[] }
interface AnchorDelivery {
  alive: boolean;
  owner: ComponentInternalInstance | null;
  packet: AnchorPacket | null;
  once: number;
}

function retireAnchorPacket(delivery: AnchorDelivery): void {
  for (const group of delivery.packet?.groups ?? []) group.callbacks.length = 0;
  delivery.packet = null;
}

/** Keep the original native event while observing immediate cancellation within a lane. */
function deliverAnchorLane(delivery: AnchorDelivery, packet: AnchorPacket,
  groups: readonly AnchorCallbackGroup[], event: MouseEvent): void {
  const admitted = (): boolean => guardAnchorActivation(event,
    !delivery.alive || delivery.packet !== packet || packet.disabled);
  if (!admitted()) return;
  const originalStop = event.stopImmediatePropagation;
  let stopped = false;
  event.stopImmediatePropagation = function (): void { stopped = true; originalStop.call(this); };
  try {
    for (const group of groups) {
      if (stopped || !admitted()) break;
      if (group.once && (delivery.once & group.once)) continue;
      delivery.once |= group.once;
      for (const callback of group.callbacks) {
        if (stopped || !admitted()) break;
        callWithAsyncErrorHandling(callback, delivery.owner, ErrorCodes.NATIVE_EVENT_HANDLER, [event]);
      }
    }
  } finally { event.stopImmediatePropagation = originalStop; }
}

function prepareAnchorListeners(delivery: AnchorDelivery, packet: AnchorPacket,
  outer: Readonly<Record<string, unknown>>, child: Readonly<Record<string, unknown>>,
  attributes: Record<string, unknown>): void {
  const lanes = new Map<number, AnchorCallbackGroup[]>();
  const seen = new Map<number, Set<AnchorCallback>>();
  const registrations = new Map<number, AnchorCallbackGroup>();
  let activeOnce = 0;
  for (const [origin, source] of [outer, child].entries()) for (const [key, value] of Object.entries(source)) {
    const match = /^on(Click|Auxclick)((?:Once|Capture|Passive)*)$/u.exec(key);
    if (!match) continue;
    delete attributes[key];
    const options = match[2]!;
    const lane = (match[1] === 'Auxclick' ? 4 : 0) + (options.includes('Capture') ? 2 : 0)
      + (options.includes('Passive') ? 1 : 0);
    const isOnce = options.includes('Once');
    const identity = lane * 2 + Number(isOnce);
    let known = seen.get(identity);
    if (!known) { known = new Set(); seen.set(identity, known); }
    const callbacks: AnchorCallback[] = [];
    const collect = (candidate: unknown): void => {
      if (Array.isArray(candidate)) { for (const entry of candidate) collect(entry); }
      else if (typeof candidate === 'function' && !known.has(candidate as AnchorCallback)) {
        known.add(candidate as AnchorCallback); callbacks.push(candidate as AnchorCallback);
      }
    };
    collect(value);
    if (!callbacks.length) continue;
    const registration = lane * 4 + origin * 2 + Number(isOnce);
    const existing = registrations.get(registration);
    if (existing) { for (const callback of callbacks) existing.callbacks.push(callback); continue; }
    const group = { once: isOnce ? 1 << (lane * 2 + origin) : 0, callbacks };
    activeOnce |= group.once;
    registrations.set(registration, group);
    packet.groups.push(group);
    const groups = lanes.get(lane);
    if (groups) groups.push(group); else lanes.set(lane, [group]);
  }
  // Removing and later restoring a once listener rearms it, as native registration does.
  delivery.once &= activeOnce;
  // Capture guards also cover a disabled native default action when no callback is supplied.
  if (!lanes.has(2)) lanes.set(2, []);
  if (!lanes.has(6)) lanes.set(6, []);
  for (const [lane, groups] of lanes) {
    const key = `on${lane >= 4 ? 'Auxclick' : 'Click'}${lane & 2 ? 'Capture' : ''}${lane & 1 ? 'Passive' : ''}`;
    attributes[key] = (event: MouseEvent): void => deliverAnchorLane(delivery, packet, groups, event);
  }
}

const AnchorImplementation = /* @__PURE__ */ defineComponent({
  name: 'SectileAnchor',
  inheritAttrs: false,
  props: {
    asChild: { type: Boolean, default: false },
    href: { type: String, default: undefined },
    target: { type: String, default: undefined },
    rel: { type: String, default: undefined },
    download: { type: [String, Boolean] as PropType<string | boolean>, default: undefined },
    disabled: { type: Boolean, default: false },
    current: { type: String as PropType<AnchorOptions['current']>, default: undefined },
    tabIndex: { type: [Number, String] as PropType<number | string>, default: undefined },
  },
  slots: Object as SlotsType<AnchorSlots>,
  setup(props, { attrs, slots, expose }) {
    const owner = getCurrentInstance()!;
    const delivery: AnchorDelivery = { alive: true, owner, packet: null, once: 0 };
    let element: HTMLAnchorElement | null = null;
    let onceRoot: WeakRef<HTMLAnchorElement> | undefined;
    const setElement = (value: unknown): void => {
      element = value as HTMLAnchorElement | null;
      if (element && onceRoot?.deref() !== element) {
        delivery.once = 0;
        onceRoot = new WeakRef(element);
      }
    };
    expose({ get element() { return element; }, focus(options?: FocusOptions) { element?.focus(options); } });
    onBeforeUnmount(() => {
      delivery.alive = false; delivery.owner = null; delivery.once = 0;
      retireAnchorPacket(delivery); element = null; onceRoot = undefined;
    });
    return (): VNodeChild => {
      retireAnchorPacket(delivery);
      const packet: AnchorPacket = { disabled: props.disabled, groups: [] };
      delivery.packet = packet;
      const project = (child: VNode | undefined): VNode => {
        if (child && child.type !== 'a') throw new TypeError('A Sectile Anchor with asChild requires one native a element.');
        const childProps = child?.props ?? {};
        const attributes = mergeProps(childProps, attrs);
        const raw = owner.vnode.props ?? {};
        const supplied = (key: string, alias?: string): boolean => Object.hasOwn(raw, key)
          || (alias !== undefined && Object.hasOwn(raw, alias));
        const href = supplied('href') ? props.href : attributes['href'] as string | undefined;
        const target = supplied('target') ? props.target : attributes['target'] as string | undefined;
        const rel = supplied('rel') ? props.rel : attributes['rel'] as string | undefined;
        const download = supplied('download') ? props.download : attributes['download'] as string | boolean | undefined;
        const tabIndex = supplied('tabIndex', 'tab-index') ? props.tabIndex : attributes['tabindex'] as string | number | undefined;
        const { 'aria-current': ariaCurrent, ...projected } = getAnchorAttributes({
          ...(href === undefined ? {} : { href }),
          ...(target === undefined ? {} : { target }),
          ...(rel === undefined ? {} : { rel }),
          ...(download === undefined ? {} : { download }),
          disabled: props.disabled,
          ...(props.current === undefined ? {} : { current: props.current }),
          ...(tabIndex === undefined ? {} : { tabIndex }),
        });
        Object.assign(attributes, projected);
        if (supplied('current')) attributes['aria-current'] = ariaCurrent;
        prepareAnchorListeners(delivery, packet, attrs, childProps, attributes);
        attributes['ref'] = setElement;
        const decorated = slots.leading !== undefined || slots.trailing !== undefined || slots.content !== undefined;
        let adopted: VNode;
        if (!decorated) {
          if (!child) return h('a', attributes, slots.default?.({ disabled: props.disabled, current: props.current }) ?? []);
          adopted = cloneVNode(child, attributes, true);
        } else {
          const state: AnchorSlotState = { disabled: props.disabled, current: props.current };
          const content = child ? child.children as VNodeChild : slots.default?.(state) ?? [];
          const children = [slots.leading?.(state), slots.content ? slots.content({ ...state, children: content }) : content, slots.trailing?.(state)];
          if (!child) return h('a', attributes, children);
          // h(VNode) invalidates block metadata but retains the former text-child flag.
          // Read the replacement shape from Vue's native-element normalizer as well.
          adopted = h(child, attributes, children);
          adopted.shapeFlag = h('a', null, children).shapeFlag;
        }
        // cloneVNode owns ref/block flags; replace its merged props to avoid a second child listener/class merge.
        adopted.props = attributes;
        return adopted;
      };
      try {
        return props.asChild
          ? adoptSingleElement((slots.default?.({ disabled: props.disabled, current: props.current }) ?? []) as VNode[], {}, value => project(value))
          : project(undefined);
      } catch (error) { retireAnchorPacket(delivery); throw error; }
    };
  },
});

/** Native anchor composition with activation admission before adopted navigation callbacks. */
export const Anchor = AnchorImplementation as unknown as {
  new (): AnchorInstance & { readonly $props: AnchorProps & PublicProps; readonly $slots: AnchorSlots };
};
