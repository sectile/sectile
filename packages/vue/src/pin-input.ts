import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createPinInput, type PinInputConnection, type PinInputPolicies } from '@sectile/dom/pin-input';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface PinInputRootProps {
  readonly length?: number;
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly mask?: boolean;
  readonly otp?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly policies?: PinInputPolicies;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface PinInputRootSlotProps { readonly value: string; readonly complete: boolean; readonly disabled: boolean; readonly: boolean }
export interface PinInputInputProps { readonly index: number; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface PinInputInputSlotProps extends PinInputRootSlotProps { readonly index: number; readonly character: string }

interface Context {
  readonly state: ComputedRef<PinInputRootSlotProps>;
  readonly length: ComputedRef<number>;
  readonly mask: ComputedRef<boolean>;
  readonly otp: ComputedRef<boolean>;
  readonly label: ComputedRef<string>;
  register(index: number, element?: HTMLInputElement): void;
}
const key = Symbol('SectilePinInputRoot');

export const PinInputRoot = defineComponent({
  name: 'SectilePinInputRoot', inheritAttrs: false,
  props: {
    length: { type: Number, default: 6 }, modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' }, mask: { type: Boolean, default: false },
    otp: { type: Boolean, default: true }, disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false }, label: { type: String, default: 'PIN' },
    name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    policies: { type: Object as PropType<PinInputPolicies>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string): boolean => true, complete: (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: PinInputRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    if (!Number.isInteger(props.length) || props.length < 1) throw new TypeError('PinInput length must be a positive integer.');
    const root = shallowRef<HTMLElement>();
    const inputs = shallowRef<Array<HTMLInputElement | undefined>>(Array.from({ length: props.length }));
    const connection = shallowRef<PinInputConnection>();
    const value = shallowRef(props.modelValue ?? props.defaultValue);
    const controlled = props.modelValue !== undefined;
    const state = computed<PinInputRootSlotProps>(() => Object.freeze({
      value: props.modelValue ?? value.value, complete: (props.modelValue ?? value.value).length === props.length,
      disabled: props.disabled, readonly: props.readonly,
    }));
    const connect = (): void => {
      connection.value?.disconnect();
      const nodes = inputs.value.filter((input): input is HTMLInputElement => input !== undefined);
      if (root.value === undefined || nodes.length !== props.length) return;
      connection.value = createPinInput({
        root: root.value, inputs: nodes, ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(controlled ? { value: props.modelValue as string } : { defaultValue: value.value }),
        disabled: props.disabled, readOnly: props.readonly, label: props.label,
        onValueChange: (next) => { value.value = next; emit('update:modelValue', next); },
        onComplete: (next) => emit('complete', next), onUpdate: refresh,
      });
      refresh();
    };
    const refresh = (): void => { if (connection.value !== undefined) value.value = connection.value.getSnapshot().state.values.join(''); };
    const register = (index: number, element?: HTMLInputElement): void => {
      if (inputs.value[index] === element) return;
      const next = [...inputs.value]; next[index] = element; inputs.value = next;
    };
    provide<Context>(key, {
      state, length: computed(() => props.length), mask: computed(() => props.mask), otp: computed(() => props.otp),
      label: computed(() => props.label), register,
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.length, () => props.disabled, () => props.readonly, () => props.label, () => props.policies], () => {
      inputs.value = Array.from({ length: props.length }, (_, index) => inputs.value[index]); connect();
    });
    watch(() => props.modelValue, (next) => {
      if (!controlled || next === undefined || connection.value === undefined) return;
      const result = connection.value.syncControlledValue(next);
      if (!result.ok) throw new TypeError(result.error.message);
      value.value = next;
    });
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
        role: 'group', 'aria-label': props.label, 'data-scope': 'pin-input', 'data-part': 'root',
        'data-complete': state.value.complete ? '' : undefined,
      }), { default: () => slots['default']?.(state.value) });
      if (props.name === undefined && props.form === undefined && !props.required) return visual;
      return [visual, h('input', {
        type: 'hidden', name: props.name, form: props.form, value: state.value.value,
        required: props.required, disabled: props.disabled,
      })];
    };
  },
});

export const PinInputInput = defineComponent({
  name: 'SectilePinInputInput', inheritAttrs: false,
  props: {
    index: { type: Number, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: PinInputInputSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('PinInputInput');
    const slot = computed<PinInputInputSlotProps>(() => ({
      ...root.state.value, index: props.index, character: Array.from(root.state.value.value)[props.index] ?? '',
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => root.register(props.index, node instanceof HTMLInputElement ? node : undefined),
      type: root.mask.value ? 'password' : 'text', inputmode: 'numeric', maxlength: 1,
      autocomplete: root.otp.value && props.index === 0 ? 'one-time-code' : undefined,
      disabled: root.state.value.disabled, readonly: root.state.value.readonly,
      'aria-label': `${root.label.value} digit ${props.index + 1} of ${root.length.value}`,
      'data-scope': 'pin-input', 'data-part': 'input', 'data-index': props.index,
    }), { default: () => slots['default']?.(slot.value) });
  },
});

function useRoot(part: string): Context {
  const root = inject<Context>(key);
  if (root === undefined) throw new TypeError(`${part} must be used inside PinInputRoot.`);
  return root;
}
