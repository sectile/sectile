import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createCheckboxController,
  getCheckboxAttributes,
  type CheckboxController,
  type CheckboxPolicies,
  type CheckboxValue,
} from '@sectile/dom/checkbox';
import { Primitive, type PrimitiveAs } from './primitive.js';

export type { CheckboxPolicies, CheckboxValue } from '@sectile/dom/checkbox';

export interface CheckboxRootProps {
  readonly modelValue?: CheckboxValue;
  readonly defaultValue?: CheckboxValue;
  readonly policies?: CheckboxPolicies;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface CheckboxSlotProps {
  readonly checked: CheckboxValue;
  readonly isChecked: boolean;
  readonly isIndeterminate: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

interface CheckboxContext {
  readonly slotProps: ComputedRef<CheckboxSlotProps>;
  readonly dataState: ComputedRef<string>;
}

interface CheckboxControllerProps {
  readonly policies: CheckboxPolicies | undefined;
  readonly disabled: boolean;
  readonly: boolean;
}

interface CheckboxEmit {
  (event: 'update:modelValue', value: CheckboxValue): void;
}

const checkboxContextKey = Symbol('SectileCheckbox');

export const CheckboxRoot = defineComponent({
  name: 'SectileCheckboxRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: [Boolean, String] as PropType<CheckboxValue>, default: undefined },
    defaultValue: { type: [Boolean, String] as PropType<CheckboxValue>, default: false },
    policies: { type: Object as PropType<CheckboxPolicies>, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: CheckboxValue): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: CheckboxSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, slots }) {
    const controlled = props.modelValue !== undefined;
    const controller = shallowRef(createController(
      controlled,
      controlled ? props.modelValue as CheckboxValue : props.defaultValue,
      props,
      emit,
    ));
    const snapshot = shallowRef(controller.value.getSnapshot());

    const refresh = (): void => {
      snapshot.value = controller.value.getSnapshot();
    };
    const rebuild = (): void => {
      const value = controlled
        ? props.modelValue as CheckboxValue
        : snapshot.value.state.checked;
      controller.value = createController(controlled, value, props, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch(
      [() => props.disabled, () => props.readonly, () => props.policies],
      rebuild,
    );

    const slotProps = computed<CheckboxSlotProps>(() => Object.freeze({
      checked: snapshot.value.state.checked,
      isChecked: snapshot.value.state.checked === true,
      isIndeterminate: snapshot.value.state.checked === 'mixed',
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const attributes = computed(() => getCheckboxAttributes(snapshot.value.state, {
      disabled: props.disabled,
      readOnly: props.readonly,
      native: true,
    }));
    const dataState = computed(() => attributes.value['data-state']);
    provide<CheckboxContext>(checkboxContextKey, { slotProps, dataState });

    const handleClick = (event: MouseEvent): void => {
      if (event.defaultPrevented) return;
      if (controller.value.handleEvent('toggle')) refresh();
    };

    return (): VNodeChild => h(Primitive, mergeProps(
      attrs,
      attributes.value as unknown as Record<string, unknown>,
      {
      as: props.as,
      asChild: props.asChild,
      ...(props.as === 'button' && !props.asChild ? { type: 'button' } : {}),
      onClick: handleClick,
      },
    ), {
      default: () => slots['default']?.(slotProps.value),
    });
  },
});

export interface CheckboxIndicatorProps {
  readonly forceMount?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export const CheckboxIndicator = defineComponent({
  name: 'SectileCheckboxIndicator',
  inheritAttrs: false,
  props: {
    forceMount: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (props: CheckboxSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const context = inject<CheckboxContext>(checkboxContextKey);
    if (context === undefined) {
      throw new TypeError('CheckboxIndicator must be used inside CheckboxRoot.');
    }
    return (): VNodeChild => {
      const state = context.slotProps.value;
      if (!props.forceMount && state.checked === false) return null;
      return h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        'aria-hidden': 'true',
        'data-scope': 'checkbox',
        'data-part': 'indicator',
        'data-state': context.dataState.value,
      }), {
        default: () => slots['default']?.(state),
      });
    };
  },
});

function createController(
  controlled: boolean,
  value: CheckboxValue,
  props: CheckboxControllerProps,
  emit: CheckboxEmit,
): CheckboxController {
  const result = createCheckboxController({
    ...(controlled ? { value } : { defaultValue: value }),
    ...(props.policies === undefined ? {} : { policies: props.policies }),
    disabled: props.disabled ?? false,
    readOnly: props.readonly ?? false,
    onValueChange: (next) => {
      emit('update:modelValue', next);
    },
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}
