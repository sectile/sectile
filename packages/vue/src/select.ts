import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide, ref,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createSelect, type SelectConnection, type SelectPolicies } from '@sectile/dom/select';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { hiddenSelectSubmissionCapabilities, useCompositeFormControl } from './internal/form-control.js';

export interface SelectRootProps {
  readonly items: readonly string[];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly textValue?: (id: string) => string;
  readonly policies?: SelectPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type SelectTextValueResolver = NonNullable<SelectRootProps['textValue']>;
export interface SelectRootSlotProps { readonly value: string | null; readonly highlightedValue: string | null; readonly open: boolean; readonly disabled: boolean; readonly: boolean }
export interface SelectItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface SelectItemSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface SelectPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface RootContext {
  readonly state: ComputedRef<SelectRootSlotProps>;
  readonly label: ComputedRef<string | undefined>;
  readonly textValue: ComputedRef<(id: string) => string>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  registerTrigger(element?: HTMLButtonElement): void;
  registerPopup(element?: HTMLElement): void;
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
}
interface ItemContext { readonly state: ComputedRef<SelectItemSlotProps> }
const rootKey = Symbol('SectileSelectRoot'); const itemKey = Symbol('SectileSelectItem');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const SelectRoot = defineComponent({
  name: 'SectileSelectRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true }, modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: null }, open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false }, label: { type: String, default: undefined }, name: { type: String, default: undefined },
    form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    textValue: { type: Function as PropType<SelectTextValueResolver>, default: undefined },
    policies: { type: Object as PropType<SelectPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string | null): boolean => true,
    'update:open': (_value: boolean): boolean => true,
    highlight: (_value: string | null): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: SelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>();
    const trigger = shallowRef<HTMLButtonElement>();
    const popup = shallowRef<HTMLElement>();
    const submissionElement = ref<HTMLSelectElement | null>(null);
    const participation = useCompositeFormControl({
      root: () => root.value ?? null,
      focusTarget: () => trigger.value ?? root.value ?? null,
      submissions: [{ element: submissionElement, capabilities: hiddenSelectSubmissionCapabilities }],
    });
    const connection = shallowRef<SelectConnection<string>>();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localOpen = shallowRef(props.open ?? props.defaultOpen); const highlighted = shallowRef<string | null>(localValue.value);
    const valueControlled = props.modelValue !== undefined; const openControlled = props.open !== undefined;
    const state = computed<SelectRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      highlightedValue: highlighted.value, open: props.open ?? localOpen.value,
      disabled: props.disabled, readonly: props.readonly,
    }));
    const refresh = (): void => {
      const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return;
      localValue.value = snapshot.choice.selection.selected[0] ?? null; highlighted.value = snapshot.choice.cursor.current; localOpen.value = snapshot.open;
      refreshItems();
    };
    const refreshItems = (): void => {
      if (popup.value === undefined || connection.value === undefined) return;
      popup.value.querySelectorAll<HTMLElement>('[data-sectile-select-id]').forEach((element) => {
        const id = element.dataset['sectileSelectId']; if (id !== undefined) connection.value?.setItemAttributes(element, id, props.disabledItems.includes(id));
      });
    };
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === undefined || trigger.value === undefined || popup.value === undefined) return;
      connection.value = createSelect({
        root: root.value, trigger: trigger.value, popup: popup.value, items: props.items, disabledItems: props.disabledItems,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(valueControlled ? { value: props.modelValue as string | null } : { defaultValue: localValue.value }),
        ...(openControlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
        disabled: props.disabled, readOnly: props.readonly, ...(props.label === undefined ? {} : { label: props.label }),
        onValueChange: (next) => { localValue.value = next; emit('update:modelValue', next); },
        onHighlightedValueChange: (next) => { highlighted.value = next; emit('highlight', next); },
        onOpenChange: (next) => { localOpen.value = next; emit('update:open', next); }, onUpdate: refresh,
      });
      refreshItems(); refresh();
    };
    provide<RootContext>(rootKey, {
      state, label: computed(() => props.label), textValue: computed(() => props.textValue ?? ((id: string) => id)),
      disabledItems: computed(() => new Set(props.disabledItems)),
      registerTrigger: (element) => { trigger.value = element; }, registerPopup: (element) => { popup.value = element; },
      registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, id, disabled),
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.label, () => props.policies], connect);
    watch([() => props.modelValue, () => props.open], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({
        ...(valueControlled ? { value: props.modelValue as string | null } : {}),
        ...(openControlled ? { open: props.open as boolean } : {}),
      });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
        'data-scope': 'select', 'data-part': 'root', 'data-state': state.value.open ? 'open' : 'closed',
      }, participation.controlProps.value), { default: () => slots['default']?.(state.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined && !props.required) return visual;
      return [visual, h('select', {
        ref: submissionElement,
        name: props.name, form: props.form, required: props.required, disabled: props.disabled,
        value: state.value.value ?? '', tabindex: -1, 'aria-hidden': 'true', style: visuallyHiddenInputStyle,
      }, [h('option', { value: '' }), ...props.items.map((id) => h('option', { value: id, disabled: props.disabledItems.includes(id) }, props.textValue?.(id) ?? id))])];
    };
  },
});

export type SelectValueChangeHandler = (value: string | null) => void;
export type SelectOpenChangeHandler = (value: boolean) => void;
export type SelectHighlightHandler = (value: string | null) => void;

export const SelectTrigger = defineComponent({
  name: 'SectileSelectTrigger', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: SelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('SelectTrigger'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerTrigger(node instanceof HTMLButtonElement ? node : undefined),
    type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled,
    'aria-haspopup': 'listbox', 'aria-expanded': String(root.state.value.open), 'aria-label': root.label.value,
    'data-scope': 'select', 'data-part': 'trigger', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const SelectValue = defineComponent({
  name: 'SectileSelectValue', inheritAttrs: false, props: { placeholder: { type: String, default: '' }, ...partProps },
  slots: Object as SlotsType<{ default: (props: SelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('SelectValue'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, 'data-scope': 'select', 'data-part': 'value',
    'data-placeholder': root.state.value.value === null ? '' : undefined,
  }), { default: () => slots['default']?.(root.state.value) ?? (root.state.value.value === null ? props.placeholder : root.textValue.value(root.state.value.value)) }); },
});

export const SelectContent = defineComponent({
  name: 'SectileSelectContent', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: SelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('SelectContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerPopup(node instanceof HTMLElement ? node : undefined),
    role: 'listbox', hidden: !root.state.value.open, 'aria-label': root.label.value,
    'data-scope': 'select', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const SelectItem = defineComponent({
  name: 'SectileSelectItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: SelectItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('SelectItem'); const state = computed<SelectItemSlotProps>(() => ({
      value: props.value, selected: root.state.value.value === props.value, highlighted: root.state.value.highlightedValue === props.value,
      disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value),
    }));
    provide<ItemContext>(itemKey, { state });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerItem(node, props.value, state.value.disabled); },
      role: 'option', 'aria-selected': String(state.value.selected), 'aria-disabled': state.value.disabled ? 'true' : undefined,
      'data-sectile-select-id': props.value, 'data-scope': 'select', 'data-part': 'item',
      'data-selected': state.value.selected ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const SelectItemIndicator = defineComponent({
  name: 'SectileSelectItemIndicator', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: SelectItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const item = useItem('SelectItemIndicator'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, hidden: !item.state.value.selected, 'aria-hidden': 'true', 'data-scope': 'select', 'data-part': 'item-indicator',
  }), { default: () => slots['default']?.(item.state.value) }); },
});

function useRoot(part: string): RootContext { const root = inject<RootContext>(rootKey); if (root === undefined) throw new TypeError(`${part} must be used inside SelectRoot.`); return root; }
function useItem(part: string): ItemContext { const item = inject<ItemContext>(itemKey); if (item === undefined) throw new TypeError(`${part} must be used inside SelectItem.`); return item; }
