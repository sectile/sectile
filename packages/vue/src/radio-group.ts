import {
  computed, defineComponent, h, inject, mergeProps, nextTick, provide, ref, shallowRef, watch,
  type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  getRadioGroupInputAttributes,
  getRadioGroupItemAttributes,
  getRadioGroupRootAttributes,
} from '@sectile/dom/radio-group';
import { createListboxControllerFromItems, type ListboxController } from '@sectile/dom/listbox';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { usePartContract, type PartContract } from './internal/part-contract.js';
import { provideFormControlOwner } from './form.js';
import { hiddenInputSubmissionCapabilities, useCompositeFormControl } from './internal/form-control.js';
import { useHostDirection } from './host-provider.js';

export interface RadioGroupRootProps {
  readonly items: readonly string[];
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface RadioGroupRootSlotProps { readonly value: string; readonly highlightedValue: string | null; readonly disabled: boolean; readonly: boolean }
export interface RadioGroupItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface RadioGroupItemSlotProps { readonly value: string; readonly checked: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface RadioGroupIndicatorProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface RootContext {
  readonly value: ComputedRef<string>;
  readonly highlighted: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly partContract: PartContract;
  select(value: string, target: HTMLElement): void;
}
interface ItemContext { readonly state: ComputedRef<RadioGroupItemSlotProps>; readonly partContract: PartContract }
const rootKey = Symbol('SectileRadioGroupRoot');
const itemKey = Symbol('SectileRadioGroupItem');

export const RadioGroupRoot = defineComponent({
  name: 'SectileRadioGroupRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'vertical' },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string): boolean => true,
    highlight: (_value: string | null): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: RadioGroupRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const direction = useHostDirection();
    const rootElement = ref<HTMLElement | null>(null);
    const inputElements: Array<HTMLInputElement | null> = [];
    const participation = useCompositeFormControl({
      root: rootElement,
      submissions: () => props.items.map((_, index) => ({
        element: () => inputElements[index] ?? null,
        capabilities: hiddenInputSubmissionCapabilities,
      })),
    });
    provideFormControlOwner();
    const controlled = props.modelValue !== undefined;
    const makeController = (value: string): ListboxController<string> => {
      const selected = value === '' ? [] : [value];
      const result = createListboxControllerFromItems({
        items: props.items,
        selectionMode: 'single',
        disabledItems: props.disabledItems,
        disabled: props.disabled,
        readOnly: props.readonly,
        orientation: props.orientation,
        direction: direction.value,
        policies: { selectionFollowsFocus: true },
        ...(controlled ? { value: selected } : { defaultValue: selected }),
        defaultHighlightedValue: value || props.items.find((id) => !props.disabledItems.includes(id)) || null,
        onValueChange: ({ value: next }) => emit('update:modelValue', next[0] ?? ''),
        onHighlightedValueChange: ({ value: next }) => emit('highlight', next),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    };
    const controller = shallowRef(makeController(controlled ? props.modelValue as string : props.defaultValue));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const rebuild = (): void => {
      const current = controlled ? props.modelValue as string : snapshot.value.state.selection.selected[0] ?? '';
      controller.value = makeController(current);
      snapshot.value = controller.value.getSnapshot();
    };
    watch(() => props.modelValue, (next) => {
      if (!controlled || next === undefined) return;
      const result = controller.value.syncControlledValues({ value: next === '' ? [] : [next] });
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.orientation, direction], rebuild);
    const value = computed(() => snapshot.value.state.selection.selected[0] ?? '');
    const highlighted = computed(() => snapshot.value.state.cursor.current);
    const disabled = computed(() => props.disabled);
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    const apply = (result: ReturnType<ListboxController<string>['handleEvent']>, root?: HTMLElement): boolean => {
      if (!result.ok) return false;
      snapshot.value = result.snapshot;
      if (root !== undefined) void nextTick(() => focusItem(root, result.snapshot.state.cursor.current));
      return true;
    };
    const part = usePartContract('radio-group', 'root');
    provide<RootContext>(rootKey, {
      value, highlighted, disabled, disabledItems, partContract: part,
      select: (id, target) => apply(controller.value.handleEvent({ type: 'activate', id }), target.closest('[role="radiogroup"]') as HTMLElement | undefined),
    });
    const rootAttributes = computed(() => getRadioGroupRootAttributes({ orientation: props.orientation, direction: direction.value, disabled: props.disabled, readOnly: props.readonly }));
    const slotProps = computed<RadioGroupRootSlotProps>(() => ({ value: value.value, highlightedValue: highlighted.value, disabled: props.disabled, readonly: props.readonly }));
    return (): VNodeChild => {
      const root = h(Primitive, mergeProps(attrs, rootAttributes.value as Record<string, unknown>, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { rootElement.value = element as HTMLElement | null; },
        'data-scope': part.scope,
        onKeydown: (event: KeyboardEvent) => {
          if (!apply(controller.value.handleKeyboardInput(event), event.currentTarget as HTMLElement)) return;
          event.preventDefault();
        },
      }, participation.controlProps.value), { default: () => slots['default']?.(slotProps.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined && !props.required) return root;
      return [root, ...props.items.map((id, index) => h('input', mergeProps(getRadioGroupInputAttributes({
        ...(props.name === undefined ? {} : { name: props.name }),
        ...(props.form === undefined ? {} : { form: props.form }),
        value: id,
        checked: value.value === id,
        required: props.required,
        disabled: props.disabled || props.disabledItems.includes(id),
      }) as Record<string, unknown>, {
        ref: (element: unknown) => {
          inputElements[index] = element instanceof HTMLInputElement ? element : null;
        },
        style: visuallyHiddenInputStyle,
      })))];
    };
  },
});

export type RadioGroupValueChangeHandler = (value: string) => void;
export type RadioGroupHighlightHandler = (value: string | null) => void;

export const RadioGroupItem = defineComponent({
  name: 'SectileRadioGroupItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: RadioGroupItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('RadioGroupItem');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['item'] ?? 'item' };
    const state = computed<RadioGroupItemSlotProps>(() => ({
      value: props.value,
      checked: root.value.value === props.value,
      highlighted: root.highlighted.value === props.value,
      disabled: root.disabled.value || props.disabled || root.disabledItems.value.has(props.value),
    }));
    provide<ItemContext>(itemKey, { state, partContract: root.partContract });
    const attributes = computed(() => getRadioGroupItemAttributes({ id: props.value, checked: state.value.checked, highlighted: state.value.highlighted, disabled: state.value.disabled }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, {
      as: props.as, asChild: props.asChild,
      'data-scope': part.scope,
      onClick: (event: MouseEvent) => {
        if (!event.defaultPrevented && !state.value.disabled) root.select(props.value, event.currentTarget as HTMLElement);
      },
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const RadioGroupIndicator = defineComponent({
  name: 'SectileRadioGroupIndicator',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: RadioGroupItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const item = inject<ItemContext>(itemKey);
    if (item === undefined) throw new TypeError('RadioGroupIndicator must be used inside RadioGroupItem.');
    const part = { scope: item.partContract.scope, part: item.partContract.parts['indicator'] ?? 'indicator' };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      hidden: !item.state.value.checked,
      'aria-hidden': 'true',
      'data-scope': part.scope,
      'data-part': part.part,
      'data-state': item.state.value.checked ? 'checked' : 'unchecked',
    }), { default: () => slots['default']?.(item.state.value) });
  },
});

function useRoot(part: string): RootContext {
  const root = inject<RootContext>(rootKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside RadioGroupRoot.`);
  return root;
}
function focusItem(root: HTMLElement, id: string | null): void {
  if (id === null) return;
  for (const item of root.querySelectorAll<HTMLElement>('[data-radio-group-id]')) if (item.dataset['radioGroupId'] === id) item.focus();
}
