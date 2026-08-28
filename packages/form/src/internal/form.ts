import type { StableID } from '@sectile/core';
import type { FormResult as Result } from '../error.js';
import { fail, ok, unwrap } from './result.js';

export type FormIssueSource = 'native' | 'field' | 'form' | 'validate' | 'schema' | 'server';
export type FormPathSegment = string | number;
export type FormFieldPath = string | readonly FormPathSegment[];
export type FormRelativePath = FormPathSegment | readonly FormPathSegment[];

export interface FormValueEntry<Value = unknown> {
  readonly path: FormFieldPath;
  readonly value: Value;
}

export type FormValues<Shape extends object = Record<string, unknown>> = Readonly<Shape>;

export type FormValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';
export type FormSubmissionStatus = 'idle' | 'submitting' | 'succeeded' | 'failed';
export type FormValidationTrigger = 'input' | 'blur' | 'submit';
export type FormValidationIntent = 'interaction' | 'submission';

export interface FormIssue<ID extends StableID = StableID> {
  readonly id: StableID;
  readonly message: string;
  readonly source: FormIssueSource;
  readonly fieldId?: ID;
}

export interface FormFieldInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly name?: string | null;
  readonly touched?: boolean;
  readonly dirty?: boolean;
  readonly valid?: boolean;
  readonly issues?: readonly FormIssue<ID>[];
}

export interface FormFieldState<ID extends StableID = StableID> {
  readonly id: ID;
  readonly name: string | null;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly issues: readonly FormIssue<ID>[];
}

export interface FormState<ID extends StableID = StableID> {
  readonly validationGeneration: number;
  readonly validationStatus: FormValidationStatus;
  readonly validationTrigger: FormValidationTrigger | null;
  readonly validationIntent: FormValidationIntent | null;
  readonly submissionGeneration: number;
  readonly submissionStatus: FormSubmissionStatus;
  readonly submitCount: number;
  readonly submitted: boolean;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly fields: readonly FormFieldState<ID>[];
  readonly issues: readonly FormIssue<ID>[];
}

export type FormEvent<ID extends StableID = StableID> =
  | { readonly type: 'register-field'; readonly field: FormFieldInput<ID> }
  | { readonly type: 'unregister-field'; readonly id: ID }
  | {
      readonly type: 'update-field';
      readonly id: ID;
      readonly touched?: boolean;
      readonly dirty?: boolean;
      readonly valid?: boolean;
      readonly issues?: readonly FormIssue<ID>[];
    }
  | { readonly type: 'reorder-fields'; readonly ids: readonly ID[] }
  | {
      readonly type: 'replace-issues';
      readonly source: FormIssueSource;
      readonly issues: readonly FormIssue<ID>[];
      readonly generation?: number;
    }
  | { readonly type: 'validation-invalidated' }
  | {
      readonly type: 'validation-started';
      readonly trigger: FormValidationTrigger;
      readonly intent: FormValidationIntent;
    }
  | {
      readonly type: 'validation-completed';
      readonly trigger: FormValidationTrigger;
      readonly intent: FormValidationIntent;
      readonly generation: number;
    }
  | { readonly type: 'submit-started'; readonly generation: number }
  | { readonly type: 'submit-succeeded'; readonly generation: number }
  | { readonly type: 'submit-failed'; readonly generation: number; readonly issues?: readonly FormIssue<ID>[] }
  | 'reset';

export type FormCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus-field'; readonly id: ID }
  | { readonly type: 'announce-summary'; readonly issueIds: readonly StableID[] }
  | { readonly type: 'submit-requested'; readonly generation: number }
  | { readonly type: 'reset-field'; readonly id: ID };

export interface FormUpdate<ID extends StableID = StableID> {
  readonly state: FormState<ID>;
  readonly commands: readonly FormCommand<ID>[];
}

export interface FormStateInput<ID extends StableID = StableID> {
  readonly validationGeneration?: number;
  readonly validationStatus?: FormValidationStatus;
  readonly validationTrigger?: FormValidationTrigger | null;
  readonly validationIntent?: FormValidationIntent | null;
  readonly submissionGeneration?: number;
  readonly submissionStatus?: FormSubmissionStatus;
  readonly submitCount?: number;
  readonly submitted?: boolean;
  readonly fields?: readonly FormFieldInput<ID>[];
  readonly issues?: readonly FormIssue<ID>[];
}

export function createFormFieldPath(path: FormFieldPath): readonly FormPathSegment[] {
  return unwrap(tryCreateFormFieldPath(path));
}

export function tryCreateFormFieldPath(
  path: FormFieldPath,
): Result<readonly FormPathSegment[]> {
  const segments = typeof path === 'string' ? parsePath(path) : ok([...path]);
  if (!segments.ok) return segments;
  return validatePathSegments(segments.value, true);
}

export function createFormRelativePath(path: FormRelativePath): readonly FormPathSegment[] {
  return unwrap(tryCreateFormRelativePath(path));
}

export function tryCreateFormRelativePath(
  path: FormRelativePath,
): Result<readonly FormPathSegment[]> {
  const segments = typeof path === 'string'
    ? parsePath(path)
    : ok(typeof path === 'number' ? [path] : [...path]);
  if (!segments.ok) return segments;
  return validatePathSegments(segments.value, false);
}

export function appendFormFieldPath(
  base: FormFieldPath,
  relative: FormRelativePath,
): readonly FormPathSegment[] {
  return Object.freeze([
    ...createFormFieldPath(base),
    ...createFormRelativePath(relative),
  ]);
}

function validatePathSegments(
  segments: readonly FormPathSegment[],
  requireStringRoot: boolean,
): Result<readonly FormPathSegment[]> {
  if (segments.length === 0 || (requireStringRoot && typeof segments[0] !== 'string')) {
    return fail(
      'construction',
      requireStringRoot ? 'form-field-path-root-invalid' : 'form-relative-path-empty',
      requireStringRoot
        ? 'A Form field path must start with a string segment.'
        : 'A relative Form field path must not be empty.',
    );
  }
  for (const segment of segments) {
    if (typeof segment === 'number') {
      if (!Number.isSafeInteger(segment) || segment < 0) {
        return fail(
          'construction',
          'form-field-path-index-invalid',
          'Form field path indices must be non-negative safe integers.',
        );
      }
      continue;
    }
    if (segment.length === 0 || /[.\[\]]/u.test(segment)) {
      return fail(
        'construction',
        'form-field-path-segment-invalid',
        'Form field path string segments must be non-empty and must not contain dots or brackets.',
      );
    }
  }
  return ok(Object.freeze([...segments]));
}

export function encodeFormFieldPath(path: FormFieldPath): string {
  const segments = createFormFieldPath(path);
  return segments.map((segment, index) => (
    typeof segment === 'number'
      ? `[${segment}]`
      : index === 0 ? segment : `.${segment}`
  )).join('');
}

export function createFormValues<Value = unknown>(
  entries: readonly FormValueEntry<Value>[],
): FormValues {
  return unwrap(tryCreateFormValues(entries));
}

export function tryCreateFormValues<Value = unknown>(
  entries: readonly FormValueEntry<Value>[],
): Result<FormValues> {
  const root: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const branches = new WeakSet<object>();
  const repeated = new Map<string, unknown[]>();
  branches.add(root);

  for (const entry of entries) {
    const path = tryCreateFormFieldPath(entry.path);
    if (!path.ok) return path;
    const canonical = encodeSegments(path.value);
    let container: Record<string, unknown> | unknown[] = root;

    for (let index = 0; index < path.value.length - 1; index += 1) {
      const segment = path.value[index]!;
      const nextSegment = path.value[index + 1]!;
      const existing = readContainer(container, segment);
      const needsArray = typeof nextSegment === 'number';

      if (!hasContainer(container, segment)) {
        const branch: Record<string, unknown> | unknown[] = needsArray
          ? []
          : Object.create(null) as Record<string, unknown>;
        branches.add(branch);
        writeContainer(container, segment, branch);
        container = branch;
        continue;
      }
      if (
        typeof existing !== 'object'
        || existing === null
        || !branches.has(existing)
        || Array.isArray(existing) !== needsArray
      ) {
        return valueCollision(canonical);
      }
      container = existing as Record<string, unknown> | unknown[];
    }

    const leaf = path.value[path.value.length - 1]!;
    const existing = readContainer(container, leaf);
    if (!hasContainer(container, leaf)) {
      writeContainer(container, leaf, entry.value);
      continue;
    }
    if (typeof existing === 'object' && existing !== null && branches.has(existing)) {
      return valueCollision(canonical);
    }
    const values = repeated.get(canonical);
    if (values === undefined) {
      const next = [existing, entry.value];
      repeated.set(canonical, next);
      writeContainer(container, leaf, next);
    } else {
      values.push(entry.value);
    }
  }

  freezeBranches(root, branches);
  return ok(root);
}

export function createFormState<ID extends StableID = StableID>(
  input: FormStateInput<ID> = {},
): FormState<ID> {
  return unwrap(tryCreateFormState(input));
}

export function tryCreateFormState<ID extends StableID = StableID>(
  input: FormStateInput<ID> = {},
): Result<FormState<ID>> {
  const validationGeneration = input.validationGeneration ?? 0;
  const validationStatus = input.validationStatus ?? 'idle';
  const validationTrigger = input.validationTrigger ?? null;
  const validationIntent = input.validationIntent ?? null;
  const submissionGeneration = input.submissionGeneration ?? 0;
  const submissionStatus = input.submissionStatus ?? 'idle';
  const submitCount = input.submitCount ?? 0;
  if (!Number.isSafeInteger(validationGeneration) || validationGeneration < 0) {
    return fail(
      'construction',
      'form-validation-generation-invalid',
      'Form validation generation must be a non-negative safe integer.',
    );
  }
  if (!Number.isSafeInteger(submissionGeneration) || submissionGeneration < 0) {
    return fail(
      'construction',
      'form-submission-generation-invalid',
      'Form submission generation must be a non-negative safe integer.',
    );
  }
  if (!isValidationStatus(validationStatus)) {
    return fail(
      'construction',
      'form-validation-status-invalid',
      'Form validation status is invalid.',
    );
  }
  if (validationTrigger !== null && !isValidationTrigger(validationTrigger)) {
    return fail(
      'construction',
      'form-validation-trigger-invalid',
      'Form validation trigger is invalid.',
    );
  }
  if (validationIntent !== null && !isValidationIntent(validationIntent)) {
    return fail(
      'construction',
      'form-validation-intent-invalid',
      'Form validation intent is invalid.',
    );
  }
  if (!isSubmissionStatus(submissionStatus)) {
    return fail(
      'construction',
      'form-submission-status-invalid',
      'Form submission status is invalid.',
    );
  }
  if (
    (validationStatus === 'idle' && (validationTrigger !== null || validationIntent !== null))
    || (validationStatus !== 'idle' && (validationTrigger === null || validationIntent === null))
  ) {
    return fail(
      'construction',
      'form-validation-context-invalid',
      'Form validation context must be present exactly while validation has run.',
    );
  }
  if (!Number.isSafeInteger(submitCount) || submitCount < 0) {
    return fail(
      'construction',
      'form-submit-count-invalid',
      'Form submitCount must be a non-negative safe integer.',
    );
  }

  const fields: FormFieldState<ID>[] = [];
  for (const inputField of input.fields ?? []) {
    if (fields.some((field) => field.id === inputField.id)) {
      return fail(
        'construction',
        'form-field-id-duplicate',
        'Form field identifiers must be unique.',
      );
    }
    const field = normalizeField(inputField);
    if (!field.ok) return field;
    fields.push(field.value);
  }

  const issues = normalizeIssues(input.issues ?? [], undefined);
  if (!issues.ok) return issues;
  const issueIds = [
    ...issues.value.map((issue) => issue.id),
    ...fields.flatMap((field) => field.issues.map((issue) => issue.id)),
  ];
  if (new Set(issueIds).size !== issueIds.length) {
    return fail(
      'construction',
      'form-issue-id-duplicate',
      'Form issue identifiers must be unique.',
    );
  }

  return ok(buildState({
    validationGeneration,
    validationStatus,
    validationTrigger,
    validationIntent,
    submissionGeneration,
    submissionStatus,
    submitCount,
    submitted: input.submitted ?? submitCount > 0,
    fields,
    issues: issues.value,
  }));
}

export function applyFormEvent<ID extends StableID>(
  state: FormState<ID>,
  event: FormEvent<ID>,
): Result<FormUpdate<ID>> {
  const current = tryCreateFormState(state);
  if (!current.ok) {
    return fail('transition-rejection', current.error.code, current.error.message);
  }

  if (typeof event !== 'string') {
    if (event.type === 'register-field') return registerField(state, event.field);
    if (event.type === 'unregister-field') return unregisterField(state, event.id);
    if (event.type === 'update-field') return updateField(state, event);
    if (event.type === 'reorder-fields') return reorderFields(state, event.ids);
    if (event.type === 'replace-issues') {
      if (event.generation !== undefined) {
        const currentGeneration = requireValidationGeneration(state, event.generation);
        if (!currentGeneration.ok) return currentGeneration;
      }
      return replaceIssues(state, event.source, event.issues);
    }
    if (event.type === 'validation-invalidated') return invalidateValidation(state);
    if (event.type === 'validation-started') {
      return startValidation(state, event.trigger, event.intent);
    }
    if (event.type === 'validation-completed') {
      return completeValidation(state, event.trigger, event.intent, event.generation);
    }
    if (event.type === 'submit-failed') {
      return submitFailed(state, event.generation, event.issues ?? []);
    }
    if (event.type === 'submit-started') {
      const currentGeneration = requireSubmissionGeneration(state, event.generation);
      if (!currentGeneration.ok) return currentGeneration;
      if (
        state.submissionStatus !== 'idle'
        || state.validationStatus !== 'valid'
        || state.validationIntent !== 'submission'
      ) {
        return fail(
          'transition-rejection',
          'form-submit-not-requested',
          'Form submission can start only after a valid submit request.',
        );
      }
      return update(buildState({ ...state, submissionStatus: 'submitting' }));
    }
    if (event.type === 'submit-succeeded') {
      const currentGeneration = requireSubmissionGeneration(state, event.generation);
      if (!currentGeneration.ok) return currentGeneration;
      if (state.submissionStatus !== 'submitting') {
        return fail(
          'transition-rejection',
          'form-submit-not-pending',
          'Form submission can succeed only while pending.',
        );
      }
      return update(buildState({
        ...withoutIssueSource(state, 'server'),
        submissionStatus: 'succeeded',
      }));
    }
  }
  return reset(state);
}

function registerField<ID extends StableID>(
  state: FormState<ID>,
  input: FormFieldInput<ID>,
): Result<FormUpdate<ID>> {
  const normalized = normalizeField(input);
  if (!normalized.ok) return transitionError(normalized);
  const index = state.fields.findIndex((field) => field.id === input.id);
  const fields = [...state.fields];
  if (index < 0) fields.push(normalized.value);
  else fields[index] = normalized.value;
  return rebuild(state, fields, state.issues);
}

function unregisterField<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
): Result<FormUpdate<ID>> {
  if (!state.fields.some((field) => field.id === id)) {
    return fail(
      'transition-rejection',
      'form-field-id-missing',
      'The Form field to unregister does not exist.',
    );
  }
  return rebuild(
    state,
    state.fields.filter((field) => field.id !== id),
    state.issues,
  );
}

function updateField<ID extends StableID>(
  state: FormState<ID>,
  event: Extract<FormEvent<ID>, { readonly type: 'update-field' }>,
): Result<FormUpdate<ID>> {
  const index = state.fields.findIndex((field) => field.id === event.id);
  if (index < 0) {
    return fail(
      'transition-rejection',
      'form-field-id-missing',
      'The Form field to update does not exist.',
    );
  }
  const current = state.fields[index]!;
  const normalized = normalizeField({
    id: current.id,
    ...(current.name === null ? {} : { name: current.name }),
    touched: event.touched ?? current.touched,
    dirty: event.dirty ?? current.dirty,
    valid: event.valid ?? current.valid,
    issues: event.issues ?? current.issues,
  });
  if (!normalized.ok) return transitionError(normalized);
  const fields = [...state.fields];
  fields[index] = normalized.value;
  return rebuild(state, fields, state.issues);
}

function reorderFields<ID extends StableID>(
  state: FormState<ID>,
  ids: readonly ID[],
): Result<FormUpdate<ID>> {
  if (
    ids.length !== state.fields.length
    || new Set(ids).size !== ids.length
    || ids.some((id) => !state.fields.some((field) => field.id === id))
  ) {
    return fail(
      'transition-rejection',
      'form-field-order-invalid',
      'Form field order must contain every registered field exactly once.',
    );
  }
  const byId = new Map(state.fields.map((field) => [field.id, field]));
  return rebuild(state, ids.map((id) => byId.get(id)!), state.issues);
}

function replaceIssues<ID extends StableID>(
  state: FormState<ID>,
  source: FormIssueSource,
  inputIssues: readonly FormIssue<ID>[],
): Result<FormUpdate<ID>> {
  if (inputIssues.some((issue) => issue.source !== source)) {
    return fail(
      'transition-rejection',
      'form-issue-source-mismatch',
      'Every replacement issue must match the requested source.',
    );
  }
  const normalized = normalizeIssues(inputIssues, undefined);
  if (!normalized.ok) return transitionError(normalized);
  const registered = new Set(state.fields.map((field) => field.id));
  const fields = state.fields.map((field) => {
    const fieldIssues = Object.freeze([
      ...field.issues.filter((issue) => issue.source !== source),
      ...normalized.value.filter((issue) => issue.fieldId === field.id),
    ]);
    return Object.freeze({
      ...field,
      valid: fieldIssues.length === 0,
      issues: fieldIssues,
    });
  });
  const issues = [
    ...state.issues.filter((issue) => issue.source !== source),
    ...normalized.value.filter(
      (issue) => issue.fieldId === undefined || !registered.has(issue.fieldId),
    ),
  ];
  return rebuild(state, fields, issues);
}

function invalidateValidation<ID extends StableID>(
  state: FormState<ID>,
): Result<FormUpdate<ID>> {
  if (state.validationStatus === 'idle' && state.submissionStatus === 'idle') {
    return update(state);
  }
  return update(buildState({
    ...state,
    validationStatus: 'idle',
    validationTrigger: null,
    validationIntent: null,
    submissionStatus: state.submissionStatus === 'submitting'
      ? 'submitting'
      : 'idle',
  }));
}

function startValidation<ID extends StableID>(
  state: FormState<ID>,
  trigger: FormValidationTrigger,
  intent: FormValidationIntent,
): Result<FormUpdate<ID>> {
  if (state.submissionStatus === 'submitting') {
    return fail(
      'transition-rejection',
      'form-validation-during-submit',
      'Form validation cannot start while submission is pending.',
    );
  }
  if (state.validationGeneration === Number.MAX_SAFE_INTEGER) {
    return fail(
      'resource-rejection',
      'form-validation-generation-exhausted',
      'Form validation generation cannot advance beyond the safe-integer ceiling.',
    );
  }
  const submission = intent === 'submission';
  const current = submission ? withoutIssueSource(state, 'server') : state;
  return update(buildState({
    ...current,
    validationGeneration: current.validationGeneration + 1,
    validationStatus: 'validating',
    validationTrigger: trigger,
    validationIntent: intent,
    submissionStatus: 'idle',
    submitCount: current.submitCount + (submission ? 1 : 0),
    submitted: current.submitted || submission,
  }));
}

function completeValidation<ID extends StableID>(
  state: FormState<ID>,
  trigger: FormValidationTrigger,
  intent: FormValidationIntent,
  generation: number,
): Result<FormUpdate<ID>> {
  const currentGeneration = requireValidationGeneration(state, generation);
  if (!currentGeneration.ok) return currentGeneration;
  if (
    state.validationStatus !== 'validating'
    || state.validationTrigger !== trigger
    || state.validationIntent !== intent
  ) {
    return fail(
      'transition-rejection',
      'form-validation-not-pending',
      'Form validation can complete only for the active validation run.',
    );
  }
  const completed = buildState({
    ...state,
    validationStatus: state.valid ? 'valid' : 'invalid',
  });
  if (intent !== 'submission') return update(completed);

  if (completed.valid) {
    if (completed.submissionGeneration === Number.MAX_SAFE_INTEGER) {
      return fail(
        'resource-rejection',
        'form-submission-generation-exhausted',
        'Form submission generation cannot advance beyond the safe-integer ceiling.',
      );
    }
    const submissionGeneration = completed.submissionGeneration + 1;
    return update(
      buildState({ ...completed, submissionGeneration }),
      [{ type: 'submit-requested', generation: submissionGeneration }],
    );
  }
  const allIssues = orderedIssues(completed);
  const firstInvalid = completed.fields.find(
    (field) => !field.valid || field.issues.length > 0,
  );
  const commands: FormCommand<ID>[] = [];
  if (firstInvalid !== undefined) commands.push({ type: 'focus-field', id: firstInvalid.id });
  if (allIssues.length > 0) {
    commands.push({
      type: 'announce-summary',
      issueIds: Object.freeze(allIssues.map((issue) => issue.id)),
    });
  }
  return update(completed, commands);
}

function submitFailed<ID extends StableID>(
  state: FormState<ID>,
  generation: number,
  issues: readonly FormIssue<ID>[],
): Result<FormUpdate<ID>> {
  const currentGeneration = requireSubmissionGeneration(state, generation);
  if (!currentGeneration.ok) return currentGeneration;
  if (state.submissionStatus !== 'submitting') {
    return fail(
      'transition-rejection',
      'form-submit-not-pending',
      'Form submission can fail only while pending.',
    );
  }
  if (issues.some((issue) => issue.source !== 'server')) {
    return fail(
      'transition-rejection',
      'form-submit-issue-source-invalid',
      'Submit failure issues must use the server source.',
    );
  }
  const replaced = replaceIssues(state, 'server', issues);
  if (!replaced.ok) return replaced;
  const failed = buildState({ ...replaced.value.state, submissionStatus: 'failed' });
  const ordered = orderedIssues(failed);
  const firstInvalid = failed.fields.find(
    (field) => !field.valid || field.issues.length > 0,
  );
  const commands: FormCommand<ID>[] = [];
  if (firstInvalid !== undefined) commands.push({ type: 'focus-field', id: firstInvalid.id });
  if (ordered.length > 0) {
    commands.push({
      type: 'announce-summary',
      issueIds: Object.freeze(ordered.map((issue) => issue.id)),
    });
  }
  return update(failed, commands);
}

function reset<ID extends StableID>(state: FormState<ID>): Result<FormUpdate<ID>> {
  const fields = state.fields.map((field) => Object.freeze({
    ...field,
    touched: false,
    dirty: false,
    valid: true,
    issues: Object.freeze([]) as readonly FormIssue<ID>[],
  }));
  return update(
    buildState({
      validationGeneration: state.validationGeneration,
      validationStatus: 'idle',
      validationTrigger: null,
      validationIntent: null,
      submissionGeneration: state.submissionGeneration,
      submissionStatus: 'idle',
      submitCount: 0,
      submitted: false,
      fields,
      issues: [],
    }),
    fields.map((field) => ({ type: 'reset-field', id: field.id })),
  );
}

function normalizeField<ID extends StableID>(
  input: FormFieldInput<ID>,
): Result<FormFieldState<ID>> {
  if (input.id.trim().length === 0) {
    return fail(
      'construction',
      'form-field-id-empty',
      'Form field identifiers must not be empty.',
    );
  }
  const name = input.name?.trim() || null;
  const issues = normalizeIssues(input.issues ?? [], input.id);
  if (!issues.ok) return issues;
  return ok(Object.freeze({
    id: input.id,
    name,
    touched: input.touched ?? false,
    dirty: input.dirty ?? false,
    valid: input.valid ?? issues.value.length === 0,
    issues: issues.value,
  }));
}

function normalizeIssues<ID extends StableID>(
  input: readonly FormIssue<ID>[],
  fieldId: ID | undefined,
): Result<readonly FormIssue<ID>[]> {
  const issues: FormIssue<ID>[] = [];
  for (const issue of input) {
    if (issue.id.trim().length === 0 || issue.message.trim().length === 0) {
      return fail(
        'construction',
        'form-issue-invalid',
        'Form issue identifiers and messages must not be empty.',
      );
    }
    if (issues.some((candidate) => candidate.id === issue.id)) {
      return fail(
        'construction',
        'form-issue-id-duplicate',
        'Form issue identifiers must be unique.',
      );
    }
    if (fieldId !== undefined && issue.fieldId !== undefined && issue.fieldId !== fieldId) {
      return fail(
        'construction',
        'form-issue-field-mismatch',
        'A field issue must reference its owning field.',
      );
    }
    issues.push(Object.freeze({
      id: issue.id,
      message: issue.message.trim(),
      source: issue.source,
      ...((fieldId ?? issue.fieldId) === undefined
        ? {}
        : { fieldId: fieldId ?? issue.fieldId }),
    }));
  }
  return ok(Object.freeze(issues));
}

function buildState<ID extends StableID>(input: {
  readonly validationGeneration: number;
  readonly validationStatus: FormValidationStatus;
  readonly validationTrigger: FormValidationTrigger | null;
  readonly validationIntent: FormValidationIntent | null;
  readonly submissionGeneration: number;
  readonly submissionStatus: FormSubmissionStatus;
  readonly submitCount: number;
  readonly submitted: boolean;
  readonly fields: readonly FormFieldState<ID>[];
  readonly issues: readonly FormIssue<ID>[];
}): FormState<ID> {
  const fields = Object.freeze([...input.fields]);
  const issues = Object.freeze([...input.issues]);
  return Object.freeze({
    ...input,
    touched: fields.some((field) => field.touched),
    dirty: fields.some((field) => field.dirty),
    valid: issues.length === 0 && fields.every(
      (field) => field.valid && field.issues.length === 0,
    ),
    fields,
    issues,
  });
}

function requireValidationGeneration<ID extends StableID>(
  state: FormState<ID>,
  generation: number,
): Result<true> {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    return fail(
      'transition-rejection',
      'form-validation-generation-invalid',
      'Validation generation must be a positive safe integer.',
    );
  }
  if (state.validationStatus !== 'validating' || generation !== state.validationGeneration) {
    return fail(
      'transition-rejection',
      'form-validation-generation-stale',
      'Validation result does not belong to the active generation.',
      { generation, currentGeneration: state.validationGeneration },
    );
  }
  return ok(true);
}

function requireSubmissionGeneration<ID extends StableID>(
  state: FormState<ID>,
  generation: number,
): Result<true> {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    return fail(
      'transition-rejection',
      'form-submission-generation-invalid',
      'Submission generation must be a positive safe integer.',
    );
  }
  if (generation !== state.submissionGeneration) {
    return fail(
      'transition-rejection',
      'form-submission-generation-stale',
      'Submission result does not belong to the active generation.',
      { generation, currentGeneration: state.submissionGeneration },
    );
  }
  return ok(true);
}

function rebuild<ID extends StableID>(
  state: FormState<ID>,
  fields: readonly FormFieldState<ID>[],
  issues: readonly FormIssue<ID>[],
): Result<FormUpdate<ID>> {
  const created = tryCreateFormState({ ...state, fields, issues });
  return created.ok ? update(created.value) : transitionError(created);
}

function orderedIssues<ID extends StableID>(state: FormState<ID>): readonly FormIssue<ID>[] {
  return [
    ...state.fields.flatMap((field) => field.issues),
    ...state.issues,
  ];
}

function withoutIssueSource<ID extends StableID>(
  state: FormState<ID>,
  source: FormIssueSource,
): FormState<ID> {
  return buildState({
    ...state,
    fields: state.fields.map((field) => Object.freeze({
      ...field,
      issues: Object.freeze(field.issues.filter((issue) => issue.source !== source)),
    })),
    issues: state.issues.filter((issue) => issue.source !== source),
  });
}

function update<ID extends StableID>(
  state: FormState<ID>,
  commands: readonly FormCommand<ID>[] = [],
): Result<FormUpdate<ID>> {
  return ok(Object.freeze({ state, commands: Object.freeze([...commands]) }));
}

function transitionError<T>(result: Result<T>): Result<never> {
  if (result.ok) {
    return fail('internal-invariant', 'form-result-unexpected', 'Expected a failed result.');
  }
  return fail('transition-rejection', result.error.code, result.error.message);
}

function isValidationStatus(value: string): value is FormValidationStatus {
  return value === 'idle'
    || value === 'validating'
    || value === 'valid'
    || value === 'invalid';
}

function isSubmissionStatus(value: string): value is FormSubmissionStatus {
  return value === 'idle'
    || value === 'submitting'
    || value === 'succeeded'
    || value === 'failed';
}

function isValidationTrigger(value: string): value is FormValidationTrigger {
  return value === 'input' || value === 'blur' || value === 'submit';
}

function isValidationIntent(value: string): value is FormValidationIntent {
  return value === 'interaction' || value === 'submission';
}

function parsePath(path: string): Result<readonly FormPathSegment[]> {
  if (path.length === 0) {
    return fail(
      'construction',
      'form-field-path-empty',
      'A Form field path must not be empty.',
    );
  }
  const segments: FormPathSegment[] = [];
  let index = 0;
  let expectSegment = true;

  while (index < path.length) {
    if (path[index] === '.') {
      if (expectSegment) return pathSyntaxError(path, index);
      expectSegment = true;
      index += 1;
      continue;
    }
    if (path[index] === '[') {
      if (expectSegment && segments.length > 0) return pathSyntaxError(path, index);
      const close = path.indexOf(']', index + 1);
      if (close < 0) return pathSyntaxError(path, index);
      const value = path.slice(index + 1, close);
      if (value.length === 0 || value.includes('[')) return pathSyntaxError(path, index);
      segments.push(/^\d+$/u.test(value) ? Number(value) : value);
      index = close + 1;
      expectSegment = false;
      if (index < path.length && path[index] !== '.' && path[index] !== '[') {
        return pathSyntaxError(path, index);
      }
      continue;
    }

    const start = index;
    while (index < path.length && path[index] !== '.' && path[index] !== '[') {
      if (path[index] === ']') return pathSyntaxError(path, index);
      index += 1;
    }
    if (!expectSegment || start === index) return pathSyntaxError(path, start);
    segments.push(path.slice(start, index));
    expectSegment = false;
  }

  return expectSegment ? pathSyntaxError(path, path.length) : ok(segments);
}

function pathSyntaxError(
  path: string,
  index: number,
): Result<readonly FormPathSegment[]> {
  return fail(
    'construction',
    'form-field-path-syntax-invalid',
    'Form field paths must use dot properties and bracket indices without empty segments.',
    { path, index },
  );
}

function encodeSegments(segments: readonly FormPathSegment[]): string {
  return segments.map((segment, index) => (
    typeof segment === 'number'
      ? `[${segment}]`
      : index === 0 ? segment : `.${segment}`
  )).join('');
}

function valueCollision(path: string): Result<FormValues> {
  return fail(
    'construction',
    'form-value-path-collision',
    'A Form value path cannot be both a leaf and a container.',
    { path },
  );
}

function readContainer(
  container: Record<string, unknown> | unknown[],
  segment: FormPathSegment,
): unknown {
  return Array.isArray(container)
    ? container[segment as number]
    : container[String(segment)];
}

function hasContainer(
  container: Record<string, unknown> | unknown[],
  segment: FormPathSegment,
): boolean {
  return Object.hasOwn(container, segment);
}

function writeContainer(
  container: Record<string, unknown> | unknown[],
  segment: FormPathSegment,
  value: unknown,
): void {
  if (Array.isArray(container)) container[segment as number] = value;
  else container[String(segment)] = value;
}

function freezeBranches(value: object, branches: WeakSet<object>): void {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null && branches.has(child)) {
      freezeBranches(child, branches);
    } else if (Array.isArray(child)) {
      Object.freeze(child);
    }
  }
  Object.freeze(value);
}
