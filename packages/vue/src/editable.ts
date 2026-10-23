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
  type ComputedRef,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createEditable,
  type EditableConnection,
  type EditableBindingOptions,
  type EditablePolicies,
  type EditableState,
} from '@sectile/dom/editable';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useFormControlFlags, useNativeInputFormControl } from './form/control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { useNextTickTask } from './internal/scheduled-task.js';

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
export interface EditableInputExpose { readonly element: HTMLInputElement | HTMLTextAreaElement | null }

interface EditableContext {
  readonly slotProps: ComputedRef<EditableRootSlotProps>;
  readonly root: ShallowRef<HTMLElement | null>;
  readonly preview: ShallowRef<HTMLElement | null>;
  readonly input: ShallowRef<HTMLInputElement | HTMLTextAreaElement | null>;
  readonly editTrigger: ShallowRef<HTMLElement | null>;
  readonly submitTrigger: ShallowRef<HTMLElement | null>;
  readonly cancelTrigger: ShallowRef<HTMLElement | null>;
  readonly multiline: ShallowRef<boolean>;
  setMultiline(value: boolean): void;
  setInputComposing(composing: boolean): void;
  reset(): void;
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
    const flags = useFormControlFlags(props);
    const controlled = useControlledStateInvariant('EditableRoot', 'modelValue', () => props.modelValue);
    const initial = controlled ? props.modelValue as string : props.defaultValue;
    const snapshot = shallowRef<EditableState>({ value: initial, draft: initial, editing: false });
    const root = shallowRef<HTMLElement | null>(null);
    const preview = shallowRef<HTMLElement | null>(null);
    const input = shallowRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const editTrigger = shallowRef<HTMLElement | null>(null);
    const submitTrigger = shallowRef<HTMLElement | null>(null);
    const cancelTrigger = shallowRef<HTMLElement | null>(null);
    const multiline = shallowRef(false);
    let connection: EditableConnection | null = null;
    let mounted = false;
    let restoreInputFocus = false;

    const refresh = (): void => {
      if (connection !== null) snapshot.value = connection.getSnapshot().state;
    };
    const mount = (): void => {
      if (!mounted || root.value === null || preview.value === null || input.value === null) return;
      const binding: EditableBindingOptions = {
        root: root.value,
        preview: preview.value,
        input: input.value,
        ...(editTrigger.value === null ? {} : { editTrigger: editTrigger.value }),
        ...(submitTrigger.value === null ? {} : { submitTrigger: submitTrigger.value }),
        ...(cancelTrigger.value === null ? {} : { cancelTrigger: cancelTrigger.value }),
        disabled: flags.value.disabled,
        readOnly: flags.value.readonly,
        submitOnBlur: props.submitOnBlur,
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        ...(props.name === undefined ? {} : { name: props.name }),
        ...(props.label === undefined ? {} : { label: props.label }),
      };
      if (connection !== null) {
        const result = connection.syncOptions(binding);
        if (!result.ok) throw new TypeError(result.error.message);
      } else connection = createEditable({ ...binding,
        ...(controlled ? { value: props.modelValue as string } : { defaultValue: snapshot.value.value }),
        onValueChange: (value: string) => emit('update:modelValue', value),
        onEditingChange: (editing: boolean) => emit('update:editing', editing),
        onUpdate: refresh,
      });
      refresh();
      if (restoreInputFocus && snapshot.value.editing) input.value.focus();
      restoreInputFocus = false;
    };
    const reset = (): void => {
      queueMicrotask(() => {
        if (!mounted) return;
        mountTask.cancel();
        connection?.disconnect();
        connection = null;
        const value = controlled ? props.modelValue as string : initial;
        snapshot.value = { value, draft: value, editing: false };
        mount();
      });
    };
    const mountTask = useNextTickTask(mount);
    let inputComposing = false;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingMultiline: boolean | undefined;
    const requestMount = (): void => {
      if (inputComposing || reconnectTimer !== null) {
        reconnectPending = true;
        return;
      }
      mountTask.schedule();
    };
    const setMultiline = (value: boolean): void => {
      if (inputComposing || reconnectTimer !== null) {
        pendingMultiline = value;
        reconnectPending = true;
      } else multiline.value = value;
    };
    const setInputComposing = (composing: boolean): void => {
      inputComposing = composing;
      if (composing || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || inputComposing) return;
        reconnectPending = false;
        if (pendingMultiline !== undefined) { multiline.value = pendingMultiline; pendingMultiline = undefined; }
        mountTask.schedule();
      }, 0);
    };

    onMounted(() => {
      mounted = true;
      mount();
    });
    onBeforeUnmount(() => {
      mounted = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      pendingMultiline = undefined;
      restoreInputFocus = false;
      mountTask.cancel();
      connection?.disconnect();
      connection = null;
    });
    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined || connection === null) return;
      const result = connection.syncControlledValue(value);
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value.state;
    });
    watch(
      [() => flags.value.disabled, () => flags.value.readonly, () => props.submitOnBlur, () => props.policies, () => props.label, () => props.name],
      requestMount,
    );
    watch(input, (_next, previous) => {
      if (previous !== null && previous.ownerDocument.activeElement === previous) restoreInputFocus = true;
    }, { flush: 'sync' });
    watch([root, preview, input, editTrigger, submitTrigger, cancelTrigger], requestMount, { flush: 'post' });

    const slotProps = computed<EditableRootSlotProps>(() => Object.freeze({
      ...snapshot.value,
      disabled: flags.value.disabled,
      readonly: flags.value.readonly,
    }));
    provide<EditableContext>(editableContextKey, {
      slotProps, root, preview, input, editTrigger, submitTrigger, cancelTrigger, multiline,
      setInputComposing, setMultiline,
      reset,
    });

    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
      'data-scope': 'editable',
      'data-part': 'root',
      'data-state': slotProps.value.editing ? 'editing' : 'idle',
      'data-disabled': flags.value.disabled ? '' : undefined,
      'data-readonly': flags.value.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

export type EditableValueChangeHandler = (value: string) => void;
export type EditableEditingChangeHandler = (editing: boolean) => void;

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
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
  },
  setup(props, { attrs, expose }) {
    const context = useEditableContext('EditableInput');
    expose({ get element() { return context.input.value; } });
    const participation = useNativeInputFormControl(context.input, { reset: context.reset });
    const renderServerValue = typeof window === 'undefined';
    watch(() => props.multiline, context.setMultiline, { immediate: true });
    return (): VNodeChild => h(context.multiline.value ? 'textarea' : 'input', mergeProps(attrs, {
      ref: (element: unknown) => { context.input.value = element as HTMLInputElement | HTMLTextAreaElement | null; },
      ...(!context.multiline.value ? { type: props.type } : {}),
      name: props.name,
      form: props.form,
      required: props.required,
      ...(renderServerValue ? { value: context.slotProps.value.draft } : {}),
      hidden: !context.slotProps.value.editing,
      disabled: context.slotProps.value.disabled,
      readonly: context.slotProps.value.readonly,
      onCompositionstart: () => context.setInputComposing(true),
      onCompositionend: () => context.setInputComposing(false),
      'data-scope': 'editable', 'data-part': 'input',
      'data-multiline': context.multiline.value ? 'true' : undefined,
    }, participation.controlProps.value));
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
