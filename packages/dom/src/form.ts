import {
  applyFormEvent,
  createFormValues,
  encodeFormFieldPath,
  tryCreateFormState,
  type FormCommand,
  type FormEvent,
  type FormFieldPath,
  type FormFieldState,
  type FormIssue,
  type FormIssueSource,
  type FormState,
  type FormValues,
} from '@sectile/core/form';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';

export {
  createFormFieldPath,
  encodeFormFieldPath,
  type FormFieldPath,
  type FormPathSegment,
} from '@sectile/core/form';

export interface FormParticipantValidation<ID extends StableID = StableID> {
  readonly valid: boolean;
  readonly issues?: readonly FormIssue<ID>[];
}

export type FormSubmissionElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export interface FormParticipant<ID extends StableID = StableID> {
  readonly id: ID;
  readonly element: HTMLElement;
  /** @deprecated Use semanticControl. */
  readonly control?: HTMLElement;
  readonly semanticControl?: HTMLElement;
  readonly focusTarget?: HTMLElement;
  readonly submissionElements?: readonly FormSubmissionElement[];
  readonly name?: FormFieldPath | null;
  readonly validate?: () => FormParticipantValidation<ID>;
  readonly focus?: () => boolean | void;
  readonly reset?: () => void;
}

export interface FormSubmitDetails<ID extends StableID = StableID> {
  readonly event: SubmitEvent;
  readonly formData: FormData;
  readonly values: FormValues;
  readonly submitter: HTMLElement | null;
  readonly state: FormState<ID>;
}

export interface FormSnapshot<ID extends StableID = StableID> {
  readonly revision: number;
  readonly state: FormState<ID>;
}

export interface FormOptions<ID extends StableID = StableID> {
  readonly form: HTMLFormElement;
  readonly summary?: HTMLElement;
  readonly participants?: readonly FormParticipant<ID>[];
  readonly issues?: readonly FormIssue<ID>[];
  readonly onSubmit?: (details: FormSubmitDetails<ID>) => void;
  readonly onReset?: () => void;
  readonly onAnnounceSummary?: (issues: readonly FormIssue<ID>[]) => void;
  readonly onStateChange?: (state: FormState<ID>) => void;
  readonly onUpdate?: () => void;
}

export interface FormConnection<ID extends StableID = StableID> {
  readonly state: FormState<ID>;
  getSnapshot(): FormSnapshot<ID>;
  getFormData(submitter?: HTMLElement | null): FormData;
  registerParticipant(participant: FormParticipant<ID>): () => void;
  refreshParticipant(id: ID): boolean;
  replaceIssues(source: FormIssueSource, issues: readonly FormIssue<ID>[]): boolean;
  submitStarted(): boolean;
  submitSucceeded(): boolean;
  submitFailed(issues?: readonly FormIssue<ID>[]): boolean;
  reset(): void;
  subscribe(listener: (snapshot: FormSnapshot<ID>) => void): () => void;
  destroy(): void;
}

export function createForm<ID extends StableID = StableID>(
  options: FormOptions<ID>,
): FormConnection<ID> {
  return unwrap(tryCreateForm(options));
}

export function tryCreateForm<ID extends StableID = StableID>(
  options: FormOptions<ID>,
): Result<FormConnection<ID>> {
  const initial = tryCreateFormState<ID>({ issues: options.issues ?? [] });
  if (!initial.ok) return initial;

  const participants = new Map<ID, FormParticipant<ID>>();
  const subscribers = new Set<(snapshot: FormSnapshot<ID>) => void>();
  let state = initial.value;
  let revision = 0;
  let active = true;
  let invalidBatchPending = false;

  options.form.dataset['scope'] = 'form';
  options.form.dataset['part'] = 'root';
  if (options.summary !== undefined) {
    options.summary.dataset['scope'] = 'form';
    options.summary.dataset['part'] = 'summary';
    options.summary.setAttribute('role', 'alert');
    options.summary.setAttribute('aria-live', 'polite');
    options.summary.tabIndex = -1;
    options.summary.hidden = true;
  }

  const snapshot = (): FormSnapshot<ID> => Object.freeze({ revision, state });
  const notify = (): void => {
    revision += 1;
    const next = snapshot();
    options.onStateChange?.(state);
    options.onUpdate?.();
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
  const nativeIssue = (participant: FormParticipant<ID>): FormIssue<ID> | null => {
    for (const control of validationTargets(participant)) {
      const candidate = control as HTMLElement & {
        readonly validity?: ValidityState;
        readonly validationMessage?: string;
        readonly willValidate?: boolean;
      };
      if (candidate.willValidate === false || candidate.validity?.valid !== false) continue;
      const message = candidate.validationMessage?.trim()
        || `${readParticipantName(participant) ?? participant.id} is invalid.`;
      return Object.freeze({
        id: `${participant.id}:native`,
        fieldId: participant.id,
        message,
        source: 'native',
      });
    }
    return null;
  };
  const participantIssues = (
    participant: FormParticipant<ID>,
  ): FormParticipantValidation<ID> => {
    const current = field(participant.id);
    const retained = current?.issues.filter(
      (issue) => issue.source !== 'native' && issue.source !== 'field',
    ) ?? [];
    const native = nativeIssue(participant);
    const custom = participant.validate?.();
    const issues = [
      ...retained,
      ...(native === null ? [] : [native]),
      ...(custom?.issues ?? []),
    ];
    return {
      valid: native === null && (custom?.valid ?? true) && issues.length === 0,
      issues,
    };
  };
  const refresh = (
    participant: FormParticipant<ID>,
    flags: { readonly touched?: boolean; readonly dirty?: boolean } = {},
  ): boolean => {
    const current = field(participant.id);
    if (current === undefined) return false;
    const validation = participantIssues(participant);
    return transition({
      type: 'update-field',
      id: participant.id,
      touched: flags.touched ?? current.touched,
      dirty: flags.dirty ?? current.dirty,
      valid: validation.valid,
      issues: validation.issues ?? [],
    }) !== null;
  };
  const refreshAll = (): void => {
    for (const participant of participants.values()) refresh(participant);
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
        ?? participant.control
        ?? participant.element;
      const focusable = control as HTMLElement & { readonly disabled?: boolean };
      if (focusable.hidden || focusable.disabled === true) continue;
      focusable.focus();
      return;
    }
  };
  const announce = (issueIds: readonly StableID[]): void => {
    const issues = orderedIssues(state).filter((issue) => issueIds.includes(issue.id));
    if (options.summary !== undefined) {
      options.summary.textContent = issues.map((issue) => issue.message).join(' ');
      options.summary.hidden = issues.length === 0;
    }
    options.onAnnounceSummary?.(issues);
  };
  const execute = (commands: readonly FormCommand<ID>[]): void => {
    for (const command of commands) {
      if (command.type === 'focus-field') focusInvalid(command.id);
      if (command.type === 'announce-summary') announce(command.issueIds);
      if (command.type === 'reset-field') participants.get(command.id)?.reset?.();
    }
  };
  const submit = (event: SubmitEvent): void => {
    refreshAll();
    const commands = transition('submit');
    if (commands === null) return;
    execute(commands);
    if (!state.valid) {
      event.preventDefault();
      return;
    }
    const submitter = event.submitter instanceof HTMLElement && isNativeSubmitter(event.submitter)
      ? event.submitter
      : null;
    const formData = createNativeFormData(options.form, submitter);
    options.onSubmit?.({
      event,
      formData,
      values: createFormValues([...formData.entries()].map(([path, value]) => ({ path, value }))),
      submitter,
      state,
    });
  };
  const submitInvalidBatch = (): void => {
    invalidBatchPending = false;
    if (!active) return;
    refreshAll();
    const commands = transition('submit');
    if (commands !== null) execute(commands);
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
  const onInput = (event: Event): void => {
    const participant = participantFor(event.target);
    if (participant !== undefined) refresh(participant, { dirty: true });
  };
  const onBlur = (event: Event): void => {
    const participant = participantFor(event.target);
    if (participant !== undefined) refresh(participant, { touched: true });
  };
  const onInvalid = (event: Event): void => {
    const participant = participantFor(event.target);
    if (participant !== undefined) refresh(participant, { touched: true });
    if (invalidBatchPending) return;
    invalidBatchPending = true;
    queueMicrotask(submitInvalidBatch);
  };
  const onSubmit = (event: Event): void => submit(event as SubmitEvent);
  const onReset = (): void => {
    const commands = transition('reset');
    if (commands !== null) execute(commands);
    if (options.summary !== undefined) {
      options.summary.textContent = '';
      options.summary.hidden = true;
    }
    options.onReset?.();
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
    const validation = participantIssues(participant);
    transition({
      type: 'register-field',
      field: {
        id: participant.id,
        name: readParticipantName(participant),
        valid: validation.valid,
        issues: validation.issues ?? [],
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

  const connection: FormConnection<ID> = {
    get state() { return state; },
    getSnapshot: snapshot,
    getFormData: (submitter = null) => createNativeFormData(options.form, submitter),
    registerParticipant,
    refreshParticipant: (id) => {
      const participant = participants.get(id);
      return participant === undefined ? false : refresh(participant);
    },
    replaceIssues: (source, issues) => transition({ type: 'replace-issues', source, issues }) !== null,
    submitStarted: () => transition('submit-started') !== null,
    submitSucceeded: () => transition('submit-succeeded') !== null,
    submitFailed: (issues = []) => transition({ type: 'submit-failed', issues }) !== null,
    reset: () => options.form.reset(),
    subscribe: (listener) => {
      subscribers.add(listener);
      return (): void => { subscribers.delete(listener); };
    },
    destroy: () => {
      if (!active) return;
      active = false;
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
    participant.semanticControl ?? participant.control ?? participant.element,
  );
}

function participantTargets<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly HTMLElement[] {
  return [...new Set([
    participant.element,
    participant.semanticControl,
    participant.control,
    participant.focusTarget,
    ...(participant.submissionElements ?? []),
  ].filter((element): element is HTMLElement => element !== undefined))];
}

function validationTargets<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly HTMLElement[] {
  const semantic = participant.semanticControl ?? participant.control;
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
