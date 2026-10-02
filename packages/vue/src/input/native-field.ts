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
  return defineComponent({
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
      let connection: NativeFieldConnection<Value> | undefined;
      const controlled = useControlledStateInvariant(config.name, 'modelValue', () => props.modelValue);
      let acceptedValue = controlled ? props.modelValue as Value | null : undefined;
      const initialProjectedValue = controlled ? props.modelValue : props.defaultValue;
      const projectedText = shallowRef(
        initialProjectedValue === null || initialProjectedValue === undefined
          ? ''
          : config.formatValue(initialProjectedValue as Value),
      );
      const projectOptions = () => ({ native: props.native, disabled: props.disabled,
        readonly: props.readonly, required: props.required });
      const projected = shallowRef(projectOptions());
      let inputComposing = false;
      let reconnectPending = false;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

      const capture = (): PreservedNativeField<Value> | undefined => {
        const target = connection;
        const element = input.value;
        if (target === undefined || element === undefined) return undefined;
        return {
          value: target.getValue(),
          inputState: captureNativeTextState(element, target.getText()),
        };
      };
      const connect = (preserved?: PreservedNativeField<Value>): void => {
        const element = input.value;
        if (element === undefined) return;
        connection?.disconnect();
        projected.value = projectOptions();
        const fieldOptions: {
          -readonly [Key in keyof NativeFieldFactoryOptions<Value, Policies>]: NativeFieldFactoryOptions<Value, Policies>[Key];
        } & { defaultInputState?: TextEditingState } = {
          input: element,
          disabled: props.disabled,
          readOnly: props.readonly,
          required: props.required,
          native: props.native,
          onValueChange: (value) => {
            emit('update:modelValue', value);
          },
          onUpdate: () => {
            const target = connection;
            if (target === undefined) return;
            projectedText.value = target.getText();
          },
        };
        if (props.policies !== undefined) fieldOptions.policies = props.policies as Policies;
        if (controlled) fieldOptions.value = acceptedValue as Value | null;
        else fieldOptions.defaultValue = (preserved === undefined ? props.defaultValue : preserved.value) as Value | null;
        if (preserved !== undefined) fieldOptions.defaultInputState = preserved.inputState;
        if (props.label !== undefined) fieldOptions.label = props.label;
        connection = config.create(fieldOptions);
        projectedText.value = connection.getText();
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
        connection?.disconnect();
      });
      watch(() => props.modelValue, (value) => {
        if (!controlled || value === undefined || connection === undefined) return;
        const result = connection.syncControlledValues({ value: value as Value | null });
        if (!result.ok) throw new TypeError('Controlled native field synchronization failed.');
        acceptedValue = value as Value | null;
        projectedText.value = connection.getText();
      });
      watch(
        [() => props.policies, () => props.disabled, () => props.readonly,
          () => props.required, () => props.label, () => props.native],
        requestConnect,
      );

      const setInput = (element: unknown): void => {
        input.value = element instanceof HTMLInputElement ? element : undefined;
      };

      return (): VNodeChild => h('input', mergeProps(attrs, {
        ref: setInput,
        'data-scope': config.scope,
        'data-part': 'input',
        type: projected.value.native && config.nativeInputType !== undefined
          ? config.nativeInputType
          : 'text',
        inputmode: projected.value.native ? undefined : config.inputMode,
        placeholder: projected.value.native ? undefined : config.placeholder,
        disabled: projected.value.disabled,
        readonly: projected.value.readonly,
        required: projected.value.required,
        'aria-disabled': String(projected.value.disabled),
        'aria-readonly': String(projected.value.readonly),
        'aria-label': props.label,
        onCompositionstart: () => setInputComposing(true),
        onCompositionend: () => setInputComposing(false),
        value: projectedText.value,
      }, participation.controlProps.value));
    },
  }) as unknown as DefineComponent<NativeFieldPublicProps<Value, Policies>>;
}

interface PreservedNativeField<Value> {
  readonly value: Value | null;
  readonly inputState: TextEditingState;
}
