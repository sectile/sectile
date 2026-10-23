import {
  computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createCombobox, type ComboboxConnection, type ComboboxItem as ComboboxItemDefinition, type ComboboxOptions, type ComboboxPolicies, type ComboboxPresentation, type ComboboxAnchor,
} from '@sectile/dom/combobox';
import type { DOMLayerPresentationSnapshot } from '@sectile/dom/dialog';
import type {
  PositionBoundary,
  PositionOptions,
  PositionPadding,
  PositionStrategy,
  PositionTracking,
} from '@sectile/dom/position';
import { createTextState, type TextState } from '@sectile/dom/text';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useFormControlFlags, useNativeInputFormControl } from './form/control.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { usePopupPresentation } from './internal/popup-presentation.js';
import { provideHostLayerParent } from './host-provider.js';
import { usePresence } from './presence/presence.js';
import {
  conditionalPresenceProps,
  useConditionalPresence,
  type ConditionalPresenceProps,
} from './presence/conditional-presence.js';

export interface ComboboxRootProps extends Omit<PositionOptions, 'arrowPadding'> {
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
  readonly position?: boolean;
  readonly anchor?: ComboboxAnchor;
  readonly presentation?: ComboboxPresentation;
  /** DOM option IDs; logical item values remain unchanged. */
  readonly itemId?: (id: string) => string;
  /** Currently rendered IDs; undefined preserves complete-list publication. */
  readonly renderedItems?: readonly string[] | undefined;
  readonly policies?: ComboboxPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ComboboxRootSlotProps { readonly value: string | null; readonly inputValue: string; readonly highlightedValue: string | null; readonly open: boolean; readonly disabled: boolean; readonly: boolean }
export interface ComboboxItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ComboboxItemSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface ComboboxResultsSlotProps extends ComboboxRootSlotProps { readonly items: readonly ComboboxItemDefinition<string>[]; readonly active: boolean }
export interface ComboboxPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ComboboxEmptyProps extends ComboboxPartProps, ConditionalPresenceProps {}

interface Context {
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly presentation: Readonly<ShallowRef<DOMLayerPresentationSnapshot | undefined>>;
  registerPresence(present: ShallowRef<boolean>): () => void;
  readonly state: ComputedRef<ComboboxRootSlotProps>;
  readonly position: ComputedRef<boolean>;
  readonly strategy: ComputedRef<PositionStrategy>;
  readonly label: ComputedRef<string | undefined>;
  readonly connection: ComputedRef<ComboboxConnection<string> | undefined>;
  readonly matchingItems: ComputedRef<readonly ComboboxItemDefinition<string>[]>;
  matchesItem(id: string): boolean;
  hasMatches(): boolean;
  registerInput(element?: HTMLInputElement | HTMLTextAreaElement, manageText?: boolean): void;
  registerPopup(element?: HTMLElement): void;
  registerItem(element: HTMLElement, id: string, disabled: boolean): void;
  setInputComposing(composing: boolean): void;
  reset(): void;
}
const key = Symbol('SectileComboboxRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const ComboboxRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileComboboxRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly ComboboxItemDefinition<string>[]>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    inputValue: { type: String, default: undefined }, defaultInputValue: { type: String, default: '' },
    open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined },
    position: { type: Boolean, default: true }, presentation: { type: String as PropType<ComboboxPresentation>, default: 'popup' },
    anchor: { type: String as PropType<ComboboxAnchor>, default: 'input' },
    itemId: Function as PropType<(id: string) => string>,
    renderedItems: { type: Array as PropType<readonly string[] | undefined>, default: undefined },
    side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom' },
    align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'start' },
    sideOffset: { type: Number, default: 8 }, collisionPadding: { type: [Number, Object] as PropType<PositionPadding>, default: 8 },
    collisionBoundary: { type: [String, Object] as PropType<PositionBoundary>, default: undefined }, avoidCollisions: { type: Boolean, default: true },
    hideWhenDetached: { type: Boolean, default: false }, strategy: { type: String as PropType<PositionStrategy>, default: 'absolute' },
    tracking: { type: String as PropType<PositionTracking>, default: 'events' },
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
    const flags = useFormControlFlags(props);
    const input = shallowRef<HTMLInputElement | HTMLTextAreaElement>(); const popup = shallowRef<HTMLElement>();
    let manageText = true;
    const connection = shallowRef<ComboboxConnection<string>>();
    const matchingText = shallowRef<TextState>();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const localInput = shallowRef(props.inputValue ?? props.defaultInputValue); const localOpen = shallowRef(props.open ?? props.defaultOpen);
    const initialValue = localValue.value, initialInput = localInput.value, initialOpen = localOpen.value;
    const highlighted = shallowRef<string | null>(null);
    const inline = shallowRef(props.presentation === 'inline');
    let proposedInputState: TextState | null = null;
    const livePolicies = {} as ComboboxPolicies<string>;
    Object.defineProperties(livePolicies, {
      matches: { get: () => props.policies?.matches },
      eligible: { get: () => props.policies?.eligible },
      boundary: { get: () => props.policies?.boundary },
    });
    const controlled = {
      value: useControlledStateInvariant('ComboboxRoot', 'modelValue', () => props.modelValue),
      input: useControlledStateInvariant('ComboboxRoot', 'inputValue', () => props.inputValue),
      open: useControlledStateInvariant('ComboboxRoot', 'open', () => props.open),
    };
    const state = computed<ComboboxRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      inputValue: props.inputValue ?? localInput.value, highlightedValue: highlighted.value,
      open: props.open ?? localOpen.value, disabled: flags.value.disabled, readonly: flags.value.readonly,
    }));
    const lifecycle = usePopupPresentation({ connection, open: computed(() => state.value.open), connect: () => connect(), refresh: () => refresh(), trackLayerHost: true });
    const itemLabels = computed(() => new Map(props.items.map((item) => [item.id, item.label] as const)));
    const renderedItems = computed<ReadonlySet<string> | undefined>(() => {
      const ids = props.renderedItems;
      if (ids === undefined) return undefined;
      if (!Array.isArray(ids)) throw new TypeError('ComboboxRoot renderedItems requires an array of IDs');
      const rendered = new Set<string>();
      if (ids.length !== 0) {
        const domain = itemLabels.value;
        for (const id of ids) if (domain.has(id)) rendered.add(id);
      }
      return rendered;
    });
    const matchingQuery = computed(() => {
      const text = matchingText.value;
      return text === undefined
        ? state.value.inputValue
        : text.composition === null
          ? text.snapshot.text
          : text.composition.baseline.text;
    });
    const matchesItem = (id: string): boolean => {
      const label = itemLabels.value.get(id);
      if (label === undefined) return false;
      const matches = props.policies?.matches;
      return matches === undefined || matches(label, matchingQuery.value, id);
    };
    const hasMatches = (): boolean => {
      for (const item of props.items) {
        if (matchesItem(item.id)) return true;
      }
      return false;
    };
    const matchingItems = computed<readonly ComboboxItemDefinition<string>[]>(() => props.policies?.matches === undefined
      ? props.items
      : Object.freeze(props.items.filter(item => matchesItem(item.id))));
    const refresh = (): void => {
      const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return;
      matchingText.value = snapshot.text;
      localValue.value = snapshot.selection.selected[0] ?? null; localInput.value = snapshot.text.snapshot.text;
      localOpen.value = snapshot.popupOpen; highlighted.value = snapshot.cursor.current;
      lifecycle.update();
      if (!connection.value!.getActive()) {
        inputComposing = false;
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        if (reconnectPending) { reconnectPending = false; lifecycle.invalidate(); }
      }
      refreshItems();
    };
    const refreshItems = (): void => {
      if (popup.value === undefined || connection.value === undefined) return;
      popup.value.querySelectorAll<HTMLElement>('[data-sectile-combobox-id]').forEach((element) => {
        const id = element.dataset['sectileComboboxId']; if (id !== undefined) connection.value?.setItemAttributes(element, { id, disabled: element.dataset['disabled'] === 'true' });
      });
    };
    let mounted = false;
    let inputComposing = false;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const connect = (): void => {
      if (manageText && connection.value && (proposedInputState ?? connection.value.getSnapshot().state.text).composition !== null) {
        connection.value.handleEvent({ type: 'text', event: { type: 'composition-commit' } });
      }
      const previousText = connection.value?.getSnapshot().state.text;
      disconnect(); if (input.value === undefined) return;
      const items = props.items.map((item) => item.id);
      const requestedValue = controlled.value ? props.modelValue as string | null : localValue.value;
      const reconciled = reconcileCollectionState(
        items,
        requestedValue === null ? [] : [requestedValue],
        highlighted.value,
        [],
        'single',
        { preserveNullCurrent: true },
      );
      const value = reconciled.selected[0] ?? null;
      const inputState = controlled.input
        ? proposedInputState !== null
          ? proposedInputState
          : previousText !== undefined && previousText.snapshot.text === props.inputValue
            ? previousText
            : createTextState(props.inputValue as string)
        : previousText ?? createTextState(localInput.value);
      localValue.value = value;
      highlighted.value = reconciled.current;
      if (controlled.value && requestedValue !== value) emit('update:modelValue', value);
      connection.value = createCombobox({
        ...(lifecycle.layerHost.value === undefined ? {} : { layerHost: lifecycle.layerHost.value }),
        input: input.value, ...(popup.value === undefined ? {} : { popup: popup.value }), items: props.items,
        manageVisibility: false,
        manageText,
        isInputComposing: () => inputComposing,
        policies: livePolicies,
        ...(controlled.value ? { value } : { defaultValue: value }),
        defaultHighlightedValue: reconciled.current,
        ...(controlled.input ? { inputState } : { defaultInputState: inputState }),
        ...(controlled.open ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
        disabled: flags.value.disabled, readOnly: flags.value.readonly,
        presentation: props.presentation, position: props.position, anchor: props.anchor, side: props.side, align: props.align, sideOffset: props.sideOffset,
        ...(props.itemId === undefined ? {} : { getItemElementID: props.itemId }),
        isItemRendered: id => renderedItems.value?.has(id) ?? true,
        collisionPadding: props.collisionPadding,
        ...(props.collisionBoundary === undefined ? {} : { collisionBoundary: props.collisionBoundary }),
        avoidCollisions: props.avoidCollisions, hideWhenDetached: props.hideWhenDetached,
        strategy: props.strategy, tracking: props.tracking,
        onValueChange: ({ value }) => { localValue.value = value; emit('update:modelValue', value); },
        onInputStateChange: ({ value }) => {
          proposedInputState = value;
          matchingText.value = value;
          localInput.value = value.snapshot.text;
          emit('update:inputValue', value.snapshot.text);
          if (!controlled.input || value.composition !== null) return;
          const proposal = value;
          void nextTick(() => {
            if (connection.value === undefined || proposedInputState !== proposal) return;
            proposedInputState = null;
            const text = props.inputValue as string;
            syncControlledValues(proposal.snapshot.text === text ? proposal : createTextState(text));
          });
        },
        onOpenChange: ({ value }) => { if (!controlled.open) localOpen.value = value; emit('update:open', value); },
        onHighlightedValueChange: ({ value }) => { highlighted.value = value; emit('highlight', value); },
        onAccept: (id) => emit('accept', id), onUpdate: refresh,
      });
      inline.value = props.presentation === 'inline';
      connection.value.setInputAttributes(props.label ?? (!manageText ? input.value.getAttribute('aria-label') ?? undefined : undefined));
      connection.value.setPopupAttributes(props.label); refreshItems(); refresh();
    };
    const disconnect = (): void => {
      lifecycle.release();
      try { connection.value?.disconnect(); } finally { connection.value = undefined; }
    };
    const requestConnect = (): void => {
      if (!lifecycle.availability.value) { lifecycle.invalidate(); return; }
      if (inputComposing || reconnectPending) {
        reconnectPending = true;
        return;
      }
      lifecycle.reconnect();
    };
    const setInputComposing = (composing: boolean): void => {
      inputComposing = composing;
      if (composing || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || inputComposing) return;
        reconnectPending = false;
        lifecycle.reconnect();
      }, 0);
    };
    let connectScheduled = false;
    const scheduleConnect = (): void => {
      if (!mounted || connectScheduled) return;
      connectScheduled = true;
      void nextTick(() => {
        connectScheduled = false;
        if (mounted) lifecycle.reconnect();
      });
    };
    provide<Context>(key, {
      reset: () => {
        queueMicrotask(() => {
          if (!mounted) return;
          if (reconnectTimer !== null) clearTimeout(reconnectTimer);
          reconnectTimer = null; reconnectPending = false; inputComposing = false; proposedInputState = null;
          disconnect();
          localValue.value = controlled.value ? props.modelValue as string | null : initialValue;
          localInput.value = controlled.input ? props.inputValue as string : initialInput;
          localOpen.value = controlled.open ? props.open as boolean : initialOpen;
          highlighted.value = null; matchingText.value = undefined;
          lifecycle.reconnect();
        });
      },
      state, active: lifecycle.active, presentation: lifecycle.presentation, registerPresence: lifecycle.registerPresence,
      position: computed(() => !inline.value && props.position), strategy: computed(() => props.strategy),
      label: computed(() => props.label), connection: computed(() => connection.value),
      matchesItem, hasMatches, matchingItems,
      registerInput: (element, ownsText = true) => {
        const changed = input.value !== element || manageText !== ownsText;
        if (input.value !== element) {
          inputComposing = false; reconnectPending = false;
          if (reconnectTimer !== null) clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        input.value = element; manageText = ownsText; if (changed) scheduleConnect();
      }, registerPopup: (element) => { const changed = popup.value !== element; popup.value = element; if (changed) scheduleConnect(); },
      registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, { id, disabled }),
      setInputComposing,
    });
    onMounted(() => { mounted = true; lifecycle.reconnect(); });
    onBeforeUnmount(() => {
      mounted = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      disconnect();
      proposedInputState = null;
    });
    watch(() => props.items, (items, previousItems) => {
      if (!sameComboboxItems(items, previousItems)) requestConnect();
    });
    watch([() => flags.value.disabled, () => flags.value.readonly, () => props.label, () => props.position, () => props.presentation, () => props.anchor, () => props.itemId, () => props.side, () => props.align, () => props.sideOffset, () => props.collisionPadding, () => props.collisionBoundary, () => props.avoidCollisions, () => props.hideWhenDetached, () => props.strategy, () => props.tracking], requestConnect);
    watch(renderedItems, () => {
      if (connection.value?.getActive()) connection.value.setInputAttributes(props.label);
    }, { flush: 'post' });
    watch([() => props.modelValue, () => props.inputValue, () => props.open], () => {
      const inputState = controlled.input
        && proposedInputState !== null
        && proposedInputState.snapshot.text === props.inputValue
        ? proposedInputState
        : controlled.input
          ? createTextState(props.inputValue as string)
          : undefined;
      proposedInputState = null;
      syncControlledValues(inputState);
    });
    const syncControlledValues = (inputState?: TextState): void => {
      lifecycle.prepareModelUpdate();
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({
        ...(controlled.value ? { value: props.modelValue as string | null } : {}),
        ...(controlled.input ? { inputState: inputState ?? createTextState(props.inputValue as string) } : {}),
        ...(controlled.open ? { open: props.open as boolean } : {}),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      refresh();
    };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, 'data-scope': 'combobox', 'data-part': 'root',
      'data-state': state.value.open ? 'open' : 'closed', 'data-disabled': flags.value.disabled ? '' : undefined,
      'data-readonly': flags.value.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type ComboboxValueChangeHandler = (value: string | null) => void;
export type ComboboxInputValueChangeHandler = (value: string) => void;
export type ComboboxOpenChangeHandler = (value: boolean) => void;
export type ComboboxHighlightHandler = (value: string | null) => void;
export type ComboboxAcceptHandler = (value: string) => void;

export const ComboboxResults = /* @__PURE__ */ defineComponent({
  name: 'SectileComboboxResults', inheritAttrs: false,
  slots: Object as SlotsType<{ default: (props: ComboboxResultsSlotProps) => VNodeChild }>,
  setup(_props, { slots }) {
    const root = useRoot('ComboboxResults');
    return (): VNodeChild => slots['default']?.({ ...root.state.value, items: root.matchingItems.value, active: root.active.value });
  },
});

/** Adopt an existing native editor without owning its value, selection or Form registration. */
export const ComboboxEditor = /* @__PURE__ */ defineComponent({
  name: 'SectileComboboxEditor', inheritAttrs: false,
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(_props, { attrs, slots }) {
    const root = useRoot('ComboboxEditor');
    const registerEditor = (node: unknown): void => {
      const element = node instanceof HTMLInputElement
        || typeof HTMLTextAreaElement !== 'undefined' && node instanceof HTMLTextAreaElement ? node : undefined;
      root.registerInput(element, false);
    };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      asChild: true, elementRef: registerEditor, role: 'combobox',
      ...(root.label.value === undefined ? {} : { 'aria-label': root.label.value }),
      'aria-autocomplete': 'list', 'aria-expanded': String(root.state.value.open),
      onCompositionstart: () => { if (root.active.value) root.setInputComposing(true); },
      onCompositionend: () => { if (root.active.value) root.setInputComposing(false); },
      'data-scope': 'combobox', 'data-part': 'input',
    }), slots);
  },
});

export const ComboboxInput = /* @__PURE__ */ defineComponent({
  name: 'SectileComboboxInput', inheritAttrs: false,
  props: { name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs }) {
    const root = useRoot('ComboboxInput');
    const input = shallowRef<HTMLInputElement | null>(null);
    const participation = useNativeInputFormControl(input, { reset: root.reset });
    const renderServerValue = typeof window === 'undefined';
    const registerInput = (node: unknown): void => {
      input.value = node instanceof HTMLInputElement ? node : null;
      root.registerInput(input.value ?? undefined);
    };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: registerInput,
      type: 'text', role: 'combobox',
      ...(renderServerValue ? { value: root.state.value.inputValue } : {}),
      name: props.name, form: props.form, required: props.required,
      disabled: root.state.value.disabled, readonly: root.state.value.readonly, 'aria-label': root.label.value,
      'aria-autocomplete': 'list', 'aria-expanded': String(root.state.value.open),
      onCompositionstart: () => { if (root.active.value) root.setInputComposing(true); },
      onCompositionend: () => { if (root.active.value) root.setInputComposing(false); },
      'data-scope': 'combobox', 'data-part': 'input',
    }, participation.controlProps.value));
  },
});

export const ComboboxContent = /* @__PURE__ */ defineComponent({
  name: 'SectileComboboxContent', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ComboboxRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('ComboboxContent');
    const element = shallowRef<HTMLElement>();
    const open = computed(() => root.state.value.open);
    provideHostLayerParent({ active: root.active, open, element, presentation: root.presentation });
    const present = usePresence(open, element, undefined, root.active);
    onBeforeUnmount(root.registerPresence(present));
    watch(present, async () => { await nextTick(); root.connection.value?.render(); }, { flush: 'post' });
    const registerContent = (node: unknown): void => { const content = node instanceof HTMLElement ? node : undefined; element.value = content; root.registerPopup(content); };
    return (): VNodeChild => {
      const exiting = !open.value && present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: registerContent,
        role: 'listbox', hidden: !root.active.value || !present.value, 'aria-label': root.label.value,
        ...(exiting || !root.active.value ? { inert: true, 'aria-hidden': 'true' } : {}),
        style: root.position.value
          ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined }
          : undefined,
        'data-scope': 'combobox', 'data-part': 'content', 'data-state': open.value ? 'open' : 'closed',
      }), { default: () => slots['default']?.(root.state.value) });
    };
  },
});

export const ComboboxItem = /* @__PURE__ */ (() => defineComponent({
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
      role: 'option', hidden: !root.matchesItem(props.value),
      'aria-selected': String(state.value.selected), 'aria-disabled': state.value.disabled ? 'true' : undefined,
      'data-sectile-combobox-id': props.value, 'data-disabled': state.value.disabled ? 'true' : undefined,
      'data-scope': 'combobox', 'data-part': 'item', 'data-selected': state.value.selected ? '' : undefined,
      'data-highlighted': state.value.highlighted ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
}))();

export const ComboboxEmpty = /* @__PURE__ */ (() => defineComponent({
  name: 'SectileComboboxEmpty', inheritAttrs: false, props: { ...partProps, ...conditionalPresenceProps },
  slots: Object as SlotsType<{ default: (props: ComboboxRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('ComboboxEmpty');
    const active = computed(() => !root.hasMatches());
    const forcePresent = computed(() => props.forcePresent);
    const presence = useConditionalPresence(active, forcePresent);
    return (): VNodeChild => {
      const inactivePresent = !active.value && presence.present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: presence.register,
        role: active.value ? 'status' : undefined,
        'aria-live': active.value ? undefined : 'off',
        hidden: presence.hidden.value,
        ...(inactivePresent ? { inert: true, 'aria-hidden': 'true' } : {}),
        'data-scope': 'combobox',
        'data-part': 'empty',
        'data-state': active.value ? 'visible' : 'hidden',
      }), { default: () => slots['default']?.(root.state.value) });
    };
  },
}))();

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside ComboboxRoot.`); return root; }

function sameComboboxItems(
  items: readonly ComboboxItemDefinition<string>[],
  previousItems: readonly ComboboxItemDefinition<string>[],
): boolean {
  return items.length === previousItems.length
    && items.every((item, index) => {
      const previousItem = previousItems[index];
      return previousItem !== undefined
        && item.id === previousItem.id
        && item.label === previousItem.label;
    });
}
