import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide, shallowRef, watch,
  type ComputedRef, type PropType, type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import {
  connectSlider,
  createSliderControllerFromRange,
  getSliderAttributes,
  getSliderInputAttributes,
  type SliderConnection,
  type SliderController,
} from '@sectile/dom/slider';
import { Primitive, type PrimitiveAs } from './primitive.js';
import {
  hiddenInputSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { usePartContract, type PartContract } from './internal/part-contract.js';

export interface SliderRootProps {
  readonly min?: number | string;
  readonly max?: number | string;
  readonly step?: number | string;
  readonly modelValue?: number | string;
  readonly defaultValue?: number | string;
  readonly pageStep?: number;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly role?: 'slider' | 'separator';
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly formatValue?: (value: string) => string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface SliderSlotProps { readonly value: string; readonly percentage: number; readonly disabled: boolean; readonly: boolean }
export interface SliderPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface SliderContext {
  readonly controller: SliderController;
  readonly state: ComputedRef<SliderSlotProps>;
  readonly orientation: ComputedRef<'horizontal' | 'vertical'>;
  readonly role: ComputedRef<'slider' | 'separator'>;
  readonly root: ShallowRef<HTMLElement | undefined>;
  readonly track: ShallowRef<HTMLElement | undefined>;
  readonly thumb: ShallowRef<HTMLElement | undefined>;
  readonly connection: ShallowRef<SliderConnection | undefined>;
  readonly label: ComputedRef<string | undefined>;
  readonly formatValue: ComputedRef<((value: string) => string) | undefined>;
  readonly partContract: PartContract;
  refresh(): void;
}
const sliderKey = Symbol('SectileSliderRoot');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
  asChild: { type: Boolean, default: false },
};

export const SliderRoot = defineComponent({
  name: 'SectileSliderRoot',
  inheritAttrs: false,
  props: {
    min: { type: [Number, String], default: 0 },
    max: { type: [Number, String], default: 100 },
    step: { type: [Number, String], default: 1 },
    modelValue: { type: [Number, String], default: undefined },
    defaultValue: { type: [Number, String], default: 0 },
    pageStep: { type: Number, default: 10 },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    role: { type: String as PropType<'slider' | 'separator'>, default: 'slider' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    label: { type: String, default: undefined },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    formatValue: { type: Function as PropType<(value: string) => string>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: SliderSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const controlled = props.modelValue !== undefined;
    const result = createSliderControllerFromRange({
      min: String(props.min),
      max: String(props.max),
      step: String(props.step),
      page: props.pageStep,
      ...(controlled ? { value: String(props.modelValue) } : { defaultValue: String(props.defaultValue) }),
      disabled: props.disabled,
      readOnly: props.readonly,
      onValueChange: ({ value }) => emit('update:modelValue', String(value)),
    });
    if (!result.ok) throw new TypeError(result.error.message);
    const controller = result.value;
    const snapshot = shallowRef(controller.getSnapshot());
    const rootElement = shallowRef<HTMLElement>();
    const track = shallowRef<HTMLElement>();
    const thumb = shallowRef<HTMLElement>();
    const submission = shallowRef<HTMLInputElement>();
    const connection = shallowRef<SliderConnection>();
    const refresh = (): void => { snapshot.value = controller.getSnapshot(); };
    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const tick = controller.range.tickOf(String(value));
      if (tick === null) throw new TypeError('Slider modelValue must be an exact value in the configured range.');
      const synced = controller.syncControlledValues({ value: tick });
      if (!synced.ok) throw new TypeError(synced.error.message);
      snapshot.value = synced.value;
      connection.value?.refreshAttributes();
    });
    const value = computed(() => controller.range.valueAt(snapshot.value.state.tick) as string);
    const state = computed<SliderSlotProps>(() => ({
      value: value.value,
      percentage: controller.range.count === 0 ? 0 : snapshot.value.state.tick / controller.range.count * 100,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const orientation = computed(() => props.orientation);
    const role = computed(() => props.role);
    const label = computed(() => props.label);
    const formatValue = computed(() => props.formatValue);
    const part = usePartContract('slider', 'root');
    const participation = useCompositeFormControl({
      root: () => rootElement.value ?? null,
      focusTarget: () => thumb.value ?? null,
      submissions: [{
        element: () => submission.value ?? null,
        capabilities: hiddenInputSubmissionCapabilities,
      }],
    });
    provide<SliderContext>(sliderKey, { controller, state, orientation, role, root: rootElement, track, thumb, connection, label, formatValue, partContract: part, refresh });
    return (): VNodeChild => {
      const root = h(Primitive, mergeProps(participation.controlProps.value, attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { rootElement.value = element instanceof HTMLElement ? element : undefined; },
        'data-scope': part.scope, 'data-part': part.part,
        'data-orientation': props.orientation,
        'data-disabled': props.disabled ? '' : undefined,
        'data-readonly': props.readonly ? '' : undefined,
        style: { '--sectile-slider-percentage': `${state.value.percentage}%` },
      }), { default: () => slots['default']?.(state.value) });
      if (props.name === undefined && props.form === undefined && !props.required && !participation.participating) return root;
      return [root, h('input', mergeProps(getSliderInputAttributes(controller, {
        ...(props.name === undefined ? {} : { name: props.name }),
        ...(props.form === undefined ? {} : { form: props.form }),
        disabled: props.disabled,
      }) as Record<string, unknown>, {
        ref: (element: unknown) => { submission.value = element instanceof HTMLInputElement ? element : undefined; },
        required: props.required,
        style: visuallyHiddenInputStyle,
      }))];
    };
  },
});

export const SliderTrack = defineComponent({
  name: 'SectileSliderTrack', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: SliderSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useSlider('SliderTrack');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['track'] ?? 'track' };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (element: unknown) => { root.track.value = element instanceof HTMLElement ? element : undefined; },
      'data-scope': part.scope, 'data-part': part.part, 'data-orientation': root.orientation.value,
    }), { default: () => slots['default']?.(root.state.value) });
  },
});

export const SliderRange = defineComponent({
  name: 'SectileSliderRange', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: SliderSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useSlider('SliderRange');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['range'] ?? 'range' };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      'aria-hidden': 'true', 'data-scope': part.scope, 'data-part': part.part,
      'data-percentage': String(root.state.value.percentage),
      style: { '--sectile-slider-percentage': `${root.state.value.percentage}%` },
    }), { default: () => slots['default']?.(root.state.value) });
  },
});

export const SliderThumb = defineComponent({
  name: 'SectileSliderThumb', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: SliderSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useSlider('SliderThumb');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['thumb'] ?? 'thumb' };
    const element = shallowRef<HTMLElement>();
    onMounted(() => {
      if (element.value === undefined) throw new TypeError('SliderThumb did not render an HTMLElement.');
      root.connection.value = connectSlider({
        controller: root.controller,
        root: element.value,
        track: root.track.value ?? root.root.value ?? element.value,
        scope: part.scope,
        part: part.part,
        orientation: root.orientation.value,
        role: root.role.value,
        disabled: root.state.value.disabled,
        readOnly: root.state.value.readonly,
        ...(root.label.value === undefined ? {} : { label: root.label.value }),
        ...(root.formatValue.value === undefined ? {} : { formatValue: root.formatValue.value }),
        onUpdate: root.refresh,
      });
    });
    onBeforeUnmount(() => root.connection.value?.disconnect());
    const attributes = computed(() => getSliderAttributes(root.controller, {
      scope: part.scope,
      part: part.part,
      orientation: root.orientation.value,
      role: root.role.value,
      disabled: root.state.value.disabled,
      readOnly: root.state.value.readonly,
      ...(root.label.value === undefined ? {} : { label: root.label.value }),
      ...(root.formatValue.value === undefined ? {} : { formatValue: root.formatValue.value }),
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => {
        element.value = node instanceof HTMLElement ? node : undefined;
        root.thumb.value = element.value;
      },
      'data-scope': part.scope,
      'data-part': part.part,
      'data-percentage': String(root.state.value.percentage),
      style: { '--sectile-slider-percentage': `${root.state.value.percentage}%` },
    }), { default: () => slots['default']?.(root.state.value) });
  },
});

function useSlider(part: string): SliderContext {
  const root = inject<SliderContext>(sliderKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside SliderRoot.`);
  return root;
}
