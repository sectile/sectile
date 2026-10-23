import {
  computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide,
  shallowRef, ssrContextKey, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createPinInput, type PinInputConnection, type PinInputPolicies } from '@sectile/dom/pin-input';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './input/native-input.js';
import { provideFormControlOwner } from './form/control.js';
import {
  hiddenValueSubmissionCapabilities,
  useCompositeFormControl,
  useFormSubmissionProps,
  useFormControlFlags,
} from './form/control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

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
  readonly characters: ComputedRef<readonly string[]>;
  register(index: number, element?: HTMLInputElement): void;
  setInputComposing(composing: boolean): void;
}
const key = Symbol('SectilePinInputRoot');

export const PinInputRoot = defineComponent({
  __sectileFormLabelMode: 'labelledby',
  name: 'SectilePinInputRoot', inheritAttrs: false,
  props: {
    length: { type: Number, default: 6 }, modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' }, mask: { type: Boolean, default: false },
    otp: { type: Boolean, default: false }, disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false }, label: { type: String, default: 'PIN' },
    name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    policies: { type: Object as PropType<PinInputPolicies>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string): boolean => true, complete: (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: PinInputRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const flags = useFormControlFlags(props);
    if (!Number.isInteger(props.length) || props.length < 1) throw new TypeError('PinInput length must be a positive integer.');
    const root = shallowRef<HTMLElement | null>(null);
    const hiddenInput = shallowRef<HTMLInputElement | null>(null);
    const initialValue = props.modelValue ?? props.defaultValue;
    let mounted = false;
    let connectScheduled = false;
    const submissionProps = useFormSubmissionProps({ element: hiddenInput, capabilities: hiddenValueSubmissionCapabilities }, props);
    const participation = useCompositeFormControl({
      root,
      focusTarget: () => inputs.value.find((candidate) => candidate !== undefined) ?? null,
      submissions: [{
        element: hiddenInput,
        capabilities: hiddenValueSubmissionCapabilities,
      }],
      reset: () => {
        queueMicrotask(() => {
          if (!mounted) return;
          if (reconnectTimer !== null) clearTimeout(reconnectTimer);
          reconnectTimer = null; reconnectPending = false; inputComposing = false; proposedValue = null;
          connectScheduled = false;
          value.value = controlled ? props.modelValue as string : initialValue;
          connect();
        });
      },
    });
    provideFormControlOwner();
    const inputs = shallowRef<Array<HTMLInputElement | undefined>>(Array.from({ length: props.length }));
    const connection = shallowRef<PinInputConnection>();
    const value = shallowRef(props.modelValue ?? props.defaultValue);
    const controlled = useControlledStateInvariant('PinInputRoot', 'modelValue', () => props.modelValue);
    let proposedValue: string | null = null;
    let inputComposing = false;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const characters = computed(() => Object.freeze(Array.from(props.modelValue ?? value.value)));
    const state = computed<PinInputRootSlotProps>(() => Object.freeze({
      value: props.modelValue ?? value.value, complete: characters.value.length === props.length,
      disabled: flags.value.disabled, readonly: flags.value.readonly,
    }));
    const connect = (): void => {
      connection.value?.disconnect();
      connection.value = undefined;
      const nodes = inputs.value.filter((input): input is HTMLInputElement => input !== undefined);
      if (!mounted || root.value === null || nodes.length !== props.length) return;
      connection.value = createPinInput({
        root: root.value, inputs: nodes, ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(controlled ? { value: proposedValue ?? props.modelValue as string } : { defaultValue: value.value }),
        disabled: flags.value.disabled, readOnly: flags.value.readonly, label: props.label,
        onValueChange: (next) => {
          value.value = next;
          emit('update:modelValue', next);
          if (!controlled) return;
          proposedValue = next;
          const proposal = next;
          void nextTick(() => {
            if (connection.value === undefined || proposedValue !== proposal) return;
            proposedValue = null;
            const result = connection.value.syncControlledValue(props.modelValue as string);
            if (!result.ok) throw new TypeError(result.error.message);
            refresh();
          });
        },
        onComplete: (next) => emit('complete', next), onUpdate: refresh,
      });
      refresh();
    };
    const requestConnect = (): void => {
      if (!mounted) return;
      if (inputComposing || reconnectPending) {
        reconnectPending = true;
        return;
      }
      if (connectScheduled) return;
      connectScheduled = true;
      void nextTick(() => {
        if (!mounted || !connectScheduled) return;
        connectScheduled = false;
        if (inputComposing) { reconnectPending = true; return; }
        connect();
      });
    };
    const setInputComposing = (composing: boolean): void => {
      inputComposing = composing;
      if (composing || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || inputComposing) return;
        reconnectPending = false;
        connect();
      }, 0);
    };
    const refresh = (): void => { if (connection.value !== undefined) value.value = connection.value.getSnapshot().state.values.join(''); };
    const register = (index: number, element?: HTMLInputElement): void => {
      if (inputs.value[index] === element) return;
      const next = [...inputs.value]; next[index] = element; inputs.value = next;
      requestConnect();
    };
    provide<Context>(key, {
      state, length: computed(() => props.length), mask: computed(() => props.mask), otp: computed(() => props.otp),
      characters,
      label: computed(() => props.label), register, setInputComposing,
    });
    onMounted(() => { mounted = true; connect(); });
    onBeforeUnmount(() => {
      mounted = false;
      connectScheduled = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      proposedValue = null;
      connection.value?.disconnect();
      connection.value = undefined;
    });
    watch([() => props.length, () => flags.value.disabled, () => flags.value.readonly, () => props.label, () => props.policies], () => {
      inputs.value = Array.from({ length: props.length }, (_, index) => inputs.value[index]);
      requestConnect();
    });
    watch(() => props.modelValue, (next) => {
      if (!controlled || next === undefined || connection.value === undefined) return;
      proposedValue = null;
      const result = connection.value.syncControlledValue(next);
      if (!result.ok) throw new TypeError(result.error.message);
      value.value = next;
    });
    const registerRoot = (node: unknown): void => {
      const next = node instanceof HTMLElement ? node : null;
      if (root.value === next) return;
      root.value = next;
      requestConnect();
    };
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: registerRoot,
        role: 'group', 'aria-label': props.label, 'data-scope': 'pin-input', 'data-part': 'root',
        'data-complete': state.value.complete ? '' : undefined,
      }, participation.controlProps.value), { default: () => slots['default']?.(state.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined) return visual;
      return [visual, h('input', {
        ref: (element: unknown) => { hiddenInput.value = element instanceof HTMLInputElement ? element : null; },
        type: 'hidden', ...submissionProps.value, value: state.value.value,
        style: visuallyHiddenInputStyle,
      })];
    };
  },
});

export type PinInputValueChangeHandler = (value: string) => void;
export type PinInputCompleteHandler = (value: string) => void;

export const PinInputInput = defineComponent({
  name: 'SectilePinInputInput', inheritAttrs: false,
  props: {
    index: { type: Number, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: PinInputInputSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('PinInputInput');
    const renderServerValue = inject(ssrContextKey, undefined) !== undefined;
    const slot = computed<PinInputInputSlotProps>(() => ({
      ...root.state.value, index: props.index, character: root.characters.value[props.index] ?? '',
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => root.register(props.index, node instanceof HTMLInputElement ? node : undefined),
      type: root.mask.value ? 'password' : 'text', inputmode: 'numeric', maxlength: 1,
      autocomplete: root.otp.value && props.index === 0 ? 'one-time-code' : undefined,
      ...(renderServerValue ? { value: root.characters.value[props.index] ?? '' } : {}),
      disabled: root.state.value.disabled, readonly: root.state.value.readonly,
      onCompositionstart: () => root.setInputComposing(true),
      onCompositionend: () => root.setInputComposing(false),
      'aria-label': typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : `${root.label.value} digit ${props.index + 1} of ${root.length.value}`,
      'data-scope': 'pin-input', 'data-part': 'input', 'data-index': props.index,
    }), slots['default'] === undefined
      ? undefined
      : { default: () => slots['default']?.(slot.value) });
  },
});

function useRoot(part: string): Context {
  const root = inject<Context>(key);
  if (root === undefined) throw new TypeError(`${part} must be used inside PinInputRoot.`);
  return root;
}
