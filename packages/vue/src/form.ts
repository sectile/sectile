import {
  computed,
  defineComponent,
  getCurrentInstance,
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
  type ComputedRef,
  type PropType,
  type Ref,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  appendFormFieldPath,
  createForm,
  encodeFormFieldPath,
  type FormConnection,
  type FormFieldPath,
  type FormOptions,
  type FormParticipant,
  type FormParticipantValidation,
  type FormRelativePath,
  type FormSubmissionElement,
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
  readonly name?: FormFieldPath;
  readonly form?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
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
}

export type FormLabelMode = 'for' | 'labelledby' | 'legend';
export type FormMetadataAttribute =
  | 'id'
  | 'name'
  | 'form'
  | 'required'
  | 'disabled'
  | 'readonly'
  | 'aria-describedby'
  | 'aria-errormessage'
  | 'aria-invalid'
  | 'aria-labelledby'
  | 'aria-disabled'
  | 'aria-required'
  | 'aria-readonly';

export interface FormControlCapabilities {
  readonly id?: boolean;
  readonly describedBy?: boolean;
  readonly invalid?: boolean;
  readonly labelledBy?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
}

export interface FormSubmissionCapabilities {
  readonly name?: boolean;
  readonly form?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
}

export type FormElementSource<ElementType extends HTMLElement = HTMLElement> =
  | Ref<ElementType | null>
  | (() => ElementType | null);

export interface FormSubmissionRegistration {
  readonly element: FormElementSource<FormSubmissionElement>;
  readonly relativeName?: FormRelativePath;
  readonly capabilities?: FormSubmissionCapabilities;
  readonly explicit?: readonly FormMetadataAttribute[];
}

export type FormSubmissionSource =
  | readonly FormSubmissionRegistration[]
  | (() => readonly FormSubmissionRegistration[]);

export interface FormControlRegistration {
  readonly element: FormElementSource;
  readonly semanticControl?: FormElementSource;
  readonly focusTarget?: FormElementSource;
  readonly submissions?: FormSubmissionSource;
  readonly labelMode?: FormLabelMode;
  readonly capabilities?: FormControlCapabilities;
  readonly explicit?: readonly FormMetadataAttribute[];
}

export interface FormControlParticipation {
  readonly participating: boolean;
  readonly controlProps: ComputedRef<Readonly<Record<string, unknown>>>;
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
  readonly labelMode: ComputedRef<FormLabelMode>;
  readonly registerControl: (registration: FormControlRegistration) => () => void;
  readonly attributesFor: (
    registration: FormControlRegistration,
  ) => Readonly<Record<string, unknown>>;
}

const formContextKey = Symbol('SectileForm');
const formFieldContextKey = Symbol('SectileFormField');
const formControlOwnerKey = Symbol('SectileFormControlOwner');
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
    name: { type: [String, Array] as PropType<FormFieldPath>, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
    validate: { type: Function as PropType<() => FormParticipantValidation<string>>, default: undefined },
    ...partProps,
  },
  slots: Object as SlotsType<{ default: (props: FormFieldSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const formContext = useFormContext('FormField');
    const generatedId = useId();
    const id = computed(() => props.id ?? `form-field-${generatedId}`);
    const nameKey = computed(() => (
      props.name === undefined ? undefined : encodeFormFieldPath(props.name)
    ));
    const root = ref<HTMLElement | null>(null);
    const controls = shallowRef<readonly FormControlRegistration[]>([]);
    const fallback = shallowRef<FormControlRegistration | null>(null);
    const appliedAttributes = new Map<HTMLElement, Map<string, string | null>>();
    let observer: MutationObserver | undefined;
    let unregister: (() => void) | undefined;

    const activeControl = computed(() => (
      controls.value.find((registration) => resolveElement(registration.element) !== null)
      ?? fallback.value
    ));
    const labelMode = computed<FormLabelMode>(() => activeControl.value?.labelMode ?? 'for');
    const semanticControl = (): HTMLElement | null => {
      const registration = activeControl.value;
      if (registration === undefined || registration === null) return null;
      return resolveElement(registration.semanticControl ?? registration.element);
    };
    const effectiveControlId = computed(() => (
      semanticControl()?.getAttribute('id')?.trim() || `${id.value}-control`
    ));
    const fieldState = computed(() => formContext.state.value.fields.find((field) => field.id === id.value));
    const slotProps = computed<FormFieldSlotProps>(() => {
      const current = fieldState.value;
      const descriptionId = `${id.value}-description`;
      const messageId = `${id.value}-message`;
      const describedBy = `${descriptionId} ${messageId}`;
      const valid = current?.valid ?? true;
      return Object.freeze({
        id: id.value,
        controlId: effectiveControlId.value,
        labelId: `${id.value}-label`,
        descriptionId,
        messageId,
        describedBy,
        valid,
        touched: current?.touched ?? false,
        dirty: current?.dirty ?? false,
        issues: current?.issues ?? [],
      });
    });

    const attributesFor = (
      registration: FormControlRegistration,
    ): Readonly<Record<string, unknown>> => {
      const explicit = new Set(registration.explicit ?? []);
      const capabilities = registration.capabilities ?? {};
      const attributes: Record<string, unknown> = {};
      const assign = (attribute: FormMetadataAttribute, value: unknown): void => {
        if (!explicit.has(attribute) && value !== undefined) attributes[attribute] = value;
      };
      if (capabilities.id === true) assign('id', slotProps.value.controlId);
      if (capabilities.describedBy === true) {
        assign('aria-describedby', slotProps.value.describedBy);
        assign('aria-errormessage', slotProps.value.messageId);
      }
      if (capabilities.invalid === true && !slotProps.value.valid) assign('aria-invalid', 'true');
      if (capabilities.labelledBy === true && labelMode.value === 'labelledby') {
        assign('aria-labelledby', slotProps.value.labelId);
      }
      if (capabilities.required === true && props.required === true) assign('required', true);
      else if (labelMode.value !== 'for' && props.required === true) assign('aria-required', 'true');
      if (capabilities.disabled === true && props.disabled === true) assign('disabled', true);
      else if (labelMode.value !== 'for' && props.disabled === true) assign('aria-disabled', 'true');
      if (capabilities.readonly === true && props.readonly === true) assign('readonly', true);
      else if (labelMode.value !== 'for' && props.readonly === true) assign('aria-readonly', 'true');
      return Object.freeze(attributes);
    };

    const restoreControlAttributes = (): void => {
      for (const [element, attributes] of appliedAttributes) {
        for (const [name, previous] of attributes) {
          if (previous === null) element.removeAttribute(name);
          else element.setAttribute(name, previous);
        }
      }
      appliedAttributes.clear();
    };
    const applyControlAttributes = (): void => {
      restoreControlAttributes();
      const registration = activeControl.value;
      if (registration === undefined || registration === null) return;
      const semantic = resolveElement(registration.semanticControl ?? registration.element);
      if (semantic !== null) {
        applyMetadata(semantic, attributesFor(registration), registration.explicit, appliedAttributes);
      }
      for (const submission of resolveSubmissionRegistrations(registration)) {
        const element = resolveElement(submission.element);
        if (element === null) continue;
        const capabilities = submission.capabilities ?? nativeSubmissionCapabilities(element);
        const explicit = submission.explicit ?? registration.explicit;
        const attributes: Record<string, unknown> = {};
        if (capabilities.name === true && props.name !== undefined) {
          attributes['name'] = encodeSubmissionName(props.name, submission.relativeName);
        }
        if (capabilities.form === true && props.form !== undefined) attributes['form'] = props.form;
        if (capabilities.required === true && props.required === true) attributes['required'] = true;
        if (capabilities.disabled === true && props.disabled === true) attributes['disabled'] = true;
        if (capabilities.readonly === true && props.readonly === true) attributes['readonly'] = true;
        applyMetadata(element, attributes, explicit, appliedAttributes);
      }
    };

    const discoverNativeFallback = (): void => {
      if (controls.value.length > 0 || root.value === null) {
        fallback.value = null;
        return;
      }
      const candidates = nativeCandidates(root.value);
      const semantic = nativeSemanticControl(candidates);
      if (semantic === undefined) {
        fallback.value = null;
        return;
      }
      const submissions = candidates.filter(isFormSubmissionElement).map((element) => ({
        element: () => element,
        capabilities: nativeSubmissionCapabilities(element),
      }));
      const current = fallback.value;
      if (
        current !== null
        && resolveElement(current.semanticControl ?? current.element) === semantic
        && sameSubmissionElements(resolveSubmissionRegistrations(current), submissions)
      ) return;
      fallback.value = {
        element: () => semantic,
        semanticControl: () => semantic,
        focusTarget: () => semantic,
        submissions,
        labelMode: nativeLabelMode(semantic),
        capabilities: nativeControlCapabilities(semantic),
      };
    };

    const registerControl = (registration: FormControlRegistration): (() => void) => {
      controls.value = [...controls.value, registration];
      fallback.value = null;
      void nextTick(applyControlAttributes);
      return (): void => {
        controls.value = controls.value.filter((candidate) => candidate !== registration);
        discoverNativeFallback();
        void nextTick(applyControlAttributes);
      };
    };

    const mount = (): void => {
      unregister?.();
      unregister = undefined;
      if (root.value === null) return;
      discoverNativeFallback();
      observer?.disconnect();
      observer = new MutationObserver(() => {
        discoverNativeFallback();
        applyControlAttributes();
      });
      observer.observe(root.value, { childList: true, subtree: true });
      applyControlAttributes();
      const participant: FormParticipant<string> = {
        id: id.value,
        get element() { return root.value as HTMLElement; },
        get semanticControl() { return semanticControl() ?? root.value as HTMLElement; },
        get focusTarget() {
          const registration = activeControl.value;
          return registration === undefined || registration === null
            ? root.value as HTMLElement
            : resolveElement(registration.focusTarget ?? registration.semanticControl ?? registration.element)
              ?? root.value as HTMLElement;
        },
        get submissionElements() {
          const registration = activeControl.value;
          if (registration === undefined || registration === null) return [];
          return resolveSubmissionRegistrations(registration)
            .map((submission) => resolveElement(submission.element))
            .filter((element): element is FormSubmissionElement => element !== null);
        },
        focus: () => {
          const registration = activeControl.value;
          const control = registration === undefined || registration === null
            ? null
            : resolveElement(registration.focusTarget ?? registration.semanticControl ?? registration.element);
          control?.focus();
          return control !== null && document.activeElement === control;
        },
        ...(props.name === undefined ? {} : { name: props.name }),
        ...(props.validate === undefined ? {} : { validate: props.validate }),
      };
      unregister = formContext.register(participant);
    };

    onMounted(() => { void nextTick(mount); });
    onBeforeUnmount(() => {
      observer?.disconnect();
      restoreControlAttributes();
      unregister?.();
    });
    watch([id, nameKey, () => props.validate], () => { void nextTick(mount); });
    watch([
      activeControl,
      effectiveControlId,
      labelMode,
      () => props.name,
      () => props.form,
      () => props.required,
      () => props.disabled,
      () => props.readonly,
      () => slotProps.value.valid,
    ], applyControlAttributes, { flush: 'post' });
    provide<FormFieldContext>(formFieldContextKey, {
      slotProps,
      labelMode,
      registerControl,
      attributesFor,
    });

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
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: undefined },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormLabel');
    return (): VNodeChild => {
      const mode = field.labelMode.value;
      return renderFieldPart({
        as: props.as ?? (mode === 'legend' ? 'legend' : mode === 'for' ? 'label' : 'span'),
        asChild: props.asChild,
      }, attrs, slots, 'label', {
        id: field.slotProps.value.labelId,
        ...(mode === 'for' ? { for: field.slotProps.value.controlId } : {}),
      });
    };
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
  return h(Primitive, mergeProps(attributes, attrs, {
    as: props.as,
    asChild: props.asChild,
    'data-scope': 'form',
    'data-part': part,
  }), { default: () => slots.default?.() });
}

export function useFormControl(
  registration: FormControlRegistration,
): FormControlParticipation {
  const field = inject<FormFieldContext | null>(formFieldContextKey, null);
  const owned = inject(formControlOwnerKey, false);
  const instance = getCurrentInstance();
  const explicit = Object.freeze([
    ...new Set([
      ...(registration.explicit ?? []),
      ...explicitMetadataAttributes(instance?.vnode.props ?? null),
    ]),
  ]);
  const normalized = Object.freeze({ ...registration, explicit });
  const controlProps = computed<Readonly<Record<string, unknown>>>(() => (
    field !== null && !owned ? field.attributesFor(normalized) : Object.freeze({})
  ));
  let unregister: (() => void) | undefined;
  if (field !== null && !owned) {
    onMounted(() => { unregister = field.registerControl(normalized); });
    onBeforeUnmount(() => unregister?.());
  }
  return Object.freeze({ participating: field !== null && !owned, controlProps });
}

export function provideFormControlOwner(): void {
  provide(formControlOwnerKey, true);
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

function resolveElement<ElementType extends HTMLElement>(
  source: FormElementSource<ElementType>,
): ElementType | null {
  return typeof source === 'function' ? source() : source.value;
}

function resolveSubmissionRegistrations(
  registration: FormControlRegistration,
): readonly FormSubmissionRegistration[] {
  if (registration.submissions !== undefined) {
    return typeof registration.submissions === 'function'
      ? registration.submissions()
      : registration.submissions;
  }
  const element = resolveElement(registration.element);
  if (element === null || !isFormSubmissionElement(element)) return [];
  return [{
    element: () => element,
    capabilities: nativeSubmissionCapabilities(element),
    ...(registration.explicit === undefined ? {} : { explicit: registration.explicit }),
  }];
}

function sameSubmissionElements(
  left: readonly FormSubmissionRegistration[],
  right: readonly FormSubmissionRegistration[],
): boolean {
  return left.length === right.length && left.every((submission, index) => (
    resolveElement(submission.element) === resolveElement(right[index]!.element)
  ));
}

function nativeCandidates(root: HTMLElement): readonly HTMLElement[] {
  const selector = 'button, fieldset, input, select, textarea';
  const candidates = [
    ...(root.matches(selector) ? [root] : []),
    ...root.querySelectorAll<HTMLElement>(selector),
  ];
  return candidates.filter((candidate) => (
    candidate.closest<HTMLElement>('[data-scope="form"][data-part="field"]') === root
  ));
}

function nativeSemanticControl(candidates: readonly HTMLElement[]): HTMLElement | undefined {
  return candidates.find((candidate) => (
    candidate.tagName !== 'INPUT'
    || candidate.getAttribute('type')?.toLowerCase() !== 'hidden'
  )) ?? candidates[0];
}

function isFormSubmissionElement(element: HTMLElement): element is FormSubmissionElement {
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
}

function nativeLabelMode(element: HTMLElement): FormLabelMode {
  if (element.tagName === 'FIELDSET') return 'legend';
  if (element.tagName === 'INPUT' && element.getAttribute('type')?.toLowerCase() === 'hidden') {
    return 'labelledby';
  }
  return ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
    ? 'for'
    : 'labelledby';
}

function nativeControlCapabilities(element: HTMLElement): FormControlCapabilities {
  const tag = element.tagName;
  const labelable = nativeLabelMode(element) === 'for';
  return Object.freeze({
    id: true,
    describedBy: true,
    invalid: true,
    labelledBy: !labelable,
    required: ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag),
    disabled: ['BUTTON', 'FIELDSET', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag),
    readonly: tag === 'TEXTAREA' || (tag === 'INPUT' && supportsReadonly(element as HTMLInputElement)),
  });
}

function nativeSubmissionCapabilities(
  element: FormSubmissionElement,
): FormSubmissionCapabilities {
  const tag = element.tagName;
  return Object.freeze({
    name: true,
    form: true,
    required: ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag),
    disabled: true,
    readonly: tag === 'TEXTAREA' || (tag === 'INPUT' && supportsReadonly(element as HTMLInputElement)),
  });
}

function encodeSubmissionName(base: FormFieldPath, relative?: FormRelativePath): string {
  if (relative === undefined) return encodeFormFieldPath(base);
  return encodeFormFieldPath(appendFormFieldPath(base, relative));
}

function applyMetadata(
  element: HTMLElement,
  attributes: Readonly<Record<string, unknown>>,
  explicitAttributes: readonly FormMetadataAttribute[] | undefined,
  applied: Map<HTMLElement, Map<string, string | null>>,
): void {
  const explicit = new Set(explicitAttributes ?? []);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false || explicit.has(name as FormMetadataAttribute)) continue;
    const previous = element.getAttribute(name);
    const mergeTokens = name === 'aria-describedby' || name === 'aria-labelledby';
    if (previous !== null && !mergeTokens) continue;
    let changes = applied.get(element);
    if (changes === undefined) {
      changes = new Map();
      applied.set(element, changes);
    }
    if (!changes.has(name)) changes.set(name, previous);
    const next = mergeTokens && previous !== null
      ? [...new Set([...previous.split(/\s+/u), ...String(value).split(/\s+/u)])].join(' ')
      : value === true ? '' : String(value);
    element.setAttribute(name, next);
  }
}

function explicitMetadataAttributes(
  vnodeProps: Readonly<Record<string, unknown>> | null,
): readonly FormMetadataAttribute[] {
  if (vnodeProps === null) return [];
  const aliases: Readonly<Record<FormMetadataAttribute, readonly string[]>> = {
    id: ['id'],
    name: ['name'],
    form: ['form'],
    required: ['required'],
    disabled: ['disabled'],
    readonly: ['readonly', 'readOnly'],
    'aria-describedby': ['aria-describedby', 'ariaDescribedby'],
    'aria-errormessage': ['aria-errormessage', 'ariaErrormessage'],
    'aria-invalid': ['aria-invalid', 'ariaInvalid'],
    'aria-labelledby': ['aria-labelledby', 'ariaLabelledby'],
    'aria-disabled': ['aria-disabled', 'ariaDisabled'],
    'aria-required': ['aria-required', 'ariaRequired'],
    'aria-readonly': ['aria-readonly', 'ariaReadonly'],
  };
  return (Object.entries(aliases) as [FormMetadataAttribute, readonly string[]][])
    .filter(([, names]) => names.some((name) => Object.hasOwn(vnodeProps, name)))
    .map(([attribute]) => attribute);
}

function supportsReadonly(element: HTMLInputElement): boolean {
  return !new Set([
    'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range',
    'reset', 'submit',
  ]).has(element.type.toLowerCase());
}
