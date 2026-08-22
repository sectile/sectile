import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createCombobox, type ComboboxConnection, type ComboboxItem as ComboboxItemDefinition, type ComboboxPolicies,
} from '@sectile/dom/combobox';
import { createTextState } from '@sectile/dom/text';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface ComboboxRootProps {
  readonly items: readonly ComboboxItemDefinition<string>[];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly inputValue?: string;
  readonly defaultInputValue?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly policies?: ComboboxPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ComboboxRootSlotProps { readonly value: string | null; readonly inputValue: string; readonly highlightedValue: string | null; readonly open: boolean; readonly disabled: boolean; readonly: boolean }
export interface ComboboxItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ComboboxItemSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface ComboboxPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<ComboboxRootSlotProps>;
  readonly label: ComputedRef<string | undefined>;
  readonly connection: ComputedRef<ComboboxConnection<string> | undefined>;
  registerInput(element?: HTMLInputElement): void;
  registerPopup(element?: HTMLElement): void;
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
}
const key = Symbol('SectileComboboxRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const ComboboxRoot = defineComponent({
  name: 'SectileComboboxRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly ComboboxItemDefinition<string>[]>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    inputValue: { type: String, default: undefined }, defaultInputValue: { type: String, default: '' },
    open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined },
    policies: { type: Object as PropType<ComboboxPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string | null): boolean => true,
    'update:inputValue': (_value: string): boolean => true,
    'update:open': (_value: boolean): boolean => true,
    highlight: (_value: string | null): boolean => true,
    accept: (_value: string): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: ComboboxRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const input = shallowRef<HTMLInputElement>(); const popup = shallowRef<HTMLElement>();
    const connection = shallowRef<ComboboxConnection<string>>();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localInput = shallowRef(props.inputValue ?? props.defaultInputValue); const localOpen = shallowRef(props.open ?? props.defaultOpen);
    const highlighted = shallowRef<string | null>(null);
    const controlled = { value: props.modelValue !== undefined, input: props.inputValue !== undefined, open: props.open !== undefined };
    const state = computed<ComboboxRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      inputValue: props.inputValue ?? localInput.value, highlightedValue: highlighted.value,
      open: props.open ?? localOpen.value, disabled: props.disabled, readonly: props.readonly,
    }));
    const refresh = (): void => {
      const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return;
      localValue.value = snapshot.selection.selected[0] ?? null; localInput.value = snapshot.text.snapshot.text;
      localOpen.value = snapshot.popupOpen; highlighted.value = snapshot.cursor.current; refreshItems();
    };
    const refreshItems = (): void => {
      if (popup.value === undefined || connection.value === undefined) return;
      popup.value.querySelectorAll<HTMLElement>('[data-sectile-combobox-id]').forEach((element) => {
        const id = element.dataset['sectileComboboxId']; if (id !== undefined) connection.value?.setItemAttributes(element, { id, disabled: element.dataset['disabled'] === 'true' });
      });
    };
    const connect = (): void => {
      connection.value?.disconnect(); if (input.value === undefined) return;
      connection.value = createCombobox({
        input: input.value, ...(popup.value === undefined ? {} : { popup: popup.value }), items: props.items,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(controlled.value ? { value: props.modelValue as string | null } : { defaultValue: localValue.value }),
        ...(controlled.input ? { inputState: createTextState(props.inputValue as string) } : { defaultInputState: createTextState(localInput.value) }),
        ...(controlled.open ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
        disabled: props.disabled, readOnly: props.readonly,
        onValueChange: ({ value }) => { localValue.value = value; emit('update:modelValue', value); },
        onInputStateChange: ({ value }) => { localInput.value = value.snapshot.text; emit('update:inputValue', value.snapshot.text); },
        onOpenChange: ({ value }) => { localOpen.value = value; emit('update:open', value); },
        onHighlightedValueChange: ({ value }) => { highlighted.value = value; emit('highlight', value); },
        onAccept: (id) => emit('accept', id), onUpdate: refresh,
      });
      connection.value.setInputAttributes(props.label); connection.value.setPopupAttributes(props.label); refreshItems(); refresh();
    };
    provide<Context>(key, {
      state, label: computed(() => props.label), connection: computed(() => connection.value),
      registerInput: (element) => { input.value = element; }, registerPopup: (element) => { popup.value = element; },
      registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, { id, disabled }),
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.items, () => props.disabled, () => props.readonly, () => props.label, () => props.policies], connect);
    watch([() => props.modelValue, () => props.inputValue, () => props.open], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({
        ...(controlled.value ? { value: props.modelValue as string | null } : {}),
        ...(controlled.input ? { inputState: createTextState(props.inputValue as string) } : {}),
        ...(controlled.open ? { open: props.open as boolean } : {}),
      });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, 'data-scope': 'combobox', 'data-part': 'root',
      'data-state': state.value.open ? 'open' : 'closed', 'data-disabled': props.disabled ? '' : undefined,
      'data-readonly': props.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const ComboboxInput = defineComponent({
  name: 'SectileComboboxInput', inheritAttrs: false,
  props: { name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs }) { const root = useRoot('ComboboxInput'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerInput(node instanceof HTMLInputElement ? node : undefined),
    type: 'text', role: 'combobox', value: root.state.value.inputValue, name: props.name, form: props.form, required: props.required,
    disabled: root.state.value.disabled, readonly: root.state.value.readonly, 'aria-label': root.label.value,
    'aria-autocomplete': 'list', 'aria-expanded': String(root.state.value.open), 'data-scope': 'combobox', 'data-part': 'input',
  })); },
});

export const ComboboxContent = defineComponent({
  name: 'SectileComboboxContent', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ComboboxRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('ComboboxContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerPopup(node instanceof HTMLElement ? node : undefined),
    role: 'listbox', hidden: !root.state.value.open, 'aria-label': root.label.value,
    'data-scope': 'combobox', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const ComboboxItem = defineComponent({
  name: 'SectileComboboxItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: ComboboxItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('ComboboxItem'); const state = computed<ComboboxItemSlotProps>(() => ({
      value: props.value, selected: root.state.value.value === props.value,
      highlighted: root.state.value.highlightedValue === props.value, disabled: root.state.value.disabled || props.disabled,
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerItem(node, props.value, state.value.disabled); },
      role: 'option', 'aria-selected': String(state.value.selected), 'aria-disabled': state.value.disabled ? 'true' : undefined,
      'data-sectile-combobox-id': props.value, 'data-disabled': state.value.disabled ? 'true' : undefined,
      'data-scope': 'combobox', 'data-part': 'item', 'data-selected': state.value.selected ? '' : undefined,
      'data-highlighted': state.value.highlighted ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const ComboboxEmpty = defineComponent({
  name: 'SectileComboboxEmpty', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: ComboboxRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('ComboboxEmpty'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, role: 'status', 'data-scope': 'combobox', 'data-part': 'empty',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside ComboboxRoot.`); return root; }
