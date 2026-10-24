import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, ssrContextKey, triggerRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createQuantityField, type QuantityFieldConnection, type QuantityFieldPolicies, type QuantityValue,
} from '@sectile/dom/quantity-field';
import { createQuantityFieldState, getQuantityFieldDisplayUnits } from '@sectile/core/quantity-field';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useFormControlFlags, useNativeInputFormControl } from './form/control.js';
import { captureNativeTextState } from './input/native-text-state.js';

export {
  createStandardQuantityPolicies,
  type StandardQuantityUnitSystem,
} from '@sectile/dom/quantity-field';

export interface QuantityFieldRootProps {
  readonly policies: QuantityFieldPolicies;
  readonly modelValue?: QuantityValue | null;
  readonly defaultValue?: QuantityValue | null;
  readonly displayUnit?: string;
  readonly defaultDisplayUnit?: string;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface QuantityFieldRootSlotProps { readonly value: QuantityValue | null; readonly text: string; readonly displayUnit: string; readonly invalid: boolean; readonly disabled: boolean; readonly: boolean }
export interface QuantityFieldInputProps { readonly name?: string; readonly form?: string; readonly required?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface QuantityFieldPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<QuantityFieldRootSlotProps>;
  readonly unitState: ComputedRef<Pick<QuantityFieldRootSlotProps, 'displayUnit' | 'disabled' | 'readonly'>>;
  readonly label: ComputedRef<string | undefined>;
  readonly units: ComputedRef<readonly { readonly id: string; readonly symbol: string }[]>;
  registerInput(element?: HTMLInputElement): void;
  registerUnitSelect(element?: HTMLSelectElement): void;
  setInputComposing(composing: boolean): void;
  reset(): void;
}
const key = Symbol('SectileQuantityFieldRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const QuantityFieldRoot = defineComponent({
  name: 'SectileQuantityFieldRoot', inheritAttrs: false,
  props: {
    policies: { type: Object as PropType<QuantityFieldPolicies>, required: true },
    modelValue: { type: Object as PropType<QuantityValue | null>, default: undefined },
    defaultValue: { type: Object as PropType<QuantityValue | null>, default: null },
    displayUnit: { type: String, default: undefined }, defaultDisplayUnit: { type: String, default: undefined },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: QuantityValue | null): boolean => true,
    'update:displayUnit': (_value: string): boolean => true,
    commit: (_details: { value: QuantityValue | null; expression: string; displayUnit: string }): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: QuantityFieldRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const flags = useFormControlFlags(props);
    const input = shallowRef<HTMLInputElement>(); const select = shallowRef<HTMLSelectElement>();
    const connection = shallowRef<QuantityFieldConnection>();
    const initial = createQuantityFieldState(props.policies, props.modelValue !== undefined ? props.modelValue : props.defaultValue,
      props.displayUnit ?? props.defaultDisplayUnit);
    const value = shallowRef<QuantityValue | null>(initial.quantity);
    const unit = shallowRef(initial.displayUnit);
    const text = shallowRef(initial.inputState.snapshot.text); const invalid = shallowRef(false);
    const units = computed(() => getQuantityFieldDisplayUnits(props.policies, props.displayUnit ?? unit.value).flatMap(id => {
      const entry = props.policies.registry.get(id);
      return entry === null ? [] : [{ id: entry.id, symbol: entry.symbol }];
    }));
    const valueControlled = props.modelValue !== undefined; const unitControlled = props.displayUnit !== undefined;
    let resetQuantity = valueControlled ? null : initial.quantity;
    let resetDisplayUnit = unitControlled ? undefined : initial.displayUnit;
    const state = computed<QuantityFieldRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : value.value,
      text: text.value, displayUnit: props.displayUnit ?? unit.value, invalid: invalid.value,
      disabled: flags.value.disabled, readonly: flags.value.readonly,
    }));
    const unitState = computed(() => Object.freeze({ displayUnit: props.displayUnit ?? unit.value,
      disabled: flags.value.disabled, readonly: flags.value.readonly }));
    const refresh = (): void => {
      if (connection.value === undefined) return;
      value.value = connection.value.getQuantity(); unit.value = connection.value.getDisplayUnit();
      text.value = connection.value.getText(); invalid.value = input.value?.getAttribute('aria-invalid') === 'true';
    };
    const connect = (preserveNative = false): void => {
      const element = input.value;
      if (element === undefined) return;
      const inputState = preserveNative && connection.value !== undefined
        ? captureNativeTextState(element, connection.value.getText())
        : undefined;
      connection.value?.disconnect();
      connection.value = createQuantityField({
        input: element, ...(select.value === undefined ? {} : { unitSelect: select.value }), policies: props.policies,
        manageUnitOptions: false,
        ...(valueControlled ? { quantity: props.modelValue as QuantityValue | null } : { defaultQuantity: value.value }),
        ...(unitControlled ? { displayUnit: props.displayUnit as string } : { defaultDisplayUnit: unit.value }),
        ...(inputState === undefined ? {} : { defaultInputState: inputState }),
        disabled: flags.value.disabled, readOnly: flags.value.readonly, ...(props.label === undefined ? {} : { label: props.label }),
        onQuantityChange: (details) => { value.value = details.value; emit('update:modelValue', details.value); emit('commit', details); },
        onDisplayUnitChange: (next) => { unit.value = next; emit('update:displayUnit', next); }, onUpdate: refresh,
      });
      refresh();
    };
    let mounted = false;
    let inputComposing = false;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const requestConnect = (): void => {
      if (inputComposing) {
        reconnectPending = true;
        return;
      }
      connect(true);
    };
    const setInputComposing = (composing: boolean): void => {
      inputComposing = composing;
      if (composing || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || inputComposing) return;
        reconnectPending = false;
        connect(true);
      }, 0);
    };
    const resetRequested = shallowRef<undefined>();
    watch(resetRequested, () => {
      if (!mounted) return;
      const baseline = createQuantityFieldState(props.policies,
        valueControlled ? props.modelValue as QuantityValue | null : resetQuantity,
        unitControlled ? props.displayUnit : resetDisplayUnit);
      value.value = baseline.quantity;
      unit.value = baseline.displayUnit;
      connect();
    }, { flush: 'post' });
    const reset = (): void => {
      if (!mounted) return;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null; reconnectPending = false; inputComposing = false;
      triggerRef(resetRequested);
    };
    provide<Context>(key, {
      state, unitState, units, label: computed(() => props.label),
      registerInput: (element) => { input.value = element; }, registerUnitSelect: (element) => { select.value = element; },
      setInputComposing, reset,
    });
    onMounted(() => {
      mounted = true;
      connect();
    });
    onBeforeUnmount(() => {
      mounted = false;
      resetQuantity = null; resetDisplayUnit = undefined;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      connection.value?.disconnect();
      connection.value = undefined;
    });
    watch([() => props.policies, () => flags.value.disabled, () => flags.value.readonly, () => props.label], requestConnect);
    watch([() => props.modelValue, () => props.displayUnit], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({
        ...(valueControlled ? { quantity: props.modelValue as QuantityValue | null } : {}),
        ...(unitControlled ? { displayUnit: props.displayUnit as string } : {}),
      });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, 'data-scope': 'quantity-field', 'data-part': 'root',
      'data-invalid': invalid.value ? '' : undefined, 'data-disabled': flags.value.disabled ? '' : undefined,
      'data-readonly': flags.value.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type QuantityFieldValueChangeHandler = (value: QuantityValue | null) => void;
export type QuantityFieldDisplayUnitChangeHandler = (value: string) => void;
export type QuantityFieldCommitHandler = (details: { value: QuantityValue | null; expression: string; displayUnit: string }) => void;

export const QuantityFieldInput = defineComponent({
  name: 'SectileQuantityFieldInput', inheritAttrs: false,
  props: {
    name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs }) {
    const root = useRoot('QuantityFieldInput');
    const renderServerValue = inject(ssrContextKey, undefined) !== undefined;
    const input = shallowRef<HTMLInputElement | null>(null);
    const participation = useNativeInputFormControl(input, { reset: root.reset });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => {
        input.value = node instanceof HTMLInputElement ? node : null;
        root.registerInput(input.value ?? undefined);
      },
      type: 'text', name: props.name, form: props.form, required: props.required,
      ...(renderServerValue ? { value: root.state.value.text } : {}), 'aria-invalid': root.state.value.invalid ? 'true' : undefined,
      disabled: root.state.value.disabled, readonly: root.state.value.readonly,
      onCompositionstart: () => root.setInputComposing(true),
      onCompositionend: () => root.setInputComposing(false),
      'aria-label': root.label.value, 'data-scope': 'quantity-field', 'data-part': 'input',
    }, participation.controlProps.value));
  },
});

export const QuantityFieldUnitSelect = defineComponent({
  name: 'SectileQuantityFieldUnitSelect', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'select' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs }) {
    const root = useRoot('QuantityFieldUnitSelect');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerUnitSelect(node instanceof HTMLSelectElement ? node : undefined),
      disabled: root.unitState.value.disabled, 'aria-readonly': root.unitState.value.readonly ? 'true' : undefined,
      'aria-label': root.label.value === undefined ? undefined : `${root.label.value} unit`,
      'data-scope': 'quantity-field', 'data-part': 'unit-select',
    }), { default: () => root.units.value.map(unit => h('option', { key: unit.id, value: unit.id,
      selected: unit.id === root.unitState.value.displayUnit }, unit.symbol)) });
  },
});

export const QuantityFieldValue = defineComponent({
  name: 'SectileQuantityFieldValue', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: QuantityFieldRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('QuantityFieldValue'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, 'data-scope': 'quantity-field', 'data-part': 'value',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside QuantityFieldRoot.`); return root; }
