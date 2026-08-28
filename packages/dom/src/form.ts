import {
  applyFormEvent,
  tryCreateFormState,
  type FormCommand,
  type FormEvent,
  type FormFieldState,
  type FormIssue,
  type FormIssueSource,
  type FormState,
  type FormValidationIntent,
  type FormValidationTrigger,
} from '@sectile/form/state';
import {
  encodeFormFieldPath,
  type FormFieldPath,
} from '@sectile/form/path';
import { createFormValues, type FormValues } from '@sectile/form/values';
import type { FormSchema, StandardSchemaV1 } from '@sectile/form/schema';
import { FormResultError, type FormResult } from '@sectile/form/error';
import type { StableID } from '@sectile/core';

export {
  appendFormFieldPath,
  createFormFieldPath,
  createFormRelativePath,
  encodeFormFieldPath,
  type FormFieldPath,
  type FormPathSegment,
  type FormRelativePath,
} from '@sectile/form/path';
export type { FormValues } from '@sectile/form/values';
export type { FormSchema } from '@sectile/form/schema';

export interface FormValidationIssue {
  readonly message: string;
  readonly path?: FormFieldPath;
}

export interface FormValidationResult {
  readonly issues?: readonly FormValidationIssue[];
}

export type FormInteractionValidationTrigger = Exclude<FormValidationTrigger, 'submit'>;

export interface FormValidateContext<ID extends StableID = StableID> {
  readonly trigger: FormValidationTrigger;
  readonly intent: FormValidationIntent;
  readonly changedFieldId: ID | null;
  readonly signal: AbortSignal;
}

export type FormValidateHandler<
  ID extends StableID = StableID,
  Values extends object = FormValues,
> = (
  values: Values,
  context: FormValidateContext<ID>,
) => FormValidationResult | PromiseLike<FormValidationResult>;
export type FormFocusHandler = () => boolean | void;
export type FormResetHandler = () => void;
export type FormAnnounceSummaryHandler<ID extends StableID = StableID> =
  (issues: readonly FormIssue<ID>[]) => void;
export type FormStateChangeHandler<ID extends StableID = StableID> =
  (state: FormState<ID>) => void;
export type FormUpdateHandler = () => void;

export type FormSubmissionElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export interface FormParticipant<ID extends StableID = StableID> {
  readonly id: ID;
  readonly element: HTMLElement;
  readonly semanticControl?: HTMLElement;
  readonly focusTarget?: HTMLElement;
  readonly submissionElements?: readonly FormSubmissionElement[];
  readonly name?: FormFieldPath | null;
  readonly focus?: FormFocusHandler;
  readonly reset?: FormResetHandler;
}

export interface FormSubmitPayload<
  ID extends StableID = StableID,
  Values extends object = FormValues,
> {
  readonly event: SubmitEvent;
  readonly formData: FormData;
  readonly values: Values;
  readonly submitter: HTMLElement | null;
  readonly state: FormState<ID>;
}

export type FormSubmitHandler<
  ID extends StableID = StableID,
  Values extends object = FormValues,
> = (payload: FormSubmitPayload<ID, Values>) => void;

export interface FormSnapshot<ID extends StableID = StableID> {
  readonly revision: number;
  readonly state: FormState<ID>;
}

export type FormSnapshotListener<ID extends StableID = StableID> =
  (snapshot: FormSnapshot<ID>) => void;

export interface FormOptions<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
> {
  readonly form: HTMLFormElement;
  readonly summary?: HTMLElement;
  readonly participants?: readonly FormParticipant<ID>[];
  readonly issues?: readonly FormIssue<ID>[];
  readonly schema?: FormSchema<Input, Output>;
  readonly validate?: FormValidateHandler<ID, Input>;
  readonly validateOn?: readonly FormInteractionValidationTrigger[];
  readonly revalidateOn?: readonly FormInteractionValidationTrigger[];
  readonly onSubmit?: FormSubmitHandler<ID, Output>;
  readonly onReset?: FormResetHandler;
  readonly onAnnounceSummary?: FormAnnounceSummaryHandler<ID>;
  readonly onStateChange?: FormStateChangeHandler<ID>;
  readonly onUpdate?: FormUpdateHandler;
}

export type FormReconfigureOptions<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
> = Omit<FormOptions<ID, Input, Output>, 'form' | 'participants' | 'issues'>;

export interface FormConnection<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
> {
  readonly state: FormState<ID>;
  getSnapshot(): FormSnapshot<ID>;
  getFormData(submitter?: HTMLElement | null): FormData;
  reconfigure(options: FormReconfigureOptions<ID, Input, Output>): void;
  registerParticipant(participant: FormParticipant<ID>): () => void;
  refreshParticipant(id: ID): boolean;
  replaceIssues(source: FormIssueSource, issues: readonly FormIssue<ID>[]): boolean;
  submitStarted(): number | null;
  submitSucceeded(generation: number): boolean;
  submitFailed(generation: number, issues?: readonly FormIssue<ID>[]): boolean;
  reset(): void;
  subscribe(listener: FormSnapshotListener<ID>): () => void;
  destroy(): void;
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
  const initial = tryCreateFormState<ID>({ issues: options.issues ?? [] });
  if (!initial.ok) return initial;

  const participants = new Map<ID, FormParticipant<ID>>();
  const subscribers = new Set<(snapshot: FormSnapshot<ID>) => void>();
  let state = initial.value;
  let revision = 0;
  let active = true;
  let invalidBatchPending = false;
  let validationSequence = 0;
  let validationController: AbortController | null = null;
  let summary: HTMLElement | undefined = options.summary;
  let schemaOption: FormSchema<Input, Output> | undefined = options.schema;
  let validateOption: FormValidateHandler<ID, Input> | undefined = options.validate;
  let validateOn = new Set<FormInteractionValidationTrigger>(options.validateOn ?? []);
  let revalidateOn = new Set<FormInteractionValidationTrigger>(options.revalidateOn ?? ['input']);
  let submitHandler: FormSubmitHandler<ID, Output> | undefined = options.onSubmit;
  let resetHandler: FormResetHandler | undefined = options.onReset;
  let announceSummaryHandler: FormAnnounceSummaryHandler<ID> | undefined = options.onAnnounceSummary;
  let stateChangeHandler: FormStateChangeHandler<ID> | undefined = options.onStateChange;
  let updateHandler: FormUpdateHandler | undefined = options.onUpdate;

  options.form.dataset['scope'] = 'form';
  options.form.dataset['part'] = 'root';
  const configureSummary = (element: HTMLElement | undefined): void => {
    summary = element;
    if (element === undefined) return;
    element.dataset['scope'] = 'form';
    element.dataset['part'] = 'summary';
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
    element.tabIndex = -1;
    element.hidden = state.valid;
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
    configureSummary(next.summary);
    schemaOption = next.schema;
    validateOption = next.validate;
    validateOn = new Set<FormInteractionValidationTrigger>(nextValidateOn);
    revalidateOn = new Set<FormInteractionValidationTrigger>(nextRevalidateOn);
    submitHandler = next.onSubmit;
    resetHandler = next.onReset;
    announceSummaryHandler = next.onAnnounceSummary;
    stateChangeHandler = next.onStateChange;
    updateHandler = next.onUpdate;
    if (!validationChanged) return;
    validationController?.abort();
    validationController = null;
    validationSequence += 1;
    transition({ type: 'validation-invalidated' });
    transition({ type: 'replace-issues', source: 'validate', issues: [] });
    transition({ type: 'replace-issues', source: 'schema', issues: [] });
  };

  const snapshot = (): FormSnapshot<ID> => Object.freeze({ revision, state });
  const notify = (): void => {
    revision += 1;
    const next = snapshot();
    stateChangeHandler?.(state);
    updateHandler?.();
    for (const subscriber of subscribers) subscriber(next);
  };
  const transition = (event: FormEvent<ID>): readonly FormCommand<ID>[] | null => {
    const result = applyFormEvent(state, event);
    if (!result.ok) return null;
    state = result.value.state;
    notify();
    return result.value.commands;
  };
  const field = (id: ID): FormFieldState<ID> | undefined => (
    state.fields.find((candidate) => candidate.id === id)
  );
  const updateParticipant = (
    participant: FormParticipant<ID>,
    flags: { readonly touched?: boolean; readonly dirty?: boolean } = {},
  ): boolean => {
    const current = field(participant.id);
    if (current === undefined) return false;
    return transition({
      type: 'update-field',
      id: participant.id,
      touched: flags.touched ?? current.touched,
      dirty: flags.dirty ?? current.dirty,
    }) !== null;
  };
  const focusInvalid = (startId: ID): void => {
    const invalid = state.fields.filter(
      (candidate) => !candidate.valid || candidate.issues.length > 0,
    );
    const start = Math.max(0, invalid.findIndex((candidate) => candidate.id === startId));
    const ordered = [...invalid.slice(start), ...invalid.slice(0, start)];
    for (const candidate of ordered) {
      const participant = participants.get(candidate.id);
      if (participant === undefined) continue;
      if (participant.focus !== undefined) {
        if (participant.focus() !== false) return;
        continue;
      }
      const control = participant.focusTarget
        ?? participant.semanticControl
        ?? participant.element;
      const focusable = control as HTMLElement & { readonly disabled?: boolean };
      if (focusable.hidden || focusable.disabled === true) continue;
      focusable.focus();
      return;
    }
  };
  const announce = (issueIds: readonly StableID[]): void => {
    const issues = orderedIssues(state).filter((issue) => issueIds.includes(issue.id));
    if (summary !== undefined) {
      summary.textContent = issues.map((issue) => issue.message).join(' ');
      summary.hidden = issues.length === 0;
    }
    announceSummaryHandler?.(issues);
  };
  const execute = (commands: readonly FormCommand<ID>[]): void => {
    for (const command of commands) {
      if (command.type === 'focus-field') focusInvalid(command.id);
      if (command.type === 'announce-summary') announce(command.issueIds);
      if (command.type === 'reset-field') participants.get(command.id)?.reset?.();
    }
  };
  const collectNativeIssues = (): readonly FormIssue<ID>[] => {
    const issues: FormIssue<ID>[] = [];
    for (const participant of participants.values()) {
      for (const control of validationTargets(participant)) {
        const candidate = control as HTMLElement & {
          readonly validity?: ValidityState;
          readonly validationMessage?: string;
          readonly willValidate?: boolean;
        };
        if (candidate.willValidate === false || candidate.validity?.valid !== false) continue;
        issues.push(Object.freeze({
          id: `${participant.id}:native`,
          fieldId: participant.id,
          message: candidate.validationMessage?.trim()
            || `${readParticipantName(participant) ?? participant.id} is invalid.`,
          source: 'native',
        }));
        break;
      }
    }
    return Object.freeze(issues);
  };
  const mapValidationIssues = (
    source: 'validate' | 'schema',
    issues: readonly FormValidationIssue[],
  ): readonly FormIssue<ID>[] => Object.freeze(issues.map((issue, index) => {
    const name = issue.path === undefined ? null : encodeFormFieldPath(issue.path);
    const owner = name === null
      ? undefined
      : state.fields.find((candidate) => candidate.name === name);
    return Object.freeze({
      id: `${source}:${name ?? 'form'}:${index}`,
      message: issue.message,
      source,
      ...(owner === undefined ? {} : { fieldId: owner.id }),
    });
  }));
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
  ): void => {
    if (!active || sequence !== validationSequence) return;
    if (intent === 'submission') {
      transition({
        type: 'replace-issues',
        source: 'native',
        issues: includeNative ? collectNativeIssues() : [],
        generation,
      });
    }
    transition({
      type: 'replace-issues',
      source: 'validate',
      issues: mapValidationIssues('validate', custom.issues ?? []),
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
        issues: mapValidationIssues('schema', schemaIssues),
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
    submitHandler?.({
      event,
      formData,
      values: schema !== null && schema.issues === undefined ? schema.value : input as unknown as Output,
      submitter,
      state,
    });
  };
  const runValidation = (
    trigger: FormValidationTrigger,
    intent: FormValidationIntent,
    changedFieldId: ID | null,
    event: SubmitEvent | null = null,
    submitter: HTMLElement | null = null,
  ): void => {
    if (state.submissionStatus === 'submitting') {
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
    const generation = state.validationGeneration;

    const formData = createNativeFormData(options.form, submitter);
    const input = createFormValues(
      [...formData.entries()].map(([path, value]) => ({ path, value })),
    ) as Input;
    const context: FormValidateContext<ID> = Object.freeze({
      trigger,
      intent,
      changedFieldId,
      signal: controller.signal,
    });
    let custom: FormValidationResult | PromiseLike<FormValidationResult> = {};
    let schema: StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>> | null = null;
    try {
      custom = validateOption?.(input, context) ?? {};
    } catch (error) {
      custom = validationException(error);
    }
    if (intent === 'submission' && schemaOption !== undefined) {
      try {
        schema = schemaOption['~standard'].validate(input);
      } catch (error) {
        schema = schemaException(error);
      }
    }
    const includeNative = intent === 'submission'
      && !options.form.noValidate
      && !isFormNoValidateSubmitter(submitter);
    if (isPromiseLike(custom) || isPromiseLike(schema)) {
      event?.preventDefault();
      void Promise.all([
        Promise.resolve(custom).catch(validationException),
        schema === null
          ? Promise.resolve(null)
          : Promise.resolve(schema).catch(schemaException),
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
    );
  };
  const submit = (event: SubmitEvent): void => {
    const submitter = event.submitter instanceof HTMLElement && isNativeSubmitter(event.submitter)
      ? event.submitter
      : null;
    runValidation('submit', 'submission', null, event, submitter);
  };
  const submitInvalidBatch = (): void => {
    invalidBatchPending = false;
    if (!active) return;
    runValidation('submit', 'submission', null);
  };
  const participantFor = (target: EventTarget | null): FormParticipant<ID> | undefined => {
    if (!(target instanceof Node)) return undefined;
    return [...participants.values()].find((participant) => {
      const controls = participantTargets(participant);
      return controls.includes(target as HTMLElement)
        || participant.element === target
        || participant.element.contains(target);
    });
  };
  const interact = (event: Event, trigger: FormInteractionValidationTrigger): void => {
    const participant = participantFor(event.target);
    const previousIntent = state.validationStatus === 'invalid'
      ? state.validationIntent
      : null;
    if (participant !== undefined) {
      updateParticipant(participant, trigger === 'input' ? { dirty: true } : { touched: true });
    }
    if (previousIntent !== null && !revalidateOn.has(trigger)) return;
    transition({ type: 'validation-invalidated' });
    const intent = previousIntent ?? (validateOn.has(trigger) ? 'interaction' : null);
    if (intent !== null) runValidation(trigger, intent, participant?.id ?? null);
  };
  const onInput = (event: Event): void => interact(event, 'input');
  const onBlur = (event: Event): void => interact(event, 'blur');
  const onInvalid = (event: Event): void => {
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
    const commands = transition('reset');
    if (commands !== null) execute(commands);
    if (summary !== undefined) {
      summary.textContent = '';
      summary.hidden = true;
    }
    resetHandler?.();
  };

  options.form.addEventListener('input', onInput, true);
  options.form.addEventListener('change', onInput, true);
  options.form.addEventListener('blur', onBlur, true);
  options.form.addEventListener('invalid', onInvalid, true);
  options.form.addEventListener('submit', onSubmit);
  options.form.addEventListener('reset', onReset);

  const registerParticipant = (participant: FormParticipant<ID>): (() => void) => {
    participants.set(participant.id, participant);
    participant.element.dataset['scope'] = 'form';
    participant.element.dataset['part'] = 'field';
    transition({
      type: 'register-field',
      field: {
        id: participant.id,
        name: readParticipantName(participant),
      },
    });
    reorderParticipants(participants, state, transition);
    return (): void => {
      if (participants.get(participant.id) !== participant) return;
      participants.delete(participant.id);
      transition({ type: 'unregister-field', id: participant.id });
    };
  };

  for (const participant of options.participants ?? []) registerParticipant(participant);

  const connection: FormConnection<ID, Input, Output> = {
    get state() { return state; },
    getSnapshot: snapshot,
    getFormData: (submitter = null) => createNativeFormData(options.form, submitter),
    reconfigure,
    registerParticipant,
    refreshParticipant: (id) => {
      const participant = participants.get(id);
      if (participant === undefined) return false;
      transition({ type: 'validation-invalidated' });
      runValidation('input', 'interaction', id);
      return true;
    },
    replaceIssues: (source, issues) => transition({ type: 'replace-issues', source, issues }) !== null,
    submitStarted: () => {
      const generation = state.submissionGeneration;
      return transition({ type: 'submit-started', generation }) === null ? null : generation;
    },
    submitSucceeded: (generation) => transition({ type: 'submit-succeeded', generation }) !== null,
    submitFailed: (generation, issues = []) => {
      const commands = transition({ type: 'submit-failed', generation, issues });
      if (commands === null) return false;
      execute(commands);
      return true;
    },
    reset: () => options.form.reset(),
    subscribe: (listener) => {
      subscribers.add(listener);
      return (): void => { subscribers.delete(listener); };
    },
    destroy: () => {
      if (!active) return;
      active = false;
      validationController?.abort();
      options.form.removeEventListener('input', onInput, true);
      options.form.removeEventListener('change', onInput, true);
      options.form.removeEventListener('blur', onBlur, true);
      options.form.removeEventListener('invalid', onInvalid, true);
      options.form.removeEventListener('submit', onSubmit);
      options.form.removeEventListener('reset', onReset);
      subscribers.clear();
      participants.clear();
    },
  };
  return { ok: true, value: connection };
}

function readControlName(element: HTMLElement): string | null {
  const name = (element as HTMLElement & { readonly name?: string }).name?.trim();
  return name === undefined || name.length === 0 ? null : name;
}

function readParticipantName<ID extends StableID>(
  participant: FormParticipant<ID>,
): string | null {
  if (participant.name !== undefined && participant.name !== null) {
    return encodeFormFieldPath(participant.name);
  }
  for (const element of participant.submissionElements ?? []) {
    const name = readControlName(element);
    if (name !== null) return name;
  }
  return readControlName(
    participant.semanticControl ?? participant.element,
  );
}

function participantTargets<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly HTMLElement[] {
  return [...new Set([
    participant.element,
    participant.semanticControl,
    participant.focusTarget,
    ...(participant.submissionElements ?? []),
  ].filter((element): element is HTMLElement => element !== undefined))];
}

function validationTargets<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly HTMLElement[] {
  const semantic = participant.semanticControl;
  const submissions = participant.submissionElements ?? [];
  const targets = [...new Set([semantic, ...submissions].filter(
    (element): element is HTMLElement => element !== undefined,
  ))];
  return targets.length > 0 ? targets : [participant.element];
}

function createNativeFormData(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
): FormData {
  return submitter === null ? new FormData(form) : new FormData(form, submitter);
}

function isNativeSubmitter(element: HTMLElement): boolean {
  if (element.tagName === 'BUTTON') {
    const type = element.getAttribute('type')?.toLowerCase() ?? 'submit';
    return type === 'submit';
  }
  if (element.tagName !== 'INPUT') return false;
  const type = element.getAttribute('type')?.toLowerCase() ?? 'text';
  return type === 'submit' || type === 'image';
}

function isFormNoValidateSubmitter(element: HTMLElement | null): boolean {
  if (element === null) return false;
  return (element as HTMLElement & { readonly formNoValidate?: boolean }).formNoValidate === true;
}

function isPromiseLike<T>(value: T | PromiseLike<T> | null): value is PromiseLike<T> {
  return value !== null
    && typeof value === 'object'
    && 'then' in value
    && typeof value.then === 'function';
}

function validationException(_reason: unknown): FormValidationResult {
  return Object.freeze({
    issues: Object.freeze([{ message: 'Form validation failed.' }]),
  });
}

function schemaException<Output>(_reason: unknown): StandardSchemaV1.FailureResult {
  return Object.freeze({
    issues: Object.freeze([{ message: 'Schema validation failed.' }]),
  });
}

function standardSchemaPath(
  path: StandardSchemaV1.Issue['path'],
): FormFieldPath | undefined {
  if (path === undefined || path.length === 0) return undefined;
  const result: Array<string | number> = [];
  for (const segment of path) {
    const key = typeof segment === 'object' && segment !== null ? segment.key : segment;
    if (typeof key === 'symbol') return undefined;
    result.push(typeof key === 'number' ? key : String(key));
  }
  return result;
}

function orderedIssues<ID extends StableID>(state: FormState<ID>): readonly FormIssue<ID>[] {
  return [...state.fields.flatMap((field) => field.issues), ...state.issues];
}

function reorderParticipants<ID extends StableID>(
  participants: ReadonlyMap<ID, FormParticipant<ID>>,
  state: FormState<ID>,
  transition: (event: FormEvent<ID>) => readonly FormCommand<ID>[] | null,
): void {
  const byRegistration = [...participants.values()];
  const ordered = [...byRegistration].sort((left, right) => {
    const position = left.element.compareDocumentPosition(right.element);
    if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) return -1;
    if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) return 1;
    return byRegistration.indexOf(left) - byRegistration.indexOf(right);
  });
  const ids = ordered.map((participant) => participant.id);
  if (ids.length === state.fields.length) transition({ type: 'reorder-fields', ids });
}
