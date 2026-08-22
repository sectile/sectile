import { defineComponent, h, mergeProps, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { SliderRoot, SliderThumb, type SliderRootProps, type SliderSlotProps } from './slider.js';

export type WindowSplitterRootProps = Omit<SliderRootProps, 'readonly' | 'role'>;
export interface WindowSplitterPaneProps { readonly side: 'before' | 'after'; readonly as?: PrimitiveAs; readonly asChild?: boolean }

export const WindowSplitterRoot = defineComponent({
  name: 'SectileWindowSplitterRoot', inheritAttrs: false,
  props: {
    min: { type: [Number, String], default: 0 }, max: { type: [Number, String], default: 100 }, step: { type: [Number, String], default: 1 },
    modelValue: { type: [Number, String], default: undefined }, defaultValue: { type: [Number, String], default: 50 },
    pageStep: { type: Number, default: 10 }, orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    disabled: { type: Boolean, default: false }, label: { type: String, default: 'Resize panels' },
    name: { type: String, default: undefined }, form: { type: String, default: undefined },
    formatValue: { type: Function as PropType<(value: string) => string>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: SliderSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    return (): VNodeChild => h(SliderRoot, mergeProps(attrs, props, {
      role: 'separator', readonly: false, 'data-scope': 'window-splitter',
      'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
    }), { default: (state: SliderSlotProps) => slots['default']?.(state) });
  },
});

export const WindowSplitterPane = defineComponent({
  name: 'SectileWindowSplitterPane', inheritAttrs: false,
  props: {
    side: { type: String as PropType<'before' | 'after'>, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, 'data-scope': 'window-splitter', 'data-part': 'pane', 'data-side': props.side,
      style: { flexBasis: props.side === 'before' ? 'var(--sectile-slider-percentage)' : 'calc(100% - var(--sectile-slider-percentage))' },
    }), { default: slots['default'] });
  },
});

export const WindowSplitterHandle = SliderThumb;
