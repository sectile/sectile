import {
  computed,
  defineComponent,
  h,
  mergeProps,
  shallowRef,
  watch,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createToggleButtonController,
  getToggleButtonAttributes,
  type ToggleButtonController,
} from '@sectile/dom/toggle-button';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface ToggleButtonProps {
  readonly modelValue?: boolean;
  readonly defaultValue?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface ToggleButtonSlotProps {
  readonly pressed: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

interface ToggleButtonControllerProps {
  readonly disabled: boolean;
  readonly: boolean;
}

interface ToggleButtonEmit {
  (event: 'update:modelValue', value: boolean): void;
}

export const ToggleButton = defineComponent({
  name: 'SectileToggleButton',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: undefined },
    defaultValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: boolean): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: ToggleButtonSlotProps) => VNodeChild;
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
      const pressed = controlled ? props.modelValue as boolean : snapshot.value.state.pressed;
      controller.value = createController(controlled, pressed, props, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => props.disabled, () => props.readonly], rebuild);

    const slotProps = computed<ToggleButtonSlotProps>(() => Object.freeze({
      pressed: snapshot.value.state.pressed,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const attributes = computed(() => getToggleButtonAttributes(snapshot.value.state, {
      disabled: props.disabled,
      readOnly: props.readonly,
      native: true,
    }));
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

export type ToggleButtonValueChangeHandler = (value: boolean) => void;

function createController(
  controlled: boolean,
  pressed: boolean,
  props: ToggleButtonControllerProps,
  emit: ToggleButtonEmit,
): ToggleButtonController {
  const result = createToggleButtonController({
    ...(controlled ? { pressed } : { defaultPressed: pressed }),
    disabled: props.disabled,
    readOnly: props.readonly,
    onPressedChange: (next) => emit('update:modelValue', next),
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}
