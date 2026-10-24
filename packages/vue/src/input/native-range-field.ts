import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted,
  provide, shallowRef, ssrContextKey, watch, type ComputedRef, type SetupContext,
  type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import type { TextEditingState } from '@sectile/core/text';
import { hiddenInputSubmissionCapabilities, useCompositeFormControl, useFormControlFlags, useFormMetadataPresence, useFormSubmissionProps } from '../form/control.js';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import { useControlledStateInvariant } from '../internal/controlled-state.js';
import { useNextTickTask } from '../internal/scheduled-task.js';
import { captureNativeTextState } from './native-text-state.js';

interface RangeFieldState<Value> {
  readonly value: Value | null;
  readonly start: { readonly inputState: TextEditingState };
  readonly end: { readonly inputState: TextEditingState };
  readonly active: 'start' | 'end';
}

interface RangeFieldSlotProps<Value> {
  readonly value: Value | null;
  readonly startText: string;
  readonly endText: string;
  readonly active: 'start' | 'end';
  readonly disabled: boolean;
  readonly readonly: boolean;
}

interface RangeFieldProps<Value, Policies> {
  readonly name?: string | undefined;
  readonly form?: string | undefined;
  readonly modelValue: Value | null | undefined;
  readonly defaultValue: Value | null;
  readonly policies: Policies | undefined;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
  readonly startLabel: string | undefined;
  readonly endLabel: string | undefined;
  readonly as: PrimitiveAs;
  readonly asChild: boolean;
}

interface RangeFieldOptions<Value, Policies, State = never> {
  readonly startInput: HTMLInputElement;
  readonly endInput: HTMLInputElement;
  readonly value?: Value | null;
  readonly defaultValue?: Value | null;
  readonly defaultStartInputState?: TextEditingState;
  readonly defaultEndInputState?: TextEditingState;
  readonly defaultState?: State;
  readonly policies?: Policies;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly startLabel?: string;
  readonly endLabel?: string;
  onValueChange(value: Value | null): void;
  onUpdate(): void;
}

type RangeResult<State> = { readonly ok: true; readonly value: State }
  | { readonly ok: false; readonly error: { readonly message: string } };

interface RangeFieldConnection<Value, State> {
  getSnapshot(): { readonly state: State };
  syncControlledValues(values: { readonly value: Value | null }): RangeResult<{ readonly state: State }>;
  disconnect(): void;
}

export interface NativeRangePresentation<Value, Policies, State extends RangeFieldState<Value>> {
  readonly inputMode?: 'numeric' | 'text';
  readonly placeholder?: string;
  initial(options: { readonly value: Value | null }): RangeResult<State>;
  create(options: RangeFieldOptions<Value, Policies, State>): RangeFieldConnection<Value, State>;
  rebase?(state: State, start: TextEditingState, end: TextEditingState): RangeResult<State>;
}
export interface NativeRangeFieldConfig<Value, Policies, State extends RangeFieldState<Value>> extends NativeRangePresentation<Value, Policies, State> {
  readonly name: string;
  readonly scope: string;
  readonly contextKey: symbol;
  readonly reset?: boolean;
  usePresentation?(): ComputedRef<NativeRangePresentation<Value, Policies, State> | undefined>;
}

interface RangeFieldContext<Value> {
  readonly slotProps: ComputedRef<RangeFieldSlotProps<Value>>;
  readonly required: boolean;
  readonly startInput: ShallowRef<HTMLInputElement | null>;
  readonly endInput: ShallowRef<HTMLInputElement | null>;
  readonly placeholder: ComputedRef<string | undefined>;
  readonly inputMode: ComputedRef<'numeric' | 'text'>;
  readonly submissionProps: Readonly<Record<'start' | 'end', ComputedRef<Readonly<Record<string, unknown>>>>>;
  isInputComposing(endpoint: 'start' | 'end'): boolean;
  setInputComposing(endpoint: 'start' | 'end', composing: boolean): void;
}

export function setupNativeRangeField<Value, Policies, State extends RangeFieldState<Value>>(
  config: NativeRangeFieldConfig<Value, Policies, State>,
  props: RangeFieldProps<Value, Policies>,
  { attrs, emit, slots }: SetupContext<{
    'update:modelValue': (value: Value | null) => boolean;
  }, SlotsType<{ default: (props: RangeFieldSlotProps<Value>) => VNodeChild }>>,
): () => VNodeChild {
  const controlled = useControlledStateInvariant(config.name, 'modelValue', () => props.modelValue);
  const requested = config.usePresentation?.();
  const presentation = shallowRef<NativeRangePresentation<Value, Policies, State>>(requested?.value ?? config);
  const initial = presentation.value.initial({ value: controlled ? props.modelValue as Value | null : props.defaultValue });
  if (!initial.ok) throw new TypeError(initial.error.message);
  const snapshot = shallowRef<State>(initial.value);
  const startInput = shallowRef<HTMLInputElement | null>(null);
  const endInput = shallowRef<HTMLInputElement | null>(null);
  const root = shallowRef<HTMLElement | null>(null);
  let mounted = false;
  let connection: RangeFieldConnection<Value, State> | null = null;
  const submissions = [
    { element: startInput, relativeName: 'start', capabilities: hiddenInputSubmissionCapabilities },
    { element: endInput, relativeName: 'end', capabilities: hiddenInputSubmissionCapabilities },
  ] as const;
  const explicit = useFormMetadataPresence();
  const flags = useFormControlFlags(props);
  const endpointSubmissionProps = (endpoint: 'start' | 'end', index: 0 | 1) => {
    const inherited = useFormSubmissionProps(submissions[index]);
    return computed<Readonly<Record<string, unknown>>>(() => {
      const attributes = { ...inherited.value };
      if (explicit.value.includes('name')) {
        const name = props.name;
        // Native names are opaque namespaces; FormField owns domain path encoding.
        attributes['name'] = name === undefined || name === '' ? name : `${name}.${endpoint}`;
      }
      if (explicit.value.includes('form')) attributes['form'] = props.form;
      Object.assign(attributes, flags.value);
      return attributes;
    });
  };
  const submissionProps = { start: endpointSubmissionProps('start', 0), end: endpointSubmissionProps('end', 1) };
  const participation = useCompositeFormControl({
    root,
    focusTarget: startInput,
    submissions,
    ...(config.reset ? { reset: () => resetTask?.schedule() } : {}),
  });
  const refresh = (): void => {
    if (connection !== null) snapshot.value = connection.getSnapshot().state;
    if ((requested?.value ?? config) !== presentation.value) presentationTask?.schedule();
  };
  const mount = (preserveNative = false, convertedState?: State): void => {
    if (!mounted || startInput.value === null || endInput.value === null) return;
    let startState = preserveNative && connection !== null
      ? captureNativeTextState(startInput.value, snapshot.value.start.inputState.snapshot.text)
      : undefined;
    let endState = preserveNative && connection !== null
      ? captureNativeTextState(endInput.value, snapshot.value.end.inputState.snapshot.text)
      : undefined;
    const wanted = requested?.value ?? config;
    let next = presentation.value;
    let restored = snapshot.value;
    if (wanted !== next && startState !== undefined && endState !== undefined) {
      const converted = convertedState === undefined
        ? wanted.rebase?.(snapshot.value, startState, endState)
        : { ok: true as const, value: convertedState };
      if (converted?.ok) { next = wanted; restored = converted.value; startState = restored.start.inputState; endState = restored.end.inputState; }
    } else if (!preserveNative) {
      next = wanted;
      const converted = next.initial({ value: controlled ? props.modelValue as Value | null : snapshot.value.value });
      if (!converted.ok) throw new TypeError(converted.error.message);
      restored = converted.value;
    }
    connection?.disconnect(); presentation.value = next;
    const fieldOptions: {
      -readonly [Key in keyof RangeFieldOptions<Value, Policies, State>]: RangeFieldOptions<Value, Policies, State>[Key];
    } = {
      startInput: startInput.value,
      endInput: endInput.value,
      disabled: flags.value.disabled,
      readOnly: flags.value.readonly,
      required: flags.value.required,
      onValueChange: (value) => emit('update:modelValue', value),
      onUpdate: refresh,
    };
    if (controlled) fieldOptions.value = props.modelValue as Value | null;
    else fieldOptions.defaultValue = snapshot.value.value;
    fieldOptions.defaultState = restored;
    if (startState !== undefined) fieldOptions.defaultStartInputState = startState;
    if (endState !== undefined) fieldOptions.defaultEndInputState = endState;
    const { policies, startLabel, endLabel } = props;
    if (policies !== undefined) fieldOptions.policies = policies;
    if (startLabel !== undefined) fieldOptions.startLabel = startLabel;
    if (endLabel !== undefined) fieldOptions.endLabel = endLabel;
    connection = next.create(fieldOptions);
    refresh();
  };
  const mountTask = useNextTickTask(() => mount(true));
  const resetTask = config.reset ? useNextTickTask(() => {
    if (!controlled) snapshot.value = initial.value;
    mount();
  }) : undefined;
  let composingInputs = 0;
  let reconnectPending = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const settlePresentation = (): void => {
    if (!mounted || composingInputs !== 0 || (requested?.value ?? config) === presentation.value || startInput.value === null || endInput.value === null) return;
    const wanted = requested?.value ?? config;
    const converted = wanted.rebase?.(snapshot.value, captureNativeTextState(startInput.value, snapshot.value.start.inputState.snapshot.text), captureNativeTextState(endInput.value, snapshot.value.end.inputState.snapshot.text));
    if (converted?.ok) mount(true, converted.value);
  };
  const presentationTask = requested === undefined ? undefined : useNextTickTask(settlePresentation);
  const requestMount = (): void => {
    if (composingInputs !== 0) { reconnectPending = true; return; }
    mountTask.schedule();
  };
  const setInputComposing = (endpoint: 'start' | 'end', composing: boolean): void => {
    const bit = endpoint === 'start' ? 1 : 2;
    if (composing) composingInputs |= bit;
    else composingInputs &= ~bit;
    if (composingInputs === 0 && (requested?.value ?? config) !== presentation.value) presentationTask?.schedule();
    if (composingInputs !== 0 || !reconnectPending || reconnectTimer !== null) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!mounted || composingInputs !== 0) return;
      reconnectPending = false;
      mountTask.schedule();
    }, 0);
  };
  onMounted(() => { mounted = true; mount(); });
  onBeforeUnmount(() => {
    mounted = false;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    reconnectPending = false;
    composingInputs = 0;
    mountTask.cancel(); resetTask?.cancel(); presentationTask?.cancel();
    connection?.disconnect();
    connection = null;
  });
  watch(() => props.modelValue, (value) => {
    if (!controlled || value === undefined || connection === null) return;
    const result = connection.syncControlledValues({ value });
    if (!result.ok) throw new TypeError(result.error.message);
    snapshot.value = result.value.state;
    if ((requested?.value ?? config) !== presentation.value) presentationTask?.schedule();
  });
  watch([() => props.policies, () => flags.value.disabled, () => flags.value.readonly,
    () => flags.value.required, () => props.startLabel, () => props.endLabel], requestMount);
  if (requested !== undefined) watch(requested, settlePresentation);
  const slotProps = computed<RangeFieldSlotProps<Value>>(() => Object.freeze({
    value: snapshot.value.value,
    startText: snapshot.value.start.inputState.snapshot.text,
    endText: snapshot.value.end.inputState.snapshot.text,
    active: snapshot.value.active,
    disabled: flags.value.disabled,
    readonly: flags.value.readonly,
  }));
  provide<RangeFieldContext<Value>>(config.contextKey, {
    slotProps, startInput, endInput, setInputComposing,
    get required() { return flags.value.required; },
    isInputComposing: (endpoint) => (composingInputs & (endpoint === 'start' ? 1 : 2)) !== 0,
    placeholder: computed(() => presentation.value.placeholder),
    inputMode: computed(() => presentation.value.inputMode ?? 'numeric'),
    submissionProps,
  });
  return (): VNodeChild => h(Primitive, mergeProps(participation.controlProps.value, attrs, {
    as: props.as, asChild: props.asChild,
    elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
    role: 'group', 'data-scope': config.scope, 'data-part': 'root',
    'data-disabled': flags.value.disabled ? '' : undefined,
    'data-readonly': flags.value.readonly ? '' : undefined,
  }), { default: () => slots['default']?.(slotProps.value) });
}

export function createNativeRangeFieldInput(
  contextKey: symbol, scope: string, placeholder: string, endpoint: 'start' | 'end', name: string, rootName: string,
) {
  return defineComponent({
    name, inheritAttrs: false,
    setup(_props, { attrs }) {
      const context = inject<RangeFieldContext<unknown>>(contextKey);
      if (context === undefined) throw new TypeError(`${name} must be used inside ${rootName}.`);
      const renderServerValue = inject(ssrContextKey, undefined) !== undefined;
      return (): VNodeChild => h('input', mergeProps(context.submissionProps[endpoint].value, attrs, {
        ref: (element: unknown) => { context[endpoint === 'start' ? 'startInput' : 'endInput'].value = element as HTMLInputElement | null; },
        type: 'text', inputmode: context.inputMode.value, placeholder: context.placeholder.value ?? placeholder,
        ...(renderServerValue ? { value: endpoint === 'start' ? context.slotProps.value.startText : context.slotProps.value.endText } : {}),
        onCompositionstart: () => context.setInputComposing(endpoint, true),
        onCompositionend: () => context.setInputComposing(endpoint, false),
        'aria-disabled': String(context.slotProps.value.disabled),
        'aria-readonly': String(context.slotProps.value.readonly),
        'data-scope': scope, 'data-part': `${endpoint}-input`,
        'data-active': context.slotProps.value.active === endpoint ? '' : undefined,
      }));
    },
  });
}
