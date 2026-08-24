import { defineComponent, h, mergeProps, type Component, type PropType, type SlotsType, type VNodeChild } from 'vue';
import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger,
  type TabsRootProps,
  type TabsRootSlotProps,
} from './tabs.js';
import type { PrimitiveAs } from './primitive.js';
import { providePartContract } from './internal/part-contract.js';

export type StepperRootProps = Omit<TabsRootProps, 'activationMode'>;

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
  slots: Object as SlotsType<{ default: (props: TabsRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    providePartContract('stepper', { trigger: 'step' });
    return (): VNodeChild => h(TabsRoot as Component, mergeProps(attrs, props, {
      activationMode: 'manual',
      'aria-roledescription': 'stepper',
    }), slots);
  },
});

export const StepperList = TabsList;
export const StepperStep = TabsTrigger;
export const StepperContent = TabsContent;
export const StepperIndicator = TabsIndicator;
