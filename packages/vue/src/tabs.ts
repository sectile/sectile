import {
  computed, defineComponent, h, mergeProps, nextTick, provide, shallowRef, watch,
  type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  getTabsContentAttributes,
  getTabsListAttributes,
  getTabsRootAttributes,
  getTabsTriggerAttributes,
} from '@sectile/dom/tabs';
import { createListboxControllerFromItems, type ListboxController, type ListboxEffect } from '@sectile/dom/listbox';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { usePartContract } from './internal/part-contract.js';
import {
  tabsRootContextKey,
  useTabsRootContext,
  type TabsIDs,
  type TabsRootContext,
} from './internal/tabs-context.js';
import { useHostDirection, useHostId } from './host-provider.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export type TabsActivationMode = 'automatic' | 'manual';
export interface TabsRootProps {
  readonly items: readonly string[];
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly activationMode?: TabsActivationMode;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface TabsRootSlotProps { readonly value: string; readonly highlightedValue: string | null; readonly disabled: boolean; readonly: boolean }
export interface TabsListProps { readonly label?: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TabsTriggerProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TabsTriggerSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface TabsContentProps { readonly value: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TabsContentSlotProps { readonly value: string; readonly selected: boolean }
export interface TabsIndicatorProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

export const TabsRoot = defineComponent({
  name: 'SectileTabsRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    activationMode: { type: String as PropType<TabsActivationMode>, default: 'automatic' },
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
    const controlled = useControlledStateInvariant('TabsRoot', 'modelValue', () => props.modelValue);
    const instanceID = useHostId();
    const direction = useHostDirection();
    const rootElement = shallowRef<HTMLElement | null>(null);
    const idMap = new Map<string, TabsIDs>();
    const ids = (value: string): TabsIDs => {
      const found = idMap.get(value);
      if (found !== undefined) return found;
      const safe = encodeURIComponent(value).replaceAll('%', '-');
      const created = Object.freeze({ trigger: `sectile-tabs-${instanceID}-${safe}-trigger`, content: `sectile-tabs-${instanceID}-${safe}-content` });
      idMap.set(value, created);
      return created;
    };
    const makeController = (value: string, highlightedValue = value || null): ListboxController<string> => {
      const selected = value === '' ? [] : [value];
      const result = createListboxControllerFromItems({
        items: props.items,
        selectionMode: 'single',
        disabledItems: props.disabledItems,
        disabled: props.disabled,
        readOnly: props.readonly,
        orientation: props.orientation,
        direction: direction.value,
        policies: { selectionFollowsFocus: props.activationMode === 'automatic' },
        ...(controlled ? { value: selected } : { defaultValue: selected }),
        defaultHighlightedValue: highlightedValue ?? props.items.find((id) => !props.disabledItems.includes(id)) ?? null,
        onValueChange: ({ value: next }) => emit('update:modelValue', next[0] ?? ''),
        onHighlightedValueChange: ({ value: next }) => emit('highlight', next),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    };
    const initial = controlled ? props.modelValue as string : props.defaultValue || props.items.find((id) => !props.disabledItems.includes(id)) || '';
    const controller = shallowRef(makeController(initial));
    const snapshot = shallowRef(controller.value.getSnapshot());
    const rebuild = (): void => {
      const requested = controlled ? props.modelValue as string : snapshot.value.state.selection.selected[0] ?? '';
      const reconciled = reconcileCollectionState(
        props.items,
        requested === '' ? [] : [requested],
        snapshot.value.state.cursor.current,
        props.disabledItems,
        'single',
      );
      const current = reconciled.selected[0] ?? reconciled.current ?? '';
      controller.value = makeController(current, reconciled.current);
      snapshot.value = controller.value.getSnapshot();
      if (controlled && current !== requested) emit('update:modelValue', current);
    };
    watch(() => props.modelValue, (next) => {
      if (!controlled || next === undefined) return;
      const result = controller.value.syncControlledValues({ value: next === '' ? [] : [next] });
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value;
    });
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.orientation, () => props.activationMode, direction], rebuild);
    const value = computed(() => snapshot.value.state.selection.selected[0] ?? '');
    const highlighted = computed(() => snapshot.value.state.cursor.current);
    const disabled = computed(() => props.disabled);
    const readonly = computed(() => props.readonly);
    const orientation = computed(() => props.orientation);
    const disabledItems = computed<ReadonlySet<string>>(() => new Set(props.disabledItems));
    const apply = (result: ReturnType<ListboxController<string>['handleEvent']>, root?: HTMLElement): boolean => {
      if (!result.ok) return false;
      snapshot.value = result.snapshot;
      applyEffects(result.commands, emit);
      if (root !== undefined) void nextTick(() => focusTrigger(root, result.snapshot.state.cursor.current));
      return true;
    };
    const activateTarget = (target: string): boolean => {
      if (!apply(controller.value.handleEvent({ type: 'focus', id: target }))) return false;
      if (!apply(controller.value.handleEvent({ type: 'activate', id: target }))) return false;
      void nextTick(() => {
        if (rootElement.value !== null) focusTrigger(rootElement.value, target);
      });
      return true;
    };
    const part = usePartContract('tabs', 'root');
    provide<TabsRootContext>(tabsRootContextKey, {
      value, highlighted, disabled, readonly, orientation, direction, disabledItems,
      items: computed(() => props.items), partContract: part, ids,
      select: (id, target) => apply(controller.value.handleEvent({ type: 'activate', id }), target.closest('[role="tablist"]') as HTMLElement | undefined),
      keydown: (event) => {
        if (!apply(controller.value.handleKeyboardInput(event), event.currentTarget as HTMLElement)) return;
        event.preventDefault();
      },
      activateTarget,
    });
    const slotProps = computed<TabsRootSlotProps>(() => ({ value: value.value, highlightedValue: highlighted.value, disabled: props.disabled, readonly: props.readonly }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, getTabsRootAttributes(), {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { rootElement.value = element as HTMLElement | null; },
      'data-scope': part.scope,
    }), {
      default: () => slots['default']?.(slotProps.value),
    });
  },
});

export type TabsValueChangeHandler = (value: string) => void;
export type TabsHighlightHandler = (value: string | null) => void;
export type TabsActivateHandler = (value: string) => void;

export const TabsList = defineComponent({
  name: 'SectileTabsList',
  inheritAttrs: false,
  props: {
    label: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useTabsRootContext('TabsList');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['list'] ?? 'list' };
    const attributes = computed(() => getTabsListAttributes({
      orientation: root.orientation.value,
      direction: root.direction.value,
      ...(props.label === undefined ? {} : { label: props.label }),
      disabled: root.disabled.value,
      readOnly: root.readonly.value,
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, { as: props.as, asChild: props.asChild, 'data-scope': part.scope, onKeydown: root.keydown }), slots);
  },
});

export const TabsTrigger = defineComponent({
  name: 'SectileTabsTrigger',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: TabsTriggerSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useTabsRootContext('TabsTrigger');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['trigger'] ?? 'trigger' };
    const state = computed<TabsTriggerSlotProps>(() => ({
      value: props.value,
      selected: root.value.value === props.value,
      highlighted: root.highlighted.value === props.value,
      disabled: root.disabled.value || props.disabled || root.disabledItems.value.has(props.value),
    }));
    const attributes = computed(() => {
      const ids = root.ids(props.value);
      return getTabsTriggerAttributes({ id: props.value, selected: state.value.selected, highlighted: state.value.highlighted, disabled: state.value.disabled, triggerID: ids.trigger, panelID: ids.content });
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, {
      as: props.as, asChild: props.asChild,
      'data-scope': part.scope,
      'data-part': part.part,
      onClick: (event: MouseEvent) => {
        if (!event.defaultPrevented && !state.value.disabled) root.select(props.value, event.currentTarget as HTMLElement);
      },
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const TabsContent = defineComponent({
  name: 'SectileTabsContent',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: TabsContentSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useTabsRootContext('TabsContent');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['content'] ?? 'content' };
    const selected = computed(() => root.value.value === props.value);
    const attributes = computed(() => {
      const ids = root.ids(props.value);
      return getTabsContentAttributes({ selected: selected.value, contentID: ids.content, triggerID: ids.trigger });
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, { as: props.as, asChild: props.asChild, 'data-scope': part.scope }), {
      default: () => slots['default']?.({ value: props.value, selected: selected.value }),
    });
  },
});

export const TabsIndicator = defineComponent({
  name: 'SectileTabsIndicator',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: { value: string }) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useTabsRootContext('TabsIndicator');
    const part = { scope: root.partContract.scope, part: root.partContract.parts['indicator'] ?? 'indicator' };
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      'aria-hidden': 'true',
      'data-scope': part.scope,
      'data-part': part.part,
      'data-value': root.value.value,
    }), { default: () => slots['default']?.({ value: root.value.value }) });
  },
});

function applyEffects(effects: readonly ListboxEffect<string>[], emit: (event: 'activate', value: string) => void): void {
  for (const effect of effects) if (effect.type === 'dispatch-activation') emit('activate', effect.id);
}
function focusTrigger(root: HTMLElement, id: string | null): void {
  if (id === null) return;
  for (const item of root.querySelectorAll<HTMLElement>('[data-tabs-id]')) if (item.dataset['tabsId'] === id) item.focus();
}
