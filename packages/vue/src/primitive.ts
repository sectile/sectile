import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  defineComponent,
  h,
  isRef,
  isVNode,
  mergeProps,
  onMounted,
  onUpdated,
  unref,
  type Component,
  type PropType,
  type Slots,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from 'vue';

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

export const Primitive = defineComponent({
  name: 'SectilePrimitive',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
    elementRef: { type: Function as PropType<PrimitiveElementRefHandler>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    let adoptedComponent: ComponentElementInstance | undefined;
    const setElement = (value: unknown): void => {
      adoptedComponent = componentElementInstance(value);
      if (adoptedComponent === undefined) props.elementRef?.(value ?? null);
    };
    const deliverComponentElement = (): void => {
      if (adoptedComponent !== undefined) {
        props.elementRef?.(resolvePrimitiveElement(adoptedComponent));
      }
    };
    onMounted(deliverComponentElement);
    onUpdated(deliverComponentElement);
    return (): VNodeChild => renderPrimitive(props, mergeProps(
      attrs,
      props.elementRef === undefined ? {} : { ref: setElement },
    ), slots);
  },
});

export function renderPrimitive(
  props: Pick<Required<PrimitiveProps>, 'as' | 'asChild'>,
  attributes: Readonly<Record<string, unknown>>,
  slots: Slots,
): VNodeChild {
  if (!props.asChild) {
    if (typeof props.as !== 'string') return h(props.as, attributes, slots);
    return h(
      props.as,
      attributes,
      htmlVoidElements.has(props.as.toLowerCase()) ? undefined : slots['default']?.() ?? [],
    );
  }
  const children = slots['default']?.() ?? [];
  return adoptSingleElement(children, guardAdoptedEventHandlers(attributes));
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
}

type FragmentVNode = VNode & {
  dynamicChildren?: VNode[] | null;
  slotScopeIds?: string[] | null;
};

function adoptSingleElement(
  children: readonly VNode[],
  attributes: Readonly<Record<string, unknown>>,
): VNodeChild {
  const state: AdoptionState = {
    elementCount: 0,
    unsupportedCount: 0,
    clones: new WeakMap(),
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
  const adopted = cloneVNode(value, attributes, true);
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
  readonly $el?: unknown;
}

function resolvePrimitiveElement(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  const instance = componentElementInstance(value);
  if (instance === undefined) return value;

  const exposed = instance.$?.exposed;
  if (exposed !== undefined && exposed !== null
    && Object.prototype.hasOwnProperty.call(exposed, 'element')) {
    const element = isRef(exposed['element']) ? unref(exposed['element']) : exposed['element'];
    return requireRendererElement(element, 'exposed `element`');
  }

  const subTree = instance.$?.subTree;
  if (subTree === undefined || !isElementCandidate(subTree)) {
    throw new TypeError(
      'A component adopted by a Sectile primitive must expose `element` or render one element root.',
    );
  }
  return requireRendererElement(instance.$el, 'single root');
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
