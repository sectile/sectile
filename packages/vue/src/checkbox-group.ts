import {
  computed, defineComponent, h, inject, mergeProps, provide, ref, shallowRef, watch,
  type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { applyCheckboxGroupEvent, tryCreateCheckboxGroupState } from '@sectile/core/checkbox-group';
import { tryReconcileCollectionIdentities } from '@sectile/core/adapter-runtime';
import { createSequence } from '@sectile/core/sequence';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from './checkbox.js';
import { providePartContract } from './internal/part-contract.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { provideFormControlOwner } from './internal/form-control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import {
  hiddenValueSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';

export interface CheckboxGroupRootProps {
  readonly items: readonly string[];
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
  readonly selected: ComputedRef<ReadonlySet<string>>;
  readonly name: ComputedRef<string | undefined>;
  readonly form: ComputedRef<string | undefined>;
  readonly required: ComputedRef<boolean>;
  toggle(value: string, checked: CheckboxValue): void;
}
const key = Symbol('SectileCheckboxGroupRoot');

export const CheckboxGroupRoot = defineComponent({
  name: 'SectileCheckboxGroupRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
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
    const rootElement = ref<HTMLElement | null>(null);
    const submissionElements: Array<HTMLInputElement | null> = [];
    const controlled = useControlledStateInvariant(
      'CheckboxGroupRoot',
      'modelValue',
      () => props.modelValue,
    );
    const initialValue = Object.freeze([...(controlled ? props.modelValue ?? [] : props.defaultValue)]);
    const domain = shallowRef(createSequence(props.items));
    const initialState = tryCreateCheckboxGroupState(domain.value, { selected: initialValue });
    if (!initialState.ok) throw new TypeError(initialState.error.message);
    const selectedValue = shallowRef<readonly string[]>(initialState.value.selection.selected);
    const selected = computed<ReadonlySet<string>>(() => new Set(selectedValue.value));
    const participation = useCompositeFormControl({
      root: rootElement,
      submissions: () => state.value.value.map((_, index) => ({
        element: () => submissionElements[index] ?? null,
        capabilities: hiddenValueSubmissionCapabilities,
      })),
      reset: () => {
        if (!controlled) {
          const reconciled = tryReconcileCollectionIdentities(
            props.items,
            initialValue,
            null,
            [],
            'multiple',
            { preserveNullCurrent: true },
          );
          if (!reconciled.ok) throw new TypeError(reconciled.error.message);
          selectedValue.value = reconciled.value.selected;
        }
      },
    });
    provideFormControlOwner();
    const state = computed<CheckboxGroupRootSlotProps>(() => Object.freeze({
      value: selectedValue.value, disabled: props.disabled, readonly: props.readonly,
    }));
    watch(() => props.items, () => {
      const nextDomain = createSequence(props.items);
      const requested = controlled ? props.modelValue ?? [] : selectedValue.value;
      const reconciled = tryReconcileCollectionIdentities(
        props.items,
        requested,
        null,
        [],
        'multiple',
        { preserveNullCurrent: true },
      );
      if (!reconciled.ok) throw new TypeError(reconciled.error.message);
      domain.value = nextDomain;
      selectedValue.value = reconciled.value.selected;
      if (controlled && reconciled.value.selectionChanged) {
        emit('update:modelValue', reconciled.value.selected);
      }
    }, { flush: 'sync' });
    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const next = tryCreateCheckboxGroupState(domain.value, { selected: value });
      if (!next.ok) throw new TypeError(next.error.message);
      selectedValue.value = next.value.selection.selected;
    }, { flush: 'sync' });
    provide<Context>(key, {
      state, selected, name: computed(() => props.name), form: computed(() => props.form), required: computed(() => props.required),
      toggle: (value, checked) => {
        if (props.disabled || props.readonly) return;
        const current = tryCreateCheckboxGroupState(domain.value, { selected: selectedValue.value });
        if (!current.ok) throw new TypeError(current.error.message);
        if (current.value.selection.has(value) === (checked === true)) return;
        const update = applyCheckboxGroupEvent(
          domain.value,
          current.value,
          { type: 'toggle', id: value },
        );
        if (!update.ok) throw new TypeError(update.error.message);
        const next = update.value.state.selection.selected;
        if (!controlled) selectedValue.value = next;
        emit('update:modelValue', next);
      },
    });
    return (): VNodeChild => {
      const root = h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (element: unknown) => { rootElement.value = element instanceof HTMLElement ? element : null; },
      role: 'group', 'aria-label': props.label,
      'aria-disabled': props.disabled ? 'true' : undefined, 'aria-readonly': props.readonly ? 'true' : undefined,
      'data-scope': 'checkbox-group', 'data-part': 'root',
      }, participation.controlProps.value), { default: () => slots['default']?.(state.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined) return root;
      return [root, ...state.value.value.map((value, index) => h('input', {
        ref: (element: unknown) => {
          submissionElements[index] = element instanceof HTMLInputElement ? element : null;
        },
        type: 'hidden', name: props.name, form: props.form, value,
        disabled: props.disabled, style: visuallyHiddenInputStyle,
      }))];
    };
  },
});

export type CheckboxGroupValueChangeHandler = (value: readonly string[]) => void;

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
    const checked = computed(() => root.selected.value.has(props.value));
    return (): VNodeChild => h(CheckboxRoot, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, modelValue: checked.value, disabled: root.state.value.disabled || props.disabled,
      readonly: root.state.value.readonly, required: props.required ?? root.required.value,
      value: props.value,
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
