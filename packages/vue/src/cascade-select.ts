import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type InjectionKey, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createCascadeSelect, type CascadeSelectConnection, type CascadeSelectItemDefinition,
  type CascadeSelectPolicies,
} from '@sectile/dom/cascade-select';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { provideFormControlOwner } from './form.js';
import {
  hiddenSelectSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import {
  cascadeBranchItems,
  cascadeChoicePartProps,
  cascadeItemPath,
  createCascadeChoiceParts,
  initialCascadeColumns,
  type CascadeChoiceColumnProps,
  type CascadeChoiceColumnSlotProps,
  type CascadeChoiceItemContext,
  type CascadeChoiceItemProps,
  type CascadeChoiceItemSlotProps,
  type CascadeChoicePartProps,
  type CascadeChoiceRootContext,
  type CascadeChoiceRootState,
} from './internal/cascade-choice.js';

export interface CascadeSelectRootProps {
  readonly nodes: readonly CascadeSelectItemDefinition<string>[];
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
export type CascadeSelectPartProps = CascadeChoicePartProps;

interface RootContext extends CascadeChoiceRootContext<CascadeSelectRootSlotProps> {
  registerTrigger(element?: HTMLButtonElement): void;
  registerPopup(element?: HTMLElement): void;
}
const rootKey: InjectionKey<RootContext> = Symbol('SectileCascadeSelectRoot');
const itemKey: InjectionKey<CascadeChoiceItemContext> = Symbol('SectileCascadeSelectItem');
const partProps = cascadeChoicePartProps;

export const CascadeSelectRoot = defineComponent({
  name: 'SectileCascadeSelectRoot', inheritAttrs: false,
  props: {
    nodes: { type: Array as PropType<readonly CascadeSelectItemDefinition<string>[]>, required: true }, modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false }, disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined }, name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    textValue: { type: Function as PropType<CascadeSelectTextValueResolver>, default: undefined }, policies: { type: Object as PropType<CascadeSelectPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string | null): boolean => true, 'update:open': (_value: boolean): boolean => true, highlight: (_value: string | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement | null>(null);
    const trigger = shallowRef<HTMLButtonElement | null>(null);
    const popup = shallowRef<HTMLElement>();
    const submission = shallowRef<HTMLSelectElement | null>(null);
    const connection = shallowRef<CascadeSelectConnection<string>>();
    const participation = useCompositeFormControl({
      root,
      focusTarget: trigger,
      submissions: [{
        element: submission,
        capabilities: hiddenSelectSubmissionCapabilities,
      }],
    });
    provideFormControlOwner();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue); const initialValuePath = cascadeItemPath(props.nodes, localValue.value); const initialBranchPath = initialValuePath.slice(0, -1); const localOpen = shallowRef(props.open ?? props.defaultOpen); const highlighted = shallowRef<string | null>(localValue.value); const path = shallowRef<readonly string[]>(initialBranchPath); const columns = shallowRef<readonly (readonly string[])[]>(initialCascadeColumns(props.nodes, initialBranchPath)); const valuePath = shallowRef<readonly string[]>(initialValuePath);
    const valueControlled = useControlledStateInvariant('CascadeSelectRoot', 'modelValue', () => props.modelValue);
    const openControlled = useControlledStateInvariant('CascadeSelectRoot', 'open', () => props.open);
    const state = computed<CascadeSelectRootSlotProps>(() => Object.freeze({ value: props.modelValue !== undefined ? props.modelValue : localValue.value, valuePath: valuePath.value, highlightedValue: highlighted.value, path: path.value, columns: columns.value, open: props.open ?? localOpen.value, disabled: props.disabled, readonly: props.readonly }));
    const refresh = (): void => { const current = connection.value?.getSnapshot().state; if (current === undefined) return; localValue.value = current.value; localOpen.value = current.open; highlighted.value = current.highlighted; path.value = current.path; columns.value = connection.value?.getColumns() ?? []; valuePath.value = connection.value?.getValuePath() ?? []; refreshItems(); };
    const refreshItems = (): void => { if (popup.value === undefined || connection.value === undefined) return; popup.value.querySelectorAll<HTMLElement>('[data-sectile-cascade-select-id]').forEach((element) => { const id = element.dataset['sectileCascadeSelectId']; if (id !== undefined) connection.value?.setItemAttributes(element, id, props.disabledItems.includes(id)); }); };
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === null || trigger.value === null || popup.value === undefined) return;
      const branchIDs = cascadeBranchItems(props.nodes);
      const leafIDs = new Set(props.nodes.filter((node) => !branchIDs.has(node.id)).map((node) => node.id));
      const requestedValue = valueControlled ? props.modelValue as string | null : localValue.value;
      const value = requestedValue !== null && leafIDs.has(requestedValue) ? requestedValue : null;
      localValue.value = value;
      if (valueControlled && requestedValue !== value) emit('update:modelValue', value);
      connection.value = createCascadeSelect({ root: root.value, trigger: trigger.value, popup: popup.value, nodes: props.nodes, disabledItems: props.disabledItems, ...(props.policies === undefined ? {} : { policies: props.policies }), ...(valueControlled ? { value } : { defaultValue: value }), ...(openControlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }), disabled: props.disabled, readOnly: props.readonly, ...(props.label === undefined ? {} : { label: props.label }), onValueChange: (next) => { localValue.value = next; emit('update:modelValue', next); }, onHighlightedValueChange: (next) => { highlighted.value = next; emit('highlight', next); }, onOpenChange: (next) => { localOpen.value = next; emit('update:open', next); }, onUpdate: refresh });
      refresh();
    };
    const branches = computed(() => cascadeBranchItems(props.nodes));
    provide<RootContext>(rootKey, { state, label: computed(() => props.label), textValue: computed(() => props.textValue ?? ((id: string) => id)), disabledItems: computed(() => new Set(props.disabledItems)), branchItems: branches, registerTrigger: (element) => { trigger.value = element ?? null; }, registerPopup: (element) => { popup.value = element; }, registerColumn: (element, depth, label) => connection.value?.setColumnAttributes(element, depth === 0 ? null : state.value.path[depth - 1] ?? null, label), registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, id, disabled) });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect()); watch([() => props.nodes, () => props.disabledItems, () => props.disabled, () => props.readonly, () => props.label, () => props.policies], connect);
    watch([() => props.modelValue, () => props.open], () => { if (connection.value === undefined) return; const result = connection.value.syncControlledValues({ ...(valueControlled ? { value: props.modelValue as string | null } : {}), ...(openControlled ? { open: props.open as boolean } : {}) }); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : null; },
        'data-scope': 'cascade-select',
        'data-part': 'root',
        'data-state': state.value.open ? 'open' : 'closed',
      }, participation.controlProps.value), { default: () => slots['default']?.(state.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined && !props.required) return visual;
      return [visual, h('select', {
        ref: (element: unknown) => { submission.value = element instanceof HTMLSelectElement ? element : null; },
        name: props.name,
        form: props.form,
        required: props.required,
        disabled: props.disabled,
        value: state.value.value ?? '',
        tabindex: -1,
        'aria-hidden': 'true',
        style: visuallyHiddenInputStyle,
      }, [h('option', { value: '' }), ...props.nodes.filter((node) => !branches.value.has(node.id)).map((node) => h('option', { value: node.id, disabled: props.disabledItems.includes(node.id) }, props.textValue?.(node.id) ?? node.id))])];
    };
  },
});

export type CascadeSelectValueChangeHandler = (value: string | null) => void;
export type CascadeSelectOpenChangeHandler = (value: boolean) => void;
export type CascadeSelectHighlightHandler = (value: string | null) => void;

export const CascadeSelectTrigger = defineComponent({ name: 'SectileCascadeSelectTrigger', inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('CascadeSelectTrigger'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerTrigger(node instanceof HTMLButtonElement ? node : undefined), type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled, 'aria-haspopup': 'listbox', 'aria-expanded': String(root.state.value.open), 'data-scope': 'cascade-select', 'data-part': 'trigger', 'data-state': root.state.value.open ? 'open' : 'closed' }), { default: () => slots['default']?.(root.state.value) }); } });

export const CascadeSelectValue = defineComponent({ name: 'SectileCascadeSelectValue', inheritAttrs: false, props: { placeholder: { type: String, default: '' }, separator: { type: String, default: ' / ' }, ...partProps }, slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('CascadeSelectValue'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'cascade-select', 'data-part': 'value', 'data-placeholder': root.state.value.value === null ? '' : undefined }), { default: () => slots['default']?.(root.state.value) ?? (root.state.value.value === null ? props.placeholder : root.state.value.valuePath.map(root.textValue.value).join(props.separator)) }); } });

export const CascadeSelectContent = defineComponent({ name: 'SectileCascadeSelectContent', inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: CascadeSelectRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('CascadeSelectContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerPopup(node instanceof HTMLElement ? node : undefined), role: 'group', hidden: !root.state.value.open, 'aria-label': root.label.value, 'data-scope': 'cascade-select', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed' }), { default: () => slots['default']?.(root.state.value) }); } });

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
