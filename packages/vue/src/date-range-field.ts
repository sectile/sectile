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
import { createDateRangeField, tryCreateDateRangeFieldState, type DateRangeFieldConnection, type DateRangeFieldPolicies, type DateRangeFieldState } from '@sectile/dom/temporal/date-range-field';
import type { DateRange } from '@sectile/dom/temporal/date-field';
import {
  hiddenInputSubmissionCapabilities,
  useCompositeFormControl,
} from './internal/form-control.js';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface DateRangeFieldRootProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly policies?: DateRangeFieldPolicies;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface DateRangeFieldRootSlotProps {
  readonly value: DateRange | null;
  readonly startText: string;
  readonly endText: string;
  readonly active: 'start' | 'end';
  readonly disabled: boolean;
  readonly: boolean;
}

interface DateRangeFieldContext {
  readonly slotProps: ComputedRef<DateRangeFieldRootSlotProps>;
  readonly startInput: ReturnType<typeof ref<HTMLInputElement | null>>;
  readonly endInput: ReturnType<typeof ref<HTMLInputElement | null>>;
}

const contextKey = Symbol('SectileDateRangeField');

export const DateRangeFieldRoot = defineComponent({
  name: 'SectileDateRangeFieldRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: Object as PropType<DateRange | null>, default: undefined },
    defaultValue: { type: Object as PropType<DateRange | null>, default: null },
    policies: { type: Object as PropType<DateRangeFieldPolicies>, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    startLabel: { type: String, default: undefined },
    endLabel: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: DateRange | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: DateRangeFieldRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const controlled = useControlledStateInvariant('DateRangeFieldRoot', 'modelValue', () => props.modelValue);
    const initial = tryCreateDateRangeFieldState({ value: controlled ? props.modelValue as DateRange | null : props.defaultValue });
    if (!initial.ok) throw new TypeError(initial.error.message);
    const snapshot = shallowRef<DateRangeFieldState>(initial.value);
    const startInput = ref<HTMLInputElement | null>(null);
    const endInput = ref<HTMLInputElement | null>(null);
    const root = ref<HTMLElement | null>(null);
    const participation = useCompositeFormControl({
      root,
      focusTarget: startInput,
      submissions: () => [
        {
          element: startInput,
          relativeName: 'start',
          capabilities: hiddenInputSubmissionCapabilities,
        },
        {
          element: endInput,
          relativeName: 'end',
          capabilities: hiddenInputSubmissionCapabilities,
        },
      ],
      reset: () => {
        queueMicrotask(() => {
          if (!controlled) snapshot.value = initial.value;
          mount();
        });
      },
    });
    let connection: DateRangeFieldConnection | null = null;

    const refresh = (): void => { if (connection !== null) snapshot.value = connection.getSnapshot().state; };
    const mount = (): void => {
      if (startInput.value === null || endInput.value === null) return;
      connection?.disconnect();
      connection = createDateRangeField({
        startInput: startInput.value,
        endInput: endInput.value,
        ...(controlled ? { value: props.modelValue as DateRange | null } : { defaultValue: snapshot.value.value }),
        ...(props.policies === undefined ? {} : { policies: props.policies }),
        disabled: props.disabled,
        readOnly: props.readonly,
        required: props.required,
        ...(props.startLabel === undefined ? {} : { startLabel: props.startLabel }),
        ...(props.endLabel === undefined ? {} : { endLabel: props.endLabel }),
        onValueChange: (value) => emit('update:modelValue', value),
        onUpdate: refresh,
      });
      refresh();
    };

    onMounted(mount);
    onBeforeUnmount(() => connection?.disconnect());
    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined || connection === null) return;
      const result = connection.syncControlledValues({ value });
      if (!result.ok) throw new TypeError(result.error.message);
      snapshot.value = result.value.state;
    });
    watch(
      [() => props.policies, () => props.disabled, () => props.readonly, () => props.required,
        () => props.startLabel, () => props.endLabel],
      () => { void nextTick(mount); },
    );

    const slotProps = computed<DateRangeFieldRootSlotProps>(() => Object.freeze({
      value: snapshot.value.value,
      startText: snapshot.value.start.inputState.snapshot.text,
      endText: snapshot.value.end.inputState.snapshot.text,
      active: snapshot.value.active,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    provide<DateRangeFieldContext>(contextKey, { slotProps, startInput, endInput });

    return (): VNodeChild => h(Primitive, mergeProps(participation.controlProps.value, attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
      role: 'group',
      'data-scope': 'date-range-field',
      'data-part': 'root',
      'data-disabled': props.disabled ? '' : undefined,
      'data-readonly': props.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

export type DateRangeFieldValueChangeHandler = (value: DateRange | null) => void;

export const DateRangeFieldStartInput = createEndpointInput('start', 'SectileDateRangeFieldStartInput');
export const DateRangeFieldEndInput = createEndpointInput('end', 'SectileDateRangeFieldEndInput');

function createEndpointInput(endpoint: 'start' | 'end', name: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { attrs }) {
      const context = useContext(name);
      return (): VNodeChild => h('input', mergeProps(attrs, {
        ref: (element: unknown) => { context[endpoint === 'start' ? 'startInput' : 'endInput'].value = element as HTMLInputElement | null; },
        type: 'text',
        inputmode: 'numeric',
        placeholder: 'YYYY-MM-DD',
        value: endpoint === 'start' ? context.slotProps.value.startText : context.slotProps.value.endText,
        disabled: context.slotProps.value.disabled,
        readonly: context.slotProps.value.readonly,
        'aria-disabled': String(context.slotProps.value.disabled),
        'aria-readonly': String(context.slotProps.value.readonly),
        'data-scope': 'date-range-field',
        'data-part': `${endpoint}-input`,
        'data-active': context.slotProps.value.active === endpoint ? '' : undefined,
      }));
    },
  });
}

function useContext(part: string): DateRangeFieldContext {
  const context = inject<DateRangeFieldContext>(contextKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside DateRangeFieldRoot.`);
  return context;
}

export type { DateRange };
