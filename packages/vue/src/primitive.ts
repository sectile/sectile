import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  defineComponent,
  h,
  mergeProps,
  type Component,
  type PropType,
  type Slots,
  type VNode,
  type VNodeChild,
} from 'vue';

export type PrimitiveAs = string | Component;

export interface PrimitiveProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
  readonly elementRef?: (element: unknown) => void;
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
    return (): VNodeChild => renderPrimitive(props, mergeProps(
      attrs,
      props.elementRef === undefined ? {} : { ref: props.elementRef },
    ), slots);
  },
});

export function renderPrimitive(
  props: Pick<Required<PrimitiveProps>, 'as' | 'asChild'>,
  attributes: Readonly<Record<string, unknown>>,
  slots: Slots,
): VNodeChild {
  const children = slots['default']?.() ?? [];
  if (!props.asChild) return h(props.as, attributes, children);
  const renderable = renderableChildren(children);
  const child = renderable[0];
  if (renderable.length !== 1 || child === undefined || typeof child.type === 'symbol') {
    throw new TypeError(`A Sectile primitive with asChild requires exactly one element child; received ${renderable.length}.`);
  }
  return cloneVNode(child, mergeProps(child.props ?? {}, attributes), true);
}

function renderableChildren(children: readonly VNode[]): readonly VNode[] {
  const renderable: VNode[] = [];
  for (const child of children) {
    if (child.type === Comment) continue;
    if (child.type === Fragment) {
      if (Array.isArray(child.children)) {
        renderable.push(...renderableChildren(child.children.filter(isVNodeChild)));
      }
      continue;
    }
    if (child.type === Text) {
      if (String(child.children ?? '').trim().length > 0) renderable.push(child);
      continue;
    }
    renderable.push(child);
  }
  return renderable;
}

function isVNodeChild(value: unknown): value is VNode {
  return typeof value === 'object' && value !== null && '__v_isVNode' in value;
}
