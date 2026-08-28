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
  shallowRef,
  watch,
  type AllowedComponentProps,
  type ComponentCustomProps,
  type ComputedRef,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
  type VNodeProps,
} from 'vue';
import {
  appendFormFieldPath,
  createForm,
  encodeFormFieldPath,
  type FormConnection,
  type FormFieldPath,
  type FormInteractionValidationTrigger,
  type FormOptions,
  type FormParticipant,
  type FormRelativePath,
  type FormPathSegment,
  type FormSchema as DOMFormSchema,
  type FormSubmissionElement,
  type FormSubmitPayload as DOMFormSubmitPayload,
  type FormSubmitResult as DOMFormSubmitResult,
  type FormValidateContext as DOMFormValidateContext,
  type FormValidateHandler as DOMFormValidateHandler,
  type FormValidationIssue as DOMFormValidationIssue,
  type FormValidationResult as DOMFormValidationResult,
  type FormValues as DOMFormValues,
} from '@sectile/dom/form';
import { tryCreateFormFieldPath } from '@sectile/form/path';
import type { FormSchemaOutput as DOMFormSchemaOutput } from '@sectile/form/schema';
import {
  compositeControlCapabilities,
  hiddenInputSubmissionCapabilities,
  hiddenSelectSubmissionCapabilities,
  hiddenValueSubmissionCapabilities,
  nativeInputControlCapabilities,
  provideFormControlFieldContext,
  provideFormControlOwner,
  useCompositeFormControl,
  useFormControl,
  useNativeInputFormControl,
  type FormControlCapabilities,
  type FormControlParticipation,
  type FormControlRegistration,
  type FormElementSource,
  type FormLabelMode,
  type FormMetadataAttribute,
  type FormSubmissionCapabilities,
  type FormSubmissionRegistration,
  type FormSubmissionSource,
} from './internal/form-control.js';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostId } from './host-provider.js';

export type FormState = FormConnection<string>['state'];
export type FormIssue = NonNullable<FormOptions<string>['issues']>[number];
export type FormIssueSource = Parameters<FormConnection<string>['replaceIssues']>[0];
export type FormValues<Shape extends object = Record<string, unknown>> = DOMFormValues<Shape>;
export type FormSchema<
  Input extends object = Record<string, unknown>,
  Output extends object = Input,
> = DOMFormSchema<FormValues<Input>, FormValues<Output>>;
export type FormSchemaInput<Schema extends FormSchema> =
  Schema extends DOMFormSchema<infer Input extends object, object> ? Input : never;
export type FormSchemaOutput<Schema extends FormSchema> =
  Schema extends DOMFormSchema<object, infer Output extends object> ? Output : never;
export type FormSubmitEvent<Values extends object = Record<string, unknown>> = Omit<
  DOMFormSubmitPayload<string, FormValues<Values>>,
  'event'
> & {
  readonly nativeEvent: SubmitEvent;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
};
export interface FormIssueInput {
  readonly id?: string;
  readonly message: string;
  readonly path?: FormFieldPath;
}
export type FormSubmitIssue = FormIssueInput;
export type FormSubmitResult =
  | void
  | { readonly ok: true }
  | { readonly ok: false; readonly issues?: readonly FormSubmitIssue[] };
export type FormSubmitHandler<Values extends object = Record<string, unknown>> =
  (event: FormSubmitEvent<Values>) => FormSubmitResult | PromiseLike<FormSubmitResult>;
export interface FormSubmissionDefinition {
  readonly schema?: never;
  readonly onSubmit: FormSubmitHandler<Record<string, unknown>>;
}
export interface FormSchemaSubmissionDefinition<Schema extends FormSchema<object, object>> {
  readonly schema: Schema;
  readonly onSubmit: FormSubmitHandler<DOMFormSchemaOutput<Schema>>;
}
export function defineFormSubmission<const Schema extends FormSchema<object, object>>(
  definition: FormSchemaSubmissionDefinition<Schema>,
): FormSchemaSubmissionDefinition<Schema>;
export function defineFormSubmission(
  definition: FormSubmissionDefinition,
): FormSubmissionDefinition;
export function defineFormSubmission(
  definition: FormSubmissionDefinition | FormSchemaSubmissionDefinition<FormSchema<object, object>>,
): FormSubmissionDefinition | FormSchemaSubmissionDefinition<FormSchema<object, object>> {
  return Object.freeze({ ...definition });
}
export type FormSubmitErrorMapper = (
  reason: unknown,
) => FormSubmitIssue | readonly FormSubmitIssue[] | undefined;
export type FormResetHandler = () => void;
export type FormStateChangeHandler = (state: FormState) => void;
export type FormValidateContext = DOMFormValidateContext<string>;
export type FormValidationIssue = DOMFormValidationIssue;
export type FormValidationResult = DOMFormValidationResult;
export type FormValidateHandler<Values extends object = Record<string, unknown>> =
  DOMFormValidateHandler<string, FormValues<Values>>;
export type FormSubmitStartedAction = () => number | null;
export type FormSubmitSucceededAction = (generation: number) => boolean;
export type FormSubmitFailedAction = (
  generation: number,
  issues?: readonly FormIssue[],
) => boolean;
export type FormReplaceIssuesAction = (
  source: FormIssueSource,
  issues: readonly FormIssue[],
) => boolean;
export type FormResetAction = () => void;

export interface FormRootProps<
  Input extends object = Record<string, unknown>,
  Output extends object = Input,
> {
  readonly issues?: readonly FormIssueInput[];
  readonly schema?: FormSchema<Input, Output>;
  readonly validate?: FormValidateHandler<Input>;
  readonly validateOn?: readonly FormInteractionValidationTrigger[];
  readonly revalidateOn?: readonly FormInteractionValidationTrigger[];
  readonly onSubmit?: FormSubmitHandler<Output>;
  readonly mapSubmitError?: FormSubmitErrorMapper;
}

export interface FormRootSlotProps {
  readonly state: FormState;
  readonly validationStatus: FormState['validationStatus'];
  readonly validationTrigger: FormState['validationTrigger'];
  readonly validationIntent: FormState['validationIntent'];
  readonly submissionStatus: FormState['submissionStatus'];
  readonly valid: boolean;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly submitted: boolean;
  readonly submitCount: number;
  readonly submitStarted: FormSubmitStartedAction;
  readonly submitSucceeded: FormSubmitSucceededAction;
  readonly submitFailed: FormSubmitFailedAction;
  readonly replaceIssues: FormReplaceIssuesAction;
  readonly reset: FormResetAction;
}

export type FormRootPublicProps<
  Input extends object = Record<string, unknown>,
  Output extends object = Input,
> = FormRootProps<Input, Output>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onReset?: () => unknown;
    readonly onStateChange?: (state: FormState) => unknown;
  };

export interface FormRootComponent {
  new <Input extends object = Record<string, unknown>, Output extends object = Input>(props: FormRootPublicProps<Input, Output>): {
    $props: FormRootPublicProps<Input, Output>;
    $slots: {
      default?: (props: FormRootSlotProps) => VNodeChild;
    };
  };
}

export interface FormFieldProps {
  readonly id?: string;
  readonly name?: FormFieldPath;
  readonly form?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type FormFieldPublicProps =
  FormFieldProps
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps;

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

export {
  compositeControlCapabilities,
  hiddenInputSubmissionCapabilities,
  hiddenSelectSubmissionCapabilities,
  hiddenValueSubmissionCapabilities,
  nativeInputControlCapabilities,
  provideFormControlOwner,
  useCompositeFormControl,
  useFormControl,
  useNativeInputFormControl,
};
export type {
  FormControlCapabilities,
  FormControlParticipation,
  FormControlRegistration,
  FormElementSource,
  FormLabelMode,
  FormMetadataAttribute,
  FormSubmissionCapabilities,
  FormSubmissionRegistration,
  FormSubmissionSource,
};

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
  readonly summary: ShallowRef<HTMLElement | null>;
  readonly register: (participant: FormParticipant<string>) => () => void;
  readonly setFieldDiagnostic: (id: string, issue: FormIssue | null) => void;
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
const emptyState: FormState = Object.freeze({
  validationGeneration: 0,
  validationStatus: 'idle',
  validationTrigger: null,
  validationIntent: null,
  submissionGeneration: 0,
  submissionStatus: 'idle',
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

const FormRootImpl = defineComponent({
  name: 'SectileFormRoot',
  inheritAttrs: false,
  props: {
    issues: { type: Array as PropType<readonly FormIssueInput[]>, default: () => [] },
    schema: { type: Object as PropType<FormSchema>, default: undefined },
    validate: { type: Function as PropType<FormValidateHandler>, default: undefined },
    validateOn: {
      type: Array as PropType<readonly FormInteractionValidationTrigger[]>,
      default: () => [],
    },
    revalidateOn: {
      type: Array as PropType<readonly FormInteractionValidationTrigger[]>,
      default: () => ['input'],
    },
    onSubmit: { type: Function as PropType<FormSubmitHandler>, default: undefined },
    mapSubmitError: { type: Function as PropType<FormSubmitErrorMapper>, default: undefined },
  },
  emits: {
    reset: (): boolean => true,
    stateChange: (_state: FormState): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: FormRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, expose, slots }) {
    const root = shallowRef<HTMLFormElement | null>(null);
    const summary = shallowRef<HTMLElement | null>(null);
    const state = shallowRef<FormState>(emptyState);
    const connection = shallowRef<FormConnection<string> | null>(null);
    const participants = new Map<string, RegisteredParticipant>();
    const fieldDiagnostics = new Map<string, FormIssue>();
    let syncConfiguredIssues = (): void => {};
    let syncFieldDiagnostics = (): void => {};

    const sync = (): void => {
      if (connection.value !== null) state.value = connection.value.getSnapshot().state;
    };
    const register = (participant: FormParticipant<string>): (() => void) => {
      const existing = participants.get(participant.id);
      existing?.unregister?.();
      const registered: RegisteredParticipant = { participant };
      participants.set(participant.id, registered);
      if (connection.value !== null) registered.unregister = connection.value.registerParticipant(participant);
      void nextTick(() => {
        syncConfiguredIssues();
        syncFieldDiagnostics();
      });
      return (): void => {
        if (participants.get(participant.id) !== registered) return;
        registered.unregister?.();
        participants.delete(participant.id);
        sync();
        void nextTick(() => {
          syncConfiguredIssues();
          syncFieldDiagnostics();
        });
      };
    };
    const setFieldDiagnostic = (id: string, issue: FormIssue | null): void => {
      if (issue === null) fieldDiagnostics.delete(id);
      else fieldDiagnostics.set(id, issue);
      void nextTick(syncFieldDiagnostics);
    };
    const submit = (
      payload: DOMFormSubmitPayload<string>,
    ): DOMFormSubmitResult<string> | PromiseLike<DOMFormSubmitResult<string>> => {
      const handler = props.onSubmit;
      if (handler === undefined) return;
      const target = connection.value;
      if (target === null) return;
      let result: FormSubmitResult | PromiseLike<FormSubmitResult>;
      try {
        result = handler(toFormSubmitEvent(payload));
      } catch (error) {
        return {
          ok: false,
          issues: resolveIssueInputs(target, 'server', mapSubmissionError(props.mapSubmitError, error)),
        };
      }
      const settle = (resolved: FormSubmitResult): DOMFormSubmitResult<string> => (
        typeof resolved === 'object' && resolved !== null && resolved.ok === false
          ? {
              ok: false,
              issues: resolveIssueInputs(
                target,
                'server',
                resolved.issues ?? [submissionErrorIssue()],
              ),
            }
          : { ok: true }
      );
      if (isPromiseLike(result)) {
        return Promise.resolve(result).then(
          settle,
          (error: unknown) => ({
            ok: false as const,
            issues: resolveIssueInputs(
              target,
              'server',
              mapSubmissionError(props.mapSubmitError, error),
            ),
          }),
        );
      }
      return settle(result);
    };
    const configuration = () => ({
      ...(summary.value === null ? {} : { summary: summary.value }),
      ...(props.schema === undefined ? {} : { schema: props.schema }),
      ...(props.validate === undefined ? {} : { validate: props.validate }),
      validateOn: props.validateOn,
      revalidateOn: props.revalidateOn,
      ...(props.onSubmit === undefined ? {} : { onSubmit: submit }),
      onReset: () => {
        emit('reset');
        void nextTick(syncFieldDiagnostics);
      },
      onStateChange: (next: FormState) => {
        state.value = next;
        emit('stateChange', next);
      },
    });
    syncConfiguredIssues = (): void => {
      const target = connection.value;
      if (target === null) return;
      target.replaceIssues('form', resolveIssueInputs(target, 'form', props.issues));
    };
    syncFieldDiagnostics = (): void => {
      connection.value?.replaceIssues('field', [...fieldDiagnostics.values()]);
    };
    const mount = (): void => {
      if (root.value === null) return;
      connection.value?.destroy();
      connection.value = createForm({
        form: root.value,
        ...configuration(),
      });
      for (const registered of participants.values()) {
        registered.unregister = connection.value.registerParticipant(registered.participant);
      }
      syncConfiguredIssues();
      syncFieldDiagnostics();
      sync();
    };

    onMounted(() => { void nextTick(mount); });
    onBeforeUnmount(() => connection.value?.destroy());
    watch([
      summary,
      () => props.schema,
      () => props.validate,
      () => [...props.validateOn],
      () => [...props.revalidateOn],
      () => props.onSubmit,
      () => props.mapSubmitError,
    ], () => {
      void nextTick(() => connection.value?.reconfigure(configuration()));
    });
    watch(() => props.issues, () => { void nextTick(syncConfiguredIssues); }, { deep: true });

    const actions = {
      submitStarted: (): number | null => connection.value?.submitStarted() ?? null,
      submitSucceeded: (generation: number): boolean => connection.value?.submitSucceeded(generation) ?? false,
      submitFailed: (generation: number, issues: readonly FormIssue[] = []): boolean => connection.value?.submitFailed(generation, issues) ?? false,
      replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]): boolean => connection.value?.replaceIssues(source, issues) ?? false,
      reset: (): void => connection.value?.reset(),
    };
    const slotProps = computed<FormRootSlotProps>(() => Object.freeze({
      state: state.value,
      validationStatus: state.value.validationStatus,
      validationTrigger: state.value.validationTrigger,
      validationIntent: state.value.validationIntent,
      submissionStatus: state.value.submissionStatus,
      valid: state.value.valid,
      touched: state.value.touched,
      dirty: state.value.dirty,
      submitted: state.value.submitted,
      submitCount: state.value.submitCount,
      ...actions,
    }));
    provide<FormContext>(formContextKey, {
      state,
      summary,
      register,
      setFieldDiagnostic,
      connection,
    });
    expose(actions);

    return (): VNodeChild => h('form', mergeProps(attrs, {
      ref: (element: unknown) => { root.value = element as HTMLFormElement | null; },
      'data-scope': 'form',
      'data-part': 'root',
      'data-validation-status': state.value.validationStatus,
      'data-submission-status': state.value.submissionStatus,
    }), slots['default']?.(slotProps.value) ?? []);
  },
});

export const FormRoot = FormRootImpl as unknown as FormRootComponent;

function toFormSubmitEvent(
  payload: DOMFormSubmitPayload<string>,
): FormSubmitEvent {
  return Object.freeze({
    formData: payload.formData,
    values: payload.values,
    submitter: payload.submitter,
    state: payload.state,
    nativeEvent: payload.event,
    get defaultPrevented() { return payload.event.defaultPrevented; },
    preventDefault: () => payload.event.preventDefault(),
    stopPropagation: () => payload.event.stopPropagation(),
    stopImmediatePropagation: () => payload.event.stopImmediatePropagation(),
  });
}

function isPromiseLike(value: unknown): value is PromiseLike<FormSubmitResult> {
  return typeof value === 'object'
    && value !== null
    && 'then' in value
    && typeof value.then === 'function';
}

function resolveIssueInputs(
  target: FormConnection<string>,
  source: 'form' | 'server',
  input: readonly FormIssueInput[],
): readonly FormIssue[] {
  const fields = target.getSnapshot().state.fields;
  return Object.freeze(input.map((issue, index) => {
    const name = issue.path === undefined ? null : safeEncodeFormFieldPath(issue.path);
    const owner = name === null ? undefined : findNamedFieldOwner(fields, name);
    return Object.freeze({
      id: issue.id ?? `form-${source}-issue-${index + 1}`,
      message: issue.message,
      source,
      ...(owner === undefined ? {} : { fieldId: owner.id }),
    });
  }));
}

function safeEncodeFormFieldPath(path: FormFieldPath): string | null {
  const result = tryCreateFormFieldPath(path);
  return result.ok ? encodeFormFieldPath(result.value) : null;
}

function findNamedFieldOwner(
  fields: FormState['fields'],
  issueName: string,
): FormState['fields'][number] | undefined {
  let owner: FormState['fields'][number] | undefined;
  for (const candidate of fields) {
    if (
      candidate.name === null
      || (
        issueName !== candidate.name
        && !issueName.startsWith(`${candidate.name}.`)
        && !issueName.startsWith(`${candidate.name}[`)
      )
    ) continue;
    if (owner === undefined || candidate.name.length > (owner.name?.length ?? 0)) owner = candidate;
  }
  return owner;
}

function mapSubmissionError(
  mapper: FormSubmitErrorMapper | undefined,
  reason: unknown,
): readonly FormSubmitIssue[] {
  if (mapper !== undefined) {
    try {
      const mapped = mapper(reason);
      if (mapped !== undefined) {
        const issues = Array.isArray(mapped) ? mapped : [mapped as FormSubmitIssue];
        if (issues.length > 0) return Object.freeze([...issues]);
      }
    } catch {
      // Mapping failures are intentionally replaced by the safe fallback below.
    }
  }
  return Object.freeze([submissionErrorIssue()]);
}

function submissionErrorIssue(): FormSubmitIssue {
  return Object.freeze({
    id: 'form-submit-error',
    message: 'Form submission failed.',
  });
}

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
    ...partProps,
  },
  slots: Object as SlotsType<{ default: (props: FormFieldSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const formContext = useFormContext('FormField');
    const generatedId = useHostId();
    const id = computed(() => props.id ?? `form-field-${generatedId}`);
    const nameKey = computed(() => (
      props.name === undefined ? undefined : safeEncodeFormFieldPath(props.name) ?? undefined
    ));
    const root = shallowRef<HTMLElement | null>(null);
    const controls = shallowRef<readonly FormControlRegistration[]>([]);
    const fallback = shallowRef<FormControlRegistration | null>(null);
    const nativeFallbackProblem = shallowRef<string | null>(null);
    const appliedAttributes = new Map<HTMLElement, Map<string, string | null>>();
    let observer: MutationObserver | undefined;
    let unregister: (() => void) | undefined;
    let diagnosticId: string | undefined;
    let observedTargets: readonly HTMLElement[] = [];
    let warnedMultipleControls = false;

    const activeRegistrations = computed(() => controls.value.filter(
      (registration) => resolveElement(registration.element) !== null,
    ));
    const activeControl = computed(() => (
      activeRegistrations.value.length === 1
        ? activeRegistrations.value[0]
        : controls.value.length === 0 ? fallback.value : null
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
        if (capabilities.name === true && nameKey.value !== undefined) {
          const submissionName = safeEncodeSubmissionName(nameKey.value, submission.relativeName);
          if (submissionName !== null) attributes['name'] = submissionName;
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
        nativeFallbackProblem.value = null;
        return;
      }
      const candidates = nativeCandidates(root.value);
      const discovered = createNativeFallbackRegistration(root.value, candidates);
      nativeFallbackProblem.value = discovered.problem;
      if (discovered.registration === null) {
        fallback.value = null;
        return;
      }
      const next = discovered.registration;
      const current = fallback.value;
      if (
        current !== null
        && resolveElement(current.semanticControl ?? current.element)
          === resolveElement(next.semanticControl ?? next.element)
        && sameSubmissionElements(
          resolveSubmissionRegistrations(current),
          resolveSubmissionRegistrations(next),
        )
      ) return;
      fallback.value = next;
    };

    const syncDiagnostic = (): void => {
      const currentId = id.value;
      if (diagnosticId !== undefined && diagnosticId !== currentId) {
        formContext.setFieldDiagnostic(diagnosticId, null);
      }
      diagnosticId = currentId;
      let message: string | null = null;
      if (props.name !== undefined && nameKey.value === undefined) {
        message = 'FormField received an invalid field path.';
      } else if (activeRegistrations.value.length > 1) {
        message = 'FormField received multiple active controls. Register one composite control with explicit targets.';
      } else if (controls.value.length > 0 && activeRegistrations.value.length === 0) {
        message = 'FormField has no mounted control target.';
      } else if (nativeFallbackProblem.value !== null) {
        message = nativeFallbackProblem.value;
      } else {
        const registration = activeControl.value;
        if (registration !== null && registration !== undefined) {
          const invalidRelativeName = resolveSubmissionRegistrations(registration).some(
            (submission) => submission.relativeName !== undefined
              && nameKey.value !== undefined
              && safeEncodeSubmissionName(nameKey.value, submission.relativeName) === null,
          );
          if (invalidRelativeName) message = 'FormField received an invalid relative submission path.';
        }
      }
      formContext.setFieldDiagnostic(currentId, message === null ? null : Object.freeze({
        id: `${currentId}:composition`,
        fieldId: currentId,
        message,
        source: 'field',
      }));
    };

    const refreshParticipantTargets = (): void => {
      const registration = activeControl.value;
      const next = registration === null || registration === undefined
        ? root.value === null ? [] : [root.value]
        : [
            root.value,
            resolveElement(registration.semanticControl ?? registration.element),
            resolveElement(registration.focusTarget ?? registration.element),
            resolveElement(registration.validationTarget ?? registration.element),
            ...resolveSubmissionRegistrations(registration).map(
              (submission) => resolveElement(submission.element),
            ),
          ].filter((element): element is HTMLElement => element !== null);
      if (
        next.length === observedTargets.length
        && next.every((element, index) => element === observedTargets[index])
      ) return;
      observedTargets = Object.freeze([...next]);
      formContext.connection.value?.refreshParticipant(id.value);
    };

    const registerControl = (registration: FormControlRegistration): (() => void) => {
      controls.value = [...controls.value, registration];
      fallback.value = null;
      void nextTick(() => {
        if (!warnedMultipleControls && activeRegistrations.value.length > 1) {
          warnedMultipleControls = true;
          console.warn(
            '[Sectile] FormField received multiple active control registrations. Register one composite control with explicit semantic, focus, and submission targets.',
          );
        }
        applyControlAttributes();
        syncDiagnostic();
        refreshParticipantTargets();
      });
      return (): void => {
        controls.value = controls.value.filter((candidate) => candidate !== registration);
        discoverNativeFallback();
        void nextTick(() => {
          applyControlAttributes();
          syncDiagnostic();
          refreshParticipantTargets();
        });
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
        syncDiagnostic();
        refreshParticipantTargets();
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
        get validationTarget() {
          const registration = activeControl.value;
          return registration === undefined || registration === null
            ? root.value as HTMLElement
            : resolveElement(
                registration.validationTarget
                  ?? registration.semanticControl
                  ?? registration.element,
              ) ?? root.value as HTMLElement;
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
        reset: () => activeControl.value?.reset?.(),
        ...(nameKey.value === undefined ? {} : { name: nameKey.value }),
      };
      unregister = formContext.register(participant);
      observedTargets = Object.freeze([
        participant.element,
        participant.semanticControl ?? participant.element,
        participant.focusTarget ?? participant.element,
        participant.validationTarget ?? participant.element,
        ...(participant.submissionElements ?? []),
      ]);
      syncDiagnostic();
    };

    onMounted(() => { void nextTick(mount); });
    onBeforeUnmount(() => {
      observer?.disconnect();
      restoreControlAttributes();
      if (diagnosticId !== undefined) formContext.setFieldDiagnostic(diagnosticId, null);
      unregister?.();
    });
    watch([id, nameKey], () => { void nextTick(mount); });
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
    ], () => {
      applyControlAttributes();
      syncDiagnostic();
    }, { flush: 'post' });
    provide<FormFieldContext>(formFieldContextKey, {
      slotProps,
      labelMode,
      registerControl,
      attributesFor,
    });
    provideFormControlFieldContext({ registerControl, attributesFor });

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

export const FormReset = defineComponent({
  name: 'SectileFormReset', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'button' } },
  setup(props, { attrs, slots }) {
    const form = useFormContext('FormReset');
    const slotProps = useRootSlotProps(form);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      ...(props.as === 'button' && !props.asChild ? { type: 'reset' } : {}),
      'data-scope': 'form',
      'data-part': 'reset',
      'data-validation-status': form.state.value.validationStatus,
      'data-submission-status': form.state.value.submissionStatus,
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
      'data-validation-status': form.state.value.validationStatus,
      'data-submission-status': form.state.value.submissionStatus,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});

function useRootSlotProps(form: FormContext): ComputedRef<FormRootSlotProps> {
  return computed(() => Object.freeze({
    state: form.state.value,
    validationStatus: form.state.value.validationStatus,
    validationTrigger: form.state.value.validationTrigger,
    validationIntent: form.state.value.validationIntent,
    submissionStatus: form.state.value.submissionStatus,
    valid: form.state.value.valid,
    touched: form.state.value.touched,
    dirty: form.state.value.dirty,
    submitted: form.state.value.submitted,
    submitCount: form.state.value.submitCount,
    submitStarted: (): number | null => form.connection.value?.submitStarted() ?? null,
    submitSucceeded: (generation: number): boolean => form.connection.value?.submitSucceeded(generation) ?? false,
    submitFailed: (generation: number, issues: readonly FormIssue[] = []): boolean => form.connection.value?.submitFailed(generation, issues) ?? false,
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
  return typeof source === 'function' ? source() : source.value ?? null;
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
  const selector = 'fieldset, input, select, textarea';
  const candidates = [
    ...(root.matches(selector) ? [root] : []),
    ...root.querySelectorAll<HTMLElement>(selector),
  ];
  return candidates.filter((candidate) => (
    candidate.closest<HTMLElement>('[data-scope="form"][data-part="field"]') === root
  ));
}

function createNativeFallbackRegistration(
  root: HTMLElement,
  candidates: readonly HTMLElement[],
): { readonly registration: FormControlRegistration | null; readonly problem: string | null } {
  const semantic = nativeSemanticControl(candidates);
  if (semantic === undefined || isHiddenInput(semantic)) {
    return {
      registration: null,
      problem: 'FormField has no visible native semantic or focus target.',
    };
  }
  const submissions = candidates.filter(isFormSubmissionElement);
  const visible = candidates.filter((candidate) => !isHiddenInput(candidate));
  const fieldset = visible.find((candidate) => candidate.tagName === 'FIELDSET');
  if (fieldset !== undefined) {
    return {
      registration: nativeFallbackForElement(fieldset, submissions),
      problem: null,
    };
  }
  if (visible.length === 1) {
    return {
      registration: nativeFallbackForElement(semantic, submissions),
      problem: null,
    };
  }
  if (isNativeCheckedGroup(visible)) {
    const focusTarget = visible.find((candidate) => !(
      candidate as HTMLInputElement
    ).disabled) ?? visible[0]!;
    return {
      registration: {
        element: () => root,
        semanticControl: () => root,
        focusTarget: () => focusTarget,
        validationTarget: () => root,
        submissions: submissions.map((element) => ({
          element: () => element,
          capabilities: Object.freeze({
            ...nativeSubmissionCapabilities(element),
            required: false,
          }),
        })),
        labelMode: 'labelledby',
        capabilities: compositeControlCapabilities,
      },
      problem: null,
    };
  }
  return {
    registration: null,
    problem: 'FormField contains multiple unrelated native controls. Use a fieldset or one composite registration.',
  };
}

function nativeFallbackForElement(
  semantic: HTMLElement,
  submissions: readonly FormSubmissionElement[],
): FormControlRegistration {
  return {
    element: () => semantic,
    semanticControl: () => semantic,
    focusTarget: () => semantic,
    validationTarget: () => semantic,
    submissions: submissions.map((element) => ({
      element: () => element,
      capabilities: nativeSubmissionCapabilities(element),
    })),
    labelMode: nativeLabelMode(semantic),
    capabilities: nativeControlCapabilities(semantic),
  };
}

function isHiddenInput(element: HTMLElement): boolean {
  return element.tagName === 'INPUT'
    && element.getAttribute('type')?.toLowerCase() === 'hidden';
}

function isNativeCheckedGroup(candidates: readonly HTMLElement[]): boolean {
  if (candidates.length < 2) return false;
  const types = candidates.map((candidate) => (
    candidate.tagName === 'INPUT'
      ? (candidate as HTMLInputElement).type.toLowerCase()
      : null
  ));
  return types.every((type) => type === types[0])
    && (types[0] === 'checkbox' || types[0] === 'radio');
}

function nativeSemanticControl(candidates: readonly HTMLElement[]): HTMLElement | undefined {
  return candidates.find((candidate) => !isHiddenInput(candidate)) ?? candidates[0];
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

function safeEncodeSubmissionName(
  base: FormFieldPath,
  relative?: FormRelativePath,
): string | null {
  try {
    if (relative === undefined) return safeEncodeFormFieldPath(base);
    return safeEncodeFormFieldPath(appendFormFieldPath(base, relative));
  } catch {
    return null;
  }
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

function supportsReadonly(element: HTMLInputElement): boolean {
  return !new Set([
    'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range',
    'reset', 'submit',
  ]).has(element.type.toLowerCase());
}
