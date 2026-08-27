import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createCascadeList,
  type CascadeListConnection,
  type CascadeListItemDefinition,
  type CascadeListPolicies,
} from '@sectile/dom/cascade-list';
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

export interface CascadeListRootProps {
  readonly nodes: readonly CascadeListItemDefinition<string>[];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly textValue?: (id: string) => string;
  readonly policies?: CascadeListPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type CascadeListTextValueResolver = NonNullable<CascadeListRootProps['textValue']>;
export interface CascadeListRootSlotProps extends CascadeChoiceRootState {}
export type CascadeListColumnProps = CascadeChoiceColumnProps;
export type CascadeListColumnSlotProps = CascadeChoiceColumnSlotProps;
export type CascadeListItemProps = CascadeChoiceItemProps;
export type CascadeListItemSlotProps = CascadeChoiceItemSlotProps;
export type CascadeListPartProps = CascadeChoicePartProps;

interface RootContext extends CascadeChoiceRootContext<CascadeListRootSlotProps> {}

const rootKey: InjectionKey<RootContext> = Symbol('SectileCascadeListRoot');
const itemKey: InjectionKey<CascadeChoiceItemContext> = Symbol('SectileCascadeListItem');
const partProps = cascadeChoicePartProps;

export const CascadeListRoot = defineComponent({
  name: 'SectileCascadeListRoot',
  inheritAttrs: false,
  props: {
    nodes: { type: Array as PropType<readonly CascadeListItemDefinition<string>[]>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined },
    defaultValue: { type: String as PropType<string | null>, default: null },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    label: { type: String, default: undefined },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    textValue: { type: Function as PropType<CascadeListTextValueResolver>, default: undefined },
    policies: { type: Object as PropType<CascadeListPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string | null): boolean => true,
    highlight: (_value: string | null): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: CascadeListRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement | null>(null);
    const submission = shallowRef<HTMLSelectElement | null>(null);
    const connection = shallowRef<CascadeListConnection<string>>();
    const participation = useCompositeFormControl({
      root,
      focusTarget: root,
      submissions: [{
        element: submission,
        capabilities: hiddenSelectSubmissionCapabilities,
      }],
    });
    provideFormControlOwner();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const initialValuePath = cascadeItemPath(props.nodes, localValue.value);
    const initialBranchPath = initialValuePath.slice(0, -1);
    const highlighted = shallowRef<string | null>(localValue.value ?? firstAvailableRoot(props.nodes, props.disabledItems));
    const path = shallowRef<readonly string[]>(initialBranchPath);
    const columns = shallowRef<readonly (readonly string[])[]>(initialCascadeColumns(props.nodes, initialBranchPath));
    const valuePath = shallowRef<readonly string[]>(initialValuePath);
    const valueControlled = useControlledStateInvariant('CascadeListRoot', 'modelValue', () => props.modelValue);
    const state = computed<CascadeListRootSlotProps>(() => Object.freeze({
      value: props.modelValue !== undefined ? props.modelValue : localValue.value,
      valuePath: valuePath.value,
      highlightedValue: highlighted.value,
      path: path.value,
      columns: columns.value,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const refreshItems = (): void => {
      if (root.value === null || connection.value === undefined) return;
      root.value.querySelectorAll<HTMLElement>('[data-sectile-cascade-list-id]').forEach((element) => {
        const id = element.dataset['sectileCascadeListId'];
        if (id !== undefined) connection.value?.setItemAttributes(element, id, props.disabledItems.includes(id));
      });
    };
    const refresh = (): void => {
      const current = connection.value?.getSnapshot().state;
      if (current === undefined) return;
      localValue.value = current.value;
      highlighted.value = current.highlighted;
      path.value = current.path;
      columns.value = connection.value?.getColumns() ?? [];
      valuePath.value = connection.value?.getValuePath() ?? [];
      refreshItems();
    };
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === null) return;
      const branches = cascadeBranchItems(props.nodes);
      const leaves = new Set(props.nodes.filter((node) => !branches.has(node.id)).map((node) => node.id));
      const requestedValue = valueControlled ? props.modelValue as string | null : localValue.value;
      const value = requestedValue !== null && leaves.has(requestedValue) ? requestedValue : null;
      const ids = new Set(props.nodes.map((node) => node.id));
      const requestedHighlight = highlighted.value;
      const defaultHighlightedValue = requestedHighlight !== null
        && ids.has(requestedHighlight)
        && !props.disabledItems.includes(requestedHighlight)
        ? requestedHighlight
        : value ?? firstAvailableRoot(props.nodes, props.disabledItems);
      localValue.value = value;
      if (valueControlled && requestedValue !== value) emit('update:modelValue', value);
      connection.value = createCascadeList({
        root: root.value,
        nodes: props.nodes,
        disabledItems: props.disabledItems,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(valueControlled ? { value } : { defaultValue: value }),
        defaultHighlightedValue,
        disabled: props.disabled,
        readOnly: props.readonly,
        ...(props.label === undefined ? {} : { label: props.label }),
        onValueChange: (next) => {
          localValue.value = next;
          emit('update:modelValue', next);
        },
        onHighlightedValueChange: (next) => {
          highlighted.value = next;
          emit('highlight', next);
        },
        onUpdate: refresh,
      });
      refresh();
    };
    const branches = computed(() => cascadeBranchItems(props.nodes));
    provide<RootContext>(rootKey, {
      state,
      label: computed(() => props.label),
      textValue: computed(() => props.textValue ?? ((id: string) => id)),
      disabledItems: computed(() => new Set(props.disabledItems)),
      branchItems: branches,
      registerColumn: (element, depth, label) => connection.value?.setColumnAttributes(
        element,
        depth === 0 ? null : state.value.path[depth - 1] ?? null,
        label,
      ),
      registerItem: (element, id, disabled) => connection.value?.setItemAttributes(element, id, disabled),
    });
    onMounted(connect);
    onBeforeUnmount(() => connection.value?.disconnect());
    watch([
      () => props.nodes,
      () => props.disabledItems,
      () => props.disabled,
      () => props.readonly,
      () => props.label,
      () => props.policies,
    ], connect);
    watch(() => props.modelValue, () => {
      if (connection.value === undefined || !valueControlled) return;
      const result = connection.value.syncControlledValues({ value: props.modelValue as string | null });
      if (!result.ok) throw new TypeError(result.error.message);
      refresh();
    });
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : null; },
        role: 'group',
        tabindex: -1,
        'aria-label': props.label,
        'aria-disabled': props.disabled ? 'true' : undefined,
        'aria-readonly': props.readonly ? 'true' : undefined,
        'data-scope': 'cascade-list',
        'data-part': 'root',
        'data-disabled': props.disabled ? '' : undefined,
        'data-readonly': props.readonly ? '' : undefined,
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
      }, [
        h('option', { value: '', selected: state.value.value === null }),
        ...props.nodes
          .filter((node) => !branches.value.has(node.id))
          .map((node) => h('option', {
            value: node.id,
            selected: state.value.value === node.id,
            disabled: props.disabledItems.includes(node.id),
          }, props.textValue?.(node.id) ?? node.id)),
      ])];
    };
  },
});

export type CascadeListValueChangeHandler = (value: string | null) => void;
export type CascadeListHighlightHandler = (value: string | null) => void;

export const CascadeListValue = defineComponent({
  name: 'SectileCascadeListValue',
  inheritAttrs: false,
  props: {
    placeholder: { type: String, default: '' },
    separator: { type: String, default: ' / ' },
    ...partProps,
  },
  slots: Object as SlotsType<{ default: (props: CascadeListRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('CascadeListValue');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'cascade-list',
      'data-part': 'value',
      'data-placeholder': root.state.value.value === null ? '' : undefined,
    }), {
      default: () => slots['default']?.(root.state.value)
        ?? (root.state.value.value === null
          ? props.placeholder
          : root.state.value.valuePath.map(root.textValue.value).join(props.separator)),
    });
  },
});

const cascadeListParts = createCascadeChoiceParts<CascadeListRootSlotProps>({
  scope: 'cascade-list',
  componentName: 'CascadeList',
  itemAttribute: 'data-sectile-cascade-list-id',
  rootKey,
  itemKey,
});

export const CascadeListColumn = cascadeListParts.Column;
export const CascadeListItem = cascadeListParts.Item;
export const CascadeListItemIndicator = cascadeListParts.ItemIndicator;
export const CascadeListItemChevron = cascadeListParts.ItemChevron;

function useRoot(part: string): RootContext {
  const root = inject(rootKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside CascadeListRoot.`);
  return root;
}

function firstAvailableRoot(
  nodes: readonly CascadeListItemDefinition<string>[],
  disabledItems: readonly string[],
): string | null {
  const disabled = new Set(disabledItems);
  return nodes.find((node) => node.parentID === null && !disabled.has(node.id))?.id ?? null;
}
