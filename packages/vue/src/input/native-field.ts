import {
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue';
import type { TextEditingState } from '@sectile/core/text';
import { useNativeInputFormControl } from '../form/control.js';
import { useControlledStateInvariant } from '../internal/controlled-state.js';
import { captureNativeTextState } from './native-text-state.js';

export interface NativeFieldConnection<Value> {
  getSnapshot(): { readonly revision: number };
  getText(): string;
  getValue(): Value | null;
  syncControlledValues(values: { readonly value?: Value | null }): { readonly ok: boolean };
  disconnect(): void;
}

export interface NativeFieldFactoryOptions<Value, Policies = Readonly<Record<string, unknown>>> {
  readonly input: HTMLInputElement;
  readonly policies?: Policies;
  readonly value?: Value | null;
  readonly defaultValue?: Value | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
  readonly onValueChange: (value: Value | null) => void;
  readonly onUpdate: () => void;
}

export interface NativeFieldComponentConfig<Value, Policies = Readonly<Record<string, unknown>>> {
  readonly name: string;
  readonly scope: string;
  readonly valueType: PropType<Value | null>;
  readonly inputMode: 'decimal' | 'numeric' | 'text';
  readonly nativeInputType?: 'date' | 'time' | 'datetime-local';
  readonly placeholder?: string;
  formatValue(value: Value): string;
  create(options: NativeFieldFactoryOptions<Value, Policies>): NativeFieldConnection<Value>;
}

export interface NativeFieldPublicProps<Value, Policies = Readonly<Record<string, unknown>>> {
  readonly modelValue?: Value | null;
  readonly defaultValue?: Value | null;
  readonly policies?: Policies;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
}

export function createNativeFieldComponent<Value, Policies = Readonly<Record<string, unknown>>>(
  config: NativeFieldComponentConfig<Value, Policies>,
) {
  const component = defineComponent({
    name: config.name,
    inheritAttrs: false,
    props: {
      modelValue: { type: config.valueType, default: undefined },
      defaultValue: { type: config.valueType, default: null },
      policies: { type: Object as PropType<Policies>, default: undefined },
      disabled: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
      required: { type: Boolean, default: false },
      label: { type: String, default: undefined },
      native: { type: Boolean, default: false },
    },
    emits: {
      'update:modelValue': (_value: Value | null): boolean => true,
    },
    setup(props, { attrs, emit }) {
      const input = shallowRef<HTMLInputElement>();
      const participation = useNativeInputFormControl(input);
      const connection = shallowRef<NativeFieldConnection<Value>>();
      const controlled = useControlledStateInvariant(config.name, 'modelValue', () => props.modelValue);
      const acceptedValue = shallowRef<Value | null | undefined>(
        controlled ? props.modelValue as Value | null : undefined,
      );
      const initialProjectedValue = controlled ? props.modelValue : props.defaultValue;
      const projectedText = shallowRef(
        initialProjectedValue === null || initialProjectedValue === undefined
          ? ''
          : config.formatValue(initialProjectedValue as Value),
      );
      const projectedNative = shallowRef(props.native);
      const projectedDisabled = shallowRef(props.disabled);
      const projectedReadonly = shallowRef(props.readonly);
      const projectedRequired = shallowRef(props.required);
      let inputComposing = false;
      let reconnectPending = false;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

      const capture = (): PreservedNativeField<Value> | undefined => {
        const target = connection.value;
        const element = input.value;
        if (target === undefined || element === undefined) return undefined;
        return Object.freeze({
          value: target.getValue(),
          inputState: captureNativeTextState(element, target.getText()),
        });
      };
      const connect = (preserved?: PreservedNativeField<Value>): void => {
        const element = input.value;
        if (element === undefined) return;
        connection.value?.disconnect();
        projectedNative.value = props.native;
        projectedDisabled.value = props.disabled;
        projectedReadonly.value = props.readonly;
        projectedRequired.value = props.required;
        const fieldOptions: NativeFieldFactoryOptions<Value, Policies> & {
          readonly defaultInputState?: TextEditingState;
        } = {
          input: element,
          ...(props.policies === undefined ? {} : { policies: props.policies as Policies }),
          ...(controlled
            ? { value: acceptedValue.value as Value | null }
            : {
                defaultValue: (preserved === undefined
                  ? props.defaultValue
                  : preserved.value) as Value | null,
              }),
          ...(preserved === undefined ? {} : { defaultInputState: preserved.inputState }),
          disabled: props.disabled,
          readOnly: props.readonly,
          required: props.required,
          ...(props.label === undefined ? {} : { label: props.label }),
          native: props.native,
          onValueChange: (value) => {
            emit('update:modelValue', value);
          },
          onUpdate: () => {
            const target = connection.value;
            if (target === undefined) return;
            void target.getSnapshot().revision;
            projectedText.value = target.getText();
          },
        };
        connection.value = config.create(fieldOptions);
        projectedText.value = connection.value.getText();
      };
      const requestConnect = (): void => {
        if (inputComposing) {
          reconnectPending = true;
          return;
        }
        connect(capture());
      };
      const setInputComposing = (composing: boolean): void => {
        inputComposing = composing;
        if (composing || !reconnectPending || reconnectTimer !== null) return;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (inputComposing) return;
          reconnectPending = false;
          connect(capture());
        }, 0);
      };

      onMounted(() => connect());
      onBeforeUnmount(() => {
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        reconnectPending = false;
        connection.value?.disconnect();
      });
      watch(() => props.modelValue, (value) => {
        if (!controlled || value === undefined || connection.value === undefined) return;
        const result = connection.value.syncControlledValues({ value: value as Value | null });
        if (!result.ok) throw new TypeError('Controlled native field synchronization failed.');
        acceptedValue.value = value as Value | null;
        projectedText.value = connection.value.getText();
      });
      watch(
        [() => props.policies, () => props.disabled, () => props.readonly,
          () => props.required, () => props.label, () => props.native],
        requestConnect,
      );

      return (): VNodeChild => h('input', mergeProps(attrs, {
        ref: (element: unknown) => {
          input.value = element instanceof HTMLInputElement ? element : undefined;
        },
        'data-scope': config.scope,
        'data-part': 'input',
        type: projectedNative.value && config.nativeInputType !== undefined
          ? config.nativeInputType
          : 'text',
        inputmode: projectedNative.value ? undefined : config.inputMode,
        placeholder: projectedNative.value ? undefined : config.placeholder,
        disabled: projectedDisabled.value,
        readonly: projectedReadonly.value,
        required: projectedRequired.value,
        'aria-disabled': String(projectedDisabled.value),
        'aria-readonly': String(projectedReadonly.value),
        'aria-label': props.label,
        onCompositionstart: () => setInputComposing(true),
        onCompositionend: () => setInputComposing(false),
        value: projectedText.value,
      }, participation.controlProps.value));
    },
  });
  return component as unknown as DefineComponent<NativeFieldPublicProps<Value, Policies>>;
}

interface PreservedNativeField<Value> {
  readonly value: Value | null;
  readonly inputState: TextEditingState;
}
