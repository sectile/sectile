import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted,
  provide, shallowRef, watch, type ComputedRef, type SetupContext,
  type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import type { TextEditingState } from '@sectile/core/text';
import { hiddenInputSubmissionCapabilities, useCompositeFormControl } from '../form/control.js';
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

interface RangeFieldOptions<Value, Policies> {
  readonly startInput: HTMLInputElement;
  readonly endInput: HTMLInputElement;
  readonly value?: Value | null;
  readonly defaultValue?: Value | null;
  readonly defaultStartInputState?: TextEditingState;
  readonly defaultEndInputState?: TextEditingState;
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

export interface NativeRangeFieldConfig<Value, Policies, State extends RangeFieldState<Value>> {
  readonly name: string;
  readonly scope: string;
  readonly contextKey: symbol;
  readonly reset?: boolean;
  initial(options: { readonly value: Value | null }): RangeResult<State>;
  create(options: RangeFieldOptions<Value, Policies>): RangeFieldConnection<Value, State>;
}

interface RangeFieldContext<Value> {
  readonly slotProps: ComputedRef<RangeFieldSlotProps<Value>>;
  readonly startInput: ShallowRef<HTMLInputElement | null>;
  readonly endInput: ShallowRef<HTMLInputElement | null>;
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
  const initial = config.initial({ value: controlled ? props.modelValue as Value | null : props.defaultValue });
  if (!initial.ok) throw new TypeError(initial.error.message);
  const snapshot = shallowRef<State>(initial.value);
  const startInput = shallowRef<HTMLInputElement | null>(null);
  const endInput = shallowRef<HTMLInputElement | null>(null);
  const root = shallowRef<HTMLElement | null>(null);
  let mounted = false;
  let connection: RangeFieldConnection<Value, State> | null = null;
  const participation = useCompositeFormControl({
    root,
    focusTarget: startInput,
    submissions: () => [
      { element: startInput, relativeName: 'start', capabilities: hiddenInputSubmissionCapabilities },
      { element: endInput, relativeName: 'end', capabilities: hiddenInputSubmissionCapabilities },
    ],
    ...(config.reset ? { reset: () => queueMicrotask(() => {
      if (!controlled) snapshot.value = initial.value;
      mount();
    }) } : {}),
  });
  const refresh = (): void => { if (connection !== null) snapshot.value = connection.getSnapshot().state; };
  const mount = (preserveNative = false): void => {
    if (!mounted || startInput.value === null || endInput.value === null) return;
    const startState = preserveNative && connection !== null
      ? captureNativeTextState(startInput.value, snapshot.value.start.inputState.snapshot.text)
      : undefined;
    const endState = preserveNative && connection !== null
      ? captureNativeTextState(endInput.value, snapshot.value.end.inputState.snapshot.text)
      : undefined;
    connection?.disconnect();
    const fieldOptions: {
      -readonly [Key in keyof RangeFieldOptions<Value, Policies>]: RangeFieldOptions<Value, Policies>[Key];
    } = {
      startInput: startInput.value,
      endInput: endInput.value,
      disabled: props.disabled,
      readOnly: props.readonly,
      required: props.required,
      onValueChange: (value) => emit('update:modelValue', value),
      onUpdate: refresh,
    };
    if (controlled) fieldOptions.value = props.modelValue as Value | null;
    else fieldOptions.defaultValue = snapshot.value.value;
    if (startState !== undefined) fieldOptions.defaultStartInputState = startState;
    if (endState !== undefined) fieldOptions.defaultEndInputState = endState;
    const { policies, startLabel, endLabel } = props;
    if (policies !== undefined) fieldOptions.policies = policies;
    if (startLabel !== undefined) fieldOptions.startLabel = startLabel;
    if (endLabel !== undefined) fieldOptions.endLabel = endLabel;
    connection = config.create(fieldOptions);
    refresh();
  };
  const mountTask = useNextTickTask(() => mount(true));
  let composingInputs = 0;
  let reconnectPending = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const requestMount = (): void => {
    if (composingInputs !== 0) { reconnectPending = true; return; }
    mountTask.schedule();
  };
  const setInputComposing = (endpoint: 'start' | 'end', composing: boolean): void => {
    const bit = endpoint === 'start' ? 1 : 2;
    if (composing) composingInputs |= bit;
    else composingInputs &= ~bit;
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
    mountTask.cancel();
    connection?.disconnect();
    connection = null;
  });
  watch(() => props.modelValue, (value) => {
    if (!controlled || value === undefined || connection === null) return;
    const result = connection.syncControlledValues({ value });
    if (!result.ok) throw new TypeError(result.error.message);
    snapshot.value = result.value.state;
  });
  watch([() => props.policies, () => props.disabled, () => props.readonly,
    () => props.required, () => props.startLabel, () => props.endLabel], requestMount);
  const slotProps = computed<RangeFieldSlotProps<Value>>(() => Object.freeze({
    value: snapshot.value.value,
    startText: snapshot.value.start.inputState.snapshot.text,
    endText: snapshot.value.end.inputState.snapshot.text,
    active: snapshot.value.active,
    disabled: props.disabled,
    readonly: props.readonly,
  }));
  provide<RangeFieldContext<Value>>(config.contextKey, { slotProps, startInput, endInput, setInputComposing });
  return (): VNodeChild => h(Primitive, mergeProps(participation.controlProps.value, attrs, {
    as: props.as, asChild: props.asChild,
    elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
    role: 'group', 'data-scope': config.scope, 'data-part': 'root',
    'data-disabled': props.disabled ? '' : undefined,
    'data-readonly': props.readonly ? '' : undefined,
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
      return (): VNodeChild => h('input', mergeProps(attrs, {
        ref: (element: unknown) => { context[endpoint === 'start' ? 'startInput' : 'endInput'].value = element as HTMLInputElement | null; },
        type: 'text', inputmode: 'numeric', placeholder,
        value: endpoint === 'start' ? context.slotProps.value.startText : context.slotProps.value.endText,
        disabled: context.slotProps.value.disabled, readonly: context.slotProps.value.readonly,
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
