import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createToolbar, type ToolbarConnection, type ToolbarPolicies } from '@sectile/dom/toolbar';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostDirection } from './host-provider.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface ToolbarRootProps { readonly items: readonly string[]; readonly modelValue?: string | null; readonly defaultValue?: string | null; readonly disabledItems?: readonly string[]; readonly disabled?: boolean; readonly orientation?: 'horizontal' | 'vertical'; readonly label?: string; readonly policies?: ToolbarPolicies<string>; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ToolbarRootSlotProps { readonly highlightedValue: string | null; readonly disabled: boolean; readonly orientation: 'horizontal' | 'vertical' }
export interface ToolbarItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ToolbarItemSlotProps { readonly value: string; readonly highlighted: boolean; readonly disabled: boolean }
export interface ToolbarPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
interface Context { readonly state: ComputedRef<ToolbarRootSlotProps>; readonly disabledItems: ComputedRef<ReadonlySet<string>>; register(element: HTMLElement, id: string, disabled: boolean): void }
const key = Symbol('SectileToolbarRoot'); const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const ToolbarRoot = defineComponent({
  name: 'SectileToolbarRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true }, modelValue: { type: String as PropType<string | null>, default: undefined },
    defaultValue: { type: String as PropType<string | null>, default: null }, disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false }, orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    label: { type: String, default: undefined }, policies: { type: Object as PropType<ToolbarPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string | null): boolean => true, invoke: (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: ToolbarRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const direction = useHostDirection();
    const root = shallowRef<HTMLElement>(); const connection = shallowRef<ToolbarConnection<string>>();
    const current = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const controlled = useControlledStateInvariant('ToolbarRoot', 'modelValue', () => props.modelValue);
    const state = computed<ToolbarRootSlotProps>(() => ({ highlightedValue: props.modelValue !== undefined ? props.modelValue : current.value, disabled: props.disabled, orientation: props.orientation }));
    const refresh = (): void => { if (connection.value !== undefined) current.value = connection.value.getSnapshot().state.cursor.current; refreshItems(); };
    const refreshItems = (): void => { if (root.value === undefined || connection.value === undefined) return; root.value.querySelectorAll<HTMLElement>('[data-sectile-toolbar-id]').forEach((element) => { const id = element.dataset['sectileToolbarId']; if (id !== undefined) connection.value?.setItemAttributes(element, id, props.disabledItems.includes(id)); }); };
    const connect = (): void => {
      connection.value?.disconnect(); if (root.value === undefined) return;
      const requested = controlled ? props.modelValue as string | null : current.value;
      const reconciled = reconcileCollectionState(
        props.items,
        [],
        requested,
        props.disabledItems,
        'single',
        { preserveNullCurrent: true },
      );
      current.value = reconciled.current;
      if (controlled && requested !== reconciled.current) emit('update:modelValue', reconciled.current);
      connection.value = createToolbar({
        root: root.value, items: props.items, disabledItems: props.disabledItems,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(controlled ? { highlightedValue: reconciled.current } : { defaultHighlightedValue: reconciled.current }),
        disabled: props.disabled, orientation: props.orientation, direction: direction.value, ...(props.label === undefined ? {} : { label: props.label }),
        onHighlightedValueChange: (value) => { current.value = value; emit('update:modelValue', value); },
        onInvoke: (value) => emit('invoke', value), onUpdate: refresh,
      }); refreshItems(); refresh();
    };
    provide<Context>(key, { state, disabledItems: computed(() => new Set(props.disabledItems)), register: (element, id, disabled) => connection.value?.setItemAttributes(element, id, disabled) });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.orientation, () => props.label, () => props.policies, direction], connect);
    watch(() => props.modelValue, (value) => { if (!controlled || value === undefined || connection.value === undefined) return; const result = connection.value.syncControlledValue(value); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
      role: 'toolbar', 'aria-label': props.label, 'aria-orientation': props.orientation, 'aria-disabled': props.disabled ? 'true' : undefined,
      dir: direction.value,
      'data-scope': 'toolbar', 'data-part': 'root', 'data-orientation': props.orientation,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type ToolbarValueChangeHandler = (value: string | null) => void;
export type ToolbarInvokeHandler = (value: string) => void;

export const ToolbarItem = defineComponent({
  name: 'SectileToolbarItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ToolbarItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot(); const state = computed<ToolbarItemSlotProps>(() => ({ value: props.value, highlighted: root.state.value.highlightedValue === props.value, disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
    elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.register(node, props.value, state.value.disabled); },
    disabled: state.value.disabled && props.as === 'button' ? true : undefined, 'aria-disabled': state.value.disabled ? 'true' : undefined,
    'data-sectile-toolbar-id': props.value, 'data-scope': 'toolbar', 'data-part': 'item', 'data-highlighted': state.value.highlighted ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export const ToolbarSeparator = defineComponent({
  name: 'SectileToolbarSeparator', inheritAttrs: false, props: partProps,
  setup(props, { attrs }) { const root = useRoot(); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: 'separator', 'aria-orientation': root.state.value.orientation, 'data-scope': 'toolbar', 'data-part': 'separator' })); },
});

function useRoot(): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError('Toolbar parts must be used inside ToolbarRoot.'); return root; }
