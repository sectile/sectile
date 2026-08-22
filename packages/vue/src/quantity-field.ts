import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createQuantityField, type QuantityFieldConnection, type QuantityFieldPolicies, type QuantityValue,
} from '@sectile/dom/quantity-field';
import { Primitive, type PrimitiveAs } from './primitive.js';

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
  readonly label: ComputedRef<string | undefined>;
  registerInput(element?: HTMLInputElement): void;
  registerUnitSelect(element?: HTMLSelectElement): void;
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
    const input = shallowRef<HTMLInputElement>(); const select = shallowRef<HTMLSelectElement>();
    const connection = shallowRef<QuantityFieldConnection>();
    const value = shallowRef<QuantityValue | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const unit = shallowRef(props.displayUnit ?? props.defaultDisplayUnit ?? props.policies.canonicalUnit);
    const text = shallowRef(''); const invalid = shallowRef(false);
    const valueControlled = props.modelValue !== undefined; const unitControlled = props.displayUnit !== undefined;
    const state = computed<QuantityFieldRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : value.value,
      text: text.value, displayUnit: props.displayUnit ?? unit.value, invalid: invalid.value,
      disabled: props.disabled, readonly: props.readonly,
    }));
    const refresh = (): void => {
      if (connection.value === undefined) return;
      value.value = connection.value.getQuantity(); unit.value = connection.value.getDisplayUnit();
      text.value = connection.value.getText(); invalid.value = input.value?.getAttribute('aria-invalid') === 'true';
    };
    const connect = (): void => {
      connection.value?.disconnect();
      if (input.value === undefined) return;
      connection.value = createQuantityField({
        input: input.value, ...(select.value === undefined ? {} : { unitSelect: select.value }), policies: props.policies,
        ...(valueControlled ? { quantity: props.modelValue as QuantityValue | null } : { defaultQuantity: value.value }),
        ...(unitControlled ? { displayUnit: props.displayUnit as string } : { defaultDisplayUnit: unit.value }),
        disabled: props.disabled, readOnly: props.readonly, ...(props.label === undefined ? {} : { label: props.label }),
        onQuantityChange: (details) => { value.value = details.value; emit('update:modelValue', details.value); emit('commit', details); },
        onDisplayUnitChange: (next) => { unit.value = next; emit('update:displayUnit', next); }, onUpdate: refresh,
      });
      refresh();
    };
    provide<Context>(key, {
      state, label: computed(() => props.label),
      registerInput: (element) => { input.value = element; }, registerUnitSelect: (element) => { select.value = element; },
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.policies, () => props.disabled, () => props.readonly, () => props.label], connect);
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
      'data-invalid': invalid.value ? '' : undefined, 'data-disabled': props.disabled ? '' : undefined,
      'data-readonly': props.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const QuantityFieldInput = defineComponent({
  name: 'SectileQuantityFieldInput', inheritAttrs: false,
  props: {
    name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs }) {
    const root = useRoot('QuantityFieldInput');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerInput(node instanceof HTMLInputElement ? node : undefined),
      type: 'text', name: props.name, form: props.form, required: props.required,
      disabled: root.state.value.disabled, readonly: root.state.value.readonly,
      'aria-label': root.label.value, 'data-scope': 'quantity-field', 'data-part': 'input',
    }));
  },
});

export const QuantityFieldUnitSelect = defineComponent({
  name: 'SectileQuantityFieldUnitSelect', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'select' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs }) {
    const root = useRoot('QuantityFieldUnitSelect');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerUnitSelect(node instanceof HTMLSelectElement ? node : undefined),
      disabled: root.state.value.disabled, 'aria-readonly': root.state.value.readonly ? 'true' : undefined,
      'data-scope': 'quantity-field', 'data-part': 'unit-select',
    }));
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
