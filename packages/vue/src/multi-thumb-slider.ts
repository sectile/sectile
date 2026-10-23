import {
  computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createMultiThumbSlider, getMultiThumbSliderThumbAttributes, type MultiThumbSliderConnection, type MultiThumbSliderPolicies,
} from '@sectile/dom/multi-thumb-slider';
import { tryCreateMultiThumbSliderState } from '@sectile/core/multi-thumb-slider';
import { tryCreateSequence } from '@sectile/core/sequence';
import { unwrap } from '@sectile/core/result';
import { createSliderControllerFromRange } from '@sectile/dom/slider';
import type { FormSubmissionRegistration } from './form/control.js';
import {
  hiddenValueSubmissionCapabilities,
  useCompositeFormControl,
} from './form/control.js';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface MultiThumbSliderRootProps {
  readonly thumbs: readonly string[];
  readonly modelValue?: readonly (number | string)[];
  readonly defaultValue?: readonly (number | string)[];
  readonly min?: number | string;
  readonly max?: number | string;
  readonly step?: number | string;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly getThumbLabel?: (id: string) => string;
  readonly formatValue?: (value: string, id: string) => string;
  readonly policies?: MultiThumbSliderPolicies;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type MultiThumbSliderThumbLabelResolver = NonNullable<MultiThumbSliderRootProps['getThumbLabel']>;
export type MultiThumbSliderValueFormatter = NonNullable<MultiThumbSliderRootProps['formatValue']>;
export interface MultiThumbSliderRootSlotProps { readonly values: readonly string[]; readonly percentages: readonly number[]; readonly activeThumb: string | null; readonly disabled: boolean; readonly: boolean }
export interface MultiThumbSliderThumbProps { readonly value: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface MultiThumbSliderThumbSlotProps extends MultiThumbSliderRootSlotProps { readonly value: string; readonly index: number; readonly percentage: number }
export interface MultiThumbSliderPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<MultiThumbSliderRootSlotProps>;
  readonly thumbs: ComputedRef<readonly string[]>;
  readonly orientation: ComputedRef<'horizontal' | 'vertical'>;
  readonly connection: ComputedRef<MultiThumbSliderConnection<string> | undefined>;
  registerTrack(element?: HTMLElement): void;
  registerThumb(id: string, element?: HTMLElement): void;
  requestConnect(): void;
  thumbIndex(id: string): number | null;
  attributesFor(id: string): Readonly<Record<string, string | number | undefined>>;
}
const key = Symbol('SectileMultiThumbSliderRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const MultiThumbSliderRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileMultiThumbSliderRoot', inheritAttrs: false,
  props: {
    thumbs: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: Array as PropType<readonly (number | string)[]>, default: undefined },
    defaultValue: { type: Array as PropType<readonly (number | string)[]>, default: undefined },
    min: { type: [Number, String], default: 0 }, max: { type: [Number, String], default: 100 }, step: { type: [Number, String], default: 1 },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined },
    getThumbLabel: { type: Function as PropType<MultiThumbSliderThumbLabelResolver>, default: undefined },
    formatValue: { type: Function as PropType<MultiThumbSliderValueFormatter>, default: undefined },
    policies: { type: Object as PropType<MultiThumbSliderPolicies>, default: undefined },
    name: { type: String, default: undefined }, form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_values: readonly string[]): boolean => true },
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>(); const track = shallowRef<HTMLElement>();
    const submissions = new Map<number, HTMLInputElement>();
    const connection = shallowRef<MultiThumbSliderConnection<string>>();
    const initialValues = normalizeValues(props.modelValue ?? props.defaultValue ?? props.thumbs.map(() => props.min));
    const local = shallowRef<readonly string[]>(initialValues);
    let mounted = false, resetScheduled = false, connectScheduled = false;
    const controlled = useControlledStateInvariant('MultiThumbSliderRoot', 'modelValue', () => props.modelValue);
    const rangeController = computed(() => {
      const result = createSliderControllerFromRange({ min: String(props.min), max: String(props.max), step: String(props.step) });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    });
    const current = computed(() => normalizeValues(props.modelValue ?? local.value));
    const percentages = computed(() => current.value.map((value) => {
      const tick = rangeController.value.range.tickOf(value);
      if (tick === null) throw new TypeError(`Multi-thumb slider value ${value} is outside its exact range.`);
      return rangeController.value.range.count === 0 ? 0 : tick / rangeController.value.range.count * 100;
    }));
    const active = shallowRef<string | null>(props.thumbs[0] ?? null);
    const participation = useCompositeFormControl({
      root: () => root.value ?? null,
      focusTarget: () => root.value?.querySelector<HTMLElement>('[data-sectile-multi-thumb]') ?? root.value ?? null,
      submissions: () => current.value.flatMap<FormSubmissionRegistration>((_value, index) => {
        const element = submissions.get(index);
        return element === undefined ? [] : [{
          element: () => element,
          relativeName: [index],
          capabilities: hiddenValueSubmissionCapabilities,
        }];
      }),
      reset: () => {
        if (controlled || resetScheduled) return;
        resetScheduled = true;
        queueMicrotask(() => {
          resetScheduled = false;
          if (!mounted) return;
          local.value = initialValues;
          connect();
        });
      },
    });
    const state = computed<MultiThumbSliderRootSlotProps>(() => Object.freeze({
      values: current.value, percentages: percentages.value, activeThumb: active.value,
      disabled: props.disabled, readonly: props.readonly,
    }));
    const ticks = (values: readonly string[]): readonly number[] => values.map((value) => {
      const tick = rangeController.value.range.tickOf(value);
      if (tick === null) throw new TypeError(`Multi-thumb slider value ${value} is outside its exact range.`);
      return tick;
    });
    const domain = computed(() => connection.value?.domain ?? unwrap(tryCreateSequence(props.thumbs)));
    const projection = computed(() => {
      const values = current.value;
      return connection.value?.getSnapshot().state
        ?? unwrap(tryCreateMultiThumbSliderState(domain.value, rangeController.value.range, ticks(values), null, props.policies));
    });
    const refresh = (): void => {
      if (connection.value === undefined) return;
      local.value = connection.value.getValues(); active.value = connection.value.getSnapshot().state.cursor.current;
    };
    const connect = (): void => {
      connectScheduled = false;
      connection.value?.disconnect(); connection.value = undefined;
      if (!mounted || root.value === undefined) return;
      connection.value = createMultiThumbSlider({
        root: root.value, ...(track.value === undefined ? {} : { track: track.value }), thumbs: props.thumbs,
        min: String(props.min), max: String(props.max), step: String(props.step),
        ...(controlled ? { values: ticks(current.value) } : { defaultValues: ticks(current.value) }),
        disabled: props.disabled, readOnly: props.readonly, orientation: props.orientation,
        ...(props.label === undefined ? {} : { label: props.label }),
        ...(props.getThumbLabel === undefined ? {} : { getThumbLabel: props.getThumbLabel }),
        ...(props.formatValue === undefined ? {} : { formatValue: props.formatValue }),
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        onValuesChange: (nextTicks) => {
          const next = Object.freeze(nextTicks.map((tick) => {
            const value = rangeController.value.range.valueAt(tick);
            if (value === null) throw new TypeError(`Multi-thumb slider tick ${tick} is outside its exact range.`);
            return value;
          }));
          local.value = next;
          emit('update:modelValue', next);
        },
        onUpdate: refresh,
      });
      refreshThumbs(); refresh();
    };
    const requestConnect = (): void => {
      if (!mounted || connectScheduled) return;
      connectScheduled = true;
      void nextTick(() => {
        if (!mounted || !connectScheduled) return;
        connect();
      });
    };
    const refreshThumbs = (): void => {
      if (root.value === undefined || connection.value === undefined) return;
      root.value.querySelectorAll<HTMLElement>('[data-sectile-multi-thumb]').forEach((element) => {
        const id = element.dataset['sectileMultiThumb']; if (id !== undefined) connection.value?.setThumbAttributes(element, id);
      });
    };
    provide<Context>(key, {
      state, thumbs: computed(() => props.thumbs), orientation: computed(() => props.orientation), connection: computed(() => connection.value),
      registerTrack: (element) => { track.value = element; },
      registerThumb: (id, element) => {
        if (element === undefined) requestConnect(); else connection.value?.setThumbAttributes(element, id);
      },
      requestConnect,
      thumbIndex: id => domain.value.indexOf(id),
      attributesFor: id => getMultiThumbSliderThumbAttributes({ domain: domain.value, range: connection.value?.range ?? rangeController.value.range, state: projection.value, id,
        orientation: props.orientation, disabled: props.disabled, readOnly: props.readonly,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(props.getThumbLabel === undefined ? {} : { label: props.getThumbLabel(id) }),
        ...(props.formatValue === undefined ? {} : { formatValue: props.formatValue }),
      }),
    });
    onMounted(() => { mounted = true; requestConnect(); });
    onBeforeUnmount(() => {
      mounted = false; resetScheduled = false; connectScheduled = false;
      connection.value?.disconnect(); connection.value = undefined;
      root.value = undefined; track.value = undefined; submissions.clear();
    });
    watch([() => props.thumbs, () => props.min, () => props.max, () => props.step, () => props.orientation,
      () => props.disabled, () => props.readonly, () => props.policies, () => props.label,
      () => props.getThumbLabel, () => props.formatValue, () => props.modelValue], (next, previous) => {
      if (!mounted) return;
      for (let index = 0; index < next.length - 1; index++) {
        if (next[index] !== previous[index]) { connect(); return; }
      }
      if (connectScheduled || !controlled || props.modelValue === undefined || connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ values: ticks(normalizeValues(props.modelValue)), highlightedValue: active.value });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    watch([root, track], requestConnect, { flush: 'post' });
    return (): VNodeChild => {
      const style = Object.fromEntries(percentages.value.map((value, index) => [`--sectile-thumb-${index}-percentage`, `${value}%`]));
      const visual = h(Primitive, mergeProps(participation.controlProps.value, attrs, {
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
        role: 'group', 'aria-label': props.label, 'data-scope': 'multi-thumb-slider', 'data-part': 'root',
        'data-orientation': props.orientation, style,
      }), { default: () => slots['default']?.(state.value) });
      if (props.name === undefined && props.form === undefined && !props.required && !participation.participating) return visual;
      return [visual, ...current.value.map((value, index) => h('input', {
        key: index,
        ref: (element: unknown) => {
          if (element instanceof HTMLInputElement) submissions.set(index, element);
          else submissions.delete(index);
        },
        type: 'hidden',
        name: props.name,
        form: props.form,
        value,
        disabled: props.disabled,
      }))];
    };
  },
});

export type MultiThumbSliderValueChangeHandler = (values: readonly string[]) => void;

export const MultiThumbSliderTrack = /* @__PURE__ */ defineComponent({
  name: 'SectileMultiThumbSliderTrack', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MultiThumbSliderTrack'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerTrack(node instanceof HTMLElement ? node : undefined),
    'data-scope': 'multi-thumb-slider', 'data-part': 'track', 'data-orientation': root.orientation.value,
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MultiThumbSliderRange = /* @__PURE__ */ defineComponent({
  name: 'SectileMultiThumbSliderRange', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('MultiThumbSliderRange');
    const style = computed(() => {
      const percentages = root.state.value.percentages;
      let start = percentages[0] ?? 0, end = start;
      for (const percentage of percentages) { start = Math.min(start, percentage); end = Math.max(end, percentage); }
      return { '--sectile-range-start': `${start}%`, '--sectile-range-end': `${end}%` };
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, 'aria-hidden': 'true', 'data-scope': 'multi-thumb-slider', 'data-part': 'range',
    style: style.value,
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MultiThumbSliderThumb = /* @__PURE__ */ defineComponent({
  name: 'SectileMultiThumbSliderThumb', inheritAttrs: false,
  props: { value: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderThumbSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('MultiThumbSliderThumb');
    onBeforeUnmount(root.requestConnect);
    watch(() => props.value, root.requestConnect, { flush: 'post' });
    const slot = computed<MultiThumbSliderThumbSlotProps>(() => {
      const index = root.thumbIndex(props.value) ?? -1;
      return { ...root.state.value, value: props.value, index, percentage: root.state.value.percentages[index] ?? 0 };
    });
    return (): VNodeChild => {
      const index = root.thumbIndex(props.value) ?? -1;
      return h(Primitive, mergeProps(attrs, root.attributesFor(props.value), {
        as: props.as, asChild: props.asChild,
        elementRef: (node: unknown) => root.registerThumb(props.value, node instanceof HTMLElement ? node : undefined),
        'data-sectile-multi-thumb': props.value, 'data-scope': 'multi-thumb-slider', 'data-part': 'thumb',
        'data-index': index, style: { '--sectile-thumb-percentage': `${root.state.value.percentages[index] ?? 0}%` },
      }), { default: () => slots['default']?.({ ...slot.value, index, percentage: root.state.value.percentages[index] ?? 0 }) });
    };
  },
});

function normalizeValues(values: readonly (number | string)[]): readonly string[] { return Object.freeze(values.map(String)); }
function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside MultiThumbSliderRoot.`); return root; }
