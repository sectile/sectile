import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  ref,
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
  getCheckboxInputAttributes,
  type CheckboxController,
  type CheckboxValue as DOMCheckboxValue,
} from '@sectile/dom/checkbox';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { usePartContract, type PartContract } from './internal/part-contract.js';
import {
  hiddenInputSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';

export type CheckboxValue = boolean | 'indeterminate';

export interface CheckboxRootProps {
  readonly modelValue?: CheckboxValue;
  readonly defaultValue?: CheckboxValue;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly name?: string;
  readonly value?: string;
  readonly form?: string;
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
  readonly partContract: PartContract;
}

interface CheckboxControllerProps {
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
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    value: { type: String, default: 'on' },
    form: { type: String, default: undefined },
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
    const rootElement = ref<HTMLElement | null>(null);
    const inputElement = ref<HTMLInputElement | null>(null);
    const participation = useCompositeFormControl({
      root: rootElement,
      focusTarget: rootElement,
      submissions: [{
        element: inputElement,
        capabilities: hiddenInputSubmissionCapabilities,
      }],
    });
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
        : fromDOMValue(snapshot.value.state.checked);
      controller.value = createController(controlled, value, props, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValue(toDOMValue(value));
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch(
      [() => props.disabled, () => props.readonly],
      rebuild,
    );

    const slotProps = computed<CheckboxSlotProps>(() => Object.freeze({
      checked: fromDOMValue(snapshot.value.state.checked),
      isChecked: snapshot.value.state.checked === true,
      isIndeterminate: snapshot.value.state.checked === 'mixed',
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const attributes = computed(() => getCheckboxAttributes(snapshot.value.state, {
      disabled: props.disabled,
      readOnly: props.readonly,
      required: props.required,
      native: true,
    }));
    const inputAttributes = computed(() => getCheckboxInputAttributes(snapshot.value.state, {
      ...(props.name === undefined ? {} : { name: props.name }),
      value: props.value,
      ...(props.form === undefined ? {} : { form: props.form }),
      required: props.required,
      disabled: props.disabled,
    }));
    const dataState = computed(() => attributes.value['data-state']);
    const part = usePartContract('checkbox', 'root');
    provide<CheckboxContext>(checkboxContextKey, { slotProps, dataState, partContract: part });

    const handleClick = (event: MouseEvent): void => {
      if (event.defaultPrevented) return;
      if (controller.value.handleEvent('toggle')) refresh();
    };

    return (): VNodeChild => {
      const root = h(Primitive, mergeProps(
        attrs,
        attributes.value as unknown as Record<string, unknown>,
        {
          elementRef: (element: unknown) => {
            rootElement.value = element as HTMLElement | null;
          },
          as: props.as,
          asChild: props.asChild,
          ...(props.as === 'button' && !props.asChild ? { type: 'button' } : {}),
          'data-scope': part.scope,
          'data-part': part.part,
          onClick: handleClick,
        },
        participation.controlProps.value,
      ), {
        default: () => slots['default']?.(slotProps.value),
      });
      if (!participation.participating
        && props.name === undefined
        && props.form === undefined
        && !props.required) return root;
      return [root, h('input', mergeProps(
        inputAttributes.value as unknown as Record<string, unknown>,
        {
          ref: inputElement,
          style: visuallyHiddenInputStyle,
        },
      ))];
    };
  },
});

export type CheckboxValueChangeHandler = (value: CheckboxValue) => void;

export interface CheckboxIndicatorProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export const CheckboxIndicator = defineComponent({
  name: 'SectileCheckboxIndicator',
  inheritAttrs: false,
  props: {
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
    const part = { scope: context.partContract.scope, part: context.partContract.parts['indicator'] ?? 'indicator' };
    return (): VNodeChild => {
      const state = context.slotProps.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        hidden: state.checked === false,
        'aria-hidden': 'true',
        'data-scope': part.scope,
        'data-part': part.part,
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
    ...(controlled ? { value: toDOMValue(value) } : { defaultValue: toDOMValue(value) }),
    disabled: props.disabled ?? false,
    readOnly: props.readonly ?? false,
    onValueChange: (next) => {
      emit('update:modelValue', fromDOMValue(next));
    },
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}

function toDOMValue(value: CheckboxValue): DOMCheckboxValue {
  return value === 'indeterminate' ? 'mixed' : value;
}

function fromDOMValue(value: DOMCheckboxValue): CheckboxValue {
  return value === 'mixed' ? 'indeterminate' : value;
}
