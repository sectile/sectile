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
import { createProgressState } from '@sectile/core/progress';
import { getProgressIndicatorAttributes, getProgressRootAttributes } from '@sectile/dom/progress';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { normalizeDecimalInput } from './internal/decimal-input.js';

export type ProgressValueFormatter = (value: string) => string;
export interface ProgressRootProps {
  readonly value?: number | string | null;
  readonly max?: number | string;
  readonly label?: string;
  readonly formatValue?: ProgressValueFormatter;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ProgressRootSlotProps {
  readonly value: string | null;
  readonly max: string;
  readonly valueText: string | null;
  readonly percentage: number | null;
  readonly status: 'indeterminate' | 'progressing' | 'complete';
}
export interface ProgressPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface ProgressContext { readonly state: ComputedRef<ProgressRootSlotProps> }
const progressKey = Symbol('SectileProgressRoot');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const ProgressRoot = defineComponent({
  name: 'SectileProgressRoot',
  inheritAttrs: false,
  props: {
    value: { type: [Number, String, null] as PropType<number | string | null>, default: null },
    max: { type: [Number, String], default: 100 },
    label: { type: String, default: undefined },
    formatValue: { type: Function as PropType<ProgressValueFormatter>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: ProgressRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const state = computed<ProgressRootSlotProps>(() => {
      const progress = createProgressState({
        value: props.value === null ? null : normalizeDecimalInput(props.value),
        max: normalizeDecimalInput(props.max),
      });
      const projected = getProgressRootAttributes(progress);
      const valueText = progress.value === null ? null : props.formatValue?.(progress.value) ?? progress.value;
      return Object.freeze({
        value: progress.value,
        max: progress.max,
        valueText,
        percentage: progress.ratio === null ? null : Number(projected['data-percentage']),
        status: progress.status,
      });
    });
    provide<ProgressContext>(progressKey, { state });
    return (): VNodeChild => {
      const current = state.value;
      const projected = getProgressRootAttributes(createProgressState({ value: current.value, max: current.max }), {
        ...(props.label === undefined ? {} : { label: props.label }),
        ...(typeof attrs['aria-labelledby'] === 'string' ? { labelledBy: attrs['aria-labelledby'] } : {}),
        ...(typeof attrs['aria-describedby'] === 'string' ? { describedBy: attrs['aria-describedby'] } : {}),
        ...(props.formatValue === undefined ? {} : { formatValue: props.formatValue }),
      });
      return h(Primitive, mergeProps(attrs, projected, { as: props.as, asChild: props.asChild }), {
        default: () => slots['default']?.(current),
      });
    };
  },
});

export const ProgressTrack = progressPart('SectileProgressTrack', 'track');

export const ProgressIndicator = defineComponent({
  name: 'SectileProgressIndicator',
  inheritAttrs: false,
  props: partProps,
  setup(props, { attrs, slots }) {
    const root = useProgress('ProgressIndicator');
    return (): VNodeChild => {
      const current = root.state.value;
      const progress = createProgressState({ value: current.value, max: current.max });
      return h(Primitive, mergeProps(attrs, getProgressIndicatorAttributes(progress), {
        as: props.as,
        asChild: props.asChild,
      }), slots);
    };
  },
});

export const ProgressValueText = defineComponent({
  name: 'SectileProgressValueText',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const root = useProgress('ProgressValueText');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'progress',
      'data-part': 'value-text',
    }), { default: () => slots['default']?.(root.state.value) ?? root.state.value.valueText ?? undefined });
  },
});

function progressPart(name: string, part: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: partProps,
    setup(props, { attrs, slots }) {
      useProgress(name);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        'data-scope': 'progress',
        'data-part': part,
      }), slots);
    },
  });
}

function useProgress(part: string): ProgressContext {
  const root = inject<ProgressContext>(progressKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside ProgressRoot.`);
  return root;
}
