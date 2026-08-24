import {
  computed, defineComponent, h, inject, mergeProps, provide, shallowRef,
  type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from './checkbox.js';
import { providePartContract } from './internal/part-contract.js';

export interface CheckboxGroupRootProps {
  readonly modelValue?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly name?: string;
  readonly form?: string;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface CheckboxGroupRootSlotProps { readonly value: readonly string[]; readonly disabled: boolean; readonly: boolean }
export interface CheckboxGroupItemProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface Context {
  readonly state: ComputedRef<CheckboxGroupRootSlotProps>;
  readonly name: ComputedRef<string | undefined>;
  readonly form: ComputedRef<string | undefined>;
  readonly required: ComputedRef<boolean>;
  toggle(value: string, checked: CheckboxValue): void;
}
const key = Symbol('SectileCheckboxGroupRoot');

export const CheckboxGroupRoot = defineComponent({
  name: 'SectileCheckboxGroupRoot', inheritAttrs: false,
  props: {
    modelValue: { type: Array as PropType<readonly string[]>, default: undefined },
    defaultValue: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false }, name: { type: String, default: undefined },
    form: { type: String, default: undefined }, label: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: readonly string[]): boolean => true },
  slots: Object as SlotsType<{ default: (props: CheckboxGroupRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    providePartContract('checkbox-group', { root: 'item' });
    const local = shallowRef<readonly string[]>(props.modelValue ?? props.defaultValue);
    const state = computed<CheckboxGroupRootSlotProps>(() => Object.freeze({
      value: props.modelValue ?? local.value, disabled: props.disabled, readonly: props.readonly,
    }));
    provide<Context>(key, {
      state, name: computed(() => props.name), form: computed(() => props.form), required: computed(() => props.required),
      toggle: (value, checked) => {
        if (props.disabled || props.readonly) return;
        const selected = new Set(state.value.value);
        if (checked === true) selected.add(value); else selected.delete(value);
        const next = Object.freeze([...selected]); local.value = next; emit('update:modelValue', next);
      },
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, role: 'group', 'aria-label': props.label,
      'aria-disabled': props.disabled ? 'true' : undefined, 'aria-readonly': props.readonly ? 'true' : undefined,
      'data-scope': 'checkbox-group', 'data-part': 'root',
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const CheckboxGroupItem = defineComponent({
  name: 'SectileCheckboxGroupItem', inheritAttrs: false,
  props: {
    value: { type: String, required: true }, disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: { checked: boolean; disabled: boolean; readonly: boolean }) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot();
    const checked = computed(() => root.state.value.value.includes(props.value));
    return (): VNodeChild => h(CheckboxRoot, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, modelValue: checked.value, disabled: root.state.value.disabled || props.disabled,
      readonly: root.state.value.readonly, required: props.required ?? root.required.value,
      name: root.name.value, form: root.form.value, value: props.value,
      'onUpdate:modelValue': (next: CheckboxValue) => root.toggle(props.value, next),
    }), { default: () => slots['default']?.({ checked: checked.value, disabled: root.state.value.disabled || props.disabled, readonly: root.state.value.readonly }) });
  },
});

export const CheckboxGroupIndicator = CheckboxIndicator;

function useRoot(): Context {
  const root = inject<Context>(key);
  if (root === undefined) throw new TypeError('CheckboxGroupItem must be used inside CheckboxGroupRoot.');
  return root;
}
