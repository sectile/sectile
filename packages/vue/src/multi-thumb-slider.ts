import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createMultiThumbSlider, type MultiThumbSliderConnection, type MultiThumbSliderPolicies,
} from '@sectile/dom/multi-thumb-slider';
import { createSliderControllerFromRange } from '@sectile/dom/slider';
import type { FormSubmissionRegistration } from './form.js';
import {
  hiddenValueSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';
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
  registerThumb(id: string, element: HTMLElement): void;
}
const key = Symbol('SectileMultiThumbSliderRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const MultiThumbSliderRoot = defineComponent({
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
    const local = shallowRef<readonly string[]>(normalizeValues(props.modelValue ?? props.defaultValue ?? props.thumbs.map(() => props.min)));
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
    const refresh = (): void => {
      if (connection.value === undefined) return;
      local.value = connection.value.getValues(); active.value = connection.value.getSnapshot().state.cursor.current;
    };
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === undefined) return;
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
    const refreshThumbs = (): void => {
      if (root.value === undefined || connection.value === undefined) return;
      root.value.querySelectorAll<HTMLElement>('[data-sectile-multi-thumb]').forEach((element) => {
        const id = element.dataset['sectileMultiThumb']; if (id !== undefined) connection.value?.setThumbAttributes(element, id);
      });
    };
    provide<Context>(key, {
      state, thumbs: computed(() => props.thumbs), orientation: computed(() => props.orientation), connection: computed(() => connection.value),
      registerTrack: (element) => { track.value = element; }, registerThumb: (id, element) => connection.value?.setThumbAttributes(element, id),
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.thumbs, () => props.min, () => props.max, () => props.step, () => props.orientation,
      () => props.disabled, () => props.readonly, () => props.policies], connect);
    watch(() => props.modelValue, (values) => {
      if (!controlled || values === undefined || connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ values: ticks(normalizeValues(values)), highlightedValue: active.value });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
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

export const MultiThumbSliderTrack = defineComponent({
  name: 'SectileMultiThumbSliderTrack', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MultiThumbSliderTrack'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerTrack(node instanceof HTMLElement ? node : undefined),
    'data-scope': 'multi-thumb-slider', 'data-part': 'track', 'data-orientation': root.orientation.value,
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MultiThumbSliderRange = defineComponent({
  name: 'SectileMultiThumbSliderRange', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MultiThumbSliderRange'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, 'aria-hidden': 'true', 'data-scope': 'multi-thumb-slider', 'data-part': 'range',
    style: {
      '--sectile-range-start': `${Math.min(...root.state.value.percentages)}%`,
      '--sectile-range-end': `${Math.max(...root.state.value.percentages)}%`,
    },
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MultiThumbSliderThumb = defineComponent({
  name: 'SectileMultiThumbSliderThumb', inheritAttrs: false,
  props: { value: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MultiThumbSliderThumbSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('MultiThumbSliderThumb');
    const slot = computed<MultiThumbSliderThumbSlotProps>(() => {
      const index = root.thumbs.value.indexOf(props.value);
      return { ...root.state.value, value: props.value, index, percentage: root.state.value.percentages[index] ?? 0 };
    });
    return (): VNodeChild => {
      const index = root.thumbs.value.indexOf(props.value);
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerThumb(props.value, node); },
        'data-sectile-multi-thumb': props.value, 'data-scope': 'multi-thumb-slider', 'data-part': 'thumb',
        'data-index': index, style: { '--sectile-thumb-percentage': `${root.state.value.percentages[index] ?? 0}%` },
      }), { default: () => slots['default']?.({ ...slot.value, index, percentage: root.state.value.percentages[index] ?? 0 }) });
    };
  },
});

function normalizeValues(values: readonly (number | string)[]): readonly string[] { return Object.freeze(values.map(String)); }
function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside MultiThumbSliderRoot.`); return root; }
