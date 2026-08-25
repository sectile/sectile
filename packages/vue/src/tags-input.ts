import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createTagsInput, type TagsInputConnection, type TagsInputPolicies } from '@sectile/dom/tags-input';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { visuallyHiddenInputStyle } from './internal/native-input.js';
import { provideFormControlOwner } from './form.js';
import {
  hiddenValueSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';
import { useHostDirection } from './host-provider.js';

export interface TagsInputRootProps {
  readonly modelValue?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly inputValue?: string;
  readonly defaultInputValue?: string;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly policies?: TagsInputPolicies;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface TagsInputRootSlotProps { readonly value: readonly string[]; readonly inputValue: string; readonly disabled: boolean; readonly: boolean }
export interface TagsInputItemProps { readonly index: number; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TagsInputItemSlotProps { readonly index: number; readonly value: string; readonly disabled: boolean; readonly: boolean }
export interface TagsInputPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface RootContext {
  readonly state: ComputedRef<TagsInputRootSlotProps>;
  readonly label: ComputedRef<string>;
  registerRoot(element?: HTMLElement): void;
  registerInput(element?: HTMLInputElement): void;
  registerDelete(element: HTMLElement, index: number): void;
  clear(): void;
}
interface ItemContext { readonly state: ComputedRef<TagsInputItemSlotProps> }
const rootKey = Symbol('SectileTagsInputRoot');
const itemKey = Symbol('SectileTagsInputItem');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false },
};

export const TagsInputRoot = defineComponent({
  name: 'SectileTagsInputRoot', inheritAttrs: false,
  props: {
    modelValue: { type: Array as PropType<readonly string[]>, default: undefined },
    defaultValue: { type: Array as PropType<readonly string[]>, default: () => [] },
    inputValue: { type: String, default: undefined }, defaultInputValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false },
    label: { type: String, default: 'Tags' }, name: { type: String, default: undefined },
    form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    policies: { type: Object as PropType<TagsInputPolicies>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: readonly string[]): boolean => true,
    'update:inputValue': (_value: string): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: TagsInputRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const direction = useHostDirection();
    const root = shallowRef<HTMLElement | null>(null); const input = shallowRef<HTMLInputElement | null>(null);
    const submissionElements: Array<HTMLInputElement | null> = [];
    const participation = useCompositeFormControl({
      root,
      focusTarget: input,
      submissions: () => state.value.value.map((_, index) => ({
        element: () => submissionElements[index] ?? null,
        capabilities: hiddenValueSubmissionCapabilities,
      })),
    });
    provideFormControlOwner();
    const connection = shallowRef<TagsInputConnection>();
    const localTags = shallowRef<readonly string[]>(props.modelValue ?? props.defaultValue);
    const localInput = shallowRef(props.inputValue ?? props.defaultInputValue);
    const valueControlled = props.modelValue !== undefined; const inputControlled = props.inputValue !== undefined;
    const state = computed<TagsInputRootSlotProps>(() => Object.freeze({
      value: props.modelValue ?? localTags.value, inputValue: props.inputValue ?? localInput.value,
      disabled: props.disabled, readonly: props.readonly,
    }));
    const refresh = (): void => {
      const snapshot = connection.value?.getSnapshot().state;
      if (snapshot === undefined) return;
      localTags.value = snapshot.tags; localInput.value = snapshot.draft;
      refreshDeletes();
    };
    const refreshDeletes = (): void => {
      if (root.value === null || connection.value === undefined) return;
      root.value.querySelectorAll<HTMLElement>('[data-sectile-tags-delete]').forEach((element) => {
        connection.value?.setTagAttributes(element, Number(element.dataset['sectileTagsDelete']));
      });
    };
    const connect = (): void => {
      connection.value?.disconnect();
      if (root.value === null || input.value === null) return;
      connection.value = createTagsInput({
        root: root.value, input: input.value, direction: direction.value,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(valueControlled ? { value: props.modelValue as readonly string[] } : { defaultValue: localTags.value }),
        ...(inputControlled ? { inputValue: props.inputValue as string } : { defaultInputValue: localInput.value }),
        disabled: props.disabled, readOnly: props.readonly, label: props.label,
        onValueChange: (next) => { localTags.value = next; emit('update:modelValue', next); },
        onInputValueChange: (next) => { localInput.value = next; emit('update:inputValue', next); },
        onUpdate: refresh,
      });
      refresh();
    };
    provide<RootContext>(rootKey, {
      state, label: computed(() => props.label),
      registerRoot: (element) => { root.value = element ?? null; }, registerInput: (element) => { input.value = element ?? null; },
      registerDelete: (element, index) => connection.value?.setTagAttributes(element, index),
      clear: () => { for (let index = state.value.value.length - 1; index >= 0; index -= 1) connection.value?.handleEvent({ type: 'remove', index }); },
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.disabled, () => props.readonly, () => props.label, () => props.policies, direction], connect);
    watch([() => props.modelValue, () => props.inputValue], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({
        ...(valueControlled ? { value: props.modelValue as readonly string[] } : {}),
        ...(inputControlled ? { inputValue: props.inputValue as string } : {}),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      refresh();
    });
    return (): VNodeChild => {
      const visual = h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : null; },
        role: 'group', 'aria-label': props.label, dir: direction.value, 'data-scope': 'tags-input', 'data-part': 'root',
        'data-disabled': props.disabled ? '' : undefined, 'data-readonly': props.readonly ? '' : undefined,
      }, participation.controlProps.value), { default: () => slots['default']?.(state.value) });
      if (!participation.participating && props.name === undefined && props.form === undefined) return visual;
      return [visual, ...state.value.value.map((tag, index) => h('input', {
        ref: (element: unknown) => {
          submissionElements[index] = element instanceof HTMLInputElement ? element : null;
        },
        type: 'hidden', name: props.name, form: props.form, value: tag, disabled: props.disabled,
        style: visuallyHiddenInputStyle,
      }))];
    };
  },
});

export type TagsInputValueChangeHandler = (value: readonly string[]) => void;
export type TagsInputInputValueChangeHandler = (value: string) => void;

export const TagsInputItem = defineComponent({
  name: 'SectileTagsInputItem', inheritAttrs: false,
  props: { index: { type: Number, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: TagsInputItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TagsInputItem');
    const state = computed<TagsInputItemSlotProps>(() => ({
      index: props.index, value: root.state.value.value[props.index] ?? '',
      disabled: root.state.value.disabled, readonly: root.state.value.readonly,
    }));
    provide<ItemContext>(itemKey, { state });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, 'data-scope': 'tags-input', 'data-part': 'item', 'data-index': props.index,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const TagsInputItemText = defineComponent({
  name: 'SectileTagsInputItemText', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: TagsInputItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const item = useItem('TagsInputItemText');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, 'data-scope': 'tags-input', 'data-part': 'item-text',
    }), { default: () => slots['default']?.(item.state.value) ?? item.state.value.value });
  },
});

export const TagsInputItemDelete = defineComponent({
  name: 'SectileTagsInputItemDelete', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: TagsInputItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TagsInputItemDelete'); const item = useItem('TagsInputItemDelete');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
      elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerDelete(node, item.state.value.index); },
      'data-sectile-tags-delete': item.state.value.index, 'data-scope': 'tags-input', 'data-part': 'item-delete',
      disabled: item.state.value.disabled || item.state.value.readonly,
    }), { default: () => slots['default']?.(item.state.value) });
  },
});

export const TagsInputInput = defineComponent({
  name: 'SectileTagsInputInput', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs }) {
    const root = useRoot('TagsInputInput');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => root.registerInput(node instanceof HTMLInputElement ? node : undefined),
      type: 'text', value: root.state.value.inputValue, disabled: root.state.value.disabled,
      readonly: root.state.value.readonly, 'aria-label': root.label.value,
      'data-scope': 'tags-input', 'data-part': 'input',
    }));
  },
});

export const TagsInputClear = defineComponent({
  name: 'SectileTagsInputClear', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: TagsInputRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TagsInputClear');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
      disabled: root.state.value.disabled || root.state.value.readonly || root.state.value.value.length === 0,
      onClick: root.clear, 'data-scope': 'tags-input', 'data-part': 'clear',
    }), { default: () => slots['default']?.(root.state.value) });
  },
});

function useRoot(part: string): RootContext { const root = inject<RootContext>(rootKey); if (root === undefined) throw new TypeError(`${part} must be used inside TagsInputRoot.`); return root; }
function useItem(part: string): ItemContext { const item = inject<ItemContext>(itemKey); if (item === undefined) throw new TypeError(`${part} must be used inside TagsInputItem.`); return item; }
