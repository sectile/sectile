import {
  Teleport, computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide, ref,
  shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createSelect, type SelectConnection, type SelectPolicies } from '@sectile/dom/select';
import type {
  PositionBoundary,
  PositionOptions,
  PositionPadding,
  PositionStrategy,
  PositionTracking,
} from '@sectile/dom/position';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { hiddenSelectSubmissionCapabilities, useCompositeFormControl } from './internal/form-control.js';
import { useHostId, useHostPortalTarget } from './host-provider.js';
import { usePresence } from './internal/presence.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface SelectRootProps extends Omit<PositionOptions, 'arrowPadding'> {
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
  readonly typeaheadTimeoutMs?: number;
  readonly position?: boolean;
  readonly unmountOnExit?: boolean;
  readonly policies?: SelectPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type SelectTextValueResolver = NonNullable<SelectRootProps['textValue']>;
export interface SelectRootSlotProps { readonly value: string | null; readonly highlightedValue: string | null; readonly open: boolean; readonly disabled: boolean; readonly: boolean }
export interface SelectItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface SelectItemSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface SelectPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface SelectPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean; readonly defer?: boolean }

interface RootContext {
  readonly state: ComputedRef<SelectRootSlotProps>;
  readonly unmountOnExit: ComputedRef<boolean>;
  readonly position: ComputedRef<boolean>;
  readonly strategy: ComputedRef<PositionStrategy>;
  readonly label: ComputedRef<string | undefined>;
  readonly textValue: ComputedRef<(id: string) => string>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly contentID: string;
  itemID(id: string): string;
  registerTrigger(element?: HTMLButtonElement): void;
  registerPopup(element?: HTMLElement): void;
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
  activateTrigger(event?: Event): void;
  refresh(): void;
}
interface ItemContext { readonly state: ComputedRef<SelectItemSlotProps> }
const rootKey = Symbol('SectileSelectRoot'); const itemKey = Symbol('SectileSelectItem');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const SelectRoot = defineComponent({
  name: 'SectileSelectRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true }, modelValue: { type: String as PropType<string | null>, default: undefined },
    defaultValue: { type: String as PropType<string | null>, default: null }, open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false }, label: { type: String, default: undefined }, name: { type: String, default: undefined },
    form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    textValue: { type: Function as PropType<SelectTextValueResolver>, default: undefined },
    typeaheadTimeoutMs: { type: Number, default: 700 },
    position: { type: Boolean, default: true },
    side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom' },
    align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'start' },
    sideOffset: { type: Number, default: 8 }, collisionPadding: { type: [Number, Object] as PropType<PositionPadding>, default: 8 },
    collisionBoundary: { type: [String, Object] as PropType<PositionBoundary>, default: undefined }, avoidCollisions: { type: Boolean, default: true },
    hideWhenDetached: { type: Boolean, default: true }, strategy: { type: String as PropType<PositionStrategy>, default: 'absolute' },
    tracking: { type: String as PropType<PositionTracking>, default: 'events' },
    unmountOnExit: { type: Boolean, default: false },
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
    const id = useHostId(); const contentID = `sectile-select-${id}-content`; const itemID = (value: string): string => `${contentID}-item-${encodeURIComponent(value)}`;
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localOpen = shallowRef(props.open ?? props.defaultOpen); const highlighted = shallowRef<string | null>(localValue.value);
    const valueControlled = useControlledStateInvariant('SelectRoot', 'modelValue', () => props.modelValue);
    const openControlled = useControlledStateInvariant('SelectRoot', 'open', () => props.open);
    const unmountOnExit = computed(() => props.unmountOnExit);
    const position = computed(() => props.position);
    const strategy = computed(() => props.strategy);
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
      const requestedValue = valueControlled ? props.modelValue as string | null : localValue.value;
      const reconciled = reconcileCollectionState(
        props.items,
        requestedValue === null ? [] : [requestedValue],
        highlighted.value,
        props.disabledItems,
        'single',
        { preserveNullCurrent: true },
      );
      const value = reconciled.selected[0] ?? null;
      localValue.value = value;
      highlighted.value = reconciled.current;
      if (valueControlled && requestedValue !== value) emit('update:modelValue', value);
      connection.value = createSelect({
        root: root.value, trigger: trigger.value, popup: popup.value, items: props.items, disabledItems: props.disabledItems,
        textValue: props.textValue ?? ((value: string) => value), typeaheadTimeoutMs: props.typeaheadTimeoutMs,
        position: props.position, side: props.side, align: props.align, sideOffset: props.sideOffset, collisionPadding: props.collisionPadding,
        ...(props.collisionBoundary === undefined ? {} : { collisionBoundary: props.collisionBoundary }), avoidCollisions: props.avoidCollisions,
        hideWhenDetached: props.hideWhenDetached, strategy: props.strategy,
        tracking: props.tracking,
        manageVisibility: false,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(valueControlled ? { value } : { defaultValue: value }),
        defaultHighlightedValue: reconciled.current,
        ...(openControlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
        disabled: props.disabled, readOnly: props.readonly, ...(props.label === undefined ? {} : { label: props.label }),
        onValueChange: (next) => { localValue.value = next; emit('update:modelValue', next); },
        onHighlightedValueChange: (next) => { highlighted.value = next; emit('highlight', next); },
        onOpenChange: (next) => { localOpen.value = next; emit('update:open', next); }, onUpdate: refresh,
      });
      refreshItems(); refresh();
    };
    let mounted = false;
    let connectScheduled = false;
    const scheduleConnect = (): void => {
      if (!mounted || connectScheduled || (props.unmountOnExit && !state.value.open)) return;
      connectScheduled = true;
      void nextTick(() => {
        connectScheduled = false;
        if (mounted) connect();
      });
    };
    provide<RootContext>(rootKey, {
      state, unmountOnExit, position, strategy, label: computed(() => props.label), textValue: computed(() => props.textValue ?? ((id: string) => id)), contentID, itemID,
      disabledItems: computed(() => new Set(props.disabledItems)),
      registerTrigger: (element) => {
        trigger.value = element;
        if (element === undefined) {
          connection.value?.disconnect();
          connection.value = undefined;
        } else scheduleConnect();
      },
      registerPopup: (element) => {
        popup.value = element;
        if (element === undefined) {
          connection.value?.disconnect();
          connection.value = undefined;
        } else scheduleConnect();
      },
      registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, id, disabled),
      activateTrigger: (event) => {
        if (event?.defaultPrevented === true || connection.value !== undefined || props.disabled || state.value.open) return;
        if (!openControlled) localOpen.value = true;
        emit('update:open', true);
      },
      refresh: () => connection.value?.refresh(),
    });
    onMounted(() => { mounted = true; connect(); });
    onBeforeUnmount(() => { mounted = false; connection.value?.disconnect(); });
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.label, () => props.textValue, () => props.typeaheadTimeoutMs, () => props.position, () => props.side, () => props.align, () => props.sideOffset, () => props.collisionPadding, () => props.collisionBoundary, () => props.avoidCollisions, () => props.hideWhenDetached, () => props.strategy, () => props.tracking, () => props.policies], connect);
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
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; scheduleConnect(); },
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
    onClick: root.activateTrigger,
    type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled,
    'aria-haspopup': 'listbox', 'aria-expanded': String(root.state.value.open), 'aria-controls': root.contentID, 'aria-label': root.label.value,
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
  setup(props, { attrs, slots }) { const root = useRoot('SelectContent'); const element = shallowRef<HTMLElement>(); const open = computed(() => root.state.value.open); const present = usePresence(open, element); watch(present, () => root.refresh()); return (): VNodeChild => {
    if (root.unmountOnExit.value && !present.value) return null;
    return h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { const content = node instanceof HTMLElement ? node : undefined; element.value = content; root.registerPopup(content); },
      id: root.contentID, role: 'listbox', hidden: !present.value, 'aria-label': root.label.value,
      style: root.position.value
        ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined }
        : undefined,
      'aria-activedescendant': root.state.value.highlightedValue === null ? undefined : root.itemID(root.state.value.highlightedValue),
      'data-scope': 'select', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
    }), { default: () => slots['default']?.(root.state.value) });
  }; },
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
      id: root.itemID(props.value), role: 'option', 'aria-selected': String(state.value.selected), 'aria-disabled': state.value.disabled ? 'true' : undefined,
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

export const SelectViewport = defineComponent({
  name: 'SectileSelectViewport', inheritAttrs: false, props: { ...partProps, as: { ...partProps.as, default: 'div' } },
  setup(props, { attrs, slots }) { useRoot('SelectViewport'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'select', 'data-part': 'viewport' }), slots); },
});

export const SelectItemText = defineComponent({
  name: 'SectileSelectItemText', inheritAttrs: false, props: partProps,
  setup(props, { attrs, slots }) { useItem('SelectItemText'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'select', 'data-part': 'item-text' }), slots); },
});

export const SelectPortal = defineComponent({
  name: 'SectileSelectPortal',
  inheritAttrs: false,
  props: {
    to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
    disabled: { type: Boolean, default: false },
    defer: { type: Boolean, default: false },
  },
  setup(props, { slots }) { useRoot('SelectPortal'); const portalTarget = useHostPortalTarget(); return (): VNodeChild => h(Teleport as Component, { to: props.to ?? portalTarget.value ?? 'body', disabled: props.disabled, defer: props.defer }, slots['default']?.()); },
});

function useRoot(part: string): RootContext { const root = inject<RootContext>(rootKey); if (root === undefined) throw new TypeError(`${part} must be used inside SelectRoot.`); return root; }
function useItem(part: string): ItemContext { const item = inject<ItemContext>(itemKey); if (item === undefined) throw new TypeError(`${part} must be used inside SelectItem.`); return item; }
