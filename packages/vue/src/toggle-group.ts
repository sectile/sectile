import {
  computed, defineComponent, h, inject, mergeProps, nextTick, provide, shallowRef, watch,
  type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { getToggleGroupItemAttributes, getToggleGroupRootAttributes } from '@sectile/dom/toggle-group';
import { createListboxControllerFromItems, type ListboxController } from '@sectile/dom/listbox';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { provideFormControlOwner } from './form.js';
import {
  hiddenValueSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';

export interface ToggleGroupRootProps {
  readonly items: readonly string[];
  readonly modelValue?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly multiple?: boolean;
  readonly deselectable?: boolean;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ToggleGroupRootSlotProps { readonly value: readonly string[]; readonly highlightedValue: string | null; readonly disabled: boolean; readonly: boolean }
export interface ToggleGroupItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ToggleGroupItemSlotProps { readonly value: string; readonly pressed: boolean; readonly highlighted: boolean; readonly disabled: boolean; readonly: boolean }

interface RootContext {
  readonly value: ComputedRef<readonly string[]>;
  readonly highlighted: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  press(value: string, target: HTMLElement): void;
}
const rootKey = Symbol('SectileToggleGroupRoot');

export const ToggleGroupRoot = defineComponent({
  name: 'SectileToggleGroupRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: Array as PropType<readonly string[]>, default: undefined },
    defaultValue: { type: Array as PropType<readonly string[]>, default: () => [] },
    multiple: { type: Boolean, default: false }, deselectable: { type: Boolean, default: true },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    label: { type: String, default: undefined },
    name: { type: String, default: undefined }, form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: readonly string[]): boolean => true, highlight: (_value: string | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: ToggleGroupRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const rootElement = shallowRef<HTMLElement | null>(null);
    const submissionElements: Array<HTMLInputElement | null> = [];
    const participation = useCompositeFormControl({
      root: rootElement,
      submissions: () => value.value.map((_, index) => ({
        element: () => submissionElements[index] ?? null,
        capabilities: hiddenValueSubmissionCapabilities,
      })),
    });
    provideFormControlOwner();
    const controlled = props.modelValue !== undefined;
    const makeController = (value: readonly string[]): ListboxController<string> => {
      const result = createListboxControllerFromItems({
        items: props.items,
        selectionMode: props.multiple ? 'multiple' : 'single',
        disabledItems: props.disabledItems, disabled: props.disabled, readOnly: props.readonly,
        orientation: props.orientation, activationMode: 'toggle', clearOnEscape: false,
        policies: { deselectable: props.deselectable, boundary: 'wrap' },
        ...(controlled ? { value } : { defaultValue: value }),
        defaultHighlightedValue: value[0] ?? props.items.find((id) => !props.disabledItems.includes(id)) ?? null,
        onValueChange: ({ value: next }) => emit('update:modelValue', next),
        onHighlightedValueChange: ({ value: next }) => emit('highlight', next),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    };
    const controller = shallowRef(makeController(props.modelValue ?? props.defaultValue));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const rebuild = (): void => {
      const current = controlled ? props.modelValue as readonly string[] : snapshot.value.state.selection.selected;
      controller.value = makeController(current); snapshot.value = controller.value.getSnapshot();
    };
    watch(() => props.modelValue, (next) => {
      if (!controlled || next === undefined) return;
      const result = controller.value.syncControlledValues({ value: next });
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.orientation, () => props.multiple, () => props.deselectable], rebuild);
    const value = computed(() => snapshot.value.state.selection.selected);
    const highlighted = computed(() => snapshot.value.state.cursor.current);
    const disabled = computed(() => props.disabled);
    const readonly = computed(() => props.readonly);
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    const apply = (result: ReturnType<ListboxController<string>['handleEvent']>, root?: HTMLElement): boolean => {
      if (!result.ok) return false;
      snapshot.value = result.snapshot;
      if (root !== undefined) void nextTick(() => focusItem(root, result.snapshot.state.cursor.current));
      return true;
    };
    provide<RootContext>(rootKey, {
      value, highlighted, disabled, readonly, disabledItems,
      press: (id, target) => apply(controller.value.handleEvent({ type: 'toggle', id }), target.closest('[data-scope="toggle-group"][data-part="root"]') as HTMLElement | undefined),
    });
    const slotProps = computed<ToggleGroupRootSlotProps>(() => ({ value: value.value, highlightedValue: highlighted.value, disabled: props.disabled, readonly: props.readonly }));
    return (): VNodeChild => {
      const root = h(Primitive, mergeProps(attrs, getToggleGroupRootAttributes({ orientation: props.orientation, ...(props.label === undefined ? {} : { label: props.label }), disabled: props.disabled, readOnly: props.readonly }) as Record<string, unknown>, {
      as: props.as, asChild: props.asChild,
      elementRef: (element: unknown) => { rootElement.value = element instanceof HTMLElement ? element : null; },
      onKeydown: (event: KeyboardEvent) => { if (apply(controller.value.handleKeyboardInput(event), event.currentTarget as HTMLElement)) event.preventDefault(); },
      }, participation.controlProps.value), { default: () => slots['default']?.(slotProps.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined) return root;
      return [root, ...value.value.map((selected, index) => h('input', {
        ref: (element: unknown) => {
          submissionElements[index] = element instanceof HTMLInputElement ? element : null;
        },
        type: 'hidden', name: props.name, form: props.form, value: selected,
        disabled: props.disabled, style: visuallyHiddenInputStyle,
      }))];
    };
  },
});

export const ToggleGroupItem = defineComponent({
  name: 'SectileToggleGroupItem', inheritAttrs: false,
  props: {
    value: { type: String, required: true }, disabled: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: ToggleGroupItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot();
    const state = computed<ToggleGroupItemSlotProps>(() => ({
      value: props.value, pressed: root.value.value.includes(props.value), highlighted: root.highlighted.value === props.value,
      disabled: root.disabled.value || props.disabled || root.disabledItems.value.has(props.value), readonly: root.readonly.value,
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, getToggleGroupItemAttributes({ id: props.value, pressed: state.value.pressed, highlighted: state.value.highlighted, disabled: state.value.disabled }) as Record<string, unknown>, {
      as: props.as, asChild: props.asChild,
      onClick: (event: MouseEvent) => { if (!event.defaultPrevented && !state.value.disabled && !state.value.readonly) root.press(props.value, event.currentTarget as HTMLElement); },
    }), { default: () => slots['default']?.(state.value) });
  },
});

function useRoot(): RootContext {
  const root = inject<RootContext>(rootKey);
  if (root === undefined) throw new TypeError('ToggleGroupItem must be used inside ToggleGroupRoot.');
  return root;
}
function focusItem(root: HTMLElement, id: string | null): void {
  if (id === null) return;
  for (const item of root.querySelectorAll<HTMLElement>('[data-toggle-group-id]')) if (item.dataset['toggleGroupId'] === id) item.focus();
}
