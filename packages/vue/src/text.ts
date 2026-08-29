import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
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
import { useNativeInputFormControl } from './internal/form-control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface TextFieldProps {
  readonly modelValue?: string | number;
  readonly defaultValue?: string | number;
  readonly modelModifiers?: TextFieldModelModifiers;
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

export interface TextFieldModelModifiers {
  readonly lazy?: boolean;
  readonly number?: boolean;
  readonly trim?: boolean;
}

export const TextField = defineComponent({
  name: 'SectileTextField',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: undefined },
    defaultValue: { type: [String, Number], default: '' },
    modelModifiers: {
      type: Object as PropType<TextFieldModelModifiers>,
      default: (): TextFieldModelModifiers => ({}),
    },
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
    'update:modelValue': (_value: string | number): boolean => true,
  },
  setup(props, { attrs, emit }) {
    const element = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const controlled = useControlledStateInvariant('TextField', 'modelValue', () => props.modelValue);
    const initialValue = String(controlled ? props.modelValue : props.defaultValue);
    const renderServerValue = typeof window === 'undefined';
    let controller: TextController | null = null;
    let connection: TextConnection | null = null;
    let proposedState: TextState | null = null;
    let mounted = false;

    const createController = (state: TextState): TextController => {
      const result = createTextController({
        ...(controlled && !props.modelModifiers.lazy
          ? { value: state }
          : { defaultValue: state }),
        disabled: props.disabled,
        readOnly: props.readonly,
        onValueChange: (change) => {
          proposedState = change.value;
          if (!props.modelModifiers.lazy) {
            const proposal = change.value;
            const text = proposal.snapshot.text;
            emit('update:modelValue', text);
            void nextTick(() => {
              if (connection === null || proposedState !== proposal) return;
              if (String(props.modelValue) !== text) return;
              proposedState = null;
              const result = connection.syncControlledValues({ value: proposal });
              if (!result.ok) throw new TypeError(result.error.message);
            });
          }
        },
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    };
    const mountConnection = (state: TextState): void => {
      if (!mounted || element.value === null) return;
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
    const participation = useNativeInputFormControl(element, {
      reset: () => {
        queueMicrotask(() => mountConnection(createTextState(
          controlled ? String(props.modelValue) : initialValue,
        )));
      },
    });

    onMounted(() => {
      mounted = true;
      mountConnection(createTextState(initialValue));
    });
    onBeforeUnmount(() => {
      mounted = false;
      connection?.disconnect();
      connection = null;
      controller = null;
      proposedState = null;
    });

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined || connection === null) return;
      const text = String(value);
      const state = proposedState?.snapshot.text === text ? proposedState : createTextState(text);
      proposedState = null;
      if (props.modelModifiers.lazy) {
        mountConnection(state);
        return;
      }
      const result = connection.syncControlledValues({ value: state });
      if (!result.ok) throw new TypeError(result.error.message);
    });
    watch([() => props.disabled, () => props.readonly], () => {
      const state = controller?.getSnapshot().state
        ?? createTextState(String(controlled ? props.modelValue : props.defaultValue));
      mountConnection(state);
    });

    const commitLazyValue = (): void => {
      if (!props.modelModifiers.lazy || controller === null) return;
      emit('update:modelValue', controller.getSnapshot().state.snapshot.text);
    };

    return (): VNodeChild => h(props.multiline ? 'textarea' : 'input', mergeProps(
      attrs,
      {
        ref: element,
        ...(!props.multiline ? { type: props.type } : {}),
        ...(renderServerValue ? { value: initialValue } : {}),
        disabled: props.disabled,
        readonly: props.readonly,
        required: props.required,
        name: props.name,
        form: props.form,
        placeholder: props.placeholder,
        autocomplete: props.autocomplete,
        onChange: commitLazyValue,
        'data-scope': 'text',
        'data-part': 'input',
        'data-disabled': props.disabled ? '' : undefined,
        'data-readonly': props.readonly ? '' : undefined,
      },
      participation.controlProps.value,
    ));
  },
});

export type TextFieldValueChangeHandler = (value: string | number) => void;
