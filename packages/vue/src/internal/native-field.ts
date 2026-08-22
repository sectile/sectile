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

export interface NativeFieldConnection<Value> {
  getSnapshot(): { readonly revision: number };
  getText(): string;
  getValue(): Value | null;
  syncControlledValues(values: { readonly value?: Value | null }): { readonly ok: boolean };
  disconnect(): void;
}

export interface NativeFieldFactoryOptions<Value> {
  readonly input: HTMLInputElement;
  readonly policies?: Readonly<Record<string, unknown>>;
  readonly value?: Value | null;
  readonly defaultValue?: Value | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly onValueChange: (value: Value | null) => void;
  readonly onUpdate: () => void;
}

export interface NativeFieldComponentConfig<Value> {
  readonly name: string;
  readonly scope: string;
  readonly valueType: PropType<Value | null>;
  readonly inputMode: 'decimal' | 'numeric' | 'text';
  readonly placeholder?: string;
  formatValue(value: Value): string;
  create(options: NativeFieldFactoryOptions<Value>): NativeFieldConnection<Value>;
}

export interface NativeFieldPublicProps<Value> {
  readonly modelValue?: Value | null;
  readonly defaultValue?: Value | null;
  readonly policies?: Readonly<Record<string, unknown>>;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
}

export function createNativeFieldComponent<Value>(
  config: NativeFieldComponentConfig<Value>,
) {
  const component = defineComponent({
    name: config.name,
    inheritAttrs: false,
    props: {
      modelValue: { type: config.valueType, default: undefined },
      defaultValue: { type: config.valueType, default: null },
      policies: { type: Object as PropType<Readonly<Record<string, unknown>>>, default: undefined },
      disabled: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
      required: { type: Boolean, default: false },
      label: { type: String, default: undefined },
    },
    emits: {
      'update:modelValue': (_value: Value | null): boolean => true,
    },
    setup(props, { attrs, emit }) {
      const input = shallowRef<HTMLInputElement>();
      const connection = shallowRef<NativeFieldConnection<Value>>();
      const controlled = props.modelValue !== undefined;

      const connect = (preserved?: Value | null): void => {
        if (input.value === undefined) return;
        connection.value?.disconnect();
        const fieldOptions: NativeFieldFactoryOptions<Value> = {
          input: input.value,
          ...(props.policies === undefined ? {} : { policies: props.policies }),
          ...(controlled
            ? { value: props.modelValue as Value | null }
            : { defaultValue: (preserved === undefined ? props.defaultValue : preserved) as Value | null }),
          disabled: props.disabled,
          readOnly: props.readonly,
          required: props.required,
          ...(props.label === undefined ? {} : { label: props.label }),
          onValueChange: (value) => emit('update:modelValue', value),
          onUpdate: () => {
            if (connection.value !== undefined) void connection.value.getSnapshot().revision;
          },
        };
        connection.value = config.create(fieldOptions);
      };

      onMounted(() => connect());
      onBeforeUnmount(() => connection.value?.disconnect());
      watch(() => props.modelValue, (value) => {
        if (!controlled || value === undefined || connection.value === undefined) return;
        connection.value.syncControlledValues({ value: value as Value | null });
      });
      watch(
        [() => props.policies, () => props.disabled, () => props.readonly,
          () => props.required, () => props.label],
        () => connect(connection.value?.getValue()),
      );

      return (): VNodeChild => h('input', mergeProps(attrs, {
        ref: (element: unknown) => {
          input.value = element instanceof HTMLInputElement ? element : undefined;
        },
        'data-scope': config.scope,
        'data-part': 'input',
        type: 'text',
        inputmode: config.inputMode,
        placeholder: config.placeholder,
        disabled: props.disabled,
        readonly: props.readonly,
        required: props.required,
        'aria-disabled': String(props.disabled),
        'aria-readonly': String(props.readonly),
        'aria-label': props.label,
        value: (() => {
          const value = controlled ? props.modelValue : props.defaultValue;
          return value === null || value === undefined ? '' : config.formatValue(value as Value);
        })(),
      }));
    },
  });
  return component as unknown as DefineComponent<NativeFieldPublicProps<Value>>;
}
