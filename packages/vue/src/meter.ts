import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import { createMeterState } from '@sectile/core/meter';
import {
  getMeterIndicatorAttributes,
  getMeterRootAttributes,
} from '@sectile/dom/meter';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { normalizeDecimalInput } from './internal/decimal-input.js';

export type MeterValueFormatter = (value: string) => string;
export interface MeterRootProps {
  readonly value: number | string;
  readonly min?: number | string;
  readonly max?: number | string;
  readonly low?: number | string;
  readonly high?: number | string;
  readonly optimum?: number | string;
  readonly label?: string;
  readonly formatValue?: MeterValueFormatter;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface MeterRootSlotProps {
  readonly value: string;
  readonly min: string;
  readonly max: string;
  readonly low: string;
  readonly high: string;
  readonly optimum: string;
  readonly valueText: string;
  readonly percentage: number;
  readonly zone: 'optimum' | 'suboptimal' | 'even-less-good';
}
export interface MeterPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface MeterContext { readonly state: ComputedRef<MeterRootSlotProps> }
const meterKey = Symbol('SectileMeterRoot');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const MeterRoot = defineComponent({
  name: 'SectileMeterRoot',
  inheritAttrs: false,
  props: {
    value: { type: [Number, String], required: true },
    min: { type: [Number, String], default: 0 },
    max: { type: [Number, String], default: 100 },
    low: { type: [Number, String], default: undefined },
    high: { type: [Number, String], default: undefined },
    optimum: { type: [Number, String], default: undefined },
    label: { type: String, default: undefined },
    formatValue: { type: Function as PropType<MeterValueFormatter>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: MeterRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const state = computed<MeterRootSlotProps>(() => {
      const meter = createMeterState({
        value: normalizeDecimalInput(props.value),
        min: normalizeDecimalInput(props.min),
        max: normalizeDecimalInput(props.max),
        ...(props.low === undefined ? {} : { low: normalizeDecimalInput(props.low) }),
        ...(props.high === undefined ? {} : { high: normalizeDecimalInput(props.high) }),
        ...(props.optimum === undefined ? {} : { optimum: normalizeDecimalInput(props.optimum) }),
      });
      const projected = getMeterRootAttributes(meter);
      const valueText = props.formatValue?.(meter.value) ?? meter.value;
      return Object.freeze({
        value: meter.value,
        min: meter.min,
        max: meter.max,
        low: meter.low,
        high: meter.high,
        optimum: meter.optimum,
        valueText,
        percentage: Number(projected['data-percentage']),
        zone: meter.zone,
      });
    });
    provide<MeterContext>(meterKey, { state });
    return (): VNodeChild => {
      const current = state.value;
      const projected = getMeterRootAttributes(createMeterState({
        value: current.value,
        min: current.min,
        max: current.max,
        low: current.low,
        high: current.high,
        optimum: current.optimum,
      }), {
        ...(props.label === undefined ? {} : { label: props.label }),
        ...(typeof attrs['aria-labelledby'] === 'string' ? { labelledBy: attrs['aria-labelledby'] } : {}),
        ...(typeof attrs['aria-describedby'] === 'string' ? { describedBy: attrs['aria-describedby'] } : {}),
        ...(props.formatValue === undefined ? {} : { formatValue: props.formatValue }),
      });
      return h(Primitive, mergeProps(attrs, projected, {
        as: props.as,
        asChild: props.asChild,
      }), { default: () => slots['default']?.(current) });
    };
  },
});

export const MeterTrack = meterPart('SectileMeterTrack', 'track');

export const MeterIndicator = defineComponent({
  name: 'SectileMeterIndicator',
  inheritAttrs: false,
  props: partProps,
  setup(props, { attrs, slots }) {
    const root = useMeter('MeterIndicator');
    return (): VNodeChild => {
      const current = root.state.value;
      const meter = createMeterState({
        value: current.value, min: current.min, max: current.max,
        low: current.low, high: current.high, optimum: current.optimum,
      });
      return h(Primitive, mergeProps(attrs, getMeterIndicatorAttributes(meter), {
        as: props.as,
        asChild: props.asChild,
      }), slots);
    };
  },
});

export const MeterValueText = defineComponent({
  name: 'SectileMeterValueText',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const root = useMeter('MeterValueText');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'meter',
      'data-part': 'value-text',
    }), { default: () => slots['default']?.(root.state.value) ?? root.state.value.valueText });
  },
});

function meterPart(name: string, part: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: partProps,
    setup(props, { attrs, slots }) {
      useMeter(name);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        'data-scope': 'meter',
        'data-part': part,
      }), slots);
    },
  });
}

function useMeter(part: string): MeterContext {
  const root = inject<MeterContext>(meterKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside MeterRoot.`);
  return root;
}
