import {
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
}

export const Primitive = defineComponent({
  name: 'SectilePrimitive',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return (): VNodeChild => renderPrimitive(props, attrs, slots);
  },
});

export function renderPrimitive(
  props: Required<PrimitiveProps>,
  attributes: Readonly<Record<string, unknown>>,
  slots: Slots,
): VNodeChild {
  const children = slots['default']?.() ?? [];
  if (!props.asChild) return h(props.as, attributes, children);
  const child = firstRenderableChild(children);
  if (child === undefined) {
    throw new TypeError('A Sectile primitive with asChild requires one rendered child.');
  }
  return cloneVNode(child, mergeProps(child.props ?? {}, attributes), true);
}

function firstRenderableChild(children: readonly VNode[]): VNode | undefined {
  return children.find((child) => typeof child.type !== 'symbol');
}
