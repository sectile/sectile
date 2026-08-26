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
  createDisclosureController,
  getDisclosureContentAttributes,
  getDisclosureTriggerAttributes,
  type DisclosureController,
} from '@sectile/dom/disclosure';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostId } from './host-provider.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface DisclosureRootProps {
  readonly modelValue?: boolean;
  readonly defaultValue?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly contentId?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface DisclosureSlotProps {
  readonly open: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

export interface DisclosureTriggerProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface DisclosureContentProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface DisclosureContext {
  readonly slotProps: ComputedRef<DisclosureSlotProps>;
  readonly contentId: string;
  toggle(): void;
}

interface DisclosureControllerProps {
  readonly disabled: boolean;
  readonly: boolean;
}

interface DisclosureEmit {
  (event: 'update:modelValue', value: boolean): void;
}

const disclosureContextKey = Symbol('SectileDisclosure');

export const DisclosureRoot = defineComponent({
  name: 'SectileDisclosureRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: undefined },
    defaultValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    contentId: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: boolean): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: DisclosureSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, slots }) {
    const controlled = useControlledStateInvariant('DisclosureRoot', 'modelValue', () => props.modelValue);
    const generatedId = useHostId();
    const contentId = props.contentId ?? `sectile-disclosure-${generatedId}`;
    const controller = shallowRef(createController(
      controlled,
      controlled ? props.modelValue as boolean : props.defaultValue,
      props,
      emit,
    ));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const refresh = (): void => { snapshot.value = controller.value.getSnapshot(); };
    const rebuild = (): void => {
      const open = controlled ? props.modelValue as boolean : snapshot.value.state.open;
      controller.value = createController(controlled, open, props, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => props.disabled, () => props.readonly], rebuild);

    const slotProps = computed<DisclosureSlotProps>(() => Object.freeze({
      open: snapshot.value.state.open,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const toggle = (): void => {
      if (controller.value.handleEvent('toggle')) refresh();
    };
    provide<DisclosureContext>(disclosureContextKey, { slotProps, contentId, toggle });

    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'disclosure',
      'data-part': 'root',
      'data-state': slotProps.value.open ? 'open' : 'closed',
      'data-disabled': props.disabled ? '' : undefined,
      'data-readonly': props.readonly ? '' : undefined,
    }), {
      default: () => slots['default']?.(slotProps.value),
    });
  },
});

export type DisclosureValueChangeHandler = (value: boolean) => void;

export const DisclosureTrigger = defineComponent({
  name: 'SectileDisclosureTrigger',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (props: DisclosureSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const context = useDisclosureContext('DisclosureTrigger');
    const attributes = computed(() => getDisclosureTriggerAttributes(
      { open: context.slotProps.value.open },
      {
        panelID: context.contentId,
        disabled: context.slotProps.value.disabled,
        readOnly: context.slotProps.value.readonly,
        native: true,
      },
    ));
    const handleClick = (event: MouseEvent): void => {
      if (!event.defaultPrevented) context.toggle();
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
      default: () => slots['default']?.(context.slotProps.value),
    });
  },
});

export const DisclosureContent = defineComponent({
  name: 'SectileDisclosureContent',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (props: DisclosureSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const context = useDisclosureContext('DisclosureContent');
    const attributes = computed(() => getDisclosureContentAttributes(
      { open: context.slotProps.value.open },
      { id: context.contentId },
    ));
    return (): VNodeChild => h(Primitive, mergeProps(
      attrs,
      attributes.value as unknown as Record<string, unknown>,
      { as: props.as, asChild: props.asChild },
    ), {
      default: () => slots['default']?.(context.slotProps.value),
    });
  },
});

function useDisclosureContext(part: string): DisclosureContext {
  const context = inject<DisclosureContext>(disclosureContextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside DisclosureRoot.`);
  return context;
}

function createController(
  controlled: boolean,
  open: boolean,
  props: DisclosureControllerProps,
  emit: DisclosureEmit,
): DisclosureController {
  const result = createDisclosureController({
    ...(controlled ? { open } : { defaultOpen: open }),
    disabled: props.disabled,
    readOnly: props.readonly,
    onOpenChange: (next) => emit('update:modelValue', next),
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}
