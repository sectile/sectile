import {
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
  type VNodeChild,
} from 'vue';
import {
  connectText,
  createTextController,
  createTextState,
  type TextConnection,
  type TextController,
  type TextState,
} from '@sectile/dom/text';

export interface TextFieldProps {
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly multiline?: boolean;
  readonly type?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly autocomplete?: string;
}

interface TextEmit {
  (event: 'update:modelValue', value: string): void;
}

export const TextField = defineComponent({
  name: 'SectileTextField',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    multiline: { type: Boolean, default: false },
    type: { type: String, default: 'text' },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: undefined },
    autocomplete: { type: String as PropType<string>, default: undefined },
  },
  emits: {
    'update:modelValue': (_value: string): boolean => true,
  },
  setup(props, { attrs, emit }) {
    const element = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const controlled = props.modelValue !== undefined;
    const initialValue = controlled ? props.modelValue as string : props.defaultValue;
    let controller: TextController | null = null;
    let connection: TextConnection | null = null;
    let proposedState: TextState | null = null;

    const createController = (state: TextState): TextController => {
      const result = createTextController({
        ...(controlled ? { value: state } : { defaultValue: state }),
        disabled: props.disabled,
        readOnly: props.readonly,
        onValueChange: (change) => {
          proposedState = change.value;
          emit('update:modelValue', change.value.snapshot.text);
        },
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    };
    const mountConnection = (state: TextState): void => {
      if (element.value === null) return;
      connection?.disconnect();
      controller = createController(state);
      connection = connectText({
        controller,
        element: element.value,
        disabled: props.disabled,
        readOnly: props.readonly,
      });
      connection.render();
    };

    onMounted(() => mountConnection(createTextState(initialValue)));
    onBeforeUnmount(() => connection?.disconnect());

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined || connection === null) return;
      const state = proposedState?.snapshot.text === value ? proposedState : createTextState(value);
      proposedState = null;
      const result = connection.syncControlledValues({ value: state });
      if (!result.ok) throw new TypeError(result.error.message);
    });
    watch([() => props.disabled, () => props.readonly], () => {
      const state = controller?.getSnapshot().state
        ?? createTextState(controlled ? props.modelValue as string : props.defaultValue);
      mountConnection(state);
    });

    return (): VNodeChild => h(props.multiline ? 'textarea' : 'input', mergeProps(
      attrs,
      {
        ref: element,
        ...(!props.multiline ? { type: props.type } : {}),
        value: controlled ? props.modelValue : initialValue,
        disabled: props.disabled,
        readonly: props.readonly,
        required: props.required,
        name: props.name,
        form: props.form,
        placeholder: props.placeholder,
        autocomplete: props.autocomplete,
        'data-scope': 'text',
        'data-part': 'input',
        'data-disabled': props.disabled ? '' : undefined,
        'data-readonly': props.readonly ? '' : undefined,
      },
    ));
  },
});
