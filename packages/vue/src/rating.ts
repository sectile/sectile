import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  inject,
  mergeProps,
  provide,
  ref,
  watch,
  type ComputedRef,
  type Component,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
  type RadioGroupRootSlotProps,
} from './radio-group.js';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { providePartContract } from './internal/part-contract.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface RatingRootProps {
  readonly items: readonly string[];
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly disabledItems?: readonly string[];
  readonly clearable?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface RatingRootSlotProps extends RadioGroupRootSlotProps {
  readonly clearable: boolean;
}
export interface RatingClearProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface RatingContext {
  readonly value: ComputedRef<string>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly clearable: ComputedRef<boolean>;
  clear(): void;
}
const ratingKey = Symbol('SectileRatingRoot');

export const RatingRoot = defineComponent({
  name: 'SectileRatingRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    clearable: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: RatingRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const instance = getCurrentInstance();
    providePartContract('rating');
    const controlled = useControlledStateInvariant('RatingRoot', 'modelValue', () => props.modelValue);
    const localValue = ref(controlled ? props.modelValue as string : props.defaultValue);
    watch(() => props.modelValue, (value) => {
      if (controlled && value !== undefined) localValue.value = value;
    });
    const value = computed(() => localValue.value);
    const disabled = computed(() => props.disabled);
    const readonly = computed(() => props.readonly);
    const clearable = computed(() => props.clearable);
    const update = (next: string): void => {
      if (!controlled) localValue.value = next;
      emit('update:modelValue', next);
    };
    provide<RatingContext>(ratingKey, {
      value, disabled, readonly, clearable,
      clear: () => {
        if (!props.clearable || props.disabled || props.readonly) return;
        update('');
      },
    });
    return (): VNodeChild => h(RadioGroupRoot as Component, mergeProps(attrs, {
      items: props.items,
      modelValue: localValue.value,
      disabledItems: props.disabledItems,
      orientation: 'horizontal',
      as: props.as,
      asChild: props.asChild,
      'aria-roledescription': 'rating',
      'onUpdate:modelValue': update,
      ...explicitFormProps(instance?.vnode.props ?? null, props),
    }), {
      default: (root: RadioGroupRootSlotProps) => slots['default']?.({ ...root, clearable: props.clearable }),
    });
  },
});

export type RatingValueChangeHandler = (value: string) => void;

function explicitFormProps(
  vnodeProps: Readonly<Record<string, unknown>> | null,
  props: Readonly<{
    disabled: boolean;
    readonly: boolean;
    name: string | undefined;
    form: string | undefined;
    required: boolean;
  }>,
): Readonly<Record<string, unknown>> {
  if (vnodeProps === null) return {};
  const result: Record<string, unknown> = {};
  for (const key of ['disabled', 'readonly', 'name', 'form', 'required'] as const) {
    if (Object.prototype.hasOwnProperty.call(vnodeProps, key)) result[key] = props[key];
  }
  return result;
}

export const RatingItem = defineComponent({
  name: 'SectileRatingItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(RadioGroupItem as Component, mergeProps(attrs, props, {
      'aria-label': `${props.value} rating`,
      'data-scope': 'rating',
    }), slots);
  },
});

export const RatingIndicator = RadioGroupIndicator;

export const RatingClear = defineComponent({
  name: 'SectileRatingClear',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const root = inject<RatingContext>(ratingKey);
    if (root === undefined) throw new TypeError('RatingClear must be used inside RatingRoot.');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      type: props.as === 'button' ? 'button' : undefined,
      disabled: root.disabled.value || root.readonly.value || !root.clearable.value || root.value.value === '',
      'data-scope': 'rating',
      'data-part': 'clear',
      onClick: (event: MouseEvent) => {
        if (!event.defaultPrevented) root.clear();
      },
    }), slots);
  },
});
