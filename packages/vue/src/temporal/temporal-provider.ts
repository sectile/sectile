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
import type { DateFieldFormat, DateValue } from '@sectile/temporal/date-field';
import type { DateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import type { TimeFieldFormat, TimeFieldPrecision } from '@sectile/temporal/time-field';
import { unwrap } from '@sectile/core/result';
import { createTemporalFormatter, type TemporalFormatter, type TemporalFormatterOptions } from '@sectile/dom/temporal/format';
import type { TemporalEditingFormatter } from './internal/editing-format-contract.js';

export type { TemporalFormatter, TemporalFormatterOptions } from '@sectile/dom/temporal/format';
export type { TemporalEditingFormatter } from './internal/editing-format-contract.js';

export interface TemporalProviderProps {
  readonly referenceDate?: DateValue;
  readonly referenceInstant?: number;
  readonly formatting?: TemporalFormatterOptions;
  readonly editingFormats?: TemporalEditingFormats;
}

export interface TemporalEditingFormats {
  readonly date?: DateFieldFormat;
  readonly time?: Readonly<Partial<Record<TimeFieldPrecision, TimeFieldFormat>>>;
  readonly dateTime?: Readonly<Partial<Record<TimeFieldPrecision, DateTimeFieldFormat>>>;
}

interface TemporalContext {
  readonly referenceDate: ComputedRef<DateValue>;
  readonly referenceInstant: ComputedRef<number | undefined>;
  readonly formatter: ComputedRef<TemporalFormatter | undefined>;
  readonly editingFormats: ComputedRef<TemporalEditingFormats | undefined>;
}

const temporalContextKey = Symbol('SectileTemporal');

export const TemporalProvider = /* @__PURE__ */ defineComponent({
  name: 'SectileTemporalProvider',
  inheritAttrs: false,
  props: {
    referenceDate: { type: Object as PropType<DateValue>, default: undefined },
    referenceInstant: { type: Number, default: undefined },
    formatting: { type: Object as PropType<TemporalFormatterOptions>, default: undefined },
    editingFormats: { type: Object as PropType<TemporalEditingFormats>, default: undefined },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { slots }) {
    const parent = inject<TemporalContext | undefined>(temporalContextKey, undefined);
    let fallbackInstant = props.referenceDate === undefined && props.referenceInstant === undefined && parent === undefined ? Date.now() : undefined;
    const formatter = computed(() => props.formatting === undefined ? parent?.formatter.value : createTemporalFormatter(props.formatting));
    const editingFormats = computed<TemporalEditingFormats | undefined>(() => {
      const inherited = parent?.editingFormats.value;
      const own = props.editingFormats;
      if (own === undefined) return inherited;
      for (const precision of ['minute', 'second', 'millisecond'] as const) {
        const time = own.time?.[precision];
        const dateTime = own.dateTime?.[precision];
        if (time !== undefined && time.precision !== precision) throw new TypeError('Time editing format must match its precision key.');
        if (dateTime !== undefined && dateTime.time.precision !== precision) throw new TypeError('Date-time editing format must match its precision key.');
      }
      const date = own.date ?? inherited?.date;
      return {
        ...(date === undefined ? {} : { date }),
        time: { ...inherited?.time, ...own.time },
        dateTime: { ...inherited?.dateTime, ...own.dateTime },
      };
    });
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
    void editingFormats.value;
    void referenceDate.value;
    provide<TemporalContext>(temporalContextKey, { referenceDate, referenceInstant, formatter, editingFormats });
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

/** Resolve inherited editing formats without changing locale display or reference-date policy. */
export function useTemporalEditingFormatter(): TemporalEditingFormatter {
  const context = inject<TemporalContext | undefined>(temporalContextKey, undefined);
  return {
    dateFieldFormat(localeFallback = true) {
      const formatter = localeFallback ? context?.formatter.value : undefined;
      return context?.editingFormats.value?.date ?? (formatter === undefined ? undefined : unwrap(formatter.dateFieldFormat()));
    },
    timeFieldFormat(precision, localeFallback = true) {
      const formatter = localeFallback ? context?.formatter.value : undefined;
      return context?.editingFormats.value?.time?.[precision] ?? (formatter === undefined ? undefined : unwrap(formatter.timeFieldFormat(precision)));
    },
    dateTimeFieldFormat(precision, localeFallback = true) {
      const formatter = localeFallback ? context?.formatter.value : undefined;
      return context?.editingFormats.value?.dateTime?.[precision]
        ?? (formatter === undefined ? undefined : unwrap(formatter.dateTimeFieldFormat(precision)));
    },
  };
}

function currentReferenceDate(now: Date = new Date()): DateValue {
  return Object.freeze({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}
