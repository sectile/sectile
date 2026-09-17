import {
  applyFormEvent,
  getFormField,
  getFormFieldIDsByIssueSource,
  tryCreateFormState,
  type FormCommand,
  type FormEvent,
  type FormFieldInput,
  type FormFieldState,
  type FormReinitializeOptions,
  type FormState,
  type FormSubmissionFailure,
  type FormValidationIntent,
  type FormValidationTrigger,
} from '@sectile/form/state';
import { tryCreateFormValues, type FormValues } from '@sectile/form/values';
import type { FormSchema, StandardSchemaV1 } from '@sectile/form/schema';
import { FormResultError, type FormResult } from '@sectile/form/error';
import type { StableID } from '@sectile/core';
import type {
  FormAnnounceSummaryHandler,
  FormConnection,
  FormFieldSelector,
  FormInteractionValidationTrigger,
  FormOptions,
  FormParticipant,
  FormReconfigureOptions,
  FormResetHandler,
  FormSelectionListener,
  FormSelector,
  FormSnapshot,
  FormStateChangeHandler,
  FormSubmitErrorMapper,
  FormSubmitHandler,
  FormSubmitPayload,
  FormSubmitResult,
  FormSubscribeOptions,
  FormUpdateHandler,
  FormValidateContext,
  FormValidateHandler,
  FormValidationResult,
} from './contracts.js';
export * from './contracts.js';
import {
  formParticipantValuesEqual,
  orderedParticipants,
  participantTargets,
  readFormParticipantValue,
  readParticipantName,
  reorderParticipants,
} from './participants.js';
import {
  collectNativeIssues,
  mapValidationIssues,
  orderedIssues,
  schemaException,
  standardSchemaPath,
  summaryMessage,
  validationException,
} from './validation.js';
import {
  createNativeFormData,
  defaultSubmissionFailure,
  includeNativeValidation,
  isNativeSubmitter,
  isPromiseLike,
  nativeSubmitterForm,
  normalizeSubmissionIssues,
} from './submission.js';

interface SelectorSubscription<Input> {
  readonly select: (input: Input) => unknown;
  readonly listener: (selected: unknown, previous: unknown) => void;
  readonly equals: (previous: unknown, next: unknown) => boolean;
  selected: unknown;
  active: boolean;
  readonly createdRevision: number;
}

export function createForm<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
>(
  options: FormOptions<ID, Input, Output>,
): FormConnection<ID, Input, Output> {
  const result = tryCreateForm(options);
  if (!result.ok) throw new FormResultError(result.error);
  return result.value;
}

export function tryCreateForm<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
>(
  options: FormOptions<ID, Input, Output>,
): FormResult<FormConnection<ID, Input, Output>> {
  const participants = new Map<ID, FormParticipant<ID>>();
  const participantBaselines = new Map<ID, unknown>();
  const participantValues = new Map<ID, unknown>();
  for (const participant of options.participants ?? []) {
    const replacing = participants.has(participant.id);
    const currentValue = readFormParticipantValue(participant);
    participants.set(participant.id, participant);
    participantValues.set(participant.id, currentValue);
    if (!replacing) participantBaselines.set(participant.id, currentValue);
    participant.element.dataset['scope'] = 'form';
    participant.element.dataset['part'] = 'field';
  }
  const initialParticipants = orderedParticipants(participants);
  const initialFields: FormFieldInput<ID>[] = initialParticipants.map((participant) => ({
    id: participant.id,
    name: readParticipantName(participant),
    dirty: !formParticipantValuesEqual(
      participant,
      participantValues.get(participant.id),
      participantBaselines.get(participant.id),
    ),
  }));
  const initial = tryCreateFormState<ID>({
    fields: initialFields,
    issues: options.issues ?? [],
  });
  if (!initial.ok) return initial;

  const participantObservers = new Map<ID, () => void>();
  const participantTargetOwners = new WeakMap<Node, FormParticipant<ID>>();
  const handledParticipantEvents = new WeakSet<Event>();
  const pendingReinitializations = new Map<number, FormReinitializeOptions>();
  const formSubscribers = new Set<SelectorSubscription<FormState<ID>>>();
  const fieldSubscribers = new Map<ID, Set<SelectorSubscription<FormFieldState<ID> | null>>>();
  const pendingNotifications: Array<{
    readonly event: FormEvent<ID>;
    readonly previous: FormState<ID>;
    readonly next: FormState<ID>;
    readonly revision: number;
  }> = [];
  let state = initial.value;
  let revision = 0;
  let active = true;
  let recoveringFocus = false;
  let invalidBatchPending = false;
  let validationSequence = 0;
  let validationController: AbortController | null = null;
  let nativeResume: { readonly token: number; readonly submitter: HTMLElement | null } | null = null;
  let nativeResumeToken = 0;
  let summary: HTMLElement | undefined = options.summary;
  let renderSummaryContent = options.renderSummaryContent ?? true;
  let manageSummaryVisibility = options.manageSummaryVisibility ?? true;
  let schemaOption: FormSchema<Input, Output> | undefined = options.schema;
  let validateOption: FormValidateHandler<ID, Input> | undefined = options.validate;
  let validateOn = new Set<FormInteractionValidationTrigger>(options.validateOn ?? []);
  let revalidateOn = new Set<FormInteractionValidationTrigger>(options.revalidateOn ?? ['input']);
  let submitHandler: FormSubmitHandler<ID, Output> | undefined = options.onSubmit;
  let submitErrorMapper: FormSubmitErrorMapper<ID> | undefined = options.mapSubmitError;
  let resetHandler: FormResetHandler | undefined = options.onReset;
  let announceSummaryHandler: FormAnnounceSummaryHandler<ID> | undefined = options.onAnnounceSummary;
  let stateChangeHandler: FormStateChangeHandler<ID> | undefined = options.onStateChange;
  let updateHandler: FormUpdateHandler | undefined = options.onUpdate;
  let subscriptionErrorHandler: ((error: unknown) => void) | undefined = options.onSubscriptionError;
  let dispatchingNotifications = false;

  const detachPendingValidationForTopologyChange = (): AbortController | null => {
    if (state.validation.status !== 'validating') return null;
    const retired = validationController;
    validationController = null;
    validationSequence += 1;
    return retired;
  };

  options.form.dataset['scope'] = 'form';
  options.form.dataset['part'] = 'root';
  const syncSummary = (): void => {
    if (summary === undefined) return;
    if (renderSummaryContent) {
      summary.textContent = summaryMessage(state.allIssues, state.submission.failure);
    }
    if (manageSummaryVisibility) summary.hidden = state.allIssues.length === 0 && state.submission.failure === null;
  };
  const configureSummary = (element: HTMLElement | undefined): void => {
    summary = element;
    if (element === undefined) return;
    element.dataset['scope'] = 'form';
    element.dataset['part'] = 'summary';
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
    element.tabIndex = -1;
    syncSummary();
  };
  configureSummary(summary);

  const sameTriggers = (
    left: ReadonlySet<FormInteractionValidationTrigger>,
    right: readonly FormInteractionValidationTrigger[],
  ): boolean => left.size === right.length && right.every((trigger) => left.has(trigger));
  const reconfigure = (next: FormReconfigureOptions<ID, Input, Output>): void => {
    if (!active) return;
    const nextValidateOn = next.validateOn ?? [];
    const nextRevalidateOn = next.revalidateOn ?? ['input'];
    const validationChanged = schemaOption !== next.schema
      || validateOption !== next.validate
      || !sameTriggers(validateOn, nextValidateOn)
      || !sameTriggers(revalidateOn, nextRevalidateOn);
    renderSummaryContent = next.renderSummaryContent ?? true;
    manageSummaryVisibility = next.manageSummaryVisibility ?? true;
    configureSummary(next.summary);
    schemaOption = next.schema;
    validateOption = next.validate;
    validateOn = new Set<FormInteractionValidationTrigger>(nextValidateOn);
    revalidateOn = new Set<FormInteractionValidationTrigger>(nextRevalidateOn);
    submitHandler = next.onSubmit;
    submitErrorMapper = next.mapSubmitError;
    resetHandler = next.onReset;
    announceSummaryHandler = next.onAnnounceSummary;
    stateChangeHandler = next.onStateChange;
    updateHandler = next.onUpdate;
    subscriptionErrorHandler = next.onSubscriptionError;
    if (!validationChanged) return;
    validationController?.abort();
    validationController = null;
    validationSequence += 1;
    transition({ type: 'validation-invalidated' });
    transition({ type: 'replace-issues', source: 'validate', issues: [] });
    transition({ type: 'replace-issues', source: 'schema', issues: [] });
  };

  const snapshot = (): FormSnapshot<ID> => Object.freeze({ revision, state });
  const reportSubscriptionError = (error: unknown): void => {
    try { subscriptionErrorHandler?.(error); } catch { /* subscriber failures stay isolated */ }
  };
  const dispatchSubscriptions = <Value>(
    subscriptions: ReadonlySet<SelectorSubscription<Value>> | undefined,
    value: Value,
    notificationRevision: number,
  ): void => {
    if (subscriptions === undefined || subscriptions.size === 0) return;
    for (const subscription of [...subscriptions]) {
      if (!subscription.active || subscription.createdRevision >= notificationRevision) continue;
      let selected: unknown;
      try {
        selected = subscription.select(value);
      } catch (error) {
        reportSubscriptionError(error);
        continue;
      }
      let equal: boolean;
      try {
        equal = subscription.equals(subscription.selected, selected);
      } catch (error) {
        reportSubscriptionError(error);
        continue;
      }
      if (equal) continue;
      const previous = subscription.selected;
      subscription.selected = selected;
      try {
        subscription.listener(selected, previous);
      } catch (error) {
        reportSubscriptionError(error);
      }
    }
  };
  const affectedFieldIDs = (
    event: FormEvent<ID>,
    previous: FormState<ID>,
    next: FormState<ID>,
  ): readonly ID[] | null => {
    if (event === 'reset' || (typeof event !== 'string' && event.type === 'reinitialize')) {
      return null;
    }
    if (typeof event === 'string') return [];
    if (
      event.type === 'register-field'
      || event.type === 'unregister-field'
      || event.type === 'set-field-meta'
      || event.type === 'replace-field-issues'
      || event.type === 'upsert-field-issue'
      || event.type === 'remove-field-issue'
      || event.type === 'clear-field-issues'
    ) return [event.type === 'register-field' ? event.field.id : event.id];
    const source = event.type === 'replace-issues'
      ? event.source
      : event.type === 'field-value-changed'
        || event.type === 'submit-failed' || event.type === 'submit-succeeded'
        || (event.type === 'validation-started' && event.intent === 'submission')
        ? 'server'
        : null;
    if (source === null) return [];
    return [...new Set([
      ...getFormFieldIDsByIssueSource(previous, source),
      ...getFormFieldIDsByIssueSource(next, source),
    ])];
  };
  const notify = (event: FormEvent<ID>, previous: FormState<ID>): void => {
    revision += 1;
    pendingNotifications.push({ event, previous, next: state, revision });
    if (dispatchingNotifications) return;
    dispatchingNotifications = true;
    try {
      for (let index = 0; index < pendingNotifications.length; index += 1) {
        const notification = pendingNotifications[index]!;
        stateChangeHandler?.(notification.next);
        updateHandler?.();
        dispatchSubscriptions(formSubscribers, notification.next, notification.revision);
        if (!active) break;
        const affected = affectedFieldIDs(
          notification.event,
          notification.previous,
          notification.next,
        );
        if (affected === null) {
          for (const [id, subscriptions] of fieldSubscribers) {
            dispatchSubscriptions(
              subscriptions,
              getFormField(notification.next, id),
              notification.revision,
            );
          }
          continue;
        }
        for (const id of affected) {
          dispatchSubscriptions(
            fieldSubscribers.get(id),
            getFormField(notification.next, id),
            notification.revision,
          );
        }
      }
    } finally {
      pendingNotifications.length = 0;
      dispatchingNotifications = false;
    }
  };
  const transition = (
    event: FormEvent<ID>,
    retirePendingValidation = false,
  ): readonly FormCommand<ID>[] | null => {
    if (!active) return null;
    const result = applyFormEvent(state, event);
    if (!result.ok) return null;
    const previous = state;
    const retiredValidation = retirePendingValidation
      ? detachPendingValidationForTopologyChange()
      : null;
    state = result.value.state;
    try {
      if (!Object.is(previous, state)) {
        syncSummary();
        notify(event, previous);
      }
    } finally {
      retiredValidation?.abort();
    }
    return result.value.commands;
  };
  const field = (id: ID): FormFieldState<ID> | undefined => (
    getFormField(state, id) ?? undefined
  );
  const updateParticipant = (
    participant: FormParticipant<ID>,
    flags: { readonly touched?: boolean; readonly dirty?: boolean } = {},
  ): boolean => {
    const current = field(participant.id);
    if (current === undefined) return false;
    const touched = flags.touched ?? current.touched;
    const dirty = flags.dirty ?? current.dirty;
    if (touched === current.touched && dirty === current.dirty) return true;
    return transition({
      type: 'set-field-meta',
      id: participant.id,
      meta: { touched, dirty },
    }) !== null;
  };
  const valuesEqual = (
    participant: FormParticipant<ID>,
    current: unknown,
    baseline: unknown,
  ): boolean => formParticipantValuesEqual(participant, current, baseline);
  const readValue = (participant: FormParticipant<ID>): unknown => readFormParticipantValue(participant);
  const captureParticipant = (participant: FormParticipant<ID>): unknown => {
    const value = readValue(participant);
    participantValues.set(participant.id, value);
    return value;
  };
  const captureAllCurrentValues = (): void => {
    if (!active) return;
    for (const participant of participants.values()) {
      const value = captureParticipant(participant);
      participantBaselines.set(participant.id, value);
    }
  };
  const reinitialize = (reinitializeOptions: FormReinitializeOptions = {}): void => {
    if (!active) return;
    const canceledPendingValidation = state.validation.status === 'validating';
    validationController?.abort();
    validationController = null;
    validationSequence += 1;
    nativeResume = null;
    pendingReinitializations.clear();
    captureAllCurrentValues();
    const transitionOptions = canceledPendingValidation && reinitializeOptions.preserve?.validation === true
      ? { ...reinitializeOptions, preserve: { ...reinitializeOptions.preserve, validation: false } }
      : reinitializeOptions;
    transition({ type: 'reinitialize', options: transitionOptions });
    if (summary !== undefined) {
      const remaining = orderedIssues(state);
      if (renderSummaryContent) {
        summary.textContent = summaryMessage(remaining, state.submission.failure);
      }
      if (manageSummaryVisibility) summary.hidden = remaining.length === 0 && state.submission.failure === null;
    }
  };
  const focusInvalid = (startId: ID): boolean => {
    const invalid = state.fields.filter((candidate) => !candidate.valid);
    const start = Math.max(0, invalid.findIndex((candidate) => candidate.id === startId));
    const ordered = [...invalid.slice(start), ...invalid.slice(0, start)];
    for (const candidate of ordered) {
      const participant = participants.get(candidate.id);
      if (participant === undefined) continue;
      if (participant.focus !== undefined) {
        if (participant.focus() !== false) return true;
        continue;
      }
      const control = participant.focusTarget
        ?? participant.semanticControl
        ?? participant.element;
      const focusable = control as HTMLElement & { readonly disabled?: boolean };
      if (focusable.hidden || focusable.disabled === true) continue;
      focusable.focus();
      if (focusable.ownerDocument.activeElement === focusable) return true;
    }
    return false;
  };
  const announce = (issueIds: readonly StableID[]): void => {
    const issues = orderedIssues(state).filter((issue) => issueIds.includes(issue.id));
    if (summary !== undefined) {
      if (renderSummaryContent) {
        summary.textContent = summaryMessage(issues, state.submission.failure);
      }
      if (manageSummaryVisibility) summary.hidden = issues.length === 0 && state.submission.failure === null;
    }
    announceSummaryHandler?.(issues, state.submission.failure);
  };
  const announceFailure = (): void => {
    const failure = state.submission.failure;
    if (failure === null) return;
    if (summary !== undefined) {
      if (renderSummaryContent) summary.textContent = summaryMessage([], failure);
      if (manageSummaryVisibility) summary.hidden = false;
    }
    announceSummaryHandler?.([], failure);
  };
  const execute = (commands: readonly FormCommand<ID>[]): void => {
    let focused = false;
    for (const command of commands) {
      if (command.type === 'focus-field') {
        recoveringFocus = true;
        try {
          focused = focusInvalid(command.id) || focused;
        } finally {
          recoveringFocus = false;
        }
      }
      if (command.type === 'announce-summary') {
        announce(command.issueIds);
        if (!focused && command.issueIds.length > 0 && summary !== undefined) {
          recoveringFocus = true;
          try {
            summary.focus();
            focused = summary.ownerDocument.activeElement === summary;
          } finally {
            recoveringFocus = false;
          }
        }
      }
      if (command.type === 'announce-submission-failure') announceFailure();
      if (command.type === 'reset-field') participants.get(command.id)?.reset?.();
    }
  };
  const finishValidation = (
    sequence: number,
    generation: number,
    trigger: FormValidationTrigger,
    intent: FormValidationIntent,
    formData: FormData,
    input: Input,
    submitter: HTMLElement | null,
    event: SubmitEvent | null,
    custom: FormValidationResult,
    schema: StandardSchemaV1.Result<Output> | null,
    includeNative: boolean,
    resumeNative: boolean,
  ): void => {
    if (!active || sequence !== validationSequence) return;
    if (intent === 'submission') {
      transition({
        type: 'replace-issues',
        source: 'native',
        issues: includeNative ? collectNativeIssues(participants) : [],
        generation,
      });
    }
    transition({
      type: 'replace-issues',
      source: 'validate',
      issues: mapValidationIssues(state, 'validate', custom.issues ?? []),
      generation,
    });
    if (intent === 'submission') {
      const schemaIssues = schema?.issues === undefined
        ? []
        : schema.issues.map((issue) => {
            const path = standardSchemaPath(issue.path);
            return { message: issue.message, ...(path === undefined ? {} : { path }) };
          });
      transition({
        type: 'replace-issues',
        source: 'schema',
        issues: mapValidationIssues(state, 'schema', schemaIssues),
        generation,
      });
    }
    const commands = transition({ type: 'validation-completed', trigger, intent, generation });
    if (commands === null) return;
    execute(commands);
    if (intent !== 'submission') return;
    if (!state.valid) {
      event?.preventDefault();
      return;
    }
    if (event === null) return;
    if (submitHandler === undefined) {
      if (resumeNative) resumeNativeSubmission(submitter);
      return;
    }
    event.preventDefault();
    const submissionGeneration = state.submission.generation;
    if (transition({ type: 'submit-started', generation: submissionGeneration }) === null) return;
    const payload: FormSubmitPayload<ID, Output> = Object.freeze({
      event,
      formData,
      values: schema !== null && schema.issues === undefined ? schema.value : input as unknown as Output,
      submitter,
      state,
      reinitialize: (reinitializeOptions = {}) => {
        if (!active || submissionGeneration !== state.submission.generation) return;
        pendingReinitializations.set(submissionGeneration, reinitializeOptions);
      },
    });
    let result: FormSubmitResult<ID>;
    try {
      const candidate = submitHandler(payload);
      if (isPromiseLike(candidate)) {
        void Promise.resolve(candidate).then(
          (resolved) => settleManagedSubmission(submissionGeneration, resolved),
          (error: unknown) => failManagedSubmission(submissionGeneration, error),
        );
        return;
      }
      result = candidate;
    } catch (error) {
      failManagedSubmission(submissionGeneration, error);
      return;
    }
    settleManagedSubmission(submissionGeneration, result);
  };
  const settleManagedSubmission = (
    generation: number,
    result: FormSubmitResult<ID>,
  ): void => {
    if (!active || generation !== state.submission.generation) return;
    if (typeof result === 'object' && result !== null && result.ok === false) {
      pendingReinitializations.delete(generation);
      let commands = transition({
        type: 'submit-failed',
        generation,
        failure: result.failure
          ?? (result.issues === undefined ? defaultSubmissionFailure() : null),
        issues: normalizeSubmissionIssues(result.issues ?? []),
      });
      if (commands === null && state.submission.status === 'submitting') {
        commands = transition({
          type: 'submit-failed',
          generation,
          failure: defaultSubmissionFailure(),
        });
      }
      if (commands !== null) execute(commands);
      return;
    }
    const succeeded = transition({ type: 'submit-succeeded', generation });
    if (succeeded === null) return;
    const requested = pendingReinitializations.get(generation);
    pendingReinitializations.delete(generation);
    if (requested !== undefined) reinitialize(requested);
  };
  const failManagedSubmission = (generation: number, reason: unknown): void => {
    if (!active || generation !== state.submission.generation) return;
    let failure: FormSubmissionFailure;
    try {
      failure = submitErrorMapper?.(reason) ?? defaultSubmissionFailure();
    } catch {
      failure = defaultSubmissionFailure();
    }
    settleManagedSubmission(generation, { ok: false, failure });
  };
  const runValidation = (
    trigger: FormValidationTrigger,
    intent: FormValidationIntent,
    changedFieldId: ID | null,
    event: SubmitEvent | null = null,
    submitter: HTMLElement | null = null,
  ): void => {
    if (state.submission.status === 'submitting') {
      event?.preventDefault();
      return;
    }
    validationController?.abort();
    const controller = new AbortController();
    validationController = controller;
    const sequence = ++validationSequence;
    const commands = transition({ type: 'validation-started', trigger, intent });
    if (commands === null) return;
    execute(commands);
    const generation = state.validation.generation;

    const formData = createNativeFormData(options.form, submitter);
    const values = tryCreateFormValues(
      [...formData.entries()].map(([path, value]) => ({ path, value })),
    );
    if (!values.ok) {
      if (intent === 'submission') {
        transition({
          type: 'replace-issues',
          source: 'native',
          issues: includeNativeValidation(options.form, submitter) ? collectNativeIssues(participants) : [],
          generation,
        });
      }
      transition({
        type: 'replace-issues',
        source: 'validate',
        issues: [Object.freeze({
          id: `validate:form-values:${generation}`,
          message: 'Form values could not be constructed safely.',
          source: 'validate',
        })],
        generation,
      });
      if (intent === 'submission') {
        transition({ type: 'replace-issues', source: 'schema', issues: [], generation });
      }
      const completed = transition({ type: 'validation-completed', trigger, intent, generation });
      if (completed !== null) execute(completed);
      event?.preventDefault();
      return;
    }
    const input = values.value as Input;
    const context: FormValidateContext<ID> = Object.freeze({
      trigger,
      intent,
      changedFieldId,
      signal: controller.signal,
    });
    let custom: FormValidationResult = {};
    let customPromise: PromiseLike<FormValidationResult> | null = null;
    let schema: StandardSchemaV1.Result<Output> | null = null;
    let schemaPromise: PromiseLike<StandardSchemaV1.Result<Output>> | null = null;
    try {
      const candidate = validateOption?.(input, context) ?? {};
      if (isPromiseLike(candidate)) customPromise = candidate;
      else custom = candidate;
    } catch (error) {
      custom = validationException(error);
    }
    if (intent === 'submission' && schemaOption !== undefined) {
      try {
        const candidate = schemaOption['~standard'].validate(input);
        if (isPromiseLike(candidate)) schemaPromise = candidate;
        else schema = candidate;
      } catch (error) {
        schema = schemaException(error);
      }
    }
    const includeNative = intent === 'submission'
      && includeNativeValidation(options.form, submitter);
    if (customPromise !== null || schemaPromise !== null) {
      event?.preventDefault();
      void Promise.all([
        customPromise === null
          ? Promise.resolve(custom).catch(validationException)
          : Promise.resolve(customPromise).catch(validationException),
        schemaPromise === null
          ? Promise.resolve(schema).catch(schemaException)
          : Promise.resolve(schemaPromise).catch(schemaException),
      ]).then(([customResult, schemaResult]) => {
        if (controller.signal.aborted) return;
        finishValidation(
          sequence,
          generation,
          trigger,
          intent,
          formData,
          input,
          submitter,
          event,
          customResult,
          schemaResult,
          includeNative,
          event !== null && submitHandler === undefined,
        );
      });
      return;
    }
    finishValidation(
      sequence,
      generation,
      trigger,
      intent,
      formData,
      input,
      submitter,
      event,
      custom,
      schema,
      includeNative,
      false,
    );
  };
  const resumeNativeSubmission = (submitter: HTMLElement | null): void => {
    if (!active) return;
    const token = ++nativeResumeToken;
    nativeResume = { token, submitter };
    try {
      const associatedForm = submitter === null
        ? null
        : nativeSubmitterForm(submitter);
      if (
        submitter !== null
        && isNativeSubmitter(submitter)
        && associatedForm === options.form
      ) {
        options.form.requestSubmit(submitter as HTMLButtonElement | HTMLInputElement);
      } else {
        options.form.requestSubmit();
      }
    } finally {
      queueMicrotask(() => {
        if (nativeResume?.token === token) nativeResume = null;
      });
    }
  };
  const submit = (event: SubmitEvent): void => {
    const submitter = event.submitter instanceof HTMLElement && isNativeSubmitter(event.submitter)
      ? event.submitter
      : null;
    if (nativeResume !== null && nativeResume.submitter === submitter) {
      nativeResume = null;
      return;
    }
    if (state.validation.status === 'validating' && state.validation.intent === 'submission') {
      event.preventDefault();
      return;
    }
    runValidation('submit', 'submission', null, event, submitter);
  };
  const submitInvalidBatch = (): void => {
    invalidBatchPending = false;
    if (!active) return;
    runValidation('submit', 'submission', null);
  };
  const participantFor = (target: EventTarget | null): FormParticipant<ID> | undefined => {
    if (!(target instanceof Node)) return undefined;
    let node: Node | null = target;
    while (node !== null) {
      const participant = participantTargetOwners.get(node);
      if (participant !== undefined && participants.get(participant.id) === participant) return participant;
      if (node === options.form) break;
      node = node.parentNode;
    }
    return undefined;
  };
  const invalidateAfterInteraction = (
    trigger: FormInteractionValidationTrigger,
    participant: FormParticipant<ID> | undefined,
    previousIntent: FormValidationIntent | null = state.validation.status === 'invalid'
      ? state.validation.intent
      : null,
  ): void => {
    if (previousIntent !== null && !revalidateOn.has(trigger)) return;
    transition({ type: 'validation-invalidated' });
    const intent = previousIntent ?? (validateOn.has(trigger) ? 'interaction' : null);
    if (intent !== null) runValidation(trigger, intent, participant?.id ?? null);
  };
  const onValueInteraction = (event: Event): void => {
    if (handledParticipantEvents.has(event)) return;
    handledParticipantEvents.add(event);
    const participant = participantFor(event.target);
    if (participant === undefined) return;
    const updateValue = (): void => {
      if (!active || participants.get(participant.id) !== participant) return;
      const previous = participantValues.get(participant.id);
      const current = readValue(participant);
      if (valuesEqual(participant, current, previous)) return;
      const previousIntent = state.validation.status === 'invalid'
        ? state.validation.intent
        : null;
      participantValues.set(participant.id, current);
      const baseline = participantBaselines.get(participant.id);
      updateParticipant(participant, {
        dirty: !valuesEqual(participant, current, baseline),
      });
      transition({ type: 'field-value-changed', id: participant.id });
      invalidateAfterInteraction('input', participant, previousIntent);
    };
    if (event.type === 'input' || event.type === 'change') updateValue();
    else queueMicrotask(updateValue);
  };
  const onBlur = (event: Event): void => {
    if (recoveringFocus || handledParticipantEvents.has(event)) return;
    handledParticipantEvents.add(event);
    const participant = participantFor(event.target);
    if (participant !== undefined) updateParticipant(participant, { touched: true });
    invalidateAfterInteraction('blur', participant);
  };
  const onInvalid = (event: Event): void => {
    if (handledParticipantEvents.has(event)) return;
    handledParticipantEvents.add(event);
    const participant = participantFor(event.target);
    if (participant !== undefined) updateParticipant(participant, { touched: true });
    if (invalidBatchPending) return;
    invalidBatchPending = true;
    queueMicrotask(submitInvalidBatch);
  };
  const onSubmit = (event: Event): void => submit(event as SubmitEvent);
  const onReset = (): void => {
    validationController?.abort();
    validationSequence += 1;
    nativeResume = null;
    pendingReinitializations.clear();
    const commands = transition('reset');
    if (commands !== null) execute(commands);
    if (summary !== undefined) {
      if (renderSummaryContent) summary.textContent = '';
      if (manageSummaryVisibility) summary.hidden = true;
    }
    resetHandler?.();
    queueMicrotask(captureAllCurrentValues);
  };

  options.form.addEventListener('input', onValueInteraction);
  options.form.addEventListener('change', onValueInteraction);
  options.form.addEventListener('blur', onBlur, true);
  options.form.addEventListener('invalid', onInvalid, true);
  options.form.addEventListener('submit', onSubmit);
  options.form.addEventListener('reset', onReset);

  const observeParticipant = (participant: FormParticipant<ID>): void => {
    participantObservers.get(participant.id)?.();
    const targets = participantTargets(participant);
    for (const target of targets) participantTargetOwners.set(target, participant);
    const externalTargets = targets.filter((target) => !options.form.contains(target));
    const roots = externalTargets.filter((target) => !externalTargets.some(
      (candidate) => candidate !== target && candidate.contains(target),
    ));
    for (const target of roots) {
      target.addEventListener('input', onValueInteraction);
      target.addEventListener('change', onValueInteraction);
      target.addEventListener('blur', onBlur, true);
      target.addEventListener('invalid', onInvalid, true);
    }
    participantObservers.set(participant.id, () => {
      for (const target of roots) {
        target.removeEventListener('input', onValueInteraction);
        target.removeEventListener('change', onValueInteraction);
        target.removeEventListener('blur', onBlur, true);
        target.removeEventListener('invalid', onInvalid, true);
      }
      for (const target of targets) {
        if (participantTargetOwners.get(target) === participant) participantTargetOwners.delete(target);
      }
    });
  };

  const registerParticipant = (participant: FormParticipant<ID>): (() => void) => {
    const replacing = participants.has(participant.id);
    participantObservers.get(participant.id)?.();
    participants.set(participant.id, participant);
    const currentValue = captureParticipant(participant);
    if (!replacing || !participantBaselines.has(participant.id)) {
      participantBaselines.set(participant.id, currentValue);
    }
    observeParticipant(participant);
    participant.element.dataset['scope'] = 'form';
    participant.element.dataset['part'] = 'field';
    if (replacing) {
      const baseline = participantBaselines.get(participant.id);
      transition({
        type: 'set-field-meta',
        id: participant.id,
        meta: {
          name: readParticipantName(participant),
          dirty: !valuesEqual(participant, currentValue, baseline),
        },
      });
    } else {
      transition({
        type: 'register-field',
        field: {
          id: participant.id,
          name: readParticipantName(participant),
        },
      }, true);
    }
    reorderParticipants(participants, state, transition);
    return (): void => {
      if (participants.get(participant.id) !== participant) return;
      participantObservers.get(participant.id)?.();
      participantObservers.delete(participant.id);
      participants.delete(participant.id);
      participantBaselines.delete(participant.id);
      participantValues.delete(participant.id);
      transition(
        { type: 'unregister-field', id: participant.id },
        true,
      );
    };
  };

  for (const participant of participants.values()) observeParticipant(participant);

  const createSelectorSubscription = <Value, Selected>(
    value: Value,
    selector: (value: Value) => Selected,
    listener: FormSelectionListener<Selected>,
    subscribeOptions: FormSubscribeOptions<Selected> = {},
  ): SelectorSubscription<Value> => ({
    select: selector as (value: Value) => unknown,
    listener: listener as (selected: unknown, previous: unknown) => void,
    equals: (subscribeOptions.equals ?? Object.is) as (previous: unknown, next: unknown) => boolean,
    selected: selector(value),
    active: true,
    createdRevision: revision,
  });
  const subscribeForm = <Selected>(
    selector: FormSelector<ID, Selected>,
    listener: FormSelectionListener<Selected>,
    subscribeOptions?: FormSubscribeOptions<Selected>,
  ): (() => void) => {
    if (!active) return () => {};
    const subscription = createSelectorSubscription(state, selector, listener, subscribeOptions);
    formSubscribers.add(subscription);
    return (): void => {
      if (!subscription.active) return;
      subscription.active = false;
      formSubscribers.delete(subscription);
    };
  };
  const subscribeField = <Selected>(
    id: ID,
    selector: FormFieldSelector<ID, Selected>,
    listener: FormSelectionListener<Selected>,
    subscribeOptions?: FormSubscribeOptions<Selected>,
  ): (() => void) => {
    if (!active) return () => {};
    const subscription = createSelectorSubscription(
      getFormField(state, id),
      selector,
      listener,
      subscribeOptions,
    );
    let channel = fieldSubscribers.get(id);
    if (channel === undefined) {
      channel = new Set();
      fieldSubscribers.set(id, channel);
    }
    channel.add(subscription);
    return (): void => {
      if (!subscription.active) return;
      subscription.active = false;
      channel?.delete(subscription);
      if (channel?.size === 0) fieldSubscribers.delete(id);
    };
  };

  const connection: FormConnection<ID, Input, Output> = {
    get state() { return state; },
    getSnapshot: snapshot,
    getFormData: (submitter = null) => createNativeFormData(options.form, submitter),
    reconfigure,
    registerParticipant,
    refreshParticipant: (id) => {
      const participant = participants.get(id);
      if (participant === undefined) return false;
      observeParticipant(participant);
      const currentField = field(id);
      const name = readParticipantName(participant);
      if (currentField?.name !== name) {
        transition({ type: 'set-field-meta', id, meta: { name } });
      }
      const previous = participantValues.get(id);
      const current = captureParticipant(participant);
      const baseline = participantBaselines.get(id);
      const valueChanged = !valuesEqual(participant, current, previous);
      if (valueChanged) {
        updateParticipant(participant, { dirty: !valuesEqual(participant, current, baseline) });
      }
      reorderParticipants(participants, state, transition);
      if (!valueChanged) return true;
      const previousIntent = state.validation.status === 'invalid'
        ? state.validation.intent
        : null;
      transition({ type: 'field-value-changed', id });
      if (previousIntent !== null) runValidation('input', previousIntent, id);
      return true;
    },
    getField: (id) => getFormField(state, id),
    setFieldMeta: (id, meta) => transition({ type: 'set-field-meta', id, meta }) !== null,
    replaceFieldIssues: (id, source, issues) => transition({
      type: 'replace-field-issues',
      id,
      source,
      issues,
    }) !== null,
    upsertFieldIssue: (id, issue) => transition({ type: 'upsert-field-issue', id, issue }) !== null,
    removeFieldIssue: (id, issueId) => transition({ type: 'remove-field-issue', id, issueId }) !== null,
    clearFieldIssues: (id, source) => transition({
      type: 'clear-field-issues',
      id,
      ...(source === undefined ? {} : { source }),
    }) !== null,
    replaceIssues: (source, issues) => transition({ type: 'replace-issues', source, issues }) !== null,
    submitStarted: () => {
      const generation = state.submission.generation;
      return transition({ type: 'submit-started', generation }) === null ? null : generation;
    },
    submitSucceeded: (generation) => transition({ type: 'submit-succeeded', generation }) !== null,
    submitFailed: (generation, result) => {
      const commands = transition({
        type: 'submit-failed',
        generation,
        failure: result.failure ?? null,
        issues: normalizeSubmissionIssues(result.issues ?? []),
      });
      if (commands === null) return false;
      execute(commands);
      return true;
    },
    reinitialize,
    reset: () => options.form.reset(),
    subscribeForm,
    subscribeField,
    destroy: () => {
      if (!active) return;
      active = false;
      pendingNotifications.length = 0;
      validationController?.abort();
      nativeResume = null;
      options.form.removeEventListener('input', onValueInteraction);
      options.form.removeEventListener('change', onValueInteraction);
      options.form.removeEventListener('blur', onBlur, true);
      options.form.removeEventListener('invalid', onInvalid, true);
      options.form.removeEventListener('submit', onSubmit);
      options.form.removeEventListener('reset', onReset);
      for (const subscription of formSubscribers) subscription.active = false;
      formSubscribers.clear();
      for (const channel of fieldSubscribers.values()) {
        for (const subscription of channel) subscription.active = false;
      }
      fieldSubscribers.clear();
      for (const disconnect of participantObservers.values()) disconnect();
      participantObservers.clear();
      participants.clear();
      participantBaselines.clear();
      participantValues.clear();
      pendingReinitializations.clear();
    },
  };
  return { ok: true, value: connection };
}
