import {
  computed, defineComponent, h, inject, mergeProps, nextTick, provide, shallowRef, watch,
  type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  getTabsContentAttributes,
  getTabsListAttributes,
  getTabsRootAttributes,
  getTabsTriggerAttributes,
} from '@sectile/dom/tabs';
import { createListboxControllerFromItems, type ListboxController, type ListboxEffect } from '@sectile/dom/listbox';
import { Primitive, type PrimitiveAs } from './primitive.js';

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

interface IDs { readonly trigger: string; readonly content: string }
interface RootContext {
  readonly value: ComputedRef<string>;
  readonly highlighted: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly orientation: ComputedRef<'horizontal' | 'vertical'>;
  select(value: string, target: HTMLElement): void;
  keydown(event: KeyboardEvent): void;
  ids(value: string): IDs;
}
const rootKey = Symbol('SectileTabsRoot');
let tabsID = 0;

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
    const controlled = props.modelValue !== undefined;
    const instanceID = ++tabsID;
    const idMap = new Map<string, IDs>();
    const ids = (value: string): IDs => {
      const found = idMap.get(value);
      if (found !== undefined) return found;
      const safe = encodeURIComponent(value).replaceAll('%', '-');
      const created = Object.freeze({ trigger: `sectile-tabs-${instanceID}-${safe}-trigger`, content: `sectile-tabs-${instanceID}-${safe}-content` });
      idMap.set(value, created);
      return created;
    };
    const makeController = (value: string): ListboxController<string> => {
      const selected = value === '' ? [] : [value];
      const result = createListboxControllerFromItems({
        items: props.items,
        selectionMode: 'single',
        disabledItems: props.disabledItems,
        disabled: props.disabled,
        readOnly: props.readonly,
        orientation: props.orientation,
        policies: { selectionFollowsFocus: props.activationMode === 'automatic' },
        ...(controlled ? { value: selected } : { defaultValue: selected }),
        defaultHighlightedValue: value || props.items.find((id) => !props.disabledItems.includes(id)) || null,
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
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.orientation, () => props.activationMode], rebuild);
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
    provide<RootContext>(rootKey, {
      value, highlighted, disabled, readonly, orientation, disabledItems, ids,
      select: (id, target) => apply(controller.value.handleEvent({ type: 'activate', id }), target.closest('[role="tablist"]') as HTMLElement | undefined),
      keydown: (event) => {
        if (!apply(controller.value.handleKeyboardInput(event), event.currentTarget as HTMLElement)) return;
        event.preventDefault();
      },
    });
    const slotProps = computed<TabsRootSlotProps>(() => ({ value: value.value, highlightedValue: highlighted.value, disabled: props.disabled, readonly: props.readonly }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, getTabsRootAttributes(), { as: props.as, asChild: props.asChild }), {
      default: () => slots['default']?.(slotProps.value),
    });
  },
});

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
    const root = useRoot('TabsList');
    const attributes = computed(() => getTabsListAttributes({
      orientation: root.orientation.value,
      ...(props.label === undefined ? {} : { label: props.label }),
      disabled: root.disabled.value,
      readOnly: root.readonly.value,
    }));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, { as: props.as, asChild: props.asChild, onKeydown: root.keydown }), slots);
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
    const root = useRoot('TabsTrigger');
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
    const root = useRoot('TabsContent');
    const selected = computed(() => root.value.value === props.value);
    const attributes = computed(() => {
      const ids = root.ids(props.value);
      return getTabsContentAttributes({ selected: selected.value, contentID: ids.content, triggerID: ids.trigger });
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, attributes.value as Record<string, unknown>, { as: props.as, asChild: props.asChild }), {
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
    const root = useRoot('TabsIndicator');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      'aria-hidden': 'true',
      'data-scope': 'tabs',
      'data-part': 'indicator',
      'data-value': root.value.value,
    }), { default: () => slots['default']?.({ value: root.value.value }) });
  },
});

function useRoot(part: string): RootContext {
  const root = inject<RootContext>(rootKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside TabsRoot.`);
  return root;
}
function applyEffects(effects: readonly ListboxEffect<string>[], emit: (event: 'activate', value: string) => void): void {
  for (const effect of effects) if (effect.type === 'dispatch-activation') emit('activate', effect.id);
}
function focusTrigger(root: HTMLElement, id: string | null): void {
  if (id === null) return;
  for (const item of root.querySelectorAll<HTMLElement>('[data-tabs-id]')) if (item.dataset['tabsId'] === id) item.focus();
}
