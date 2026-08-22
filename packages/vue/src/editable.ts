import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createEditable,
  type EditableConnection,
} from '@sectile/dom/editable';
import type { EditablePolicies, EditableState } from '@sectile/core/editable';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface EditableRootProps {
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly submitOnBlur?: boolean;
  readonly policies?: EditablePolicies;
  readonly name?: string;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface EditableRootSlotProps {
  readonly value: string;
  readonly draft: string;
  readonly editing: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

export interface EditablePartProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface EditableContext {
  readonly slotProps: ComputedRef<EditableRootSlotProps>;
  readonly root: ReturnType<typeof ref<HTMLElement | null>>;
  readonly preview: ReturnType<typeof ref<HTMLElement | null>>;
  readonly input: ReturnType<typeof ref<HTMLInputElement | HTMLTextAreaElement | null>>;
  readonly editTrigger: ReturnType<typeof ref<HTMLElement | null>>;
  readonly submitTrigger: ReturnType<typeof ref<HTMLElement | null>>;
  readonly cancelTrigger: ReturnType<typeof ref<HTMLElement | null>>;
  readonly multiline: ReturnType<typeof ref<boolean>>;
}

const editableContextKey = Symbol('SectileEditable');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const EditableRoot = defineComponent({
  name: 'SectileEditableRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    submitOnBlur: { type: Boolean, default: false },
    policies: { type: Object as PropType<EditablePolicies>, default: undefined },
    name: { type: String, default: undefined },
    label: { type: String, default: undefined },
    ...partProps,
  },
  emits: {
    'update:modelValue': (_value: string): boolean => true,
    'update:editing': (_editing: boolean): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: EditableRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const controlled = props.modelValue !== undefined;
    const initial = controlled ? props.modelValue as string : props.defaultValue;
    const snapshot = shallowRef<EditableState>({ value: initial, draft: initial, editing: false });
    const root = ref<HTMLElement | null>(null);
    const preview = ref<HTMLElement | null>(null);
    const input = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const editTrigger = ref<HTMLElement | null>(null);
    const submitTrigger = ref<HTMLElement | null>(null);
    const cancelTrigger = ref<HTMLElement | null>(null);
    const multiline = ref(false);
    let connection: EditableConnection | null = null;

    const refresh = (): void => {
      if (connection !== null) snapshot.value = connection.getSnapshot().state;
    };
    const mount = (): void => {
      if (root.value === null || preview.value === null || input.value === null) return;
      connection?.disconnect();
      connection = createEditable({
        root: root.value,
        preview: preview.value,
        input: input.value,
        ...(editTrigger.value === null ? {} : { editTrigger: editTrigger.value }),
        ...(submitTrigger.value === null ? {} : { submitTrigger: submitTrigger.value }),
        ...(cancelTrigger.value === null ? {} : { cancelTrigger: cancelTrigger.value }),
        ...(controlled ? { value: props.modelValue as string } : { defaultValue: snapshot.value.value }),
        disabled: props.disabled,
        readOnly: props.readonly,
        submitOnBlur: props.submitOnBlur,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(props.name === undefined ? {} : { name: props.name }),
        ...(props.label === undefined ? {} : { label: props.label }),
        onValueChange: (value: string) => emit('update:modelValue', value),
        onEditingChange: (editing: boolean) => emit('update:editing', editing),
        onUpdate: refresh,
      });
      refresh();
    };

    onMounted(mount);
    onBeforeUnmount(() => connection?.disconnect());
    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined || connection === null) return;
      const result = connection.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value.state;
    });
    watch(
      [() => props.disabled, () => props.readonly, () => props.submitOnBlur, () => props.policies],
      () => { void nextTick(mount); },
    );

    const slotProps = computed<EditableRootSlotProps>(() => Object.freeze({
      ...snapshot.value,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    provide<EditableContext>(editableContextKey, {
      slotProps, root, preview, input, editTrigger, submitTrigger, cancelTrigger, multiline,
    });

    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
      'data-scope': 'editable',
      'data-part': 'root',
      'data-state': slotProps.value.editing ? 'editing' : 'idle',
      'data-disabled': props.disabled ? '' : undefined,
      'data-readonly': props.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

export const EditableArea = defineComponent({
  name: 'SectileEditableArea', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: EditableRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const context = useEditableContext('EditableArea'); return (): VNodeChild => renderPart(props, attrs, slots, context, 'area'); },
});

export const EditablePreview = defineComponent({
  name: 'SectileEditablePreview', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'span' } },
  slots: Object as SlotsType<{ default: (props: EditableRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const context = useEditableContext('EditablePreview');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (element: unknown) => { context.preview.value = element as HTMLElement | null; },
      hidden: context.slotProps.value.editing,
      tabindex: context.slotProps.value.disabled ? -1 : 0,
      'data-scope': 'editable', 'data-part': 'preview',
    }), { default: () => slots['default']?.(context.slotProps.value) });
  },
});

export const EditableInput = defineComponent({
  name: 'SectileEditableInput', inheritAttrs: false,
  props: {
    multiline: { type: Boolean, default: false },
    type: { type: String, default: 'text' },
  },
  setup(props, { attrs }) {
    const context = useEditableContext('EditableInput');
    context.multiline.value = props.multiline;
    return (): VNodeChild => h(props.multiline ? 'textarea' : 'input', mergeProps(attrs, {
      ref: (element: unknown) => { context.input.value = element as HTMLInputElement | HTMLTextAreaElement | null; },
      ...(!props.multiline ? { type: props.type } : {}),
      value: context.slotProps.value.draft,
      hidden: !context.slotProps.value.editing,
      disabled: context.slotProps.value.disabled,
      readonly: context.slotProps.value.readonly,
      'data-scope': 'editable', 'data-part': 'input',
    }));
  },
});

export const EditableEditTrigger = createTrigger('Edit', 'editTrigger', 'edit-trigger', false);
export const EditableSubmitTrigger = createTrigger('Submit', 'submitTrigger', 'submit-trigger', true);
export const EditableCancelTrigger = createTrigger('Cancel', 'cancelTrigger', 'cancel-trigger', true);

function createTrigger(
  label: string,
  key: 'editTrigger' | 'submitTrigger' | 'cancelTrigger',
  part: string,
  editing: boolean,
) {
  return defineComponent({
    name: `SectileEditable${label}Trigger`, inheritAttrs: false,
    props: { ...partProps, as: { ...partProps.as, default: 'button' } },
    slots: Object as SlotsType<{ default: (props: EditableRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const context = useEditableContext(`Editable${label}Trigger`);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { context[key].value = element as HTMLElement | null; },
        ...(props.as === 'button' && !props.asChild ? { type: 'button' } : {}),
        hidden: context.slotProps.value.editing !== editing,
        disabled: context.slotProps.value.disabled,
        'data-scope': 'editable', 'data-part': part,
      }), { default: () => slots['default']?.(context.slotProps.value) });
    },
  });
}

function renderPart(
  props: EditablePartProps,
  attrs: Record<string, unknown>,
  slots: { readonly default?: (props: EditableRootSlotProps) => VNodeChild },
  context: EditableContext,
  part: string,
): VNodeChild {
  return h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild,
    'data-scope': 'editable', 'data-part': part,
    'data-state': context.slotProps.value.editing ? 'editing' : 'idle',
  }), { default: () => slots.default?.(context.slotProps.value) });
}

function useEditableContext(part: string): EditableContext {
  const context = inject<EditableContext>(editableContextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside EditableRoot.`);
  return context;
}
