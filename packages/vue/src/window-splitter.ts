import { defineComponent, h, mergeProps, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { Primitive, type PrimitiveAs } from './primitive.js';
import {
  SliderRoot,
  SliderThumb,
  SliderTrack,
  type SliderRootProps,
  type SliderSlotProps,
} from './slider.js';
import { providePartContract } from './internal/part-contract.js';

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
    providePartContract('window-splitter', { thumb: 'handle' });
    const minimum = percentage(props.min, 'min');
    const maximum = percentage(props.max, 'max');
    if (minimum >= maximum) throw new TypeError('WindowSplitterRoot min must be less than max.');
    const constraintStyle = props.orientation === 'horizontal'
      ? { position: 'absolute', insetBlock: '0', insetInlineStart: `${minimum}%`, insetInlineEnd: `${100 - maximum}%`, pointerEvents: 'none' }
      : { position: 'absolute', insetInline: '0', insetBlockStart: `${minimum}%`, insetBlockEnd: `${100 - maximum}%`, pointerEvents: 'none' };
    return (): VNodeChild => h(SliderRoot, mergeProps(attrs, props, {
      asChild: true,
      role: 'separator', readonly: false,
      'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
    }), {
      default: (state: SliderSlotProps) => {
        if (props.asChild) return slots['default']?.(state);
        return h(Primitive, {
          as: props.as,
          style: {
            position: 'relative',
            '--sectile-window-splitter-percentage': `${state.value}%`,
          },
        }, {
          default: () => [
            h(SliderTrack, {
              as: 'span',
              'aria-hidden': 'true',
              'data-constraint-track': '',
              style: constraintStyle,
            }),
            slots['default']?.(state),
          ],
        });
      },
    });
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
      style: {
        flexBasis: props.side === 'before'
          ? 'var(--sectile-window-splitter-percentage, var(--sectile-slider-percentage))'
          : 'calc(100% - var(--sectile-window-splitter-percentage, var(--sectile-slider-percentage)))',
      },
    }), { default: slots['default'] });
  },
});

export const WindowSplitterHandle = SliderThumb;

function percentage(value: number | string, name: 'min' | 'max'): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new TypeError(`WindowSplitterRoot ${name} must be a percentage from 0 through 100.`);
  }
  return parsed;
}
