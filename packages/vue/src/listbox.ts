import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  nextTick,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  DEFAULT_LISTBOX_SELECTION_MODE,
  createListboxControllerFromItems,
  getListboxItemAttributes,
  getListboxRootAttributes,
  type ListboxController,
  type ListboxEffect,
} from '@sectile/dom/listbox';
import { stableIDElementToken } from '@sectile/dom/identity';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { hiddenSelectSubmissionCapabilities, useCompositeFormControl } from './internal/form-control.js';
import { useHostDirection, useHostId, type HostDirection } from './host-provider.js';
import { reconcileCollectionState, sameIDs } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export type ListboxSelectionMode = 'single' | 'multiple';
export type ListboxValue = string | readonly string[];

export interface ListboxRootProps {
  readonly items: readonly string[];
  readonly selectionMode?: ListboxSelectionMode;
  readonly modelValue?: ListboxValue;
  readonly defaultValue?: ListboxValue;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly textValue?: (id: string) => string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type ListboxTextValueResolver = NonNullable<ListboxRootProps['textValue']>;

export interface ListboxRootSlotProps {
  readonly value: ListboxValue;
  readonly highlightedValue: string | null;
  readonly disabled: boolean;
  readonly: boolean;
}

export interface ListboxItemProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface ListboxItemSlotProps {
  readonly value: string;
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly disabled: boolean;
}

export interface ListboxPartProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface ListboxRootContext {
  readonly selectedIDs: ComputedRef<readonly string[]>;
  readonly selectedIDSet: ComputedRef<ReadonlySet<string>>;
  readonly highlightedValue: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  itemID(id: string): string;
  select(id: string, target: HTMLElement): void;
}

interface ListboxItemContext {
  readonly slotProps: ComputedRef<ListboxItemSlotProps>;
}

interface ListboxEmit {
  (event: 'update:modelValue', value: ListboxValue): void;
  (event: 'highlight', value: string | null): void;
  (event: 'activate', value: string): void;
}

interface ListboxControllerProps {
  readonly items: readonly string[];
  readonly selectionMode: ListboxSelectionMode;
  readonly disabledItems: readonly string[];
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly orientation: 'horizontal' | 'vertical';
  readonly direction: HostDirection;
  readonly textValue: ((id: string) => string) | undefined;
}

const listboxRootContextKey = Symbol('SectileListboxRoot');
const listboxItemContextKey = Symbol('SectileListboxItem');
const listboxPartProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
  asChild: { type: Boolean, default: false },
};

export const ListboxRoot = defineComponent({
  name: 'SectileListboxRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    selectionMode: { type: String as PropType<ListboxSelectionMode>, default: DEFAULT_LISTBOX_SELECTION_MODE },
    modelValue: { type: [String, Array] as PropType<ListboxValue>, default: undefined },
    defaultValue: { type: [String, Array] as PropType<ListboxValue>, default: undefined },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'vertical' },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    textValue: { type: Function as PropType<ListboxTextValueResolver>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: ListboxValue): boolean => true,
    highlight: (_value: string | null): boolean => true,
    activate: (_value: string): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: ListboxRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const direction = useHostDirection();
    const instanceID = useHostId();
    const itemID = (id: string): string => `sectile-listbox-${instanceID}-option-${stableIDElementToken(id)}`;
    const rootElement = shallowRef<HTMLElement | null>(null);
    const submissionElement = shallowRef<HTMLSelectElement | null>(null);
    let controllerProps = snapshotListboxControllerProps({
      ...props,
      direction: direction.value,
    });
    const participation = useCompositeFormControl({
      root: rootElement,
      submissions: [{ element: submissionElement, capabilities: hiddenSelectSubmissionCapabilities }],
      reset: () => {
        queueMicrotask(() => {
          const next = controlled
            ? toIDs(props.modelValue, props.selectionMode)
            : initialValue;
          controller.value = createController(
            controlled,
            next,
            next[0] ?? firstEnabledItem(controllerProps) ?? null,
            controllerProps,
            emit,
          );
          snapshot.value = controller.value.getSnapshot();
        });
      },
    });
    const controlled = useControlledStateInvariant('ListboxRoot', 'modelValue', () => props.modelValue);
    const initialValue = toIDs(controlled ? props.modelValue : props.defaultValue, props.selectionMode);
    const controller = shallowRef(createController(
      controlled,
      initialValue,
      initialValue[0] ?? firstEnabledItem(controllerProps) ?? null,
      controllerProps,
      emit,
    ));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const rebuild = (): void => {
      const nextControllerProps = snapshotListboxControllerProps({
        ...props,
        direction: direction.value,
      });
      if (sameListboxControllerProps(controllerProps, nextControllerProps)) {
        return;
      }
      const requested = controlled
        ? toIDs(props.modelValue, props.selectionMode)
        : snapshot.value.state.selection.selected;
      const reconciled = reconcileCollectionState(
        nextControllerProps.items,
        requested,
        snapshot.value.state.cursor.current,
        nextControllerProps.disabledItems,
        nextControllerProps.selectionMode,
      );
      controller.value = createController(
        controlled,
        reconciled.selected,
        reconciled.current,
        nextControllerProps,
        emit,
      );
      controllerProps = nextControllerProps;
      snapshot.value = controller.value.getSnapshot();
      if (controlled && !sameIDs(requested, reconciled.selected)) {
        emit('update:modelValue', fromIDs(reconciled.selected, props.selectionMode));
      }
    };
    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined) return;
      const result = controller.value.syncControlledValues({
        value: toIDs(value, props.selectionMode),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch(
      [() => props.items, () => props.selectionMode, () => props.disabledItems,
        () => props.disabled, () => props.readonly, () => props.orientation, () => props.textValue, direction],
      rebuild,
    );

    const selectedIDs = computed(() => snapshot.value.state.selection.selected);
    const selectedIDSet = computed<ReadonlySet<string>>(
      () => new Set(selectedIDs.value),
    );
    const highlightedValue = computed(() => snapshot.value.state.cursor.current);
    const disabled = computed(() => props.disabled);
    const readonly = computed(() => props.readonly);
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    const slotProps = computed<ListboxRootSlotProps>(() => Object.freeze({
      value: fromIDs(selectedIDs.value, props.selectionMode),
      highlightedValue: highlightedValue.value,
      disabled: disabled.value,
      readonly: readonly.value,
    }));
    const applyResult = (
      result: ReturnType<ListboxController<string>['handleEvent']>,
      root?: HTMLElement,
    ): boolean => {
      if (!result.ok) return false;
      snapshot.value = result.snapshot;
      applyEffects(result.commands, emit);
      if (root !== undefined) void nextTick(() => root.focus());
      return true;
    };
    const select = (id: string, target: HTMLElement): void => {
      const event = props.selectionMode === 'multiple'
        ? { type: 'toggle' as const, id }
        : { type: 'activate' as const, id };
      applyResult(controller.value.handleEvent(event), target.closest('[role="listbox"]') as HTMLElement | undefined);
    };
    const handleKeydown = (event: KeyboardEvent): void => {
      const result = controller.value.handleKeyboardInput(event);
      if (!applyResult(result, event.currentTarget as HTMLElement)) return;
      event.preventDefault();
    };
    provide<ListboxRootContext>(listboxRootContextKey, {
      selectedIDs,
      selectedIDSet,
      highlightedValue,
      disabled,
      readonly,
      disabledItems,
      itemID,
      select,
    });

    const rootAttributes = computed(() => getListboxRootAttributes({
      selectionMode: props.selectionMode,
      orientation: props.orientation,
      direction: direction.value,
      disabled: props.disabled,
      readOnly: props.readonly,
      ...(highlightedValue.value === null ? {} : { activeDescendantID: itemID(highlightedValue.value) }),
    }));
    return (): VNodeChild => {
      const root = h(Primitive, mergeProps(
        attrs,
        rootAttributes.value as Record<string, unknown>,
        {
          as: props.as, asChild: props.asChild, onKeydown: handleKeydown,
          elementRef: (element: unknown) => { rootElement.value = element as HTMLElement | null; },
        },
        participation.controlProps.value,
      ), { default: () => slots['default']?.(slotProps.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined && !props.required) return root;
      return [root, h('select', {
        ref: submissionElement,
        name: props.name,
        form: props.form,
        required: props.required,
        multiple: props.selectionMode === 'multiple',
        tabindex: -1,
        'aria-hidden': 'true',
        style: visuallyHiddenInputStyle,
      }, props.items.map((id) => h('option', {
        value: id,
        selected: selectedIDSet.value.has(id),
      }, id)))];
    };
  },
});

export type ListboxValueChangeHandler = (value: ListboxValue) => void;
export type ListboxHighlightHandler = (value: string | null) => void;
export type ListboxActivateHandler = (value: string) => void;

export const ListboxItem = defineComponent({
  name: 'SectileListboxItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: ListboxItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useListboxRootContext('ListboxItem');
    const slotProps = computed<ListboxItemSlotProps>(() => Object.freeze({
      value: props.value,
      selected: root.selectedIDSet.value.has(props.value),
      highlighted: root.highlightedValue.value === props.value,
      disabled: root.disabled.value || props.disabled || root.disabledItems.value.has(props.value),
    }));
    provide<ListboxItemContext>(listboxItemContextKey, { slotProps });
    const attributes = computed(() => getListboxItemAttributes(
      {
        cursor: { current: root.highlightedValue.value },
        selection: { has: (id: string) => root.selectedIDSet.value.has(id) },
      },
      { id: props.value, disabled: props.disabled },
      { disabled: slotProps.value.disabled, elementID: root.itemID(props.value) },
    ));
    const handleClick = (event: MouseEvent): void => {
      if (!event.defaultPrevented && !slotProps.value.disabled) {
        root.select(props.value, event.currentTarget as HTMLElement);
      }
    };
    return (): VNodeChild => h(Primitive, mergeProps(
      attrs,
      attributes.value as Record<string, unknown>,
      { as: props.as, asChild: props.asChild, onClick: handleClick },
    ), { default: () => slots['default']?.(slotProps.value) });
  },
});

export const ListboxItemText = defineComponent({
  name: 'SectileListboxItemText',
  inheritAttrs: false,
  props: listboxPartProps,
  slots: Object as SlotsType<{ default: (props: ListboxItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const item = useListboxItemContext('ListboxItemText');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'listbox',
      'data-part': 'item-text',
      'data-state': item.slotProps.value.selected ? 'checked' : 'unchecked',
    }), { default: () => slots['default']?.(item.slotProps.value) });
  },
});

export const ListboxItemIndicator = defineComponent({
  name: 'SectileListboxItemIndicator',
  inheritAttrs: false,
  props: listboxPartProps,
  slots: Object as SlotsType<{ default: (props: ListboxItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const item = useListboxItemContext('ListboxItemIndicator');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      hidden: !item.slotProps.value.selected,
      'aria-hidden': 'true',
      'data-scope': 'listbox',
      'data-part': 'item-indicator',
      'data-state': item.slotProps.value.selected ? 'checked' : 'unchecked',
    }), { default: () => slots['default']?.(item.slotProps.value) });
  },
});

function useListboxRootContext(part: string): ListboxRootContext {
  const context = inject<ListboxRootContext>(listboxRootContextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside ListboxRoot.`);
  return context;
}

function snapshotListboxControllerProps(
  props: ListboxControllerProps,
): ListboxControllerProps {
  return Object.freeze({
    ...props,
    items: Object.freeze([...props.items]),
    disabledItems: Object.freeze([...props.disabledItems]),
  });
}

function sameListboxControllerProps(
  left: ListboxControllerProps,
  right: ListboxControllerProps,
): boolean {
  return sameIDs(left.items, right.items)
    && sameIDs(left.disabledItems, right.disabledItems)
    && left.selectionMode === right.selectionMode
    && left.disabled === right.disabled
    && left.readonly === right.readonly
    && left.orientation === right.orientation
    && left.direction === right.direction
    && left.textValue === right.textValue;
}

function firstEnabledItem(props: ListboxControllerProps): string | undefined {
  if (props.disabledItems.length === 0) return props.items[0];
  const disabled = new Set(props.disabledItems);
  return props.items.find((id) => !disabled.has(id));
}

function useListboxItemContext(part: string): ListboxItemContext {
  const context = inject<ListboxItemContext>(listboxItemContextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside ListboxItem.`);
  return context;
}

function createController(
  controlled: boolean,
  value: readonly string[],
  highlightedValue: string | null,
  props: ListboxControllerProps,
  emit: ListboxEmit,
): ListboxController<string> {
  const result = createListboxControllerFromItems({
    items: props.items,
    selectionMode: props.selectionMode,
    disabledItems: props.disabledItems,
    disabled: props.disabled,
    readOnly: props.readonly,
    orientation: props.orientation,
    direction: props.direction,
    typeahead: { textValue: props.textValue ?? ((id) => id) },
    ...(controlled ? { value } : { defaultValue: value }),
    defaultHighlightedValue: highlightedValue,
    onValueChange: (change) => emit('update:modelValue', fromIDs(change.value, props.selectionMode)),
    onHighlightedValueChange: (change) => emit('highlight', change.value),
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}

function applyEffects(effects: readonly ListboxEffect<string>[], emit: ListboxEmit): void {
  for (const effect of effects) {
    if (effect.type === 'dispatch-activation') emit('activate', effect.id);
  }
}

function toIDs(value: ListboxValue | undefined, mode: ListboxSelectionMode): readonly string[] {
  if (value === undefined || value === '') return [];
  if (Array.isArray(value)) return mode === 'single' ? value.slice(0, 1) : value;
  return [value as string];
}

function fromIDs(value: readonly string[], mode: ListboxSelectionMode): ListboxValue {
  return mode === 'single' ? value[0] ?? '' : value;
}
