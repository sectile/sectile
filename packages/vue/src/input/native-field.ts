import {
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
  type DefineComponent,
  type ComputedRef,
  type ComponentObjectPropsOptions,
  type PropType,
  type ShallowRef,
  type VNodeChild,
} from 'vue';
import type { TextEditingState } from '@sectile/core/text';
import { hiddenInputSubmissionCapabilities, useFormControlFlags, useFormSubmissionProps, useNativeInputFormControl } from '../form/control.js';
import { useControlledStateInvariant } from '../internal/controlled-state.js';
import { captureNativeTextState } from './native-text-state.js';
import { useNextTickTask } from '../internal/scheduled-task.js';

export interface NativeFieldConnection<Value> {
  getSnapshot(): { readonly revision: number };
  getText(): string;
  getValue(): Value | null;
  syncControlledValues(values: { readonly value?: Value | null }): { readonly ok: boolean };
  disconnect(): void;
}

export interface NativeFieldValueControl<Value> {
  readonly element: HTMLInputElement | null;
  readonly composing: Readonly<ShallowRef<boolean>>;
  commit(value: Value | null): boolean;
}
type NativeFieldValueBinding<Value> = (control: NativeFieldValueControl<Value>) => () => void;
const nativeFieldValueBinding = Symbol('SectileNativeFieldValueBinding');

/** Scope a composition command to its single native input, not the outer field. */
export function provideNativeFieldValueControl<Value>(attach: NativeFieldValueBinding<Value>): void {
  provide(nativeFieldValueBinding, attach);
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

export interface NativeFieldPresentation<Value, Policies, Format = undefined> {
  readonly format?: Format;
  readonly inputMode?: 'decimal' | 'numeric' | 'text';
  readonly placeholder?: string;
  formatValue(value: Value): string;
  create(options: NativeFieldFactoryOptions<Value, Policies>): NativeFieldConnection<Value>;
  rebase?(value: Value | null, inputState: TextEditingState, previousFormat: Format | undefined): TextEditingState;
}

export interface NativeFieldComponentConfig<Value, Policies = Readonly<Record<string, unknown>>, Format = undefined, ExtraProps extends object = {}> extends NativeFieldPresentation<Value, Policies, Format> {
  readonly name: string;
  readonly scope: string;
  readonly valueType: PropType<Value | null>;
  readonly inputMode: 'decimal' | 'numeric' | 'text';
  readonly nativeInputType?: 'date' | 'time' | 'datetime-local';
  readonly presentationProps?: ComponentObjectPropsOptions<ExtraProps>;
  /** Explicit user selection differs from controlled-value synchronization. */
  commitValue?(connection: NativeFieldConnection<Value>, value: Value | null): boolean;
  usePresentation?(props: Readonly<NativeFieldPublicProps<Value, Policies> & ExtraProps>): ComputedRef<NativeFieldPresentation<Value, Policies, Format> | undefined>;
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

export function createNativeFieldComponent<Value, Policies = Readonly<Record<string, unknown>>, Format = undefined, ExtraProps extends object = {}>(
  config: NativeFieldComponentConfig<Value, Policies, Format, ExtraProps>,
) {
  return defineComponent({
    name: config.name,
    inheritAttrs: false,
    props: {
      ...config.presentationProps,
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
      const flags = useFormControlFlags(props);
      const valueBinding = config.commitValue === undefined ? undefined : inject<NativeFieldValueBinding<Value> | undefined>(nativeFieldValueBinding, undefined);
      const composingState = valueBinding === undefined ? undefined : shallowRef(false);
      let detachValueControl: (() => void) | undefined;
      const requestedPresentation = config.usePresentation?.(props as unknown as Readonly<NativeFieldPublicProps<Value, Policies> & ExtraProps>);
      const presentation = shallowRef<NativeFieldPresentation<Value, Policies, Format>>(requestedPresentation?.value ?? config);
      const input = shallowRef<HTMLInputElement>();
      let connection: NativeFieldConnection<Value> | undefined;
      let mounted = false;
      const controlled = useControlledStateInvariant(config.name, 'modelValue', () => props.modelValue);
      let acceptedValue = controlled ? props.modelValue as Value | null : undefined;
      const initialProjectedValue = controlled ? props.modelValue : props.defaultValue;
      let resetValue = (initialProjectedValue ?? null) as Value | null;
      const projectedText = shallowRef(
        initialProjectedValue === null || initialProjectedValue === undefined
          ? ''
          : presentation.value.formatValue(initialProjectedValue as Value),
      );
      const projectOptions = () => ({ native: props.native, ...flags.value });
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
      const connect = (preserved?: PreservedNativeField<Value>, reset = false): void => {
        const element = input.value;
        if (element === undefined) return;
        const wanted = requestedPresentation?.value ?? config;
        const previous = presentation.value;
        const dirty = preserved !== undefined && (preserved.inputState.composition !== null || preserved.inputState.snapshot.text !== (preserved.value === null ? '' : previous.formatValue(preserved.value)));
        const deferred = wanted !== previous && dirty;
        const next = deferred ? previous : wanted;
        if (preserved !== undefined && next !== previous) {
          preserved = { value: preserved.value, inputState: next.rebase?.(preserved.value, preserved.inputState, previous.format) ?? preserved.inputState };
        }
        connection?.disconnect();
        const nextOptions = projectOptions();
        projected.value = deferred ? { ...nextOptions, native: projected.value.native } : nextOptions;
        presentation.value = next;
        const fieldOptions: {
          -readonly [Key in keyof NativeFieldFactoryOptions<Value, Policies>]: NativeFieldFactoryOptions<Value, Policies>[Key];
        } & { defaultInputState?: TextEditingState } = {
          input: element,
          disabled: flags.value.disabled,
          readOnly: flags.value.readonly,
          required: flags.value.required,
          native: projected.value.native,
          onValueChange: (value) => {
            emit('update:modelValue', value);
          },
          onUpdate: () => {
            const target = connection;
            if (target === undefined) return;
            projectedText.value = target.getText();
            if ((requestedPresentation?.value ?? config) !== presentation.value) presentationTask?.schedule();
          },
        };
        if (props.policies !== undefined) fieldOptions.policies = props.policies as Policies;
        if (controlled) fieldOptions.value = acceptedValue as Value | null;
        else fieldOptions.defaultValue = (reset ? resetValue : preserved === undefined ? props.defaultValue : preserved.value) as Value | null;
        if (preserved !== undefined) fieldOptions.defaultInputState = preserved.inputState;
        if (props.label !== undefined) fieldOptions.label = props.label;
        connection = next.create(fieldOptions);
        projectedText.value = connection.getText();
      };
      const resetTask = useNextTickTask(() => { if (mounted) connect(undefined, true); });
      const settlePresentation = (): void => {
        if (!mounted || inputComposing || (requestedPresentation?.value ?? config) === presentation.value) return;
        const preserved = capture();
        if (preserved !== undefined && preserved.inputState.composition === null && preserved.inputState.snapshot.text === (preserved.value === null ? '' : presentation.value.formatValue(preserved.value))) connect(preserved);
      };
      const presentationTask = requestedPresentation === undefined ? undefined : useNextTickTask(settlePresentation);
      const participation = useNativeInputFormControl(input, { reset: () => {
        if (!mounted) return;
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        reconnectTimer = null; reconnectPending = false; inputComposing = false;
        if (composingState !== undefined) composingState.value = false;
        resetTask.schedule();
      } });
      const submission = participation.participating
        ? useFormSubmissionProps({ element: input, capabilities: hiddenInputSubmissionCapabilities }) : undefined;
      const requestConnect = (): void => {
        if (inputComposing) {
          reconnectPending = true;
          return;
        }
        connect(capture());
      };
      const setInputComposing = (composing: boolean): void => {
        inputComposing = composing;
        if (composingState !== undefined) composingState.value = composing;
        if (!composing && (requestedPresentation?.value ?? config) !== presentation.value) presentationTask?.schedule();
        if (composing || !reconnectPending || reconnectTimer !== null) return;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (inputComposing) return;
          reconnectPending = false;
          connect(capture());
        }, 0);
      };

      onMounted(() => {
        mounted = true; connect(); resetValue = connection?.getValue() ?? null;
        if (valueBinding !== undefined && composingState !== undefined) detachValueControl = valueBinding({
          get element() { return input.value ?? null; },
          composing: composingState,
          commit(value) {
            if (!mounted || connection === undefined || props.disabled || props.readonly || inputComposing) return false;
            // A deliberate selection replaces the draft in the requested format.
            // Passive parent synchronization still preserves drafts and IME.
            if ((requestedPresentation?.value ?? config) !== presentation.value) connect();
            return config.commitValue?.(connection, value) ?? false;
          },
        });
      });
      onBeforeUnmount(() => {
        mounted = false; resetTask.cancel(); presentationTask?.cancel();
        detachValueControl?.(); detachValueControl = undefined;
        if (composingState !== undefined) composingState.value = false;
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        reconnectPending = false;
        connection?.disconnect();
        connection = undefined; input.value = undefined;
      });
      watch(() => props.modelValue, (value) => {
        if (!controlled || value === undefined || connection === undefined) return;
        const result = connection.syncControlledValues({ value: value as Value | null });
        if (!result.ok) throw new TypeError('Controlled native field synchronization failed.');
        acceptedValue = value as Value | null;
        projectedText.value = connection.getText();
      });
      watch(
        [() => props.policies, () => flags.value.disabled, () => flags.value.readonly,
          () => flags.value.required, () => props.label, () => props.native],
        requestConnect,
      );
      if (requestedPresentation !== undefined) watch(requestedPresentation, settlePresentation);

      const setInput = (element: unknown): void => {
        input.value = element instanceof HTMLInputElement ? element : undefined;
      };

      return (): VNodeChild => h('input', mergeProps(submission?.value ?? {}, attrs, {
        ref: setInput,
        'data-scope': config.scope,
        'data-part': 'input',
        type: projected.value.native && config.nativeInputType !== undefined
          ? config.nativeInputType
          : 'text',
        inputmode: projected.value.native ? undefined : presentation.value.inputMode ?? config.inputMode,
        placeholder: projected.value.native ? undefined : presentation.value.placeholder,
        disabled: projected.value.disabled,
        readonly: projected.value.readonly,
        required: projected.value.required,
        'aria-disabled': String(projected.value.disabled),
        'aria-readonly': String(projected.value.readonly),
        'aria-label': props.label,
        onCompositionstart: () => setInputComposing(true),
        onCompositionend: () => setInputComposing(false),
        value: inputComposing ? input.value?.value ?? projectedText.value : projectedText.value,
      }, participation.controlProps.value));
    },
  }) as unknown as DefineComponent<NativeFieldPublicProps<Value, Policies> & ExtraProps>;
}

interface PreservedNativeField<Value> {
  readonly value: Value | null;
  readonly inputState: TextEditingState;
}
