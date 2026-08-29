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
  createSpinButton,
  type SpinButtonConnection,
  type SpinButtonOptions,
} from '@sectile/dom/spin-button';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useNativeInputFormControl } from './internal/form-control.js';

export interface SpinButtonRootProps {
  readonly min: number | string;
  readonly max: number | string;
  readonly step?: number | string;
  readonly pageStep?: number;
  readonly modelValue?: number | string;
  readonly defaultValue?: number | string;
  readonly draft?: string | null;
  readonly defaultDraft?: string | null;
  readonly policies?: SpinButtonOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface SpinButtonSlotProps {
  readonly value: string;
  readonly draft: string | null;
  readonly text: string;
  readonly disabled: boolean;
  readonly: boolean;
}
export interface SpinButtonInputProps {
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface SpinButtonTriggerProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface SpinButtonContext {
  readonly state: ComputedRef<SpinButtonSlotProps>;
  readonly min: ComputedRef<string>;
  readonly max: ComputedRef<string>;
  readonly label: ComputedRef<string | undefined>;
  readonly connection: ShallowRef<SpinButtonConnection | undefined>;
  connect(input: HTMLInputElement): void;
  disconnect(): void;
  reset(): void;
  step(event: 'increment' | 'decrement'): void;
}

const spinButtonKey = Symbol('SectileSpinButtonRoot');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
  asChild: { type: Boolean, default: false },
};

export const SpinButtonRoot = defineComponent({
  name: 'SectileSpinButtonRoot',
  inheritAttrs: false,
  props: {
    min: { type: [Number, String], required: true },
    max: { type: [Number, String], required: true },
    step: { type: [Number, String], default: 1 },
    pageStep: { type: Number, default: 10 },
    modelValue: { type: [Number, String], default: undefined },
    defaultValue: { type: [Number, String], default: undefined },
    draft: { type: String as PropType<string | null>, default: undefined },
    defaultDraft: { type: String as PropType<string | null>, default: null },
    policies: { type: Object as PropType<SpinButtonOptions['policies']>, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    label: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: string): boolean => true,
    'update:draft': (_value: string | null): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: SpinButtonSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const valueControlled = props.modelValue !== undefined;
    const draftControlled = props.draft !== undefined;
    const connection = shallowRef<SpinButtonConnection>();
    const inputElement = shallowRef<HTMLInputElement>();
    const initialValue = String(props.defaultValue ?? props.min);
    const initialDraft = props.defaultDraft;
    const value = shallowRef(String(props.modelValue ?? initialValue));
    const draft = shallowRef<string | null>(props.draft !== undefined ? props.draft : initialDraft);
    const revision = shallowRef(0);
    const state = computed<SpinButtonSlotProps>(() => ({
      value: value.value,
      draft: draft.value,
      text: draft.value ?? value.value,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    const min = computed(() => String(props.min));
    const max = computed(() => String(props.max));
    const label = computed(() => props.label);
    const update = (): void => {
      if (connection.value === undefined) return;
      const snapshot = connection.value.getSnapshot();
      revision.value = snapshot.revision;
      value.value = snapshot.state.value;
      draft.value = snapshot.state.draft;
    };
    const disconnect = (): void => {
      connection.value?.disconnect();
      connection.value = undefined;
      inputElement.value = undefined;
    };
    const connect = (input: HTMLInputElement): void => {
      disconnect();
      inputElement.value = input;
      connection.value = createSpinButton({
        input,
        min: String(props.min),
        max: String(props.max),
        step: String(props.step),
        policies: { ...props.policies, page: props.pageStep },
        ...(valueControlled ? { value: String(props.modelValue) } : { defaultValue: value.value }),
        ...(draftControlled ? { draft: props.draft as string | null } : { defaultDraft: draft.value }),
        disabled: props.disabled,
        readOnly: props.readonly,
        ...(props.label === undefined ? {} : { label: props.label }),
        onValueChange: (next) => emit('update:modelValue', next),
        onDraftChange: (next) => emit('update:draft', next),
        onUpdate: update,
      });
      update();
    };
    const reset = (): void => {
      queueMicrotask(() => {
        value.value = valueControlled ? String(props.modelValue) : initialValue;
        draft.value = draftControlled ? props.draft as string | null : initialDraft;
        if (inputElement.value !== undefined) connect(inputElement.value);
      });
    };
    const sync = (): void => {
      const target = connection.value;
      if (target === undefined) return;
      const result = target.syncControlledValues({
        ...(valueControlled ? { value: String(props.modelValue) } : {}),
        ...(draftControlled ? { draft: props.draft as string | null } : {}),
      });
      if (!result.ok) throw new TypeError('Controlled spin button state could not be synchronized.');
      update();
    };
    watch([() => props.modelValue, () => props.draft], sync);
    provide<SpinButtonContext>(spinButtonKey, {
      state, min, max, label, connection, connect, disconnect, reset,
      step: (event) => {
        if (connection.value?.handleEvent(event)) update();
      },
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'spin-button',
      'data-part': 'root',
      'data-disabled': props.disabled ? '' : undefined,
      'data-readonly': props.readonly ? '' : undefined,
      'data-revision': String(revision.value),
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type SpinButtonValueChangeHandler = (value: string) => void;
export type SpinButtonDraftChangeHandler = (value: string | null) => void;

export const SpinButtonInput = defineComponent({
  name: 'SectileSpinButtonInput',
  inheritAttrs: false,
  props: {
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: SpinButtonSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useSpinButton('SpinButtonInput');
    const input = shallowRef<HTMLInputElement | null>(null);
    const participation = useNativeInputFormControl(input, { reset: root.reset });
    onMounted(() => {
      if (input.value === null) throw new TypeError('SpinButtonInput must render an input element.');
      root.connect(input.value);
    });
    onBeforeUnmount(root.disconnect);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { input.value = element instanceof HTMLInputElement ? element : null; },
      role: 'spinbutton',
      type: 'text',
      name: props.name,
      form: props.form,
      required: props.required,
      inputmode: 'decimal',
      value: root.state.value.text,
      disabled: root.state.value.disabled,
      readonly: root.state.value.readonly,
      'aria-label': root.label.value,
      'aria-valuemin': root.min.value,
      'aria-valuemax': root.max.value,
      'aria-valuenow': root.state.value.value,
      'aria-disabled': String(root.state.value.disabled),
      'aria-readonly': String(root.state.value.readonly),
      'data-scope': 'spin-button',
      'data-part': 'input',
    }, participation.controlProps.value), { default: () => slots['default']?.(root.state.value) });
  },
});

export const SpinButtonIncrement = createTrigger('Increment', 'increment');
export const SpinButtonDecrement = createTrigger('Decrement', 'decrement');

function createTrigger(name: string, event: 'increment' | 'decrement') {
  return defineComponent({
    name: `SectileSpinButton${name}`,
    inheritAttrs: false,
    props: partProps,
    slots: Object as SlotsType<{ default: (props: SpinButtonSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useSpinButton(`SpinButton${name}`);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        type: props.as === 'button' ? 'button' : undefined,
        disabled: root.state.value.disabled || root.state.value.readonly,
        'aria-label': name,
        'data-scope': 'spin-button',
        'data-part': event,
        onClick: (click: MouseEvent) => {
          if (!click.defaultPrevented) root.step(event);
        },
      }), { default: () => slots['default']?.(root.state.value) });
    },
  });
}

function useSpinButton(part: string): SpinButtonContext {
  const context = inject<SpinButtonContext>(spinButtonKey);
  if (context === undefined) throw new TypeError(`${part} must be used inside SpinButtonRoot.`);
  return context;
}
