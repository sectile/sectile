import {
  applyFormEvent,
  tryCreateFormState,
  type FormCommand,
  type FormEvent,
  type FormFieldInput,
  type FormIssue,
  type FormIssueSource,
  type FormState,
} from '@sectile/core/form';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface TerminalFormFieldValidation<ID extends StableID = StableID> {
  readonly valid: boolean;
  readonly issues?: readonly FormIssue<ID>[];
}

export type TerminalFormFieldValidator<ID extends StableID = StableID> =
  () => TerminalFormFieldValidation<ID>;
export type TerminalFormFieldResetHandler = () => void;

export interface TerminalFormField<ID extends StableID = StableID>
  extends Omit<FormFieldInput<ID>, 'valid' | 'issues'> {
  readonly label: string;
  readonly available?: boolean;
  readonly validate?: TerminalFormFieldValidator<ID>;
  readonly reset?: TerminalFormFieldResetHandler;
}

export interface TerminalFormSnapshot<ID extends StableID = StableID> {
  readonly revision: number;
  readonly state: FormState<ID>;
  readonly currentFieldId: ID | null;
  readonly summaryIssues: readonly FormIssue<ID>[];
}

export type TerminalFormSnapshotListener<ID extends StableID = StableID> =
  (snapshot: TerminalFormSnapshot<ID>) => void;

export interface TerminalFormSubmitPayload<ID extends StableID = StableID> {
  readonly state: FormState<ID>;
  readonly currentFieldId: ID | null;
}

export type TerminalFormSubmitHandler<ID extends StableID = StableID> =
  (payload: TerminalFormSubmitPayload<ID>) => void;
export type TerminalFormCurrentFieldChangeHandler<ID extends StableID = StableID> =
  (id: ID | null) => void;
export type TerminalFormAnnounceSummaryHandler<ID extends StableID = StableID> =
  (issues: readonly FormIssue<ID>[]) => void;
export type TerminalFormStateChangeHandler<ID extends StableID = StableID> =
  (state: FormState<ID>) => void;
export type TerminalFormUpdateHandler = () => void;

export interface TerminalFormOptions<ID extends StableID = StableID> {
  readonly fields?: readonly TerminalFormField<ID>[];
  readonly issues?: readonly FormIssue<ID>[];
  readonly defaultCurrentFieldId?: ID | null;
  readonly onCurrentFieldChange?: TerminalFormCurrentFieldChangeHandler<ID>;
  readonly onSubmit?: TerminalFormSubmitHandler<ID>;
  readonly onAnnounceSummary?: TerminalFormAnnounceSummaryHandler<ID>;
  readonly onStateChange?: TerminalFormStateChangeHandler<ID>;
  readonly onUpdate?: TerminalFormUpdateHandler;
}

export interface TerminalFormConnection<ID extends StableID = StableID> {
  readonly state: FormState<ID>;
  readonly currentFieldId: ID | null;
  readonly summaryIssues: readonly FormIssue<ID>[];
  getSnapshot(): TerminalFormSnapshot<ID>;
  registerField(field: TerminalFormField<ID>): () => void;
  refreshField(id: ID, flags?: { readonly touched?: boolean; readonly dirty?: boolean }): boolean;
  focusField(id: ID): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  replaceIssues(source: FormIssueSource, issues: readonly FormIssue<ID>[]): boolean;
  submit(): boolean;
  submitStarted(): boolean;
  submitSucceeded(): boolean;
  submitFailed(issues?: readonly FormIssue<ID>[]): boolean;
  reset(): boolean;
  subscribe(listener: TerminalFormSnapshotListener<ID>): () => void;
  destroy(): void;
}

export function createForm<ID extends StableID = StableID>(
  options: TerminalFormOptions<ID> = {},
): TerminalFormConnection<ID> {
  return unwrap(tryCreateForm(options));
}

export function tryCreateForm<ID extends StableID = StableID>(
  options: TerminalFormOptions<ID> = {},
): Result<TerminalFormConnection<ID>> {
  const fieldInputs = (options.fields ?? []).map(toFieldInput);
  const initial = tryCreateFormState<ID>({ fields: fieldInputs, issues: options.issues ?? [] });
  if (!initial.ok) return initial;

  const fields = new Map((options.fields ?? []).map((field) => [field.id, field]));
  const subscribers = new Set<(snapshot: TerminalFormSnapshot<ID>) => void>();
  let state = initial.value;
  let currentFieldId = resolveInitialField(fields, options.defaultCurrentFieldId ?? null);
  let summaryIssues: readonly FormIssue<ID>[] = Object.freeze([]);
  let revision = 0;
  let active = true;

  const snapshot = (): TerminalFormSnapshot<ID> => Object.freeze({
    revision,
    state,
    currentFieldId,
    summaryIssues,
  });
  const notify = (): void => {
    revision += 1;
    const next = snapshot();
    options.onStateChange?.(state);
    options.onUpdate?.();
    for (const subscriber of subscribers) subscriber(next);
  };
  const setCurrent = (id: ID | null): boolean => {
    if (id !== null && !isAvailable(fields.get(id))) return false;
    if (currentFieldId === id) return true;
    currentFieldId = id;
    options.onCurrentFieldChange?.(id);
    notify();
    return true;
  };
  const orderedIssues = (): readonly FormIssue<ID>[] => Object.freeze([
    ...state.fields.flatMap((field) => field.issues),
    ...state.issues,
  ]);
  const execute = (commands: readonly FormCommand<ID>[]): void => {
    for (const command of commands) {
      if (command.type === 'focus-field') setCurrent(command.id);
      if (command.type === 'announce-summary') {
        summaryIssues = Object.freeze(
          orderedIssues().filter((issue) => command.issueIds.includes(issue.id)),
        );
        options.onAnnounceSummary?.(summaryIssues);
      }
      if (command.type === 'submit-requested') {
        options.onSubmit?.({ state, currentFieldId });
      }
      if (command.type === 'reset-field') fields.get(command.id)?.reset?.();
    }
  };
  const transition = (event: FormEvent<ID>): boolean => {
    if (!active) return false;
    const result = applyFormEvent(state, event);
    if (!result.ok) return false;
    state = result.value.state;
    execute(result.value.commands);
    notify();
    return true;
  };
  const refreshField = (
    id: ID,
    flags: { readonly touched?: boolean; readonly dirty?: boolean } = {},
  ): boolean => {
    const field = fields.get(id);
    const current = state.fields.find((candidate) => candidate.id === id);
    if (field === undefined || current === undefined) return false;
    const validation = field.validate?.() ?? { valid: true, issues: [] };
    if (!transition({
      type: 'validation-started',
      trigger: 'input',
      intent: 'interaction',
    })) return false;
    const generation = state.validationGeneration;
    if (!transition({
      type: 'update-field',
      id,
      touched: flags.touched ?? current.touched,
      dirty: flags.dirty ?? current.dirty,
      valid: validation.valid,
      issues: validation.issues ?? [],
    })) return false;
    return transition({
      type: 'validation-completed',
      trigger: 'input',
      intent: 'interaction',
      generation,
    });
  };
  const validateAllForSubmission = (): boolean => {
    if (!transition({
      type: 'validation-started',
      trigger: 'submit',
      intent: 'submission',
    })) return false;
    const generation = state.validationGeneration;
    for (const [id, field] of fields) {
      const current = state.fields.find((candidate) => candidate.id === id);
      if (current === undefined) continue;
      const validation = field.validate?.() ?? { valid: true, issues: [] };
      if (!transition({
        type: 'update-field',
        id,
        touched: current.touched,
        dirty: current.dirty,
        valid: validation.valid,
        issues: validation.issues ?? [],
      })) return false;
    }
    return transition({
      type: 'validation-completed',
      trigger: 'submit',
      intent: 'submission',
      generation,
    });
  };
  const move = (offset: -1 | 1): boolean => {
    const available = [...fields.values()].filter((field) => isAvailable(field));
    if (available.length === 0) return false;
    const index = available.findIndex((field) => field.id === currentFieldId);
    const next = index < 0
      ? available[0]!
      : available[(index + offset + available.length) % available.length]!;
    return setCurrent(next.id);
  };
  const registerField = (field: TerminalFormField<ID>): (() => void) => {
    const previous = fields.get(field.id);
    fields.set(field.id, field);
    transition({ type: 'register-field', field: toFieldInput(field) });
    transition({ type: 'reorder-fields', ids: [...fields.keys()] });
    if (currentFieldId === null && isAvailable(field)) setCurrent(field.id);
    return (): void => {
      if (fields.get(field.id) !== field) return;
      if (previous === undefined) fields.delete(field.id);
      else fields.set(field.id, previous);
      transition(previous === undefined
        ? { type: 'unregister-field', id: field.id }
        : { type: 'register-field', field: toFieldInput(previous) });
      if (currentFieldId === field.id) {
        setCurrent(resolveInitialField(fields, null));
      }
    };
  };

  const connection: TerminalFormConnection<ID> = {
    get state() { return state; },
    get currentFieldId() { return currentFieldId; },
    get summaryIssues() { return summaryIssues; },
    getSnapshot: snapshot,
    registerField,
    refreshField,
    focusField: setCurrent,
    handleKeyboardInput: (input) => {
      if (input.key === 'down' || input.key === 'right' || input.key === 'tab') {
        return move(input.shiftKey === true ? -1 : 1);
      }
      if (input.key === 'up' || input.key === 'left' || input.key === 'shift-tab') {
        return move(-1);
      }
      if (input.key === 'home') {
        return setCurrent(resolveInitialField(fields, null));
      }
      if (input.key === 'end') {
        const available = [...fields.values()].filter((field) => isAvailable(field));
        return setCurrent(available.at(-1)?.id ?? null);
      }
      if (input.key === 'enter' || input.key === 'submit') return connection.submit();
      if (input.key === 'reset') return connection.reset();
      return false;
    },
    replaceIssues: (source, issues) => transition({ type: 'replace-issues', source, issues }),
    submit: validateAllForSubmission,
    submitStarted: () => transition({ type: 'submit-started', generation: state.submissionGeneration }),
    submitSucceeded: () => transition({ type: 'submit-succeeded', generation: state.submissionGeneration }),
    submitFailed: (issues = []) => transition({ type: 'submit-failed', generation: state.submissionGeneration, issues }),
    reset: () => {
      summaryIssues = Object.freeze([]);
      const reset = transition('reset');
      if (reset) setCurrent(resolveInitialField(fields, options.defaultCurrentFieldId ?? null));
      return reset;
    },
    subscribe: (listener) => {
      subscribers.add(listener);
      return (): void => { subscribers.delete(listener); };
    },
    destroy: () => {
      active = false;
      fields.clear();
      subscribers.clear();
    },
  };

  return { ok: true, value: connection };
}

function toFieldInput<ID extends StableID>(field: TerminalFormField<ID>): FormFieldInput<ID> {
  return {
    id: field.id,
    ...(field.name === undefined ? {} : { name: field.name }),
    ...(field.touched === undefined ? {} : { touched: field.touched }),
    ...(field.dirty === undefined ? {} : { dirty: field.dirty }),
  };
}

function isAvailable<ID extends StableID>(
  field: TerminalFormField<ID> | undefined,
): field is TerminalFormField<ID> {
  return field !== undefined && field.available !== false;
}

function resolveInitialField<ID extends StableID>(
  fields: ReadonlyMap<ID, TerminalFormField<ID>>,
  preferred: ID | null,
): ID | null {
  if (preferred !== null && isAvailable(fields.get(preferred))) return preferred;
  return [...fields.values()].find((field) => isAvailable(field))?.id ?? null;
}
