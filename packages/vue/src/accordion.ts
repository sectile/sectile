import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  shallowRef,
  useId,
  watch,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createAccordionController,
  getAccordionPanelAttributes,
  getAccordionRootAttributes,
  getAccordionTriggerAttributes,
  toAccordionEvent,
  type AccordionController,
} from '@sectile/dom/accordion';
import { Primitive, type PrimitiveAs } from './primitive.js';

export type AccordionType = 'single' | 'multiple';
export type AccordionValue = string | readonly string[];

export interface AccordionRootProps {
  readonly items: readonly string[];
  readonly type?: AccordionType;
  readonly modelValue?: AccordionValue;
  readonly defaultValue?: AccordionValue;
  readonly collapsible?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly disabledItems?: readonly string[];
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface AccordionRootSlotProps {
  readonly value: AccordionValue;
  readonly disabled: boolean;
  readonly: boolean;
}

export interface AccordionItemProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface AccordionItemSlotProps {
  readonly value: string;
  readonly open: boolean;
  readonly disabled: boolean;
}

export interface AccordionPartProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface AccordionRootContext {
  readonly openIDs: ComputedRef<readonly string[]>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  toggle(id: string): void;
  handleKeydown(event: KeyboardEvent): void;
}

interface AccordionItemContext {
  readonly value: string;
  readonly triggerID: string;
  readonly panelID: string;
  readonly slotProps: ComputedRef<AccordionItemSlotProps>;
}

interface AccordionEmit {
  (event: 'update:modelValue', value: AccordionValue): void;
}

interface AccordionControllerProps {
  readonly items: readonly string[];
  readonly type: AccordionType;
  readonly collapsible: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly disabledItems: readonly string[];
}

const accordionRootContextKey = Symbol('SectileAccordionRoot');
const accordionItemContextKey = Symbol('SectileAccordionItem');
const accordionHeaderProps = accordionPartProps('h3');
const accordionTriggerProps = accordionPartProps('button');
const accordionContentProps = accordionPartProps('div');

export const AccordionRoot = defineComponent({
  name: 'SectileAccordionRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    type: { type: String as PropType<AccordionType>, default: 'single' },
    modelValue: { type: [String, Array] as PropType<AccordionValue>, default: undefined },
    defaultValue: { type: [String, Array] as PropType<AccordionValue>, default: undefined },
    collapsible: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: AccordionValue): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: AccordionRootSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, slots }) {
    const controlled = props.modelValue !== undefined;
    const controller = shallowRef(createController(
      controlled,
      toIDs(controlled ? props.modelValue : props.defaultValue, props.type),
      props,
      emit,
    ));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const refresh = (): void => { snapshot.value = controller.value.getSnapshot(); };
    const rebuild = (): void => {
      const value = controlled
        ? toIDs(props.modelValue, props.type)
        : snapshot.value.state.openIDs;
      controller.value = createController(controlled, value, props, emit);
      refresh();
    };

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValues({ value: toIDs(value, props.type) });
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch(
      [() => props.items, () => props.type, () => props.collapsible, () => props.disabled,
        () => props.readonly, () => props.disabledItems],
      rebuild,
    );

    const openIDs = computed(() => snapshot.value.state.openIDs);
    const disabled = computed(() => props.disabled);
    const readonly = computed(() => props.readonly);
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    const slotProps = computed<AccordionRootSlotProps>(() => Object.freeze({
      value: fromIDs(openIDs.value, props.type),
      disabled: disabled.value,
      readonly: readonly.value,
    }));
    const toggle = (id: string): void => {
      const result = controller.value.handleEvent({ type: 'toggle', id });
      if (result.ok) snapshot.value = result.snapshot;
    };
    const handleKeydown = (event: KeyboardEvent): void => {
      const semantic = toAccordionEvent<string>(event);
      if (semantic === null || semantic === 'toggle') return;
      event.preventDefault();
      const result = controller.value.handleEvent(semantic);
      if (!result.ok) return;
      snapshot.value = result.snapshot;
      queueMicrotask(() => focusAccordionTrigger(
        event.currentTarget as HTMLElement,
        result.snapshot.state.cursor.current,
      ));
    };
    provide<AccordionRootContext>(accordionRootContextKey, {
      openIDs,
      disabled,
      readonly,
      disabledItems,
      toggle,
      handleKeydown,
    });

    const attributes = computed(() => getAccordionRootAttributes({
      disabled: props.disabled,
      readOnly: props.readonly,
    }));
    return (): VNodeChild => h(Primitive, mergeProps(
      attrs,
      attributes.value as Record<string, unknown>,
      {
        as: props.as,
        asChild: props.asChild,
        onKeydown: handleKeydown,
      },
    ), {
      default: () => slots['default']?.(slotProps.value),
    });
  },
});

export type AccordionValueChangeHandler = (value: AccordionValue) => void;

export const AccordionItem = defineComponent({
  name: 'SectileAccordionItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (props: AccordionItemSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const root = useAccordionRootContext('AccordionItem');
    const generatedID = useId();
    const triggerID = `sectile-accordion-trigger-${generatedID}`;
    const panelID = `sectile-accordion-panel-${generatedID}`;
    const slotProps = computed<AccordionItemSlotProps>(() => Object.freeze({
      value: props.value,
      open: root.openIDs.value.includes(props.value),
      disabled: root.disabled.value || props.disabled || root.disabledItems.value.has(props.value),
    }));
    provide<AccordionItemContext>(accordionItemContextKey, {
      value: props.value,
      triggerID,
      panelID,
      slotProps,
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'accordion',
      'data-part': 'item',
      'data-state': slotProps.value.open ? 'open' : 'closed',
      'data-disabled': slotProps.value.disabled ? '' : undefined,
    }), {
      default: () => slots['default']?.(slotProps.value),
    });
  },
});

export const AccordionHeader = defineComponent({
  name: 'SectileAccordionHeader',
  inheritAttrs: false,
  props: accordionHeaderProps,
  slots: Object as SlotsType<{ default: (props: AccordionItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const item = useAccordionItemContext('AccordionHeader');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'accordion',
      'data-part': 'header',
      'data-state': item.slotProps.value.open ? 'open' : 'closed',
    }), { default: () => slots['default']?.(item.slotProps.value) });
  },
});

export const AccordionTrigger = defineComponent({
  name: 'SectileAccordionTrigger',
  inheritAttrs: false,
  props: accordionTriggerProps,
  slots: Object as SlotsType<{ default: (props: AccordionItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useAccordionRootContext('AccordionTrigger');
    const item = useAccordionItemContext('AccordionTrigger');
    const attributes = computed(() => getAccordionTriggerAttributes(
      { has: (id: string) => root.openIDs.value.includes(id) },
      {
        id: item.value,
        triggerID: item.triggerID,
        panelID: item.panelID,
        disabled: item.slotProps.value.disabled,
      },
      {
        disabled: root.disabled.value,
        readOnly: root.readonly.value,
        native: props.as === 'button' && !props.asChild,
      },
    ));
    const handleClick = (event: MouseEvent): void => {
      if (!event.defaultPrevented) root.toggle(item.value);
    };
    return (): VNodeChild => h(Primitive, mergeProps(
      attrs,
      attributes.value as Record<string, unknown>,
      {
        as: props.as,
        asChild: props.asChild,
        onClick: handleClick,
      },
    ), { default: () => slots['default']?.(item.slotProps.value) });
  },
});

export const AccordionContent = defineComponent({
  name: 'SectileAccordionContent',
  inheritAttrs: false,
  props: accordionContentProps,
  slots: Object as SlotsType<{ default: (props: AccordionItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const item = useAccordionItemContext('AccordionContent');
    const attributes = computed(() => getAccordionPanelAttributes(
      { has: (id: string) => id === item.value && item.slotProps.value.open },
      item.value,
      { panelID: item.panelID, triggerID: item.triggerID },
    ));
    return (): VNodeChild => h(Primitive, mergeProps(
      attrs,
      attributes.value as Record<string, unknown>,
      { as: props.as, asChild: props.asChild },
    ), { default: () => slots['default']?.(item.slotProps.value) });
  },
});

function accordionPartProps(defaultAs: PrimitiveAs) {
  return {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: defaultAs },
    asChild: { type: Boolean, default: false },
  };
}

function useAccordionRootContext(part: string): AccordionRootContext {
  const context = inject<AccordionRootContext>(accordionRootContextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside AccordionRoot.`);
  return context;
}

function useAccordionItemContext(part: string): AccordionItemContext {
  const context = inject<AccordionItemContext>(accordionItemContextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside AccordionItem.`);
  return context;
}

function createController(
  controlled: boolean,
  value: readonly string[],
  props: AccordionControllerProps,
  emit: AccordionEmit,
): AccordionController<string> {
  const result = createAccordionController({
    items: props.items,
    expansion: props.type ?? 'single',
    collapsible: props.collapsible ?? true,
    disabledItems: props.disabledItems ?? [],
    disabled: props.disabled ?? false,
    readOnly: props.readonly ?? false,
    ...(controlled ? { value } : { defaultValue: value }),
    onValueChange: (change) => emit('update:modelValue', fromIDs(change.value, props.type ?? 'single')),
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}

function toIDs(value: AccordionValue | undefined, type: AccordionType): readonly string[] {
  if (value === undefined || value === '') return [];
  if (Array.isArray(value)) return type === 'single' ? value.slice(0, 1) : value;
  return [value as string];
}

function fromIDs(value: readonly string[], type: AccordionType): AccordionValue {
  return type === 'single' ? value[0] ?? '' : value;
}

function focusAccordionTrigger(root: HTMLElement, id: string | null): void {
  if (id === null) return;
  for (const trigger of root.querySelectorAll<HTMLElement>('[data-accordion-id]')) {
    if (trigger.dataset['accordionId'] === id) trigger.focus();
  }
}
