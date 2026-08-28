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
import type { DateValue } from '@sectile/dom/temporal';

export interface TemporalProviderProps {
  readonly referenceDate?: DateValue;
}

interface TemporalContext {
  readonly referenceDate: ComputedRef<DateValue>;
}

const temporalContextKey = Symbol('SectileTemporal');

export const TemporalProvider = defineComponent({
  name: 'SectileTemporalProvider',
  inheritAttrs: false,
  props: {
    referenceDate: { type: Object as PropType<DateValue>, default: undefined },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { slots }) {
    const parent = inject<TemporalContext | undefined>(temporalContextKey, undefined);
    const fallbackReferenceDate = currentReferenceDate();
    const referenceDate = computed(
      () => props.referenceDate ?? parent?.referenceDate.value ?? fallbackReferenceDate,
    );
    provide<TemporalContext>(temporalContextKey, { referenceDate });
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.() ?? []);
  },
});

export function useTemporalReferenceDate(): ComputedRef<DateValue> {
  const context = inject<TemporalContext | undefined>(temporalContextKey, undefined);
  const fallback = currentReferenceDate();
  return context?.referenceDate ?? computed(() => fallback);
}

function currentReferenceDate(now: Date = new Date()): DateValue {
  return Object.freeze({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}
