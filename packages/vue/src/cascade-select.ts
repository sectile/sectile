import {
  computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type InjectionKey, type PropType, type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createCascadeSelect, tryCreateCascadeSelect, type CascadeSelectConnection, type CascadeSelectItemDefinition, type CascadeSelectOptions,
  type CascadeSelectPolicies,
} from '@sectile/dom/cascade-select';
import type { DOMLayerPresentationSnapshot } from '@sectile/dom/dialog';
import { unwrap } from '@sectile/core/result';
import type {
  PositionOptions,
  PositionStrategy,
} from '@sectile/dom/position';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { positionProps, positionSources, readPositionOptions } from './internal/position-options.js';
import { visuallyHiddenInputStyle } from './input/native-input.js';
import { provideFormControlOwner } from './form/control.js';
import {
  hiddenSelectSubmissionCapabilities,
  useCompositeFormControl,
  useFormSubmissionProps,
  useFormControlFlags,
} from './form/control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { usePopupPresentation } from './internal/popup-presentation.js';
import { provideHostLayerParent, useHostDirection } from './host-provider.js';
import { usePresence } from './presence/presence.js';
import { useConditionalPresenceRegistry } from './presence/conditional-presence.js';

import {
  cascadeBranchItems,
  cascadeChoicePartProps,
  cascadeItemPath,
  createCascadeChoiceParts,
  initialCascadeColumns,
  type CascadeChoiceColumnProps,
  type CascadeChoiceColumnSlotProps,
  type CascadeChoiceItemContext,
  type CascadeChoiceItemIndicatorProps,
  type CascadeChoiceItemProps,
  type CascadeChoiceItemSlotProps,
  type CascadeChoicePartProps,
  type CascadeChoiceRootContext,
  type CascadeChoiceRootState,
} from './internal/cascade-choice.js';

export interface CascadeSelectRootProps extends Omit<PositionOptions, 'arrowPadding'> {
  readonly nodes: readonly CascadeSelectItemDefinition<string>[];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly position?: boolean;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly textValue?: (id: string) => string;
  readonly policies?: CascadeSelectPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type CascadeSelectTextValueResolver = NonNullable<CascadeSelectRootProps['textValue']>;
export interface CascadeSelectRootSlotProps extends CascadeChoiceRootState { readonly open: boolean }
export type CascadeSelectColumnProps = CascadeChoiceColumnProps;
export type CascadeSelectColumnSlotProps = CascadeChoiceColumnSlotProps;
export type CascadeSelectItemProps = CascadeChoiceItemProps;
export type CascadeSelectItemSlotProps = CascadeChoiceItemSlotProps;
export type CascadeSelectItemIndicatorProps = CascadeChoiceItemIndicatorProps;
export type CascadeSelectPartProps = CascadeChoicePartProps;

interface RootContext extends CascadeChoiceRootContext<CascadeSelectRootSlotProps> {
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly presentation: Readonly<ShallowRef<DOMLayerPresentationSnapshot | undefined>>;
  registerPresence(present: ShallowRef<boolean>): () => void;
  readonly position: ComputedRef<boolean>;
  readonly strategy: ComputedRef<PositionStrategy>;
  registerTrigger(element?: HTMLButtonElement): void;
  registerPopup(element?: HTMLElement): void;
  refresh(): void;
}
const rootKey: InjectionKey<RootContext> = Symbol('SectileCascadeSelectRoot');
const itemKey: InjectionKey<CascadeChoiceItemContext> = Symbol('SectileCascadeSelectItem');
const partProps = cascadeChoicePartProps;

export const CascadeSelectRoot = defineComponent({
  __sectileFormLabelMode: 'labelledby',
  name: 'SectileCascadeSelectRoot', inheritAttrs: false,
  props: {
    nodes: { type: Array as PropType<readonly CascadeSelectItemDefinition<string>[]>, required: true }, modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false }, disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined }, name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    ...positionProps, align: { ...positionProps.align, default: 'start' },
    textValue: { type: Function as PropType<CascadeSelectTextValueResolver>, default: undefined }, policies: { type: Object as PropType<CascadeSelectPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string | null): boolean => true, 'update:open': (_value: boolean): boolean => true, highlight: (_value: string | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const flags = useFormControlFlags(props);
    const direction = useHostDirection();
    const root = shallowRef<HTMLElement | null>(null);
    const trigger = shallowRef<HTMLButtonElement | null>(null);
    const popup = shallowRef<HTMLElement>();
    const submission = shallowRef<HTMLSelectElement | null>(null);
    const connection = shallowRef<CascadeSelectConnection<string>>();
    const initialValue = props.modelValue !== undefined ? props.modelValue : props.defaultValue;
    const initialOpen = props.open ?? props.defaultOpen;
    provideFormControlOwner();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue); const initialValuePath = cascadeItemPath(props.nodes, localValue.value); const initialBranchPath = initialValuePath.slice(0, -1); const localOpen = shallowRef(props.open ?? props.defaultOpen); const highlighted = shallowRef<string | null>(localValue.value); const path = shallowRef<readonly string[]>(initialBranchPath); const columns = shallowRef<readonly (readonly string[])[]>(initialCascadeColumns(props.nodes, initialBranchPath)); const valuePath = shallowRef<readonly string[]>(initialValuePath);
    const valueControlled = useControlledStateInvariant('CascadeSelectRoot', 'modelValue', () => props.modelValue);
    const openControlled = useControlledStateInvariant('CascadeSelectRoot', 'open', () => props.open);
    const state = computed<CascadeSelectRootSlotProps>(() => Object.freeze({ value: props.modelValue !== undefined ? props.modelValue : localValue.value, valuePath: valuePath.value, highlightedValue: highlighted.value, path: path.value, columns: columns.value, open: props.open ?? localOpen.value, disabled: flags.value.disabled, readonly: flags.value.readonly }));
    const lifecycle = usePopupPresentation({ connection, open: computed(() => state.value.open), connect: () => connect(), refresh: () => refresh(), trackLayerHost: true });
    const submissionProps = useFormSubmissionProps({ element: submission, capabilities: hiddenSelectSubmissionCapabilities }, props);
    const participation = useCompositeFormControl({ root,
      focusTarget: () => lifecycle.active.value ? trigger.value : null,
      validationTarget: () => lifecycle.active.value ? root.value : null,
      submissions: [{ element: submission, capabilities: hiddenSelectSubmissionCapabilities }],
      reset: () => {
        queueMicrotask(() => {
          if (!mounted) return;
          disconnect();
          localValue.value = valueControlled ? props.modelValue as string | null : initialValue;
          localOpen.value = openControlled ? props.open as boolean : initialOpen;
          highlighted.value = null;
          lifecycle.reconnect();
          if (submission.value !== null) submission.value.value = state.value.value ?? '';
        });
      },
    });
    const selectedIDSet = computed<ReadonlySet<string>>(() => { const value = props.modelValue !== undefined ? props.modelValue : localValue.value; return value === null ? new Set() : new Set([value]); });
    const indicatorPresence = useConditionalPresenceRegistry(selectedIDSet);
    const refresh = (): void => { const current = connection.value?.getSnapshot().state; if (current === undefined) return; localValue.value = current.value; localOpen.value = current.open; highlighted.value = current.highlighted; path.value = current.path; columns.value = connection.value?.getColumns() ?? []; valuePath.value = connection.value?.getValuePath() ?? []; lifecycle.update(); refreshItems(); };
    const refreshItems = (): void => { if (popup.value === undefined || connection.value === undefined) return; popup.value.querySelectorAll<HTMLElement>('[data-sectile-cascade-select-id]').forEach((element) => { const id = element.dataset['sectileCascadeSelectId']; if (id !== undefined) connection.value?.setItemAttributes(element, id, props.disabledItems.includes(id)); }); };
    const connect = (): void => {
      const navigation = connection.value === undefined ? {} : { defaultPath: path.value, defaultHighlightedValue: highlighted.value };
      disconnect();
      if (root.value === null || trigger.value === null || popup.value === undefined) return;
      const branchIDs = cascadeBranchItems(props.nodes);
      const leafIDs = new Set(props.nodes.filter((node) => !branchIDs.has(node.id)).map((node) => node.id));
      const requestedValue = valueControlled ? props.modelValue as string | null : localValue.value;
      const value = requestedValue !== null && leafIDs.has(requestedValue) ? requestedValue : null;
      localValue.value = value;
      if (valueControlled && requestedValue !== value) emit('update:modelValue', value);
      const options: CascadeSelectOptions<string> = { root: root.value, trigger: trigger.value, popup: popup.value, nodes: props.nodes, disabledItems: props.disabledItems, ...readPositionOptions(props), manageVisibility: false, ...(props.policies === undefined ? {} : { policies: props.policies }), ...(valueControlled ? { value } : { defaultValue: value }), ...(openControlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }), disabled: props.disabled, readOnly: props.readonly, ...(props.label === undefined ? {} : { label: props.label }), onValueChange: (next) => { localValue.value = next; emit('update:modelValue', next); }, onHighlightedValueChange: (next) => { highlighted.value = next; emit('highlight', next); }, onOpenChange: (next) => { if (!openControlled) localOpen.value = next; emit('update:open', next); }, onUpdate: refresh };
      const host = lifecycle.layerHost.value;
      const layer = host === undefined ? {} : { layerHost: host };
      const interaction = { disabled: flags.value.disabled, readOnly: flags.value.readonly };
      const candidate = tryCreateCascadeSelect({ ...options, ...interaction, ...navigation, ...layer, direction: direction.value });
      if (!candidate.ok && (candidate.error.code === 'cascade-select-highlight-outside-tree'
        || candidate.error.code === 'cascade-select-path-outside-tree' || candidate.error.code === 'cascade-select-leaf-in-path'
        || candidate.error.code === 'invalid-cascade-select-path')) connection.value = createCascadeSelect({ ...options, ...interaction, ...layer, direction: direction.value });
      else connection.value = unwrap(candidate);
      refresh();
    };
    const disconnect = (): void => {
      lifecycle.release();
      try { connection.value?.disconnect(); } finally { connection.value = undefined; }
    };
    const branches = computed(() => cascadeBranchItems(props.nodes));
    let mounted = false;
    let connectScheduled = false;
    const scheduleConnect = (): void => {
      if (!mounted || connectScheduled) return;
      if (!lifecycle.availability.value) { lifecycle.invalidate(); return; }
      connectScheduled = true;
      void nextTick(() => {
        connectScheduled = false;
        if (mounted) lifecycle.reconnect();
      });
    };
    provide<RootContext>(rootKey, { state, active: lifecycle.active, presentation: lifecycle.presentation, registerPresence: lifecycle.registerPresence, position: computed(() => props.position), strategy: computed(() => props.strategy), label: computed(() => props.label), textValue: computed(() => props.textValue ?? ((id: string) => id)), disabledItems: computed(() => new Set(props.disabledItems)), branchItems: branches, indicatorPresence, registerTrigger: (element) => { const next = element ?? null; const changed = trigger.value !== next; trigger.value = next; if (changed) scheduleConnect(); }, registerPopup: (element) => { const changed = popup.value !== element; popup.value = element; if (changed) scheduleConnect(); }, refresh: () => connection.value?.refresh(), registerColumn: (element, depth, label) => connection.value?.setColumnAttributes(element, depth === 0 ? null : state.value.path[depth - 1] ?? null, label), registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, id, disabled) });
    onMounted(() => { mounted = true; lifecycle.reconnect(); }); onBeforeUnmount(() => { mounted = false; disconnect(); }); watch([() => props.nodes, () => props.disabledItems, () => flags.value.disabled, () => flags.value.readonly, () => props.label, ...positionSources(props), () => props.policies, direction], lifecycle.reconnect);
    watch([() => props.modelValue, () => props.open], () => { lifecycle.prepareModelUpdate(); if (connection.value === undefined) return; const result = connection.value.syncControlledValues({ ...(valueControlled ? { value: props.modelValue as string | null } : {}), ...(openControlled ? { open: props.open as boolean } : {}) }); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
    const registerRoot = (node: unknown): void => { const next = node instanceof HTMLElement ? node : null; const changed = root.value !== next; root.value = next; if (changed) scheduleConnect(); };
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: registerRoot,
        'data-scope': 'cascade-select',
        'data-part': 'root',
        dir: direction.value,
        'data-state': state.value.open ? 'open' : 'closed',
      }, participation.controlProps.value), { default: () => slots['default']?.(state.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined && !props.required) return visual;
      return [visual, h('select', {
        ref: (element: unknown) => { submission.value = element instanceof HTMLSelectElement ? element : null; },
        ...submissionProps.value,
        value: state.value.value ?? '',
        tabindex: -1,
        'aria-hidden': 'true',
        style: visuallyHiddenInputStyle,
      }, [h('option', { value: '', selected: state.value.value === null }), ...props.nodes.filter((node) => !branches.value.has(node.id)).map((node) => h('option', { value: node.id, selected: state.value.value === node.id, disabled: props.disabledItems.includes(node.id) }, props.textValue?.(node.id) ?? node.id))])];
    };
  },
});

export type CascadeSelectValueChangeHandler = (value: string | null) => void;
export type CascadeSelectOpenChangeHandler = (value: boolean) => void;
export type CascadeSelectHighlightHandler = (value: string | null) => void;

export const CascadeSelectTrigger = defineComponent({ name: 'SectileCascadeSelectTrigger', inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('CascadeSelectTrigger'); const registerTrigger = (node: unknown): void => root.registerTrigger(node instanceof HTMLButtonElement ? node : undefined); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: registerTrigger, type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled, 'aria-haspopup': 'listbox', 'aria-expanded': String(root.state.value.open), 'data-scope': 'cascade-select', 'data-part': 'trigger', 'data-state': root.state.value.open ? 'open' : 'closed' }), { default: () => slots['default']?.(root.state.value) }); } });

export const CascadeSelectValue = defineComponent({ name: 'SectileCascadeSelectValue', inheritAttrs: false, props: { placeholder: { type: String, default: '' }, separator: { type: String, default: ' / ' }, ...partProps }, slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('CascadeSelectValue'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'cascade-select', 'data-part': 'value', 'data-placeholder': root.state.value.value === null ? '' : undefined }), { default: () => slots['default']?.(root.state.value) ?? (root.state.value.value === null ? props.placeholder : root.state.value.valuePath.map(root.textValue.value).join(props.separator)) }); } });

export const CascadeSelectContent = defineComponent({
  name: 'SectileCascadeSelectContent', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('CascadeSelectContent');
    const element = shallowRef<HTMLElement>();
    const open = computed(() => root.state.value.open);
    provideHostLayerParent({ element, open, active: root.active, presentation: root.presentation });
    const present = usePresence(open, element, undefined, root.active);
    onBeforeUnmount(root.registerPresence(present));
    watch(present, async () => { await nextTick(); root.refresh(); }, { flush: 'post' });
    const registerContent = (node: unknown): void => { const content = node instanceof HTMLElement ? node : undefined; element.value = content; root.registerPopup(content); };
    return (): VNodeChild => {
      const exiting = !open.value && present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: registerContent, role: 'group', hidden: !root.active.value || !present.value, 'aria-label': root.label.value,
        ...(exiting || !root.active.value ? { inert: true, 'aria-hidden': 'true' } : {}),
        style: root.position.value ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined } : undefined,
        'data-scope': 'cascade-select', 'data-part': 'content', 'data-state': open.value ? 'open' : 'closed',
      }), { default: () => slots['default']?.(root.state.value) });
    };
  },
});

const cascadeSelectParts = createCascadeChoiceParts<CascadeSelectRootSlotProps>({
  scope: 'cascade-select',
  componentName: 'CascadeSelect',
  itemAttribute: 'data-sectile-cascade-select-id',
  rootKey,
  itemKey,
});

export const CascadeSelectColumn = cascadeSelectParts.Column;
export const CascadeSelectItem = cascadeSelectParts.Item;
export const CascadeSelectItemIndicator = cascadeSelectParts.ItemIndicator;
export const CascadeSelectItemChevron = cascadeSelectParts.ItemChevron;

function useRoot(part: string): RootContext { const root = inject<RootContext>(rootKey); if (root === undefined) throw new TypeError(`${part} must be used inside CascadeSelectRoot.`); return root; }
