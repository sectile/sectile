import {
  type PropType,
  type VNodeChild,
  h,
  mergeProps,
} from 'vue';
import { type PrimitiveAs, Primitive } from '../primitive.js';
import type { FormPartProps } from './contracts.js';

export const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export function renderFieldPart(
  props: FormPartProps,
  attrs: Readonly<Record<string, unknown>>,
  slots: Readonly<{ default?: () => VNodeChild }>,
  part: string,
  attributes: Readonly<Record<string, unknown>>,
): VNodeChild {
  return h(Primitive, mergeProps(attributes, attrs, {
    as: props.as,
    asChild: props.asChild,
    'data-scope': 'form',
    'data-part': part,
  }), { default: () => slots.default?.() });
}
