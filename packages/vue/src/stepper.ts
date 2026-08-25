import { computed, defineComponent, h, mergeProps, type Component, type PropType, type SlotsType, type VNodeChild } from 'vue';
import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger,
  type TabsRootProps,
  type TabsRootSlotProps,
} from './tabs.js';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { providePartContract } from './internal/part-contract.js';
import { useTabsRootContext } from './internal/tabs-context.js';

export type StepperRootProps = Omit<TabsRootProps, 'activationMode'>;
export interface StepperActionProps {
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface StepperActionSlotProps {
  readonly value: string;
  readonly targetValue: string | null;
  readonly disabled: boolean;
}

export const StepperRoot = defineComponent({
  name: 'SectileStepperRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string): boolean => true,
    highlight: (_value: string | null): boolean => true,
    activate: (_value: string): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: TabsRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    providePartContract('stepper', { trigger: 'step' });
    return (): VNodeChild => h(TabsRoot as Component, mergeProps(attrs, props, {
      activationMode: 'manual',
      'aria-roledescription': 'stepper',
      'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
      onHighlight: (value: string | null) => emit('highlight', value),
      onActivate: (value: string) => emit('activate', value),
    }), slots);
  },
});

export const StepperList = TabsList;
export const StepperStep = TabsTrigger;
export const StepperContent = TabsContent;
export const StepperIndicator = TabsIndicator;
export const StepperPrevious = createAction('Previous', -1);
export const StepperNext = createAction('Next', 1);

function createAction(name: 'Previous' | 'Next', direction: -1 | 1) {
  return defineComponent({
    name: `SectileStepper${name}`,
    inheritAttrs: false,
    props: {
      disabled: { type: Boolean, default: false },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
      asChild: { type: Boolean, default: false },
    },
    slots: Object as SlotsType<{ default: (props: StepperActionSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useTabsRootContext(`Stepper${name}`);
      if (root.partContract.scope !== 'stepper') {
        throw new TypeError(`Stepper${name} must be used inside StepperRoot.`);
      }
      const targetValue = computed(() => props.disabled ? null : root.relativeTarget(direction));
      const disabled = computed(() => props.disabled || targetValue.value === null);
      const slotProps = computed<StepperActionSlotProps>(() => Object.freeze({
        value: root.value.value,
        targetValue: targetValue.value,
        disabled: disabled.value,
      }));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        ...(props.as === 'button' && !props.asChild ? { type: 'button', disabled: disabled.value } : {}),
        'aria-disabled': disabled.value ? 'true' : undefined,
        'data-disabled': disabled.value ? '' : undefined,
        'data-scope': 'stepper',
        'data-part': name.toLowerCase(),
        'data-target-value': targetValue.value ?? undefined,
        onClick: (event: MouseEvent) => {
          if (event.defaultPrevented) return;
          if (disabled.value) {
            event.preventDefault();
            return;
          }
          root.activateRelative(direction);
        },
      }), { default: () => slots['default']?.(slotProps.value) });
    },
  });
}
