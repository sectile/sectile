import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  provide,
  type Component,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import { unwrap } from '@sectile/core/result';
import { createTemporalFormatter, type TemporalFormatter, type TemporalFormatterOptions } from '@sectile/dom/temporal/format';

export type { TemporalFormatter, TemporalFormatterOptions } from '@sectile/dom/temporal/format';

export interface TemporalProviderProps {
  readonly referenceDate?: DateValue;
  readonly referenceInstant?: number;
  readonly formatting?: TemporalFormatterOptions;
}

interface TemporalContext {
  readonly referenceDate: ComputedRef<DateValue>;
  readonly referenceInstant: ComputedRef<number | undefined>;
  readonly formatter: ComputedRef<TemporalFormatter | undefined>;
}

const temporalContextKey = Symbol('SectileTemporal');

export const TemporalProvider = /* @__PURE__ */ defineComponent({
  name: 'SectileTemporalProvider',
  inheritAttrs: false,
  props: {
    referenceDate: { type: Object as PropType<DateValue>, default: undefined },
    referenceInstant: { type: Number, default: undefined },
    formatting: { type: Object as PropType<TemporalFormatterOptions>, default: undefined },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { slots }) {
    const parent = inject<TemporalContext | undefined>(temporalContextKey, undefined);
    let fallbackInstant = props.referenceDate === undefined && props.referenceInstant === undefined && parent === undefined ? Date.now() : undefined;
    const formatter = computed(() => props.formatting === undefined ? parent?.formatter.value : createTemporalFormatter(props.formatting));
    const referenceInstant = computed(() => props.referenceDate !== undefined ? undefined : props.referenceInstant ?? parent?.referenceInstant.value);
    const referenceDate = computed(() => {
      if (props.referenceDate !== undefined) return props.referenceDate;
      const instant = referenceInstant.value;
      const format = formatter.value;
      if (instant !== undefined) {
        if (format === undefined) throw new TypeError('TemporalProvider referenceInstant requires formatting in this provider or an ancestor.');
        return unwrap(format.dateAt(instant));
      }
      if (parent !== undefined) return parent.referenceDate.value;
      fallbackInstant ??= Date.now();
      return format === undefined ? currentReferenceDate(new Date(fallbackInstant)) : unwrap(format.dateAt(fallbackInstant));
    });
    // Admit explicit request configuration even when descendants do not read it.
    void formatter.value;
    void referenceDate.value;
    provide<TemporalContext>(temporalContextKey, { referenceDate, referenceInstant, formatter });
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.() ?? []);
  },
});

export function useTemporalReferenceDate(): ComputedRef<DateValue> {
  const context = inject<TemporalContext | undefined>(temporalContextKey, undefined);
  if (context !== undefined) return context.referenceDate;
  const fallback = currentReferenceDate();
  return computed(() => fallback);
}

export function useTemporalFormatter(): ComputedRef<TemporalFormatter | undefined> {
  const context = inject<TemporalContext | undefined>(temporalContextKey, undefined);
  return context?.formatter ?? computed(() => undefined);
}

function currentReferenceDate(now: Date = new Date()): DateValue {
  return Object.freeze({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}
