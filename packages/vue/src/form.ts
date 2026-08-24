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
  useId,
  watch,
  watchEffect,
  type ComputedRef,
  type PropType,
  type Ref,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  createForm,
  type FormConnection,
  type FormOptions,
  type FormParticipant,
  type FormParticipantValidation,
  type FormSubmitDetails,
} from '@sectile/dom/form';
import { Primitive, type PrimitiveAs } from './primitive.js';

export type FormState = FormConnection<string>['state'];
export type FormIssue = NonNullable<FormOptions<string>['issues']>[number];
export type FormIssueSource = Parameters<FormConnection<string>['replaceIssues']>[0];

export interface FormRootProps {
  readonly issues?: readonly FormIssue[];
}

export interface FormRootSlotProps {
  readonly state: FormState;
  readonly status: FormState['status'];
  readonly valid: boolean;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly submitted: boolean;
  readonly submitCount: number;
  readonly submitStarted: () => boolean;
  readonly submitSucceeded: () => boolean;
  readonly submitFailed: (issues?: readonly FormIssue[]) => boolean;
  readonly replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]) => boolean;
  readonly reset: () => void;
}

export interface FormFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly control?: string;
  readonly validate?: () => FormParticipantValidation<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface FormFieldSlotProps {
  readonly id: string;
  readonly controlId: string;
  readonly labelId: string;
  readonly descriptionId: string;
  readonly messageId: string;
  readonly describedBy: string;
  readonly valid: boolean;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly issues: readonly FormIssue[];
  readonly controlProps: Readonly<{
    id: string;
    'aria-describedby': string;
    'aria-invalid': 'true' | undefined;
  }>;
}

export interface FormPartProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface RegisteredParticipant {
  readonly participant: FormParticipant<string>;
  unregister?: () => void;
}

interface FormContext {
  readonly state: ShallowRef<FormState>;
  readonly summary: Ref<HTMLElement | null>;
  readonly register: (participant: FormParticipant<string>) => () => void;
  readonly connection: ShallowRef<FormConnection<string> | null>;
}

interface FormFieldContext {
  readonly slotProps: ComputedRef<FormFieldSlotProps>;
}

const formContextKey = Symbol('SectileForm');
const formFieldContextKey = Symbol('SectileFormField');
const emptyState: FormState = Object.freeze({
  status: 'idle',
  submitCount: 0,
  submitted: false,
  touched: false,
  dirty: false,
  valid: true,
  fields: Object.freeze([]),
  issues: Object.freeze([]),
});
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const FormRoot = defineComponent({
  name: 'SectileFormRoot',
  inheritAttrs: false,
  props: {
    issues: { type: Array as PropType<readonly FormIssue[]>, default: () => [] },
  },
  emits: {
    submit: (_details: FormSubmitDetails<string>): boolean => true,
    reset: (): boolean => true,
    'state-change': (_state: FormState): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: FormRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, expose, slots }) {
    const root = ref<HTMLFormElement | null>(null);
    const summary = ref<HTMLElement | null>(null);
    const state = shallowRef<FormState>(emptyState);
    const connection = shallowRef<FormConnection<string> | null>(null);
    const participants = new Map<string, RegisteredParticipant>();

    const sync = (): void => {
      if (connection.value !== null) state.value = connection.value.getSnapshot().state;
    };
    const register = (participant: FormParticipant<string>): (() => void) => {
      const existing = participants.get(participant.id);
      existing?.unregister?.();
      const registered: RegisteredParticipant = { participant };
      participants.set(participant.id, registered);
      if (connection.value !== null) registered.unregister = connection.value.registerParticipant(participant);
      return (): void => {
        if (participants.get(participant.id) !== registered) return;
        registered.unregister?.();
        participants.delete(participant.id);
        sync();
      };
    };
    const mount = (): void => {
      if (root.value === null) return;
      connection.value?.destroy();
      connection.value = createForm({
        form: root.value,
        ...(summary.value === null ? {} : { summary: summary.value }),
        issues: props.issues,
        onSubmit: (details) => emit('submit', details),
        onReset: () => emit('reset'),
        onStateChange: (next) => {
          state.value = next;
          emit('state-change', next);
        },
      });
      for (const registered of participants.values()) {
        registered.unregister = connection.value.registerParticipant(registered.participant);
      }
      sync();
    };

    onMounted(() => { void nextTick(mount); });
    onBeforeUnmount(() => connection.value?.destroy());

    const actions = {
      submitStarted: (): boolean => connection.value?.submitStarted() ?? false,
      submitSucceeded: (): boolean => connection.value?.submitSucceeded() ?? false,
      submitFailed: (issues: readonly FormIssue[] = []): boolean => connection.value?.submitFailed(issues) ?? false,
      replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]): boolean => connection.value?.replaceIssues(source, issues) ?? false,
      reset: (): void => connection.value?.reset(),
    };
    const slotProps = computed<FormRootSlotProps>(() => Object.freeze({
      state: state.value,
      status: state.value.status,
      valid: state.value.valid,
      touched: state.value.touched,
      dirty: state.value.dirty,
      submitted: state.value.submitted,
      submitCount: state.value.submitCount,
      ...actions,
    }));
    provide<FormContext>(formContextKey, { state, summary, register, connection });
    expose(actions);

    return (): VNodeChild => h('form', mergeProps(attrs, {
      ref: (element: unknown) => { root.value = element as HTMLFormElement | null; },
      'data-scope': 'form',
      'data-part': 'root',
      'data-status': state.value.status,
    }), slots['default']?.(slotProps.value) ?? []);
  },
});

export const FormField = defineComponent({
  name: 'SectileFormField',
  inheritAttrs: false,
  props: {
    id: { type: String, default: undefined },
    name: { type: String, default: undefined },
    control: { type: String, default: 'input, select, textarea, [contenteditable="true"]' },
    validate: { type: Function as PropType<() => FormParticipantValidation<string>>, default: undefined },
    ...partProps,
  },
  slots: Object as SlotsType<{ default: (props: FormFieldSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const form = useFormContext('FormField');
    const generatedId = useId();
    const id = computed(() => props.id ?? `form-field-${generatedId}`);
    const root = ref<HTMLElement | null>(null);
    let unregister: (() => void) | undefined;

    const resolveControl = (): HTMLElement | null => {
      const element = root.value;
      if (element === null) return null;
      return element.matches(props.control)
        ? element
        : element.querySelector<HTMLElement>(props.control);
    };

    const fieldState = computed(() => form.state.value.fields.find((field) => field.id === id.value));
    const slotProps = computed<FormFieldSlotProps>(() => {
      const current = fieldState.value;
      const controlId = `${id.value}-control`;
      const descriptionId = `${id.value}-description`;
      const messageId = `${id.value}-message`;
      const describedBy = `${descriptionId} ${messageId}`;
      const valid = current?.valid ?? true;
      return Object.freeze({
        id: id.value,
        controlId,
        labelId: `${id.value}-label`,
        descriptionId,
        messageId,
        describedBy,
        valid,
        touched: current?.touched ?? false,
        dirty: current?.dirty ?? false,
        issues: current?.issues ?? [],
        controlProps: Object.freeze({
          id: controlId,
          'aria-describedby': describedBy,
          'aria-invalid': valid ? undefined : 'true',
        }),
      });
    });

    const applyControlAttributes = (): void => {
      const control = resolveControl();
      if (control === null) return;
      const attributes = slotProps.value.controlProps;
      control.id = attributes.id;
      control.setAttribute('aria-describedby', attributes['aria-describedby']);
      if (attributes['aria-invalid'] === undefined) control.removeAttribute('aria-invalid');
      else control.setAttribute('aria-invalid', attributes['aria-invalid']);
    };
    const mount = (): void => {
      unregister?.();
      unregister = undefined;
      if (root.value === null) return;
      applyControlAttributes();
      const participant: FormParticipant<string> = {
        id: id.value,
        get element() { return root.value as HTMLElement; },
        get control() { return resolveControl() ?? root.value as HTMLElement; },
        focus: () => {
          const control = resolveControl();
          control?.focus();
          return control !== null && document.activeElement === control;
        },
        ...(props.name === undefined ? {} : { name: props.name }),
        ...(props.validate === undefined ? {} : { validate: props.validate }),
      };
      unregister = form.register(participant);
    };

    onMounted(() => { void nextTick(mount); });
    onBeforeUnmount(() => unregister?.());
    watch([id, () => props.name, () => props.control, () => props.validate], () => { void nextTick(mount); });
    watchEffect(applyControlAttributes);
    provide<FormFieldContext>(formFieldContextKey, { slotProps });

    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
      'data-scope': 'form',
      'data-part': 'field',
      'data-valid': slotProps.value.valid ? '' : undefined,
      'data-invalid': slotProps.value.valid ? undefined : '',
      'data-touched': slotProps.value.touched ? '' : undefined,
      'data-dirty': slotProps.value.dirty ? '' : undefined,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

export const FormLabel = defineComponent({
  name: 'SectileFormLabel', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'label' } },
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormLabel');
    return (): VNodeChild => renderFieldPart(props, attrs, slots, 'label', {
      id: field.slotProps.value.labelId,
      for: field.slotProps.value.controlId,
    });
  },
});

export const FormDescription = defineComponent({
  name: 'SectileFormDescription', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'p' } },
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormDescription');
    return (): VNodeChild => renderFieldPart(props, attrs, slots, 'description', {
      id: field.slotProps.value.descriptionId,
    });
  },
});

export const FormMessage = defineComponent({
  name: 'SectileFormMessage', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'p' } },
  slots: Object as SlotsType<{ default: (props: FormFieldSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormMessage');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      id: field.slotProps.value.messageId,
      hidden: field.slotProps.value.valid,
      role: 'alert',
      'aria-live': 'polite',
      'data-scope': 'form',
      'data-part': 'message',
    }), {
      default: () => slots['default']?.(field.slotProps.value)
        ?? field.slotProps.value.issues.map((issue) => issue.message).join(' '),
    });
  },
});

export const FormSummary = defineComponent({
  name: 'SectileFormSummary', inheritAttrs: false,
  props: partProps,
  slots: Object as SlotsType<{ default: (props: FormRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const form = useFormContext('FormSummary');
    const slotProps = useRootSlotProps(form);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { form.summary.value = element as HTMLElement | null; },
      role: 'alert',
      'aria-live': 'polite',
      tabindex: -1,
      hidden: form.state.value.valid,
      'data-scope': 'form',
      'data-part': 'summary',
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

export const FormSubmit = defineComponent({
  name: 'SectileFormSubmit', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'button' } },
  setup(props, { attrs, slots }) {
    const form = useFormContext('FormSubmit');
    const slotProps = useRootSlotProps(form);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      ...(props.as === 'button' && !props.asChild ? { type: 'submit' } : {}),
      'data-scope': 'form',
      'data-part': 'submit',
      'data-status': form.state.value.status,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

function useRootSlotProps(form: FormContext): ComputedRef<FormRootSlotProps> {
  return computed(() => Object.freeze({
    state: form.state.value,
    status: form.state.value.status,
    valid: form.state.value.valid,
    touched: form.state.value.touched,
    dirty: form.state.value.dirty,
    submitted: form.state.value.submitted,
    submitCount: form.state.value.submitCount,
    submitStarted: (): boolean => form.connection.value?.submitStarted() ?? false,
    submitSucceeded: (): boolean => form.connection.value?.submitSucceeded() ?? false,
    submitFailed: (issues: readonly FormIssue[] = []): boolean => form.connection.value?.submitFailed(issues) ?? false,
    replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]): boolean => form.connection.value?.replaceIssues(source, issues) ?? false,
    reset: (): void => form.connection.value?.reset(),
  }));
}

function renderFieldPart(
  props: FormPartProps,
  attrs: Readonly<Record<string, unknown>>,
  slots: Readonly<{ default?: () => VNodeChild }>,
  part: string,
  attributes: Readonly<Record<string, unknown>>,
): VNodeChild {
  return h(Primitive, mergeProps(attrs, attributes, {
    as: props.as,
    asChild: props.asChild,
    'data-scope': 'form',
    'data-part': part,
  }), { default: () => slots.default?.() });
}

function useFormContext(part: string): FormContext {
  const context = inject<FormContext | null>(formContextKey, null);
  if (context === null) throw new TypeError(`${part} must be rendered inside FormRoot.`);
  return context;
}

function useFormFieldContext(part: string): FormFieldContext {
  const context = inject<FormFieldContext | null>(formFieldContextKey, null);
  if (context === null) throw new TypeError(`${part} must be rendered inside FormField.`);
  return context;
}
