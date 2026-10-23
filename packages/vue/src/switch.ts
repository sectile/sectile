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
  createSwitchController,
  getSwitchAttributes,
  getSwitchInputAttributes,
  type SwitchController,
} from '@sectile/dom/switch';
import { visuallyHiddenInputStyle } from './input/native-input.js';
import { Primitive, type PrimitiveAs } from './primitive.js';
import {
  hiddenInputSubmissionCapabilities,
  useCompositeFormControl,
  useFormSubmissionProps,
  useFormControlFlags,
} from './form/control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface SwitchRootProps {
  readonly modelValue?: boolean;
  readonly defaultValue?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly name?: string;
  readonly value?: string;
  readonly form?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface SwitchSlotProps {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

export interface SwitchThumbProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface SwitchContext {
  readonly slotProps: ComputedRef<SwitchSlotProps>;
  readonly dataState: ComputedRef<string>;
}

interface SwitchControllerProps {
  readonly disabled: boolean;
  readonly: boolean;
}

interface SwitchEmit {
  (event: 'update:modelValue', value: boolean): void;
}

const switchContextKey = Symbol('SectileSwitch');

export const SwitchRoot = defineComponent({
  __sectileFormLabelMode: 'labelledby',
  name: 'SectileSwitchRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: undefined },
    defaultValue: { type: Boolean, default: false },
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
    'update:modelValue': (_value: boolean): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: SwitchSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, slots }) {
    const flags = useFormControlFlags(props);
    const rootElement = shallowRef<HTMLElement | null>(null);
    const inputElement = shallowRef<HTMLInputElement | null>(null);
    const submissionProps = useFormSubmissionProps({ element: inputElement, capabilities: hiddenInputSubmissionCapabilities }, props);
    const participation = useCompositeFormControl({
      root: rootElement,
      focusTarget: rootElement,
      submissions: [{
        element: inputElement,
        capabilities: hiddenInputSubmissionCapabilities,
      }],
      reset: () => {
        if (controlled) return;
        controller.value = createController(false, initialValue, { ...props, ...flags.value }, emit);
        refresh();
      },
    });
    const controlled = useControlledStateInvariant('SwitchRoot', 'modelValue', () => props.modelValue);
    const initialValue = controlled ? props.modelValue as boolean : props.defaultValue;
    const controller = shallowRef(createController(
      controlled,
      controlled ? props.modelValue as boolean : props.defaultValue,
      { ...props, ...flags.value },
      emit,
    ));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const refresh = (): void => { snapshot.value = controller.value.getSnapshot(); };
    const rebuild = (): void => {
      const checked = controlled ? props.modelValue as boolean : snapshot.value.state.checked;
      controller.value = createController(controlled, checked, { ...props, ...flags.value }, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => flags.value.disabled, () => flags.value.readonly], rebuild);

    const slotProps = computed<SwitchSlotProps>(() => Object.freeze({
      checked: snapshot.value.state.checked,
      disabled: flags.value.disabled,
      readonly: flags.value.readonly,
    }));
    const attributes = computed(() => getSwitchAttributes(snapshot.value.state, {
      disabled: flags.value.disabled,
      readOnly: flags.value.readonly,
      required: flags.value.required,
      native: true,
    }));
    const inputAttributes = computed(() => getSwitchInputAttributes(snapshot.value.state, {
      ...(props.name === undefined ? {} : { name: props.name }),
      value: props.value,
      ...(props.form === undefined ? {} : { form: props.form }),
      required: props.required,
      disabled: props.disabled,
    }));
    const dataState = computed(() => attributes.value['data-state']);
    provide<SwitchContext>(switchContextKey, { slotProps, dataState });

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
        submissionProps.value,
        {
          ref: inputElement,
          style: visuallyHiddenInputStyle,
        },
      ))];
    };
  },
});

export type SwitchValueChangeHandler = (value: boolean) => void;

export const SwitchThumb = defineComponent({
  name: 'SectileSwitchThumb',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (props: SwitchSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const context = inject<SwitchContext>(switchContextKey);
    if (context === undefined) throw new TypeError('SwitchThumb must be used inside SwitchRoot.');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'aria-hidden': 'true',
      'data-scope': 'switch',
      'data-part': 'thumb',
      'data-state': context.dataState.value,
    }), {
      default: () => slots['default']?.(context.slotProps.value),
    });
  },
});

function createController(
  controlled: boolean,
  checked: boolean,
  props: SwitchControllerProps,
  emit: SwitchEmit,
): SwitchController {
  const result = createSwitchController({
    ...(controlled ? { checked } : { defaultChecked: checked }),
    disabled: props.disabled,
    readOnly: props.readonly,
    onCheckedChange: (next) => emit('update:modelValue', next),
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}
