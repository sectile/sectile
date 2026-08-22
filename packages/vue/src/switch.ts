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
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { Primitive, type PrimitiveAs } from './primitive.js';

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
    const controlled = props.modelValue !== undefined;
    const controller = shallowRef(createController(
      controlled,
      controlled ? props.modelValue as boolean : props.defaultValue,
      props,
      emit,
    ));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const refresh = (): void => { snapshot.value = controller.value.getSnapshot(); };
    const rebuild = (): void => {
      const checked = controlled ? props.modelValue as boolean : snapshot.value.state.checked;
      controller.value = createController(controlled, checked, props, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => props.disabled, () => props.readonly], rebuild);

    const slotProps = computed<SwitchSlotProps>(() => Object.freeze({
      checked: snapshot.value.state.checked,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const attributes = computed(() => getSwitchAttributes(snapshot.value.state, {
      disabled: props.disabled,
      readOnly: props.readonly,
      required: props.required,
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
          as: props.as,
          asChild: props.asChild,
          ...(props.as === 'button' && !props.asChild ? { type: 'button' } : {}),
          onClick: handleClick,
        },
      ), {
        default: () => slots['default']?.(slotProps.value),
      });
      if (props.name === undefined && props.form === undefined && !props.required) return root;
      return [root, h('input', mergeProps(
        inputAttributes.value as unknown as Record<string, unknown>,
        { style: visuallyHiddenInputStyle },
      ))];
    };
  },
});

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
