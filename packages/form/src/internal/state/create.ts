import type { FormResult as Result } from '../../error.js';
import { exceeded, type Limits, normalizeLimits } from '../construction/limits.js';
import { fail, ok, unwrap } from '../result.js';
import type { Field, FieldInput, Issue, State, StateInput } from './contracts.js';
import { projectRelatedIssues } from './projection.js';
import { fieldIdentityError, fieldWithIssues, normalizeField, normalizeIssues, reserveIssueRelations, snapshotFieldInput, snapshotIssueInputs } from './records.js';
import { createSubmissionState, createValidationState, isSubmissionStatus, isValidationIntent, isValidationStatus, isValidationTrigger, normalizeSubmissionFailure } from './status.js';
import { buildState } from './storage/snapshot.js';
import type { StableID } from '@sectile/core';
import { tryNormalizeStableIDs } from '@sectile/core/identity';

export function createFormState<ID extends StableID = StableID>(
  input: StateInput<ID> = {},
  limits?: Partial<Limits>,
): State<ID> {
  return unwrap(tryCreateFormState(input, limits));
}

export function tryCreateFormState<ID extends StableID = StableID>(
  input: StateInput<ID> = {},
  limitsInput?: Partial<Limits>,
): Result<State<ID>> {
  const limits = normalizeLimits(limitsInput);
  if (!limits.ok) return limits;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('construction', 'form-state-input-invalid', 'Form state input must be an object.');
  }
  const validationInput = input.validation === undefined ? {
    generation: 0,
    status: 'idle',
    trigger: null,
    intent: null,
  } : input.validation;
  const submissionInput = input.submission === undefined ? {
    generation: 0,
    status: 'idle',
    count: 0,
    failure: null,
  } : input.submission;
  if (validationInput === null || typeof validationInput !== 'object' || Array.isArray(validationInput)
    || submissionInput === null || typeof submissionInput !== 'object' || Array.isArray(submissionInput)) {
    return fail('construction', 'form-state-input-invalid', 'Form validation and submission inputs must be objects.');
  }
  const validationGeneration = validationInput.generation;
  const validationStatus = validationInput.status;
  const validationTrigger = validationInput.trigger;
  const validationIntent = validationInput.intent;
  const submissionGeneration = submissionInput.generation;
  const submissionStatus = submissionInput.status;
  const submitCount = submissionInput.count;
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
  const failure = normalizeSubmissionFailure(submissionInput.failure);
  if (!failure.ok) return failure;
  if (submissionStatus !== 'failed' && failure.value !== null) {
    return fail(
      'construction',
      'form-submission-failure-context-invalid',
      'A Form submission failure may be retained only while submission status is failed.',
    );
  }

  const providedFields = input.fields;
  const providedIssues = input.issues;
  const inputFields = providedFields === undefined ? [] : providedFields;
  const inputIssues = providedIssues === undefined ? [] : providedIssues;
  if (!Array.isArray(inputFields) || !Array.isArray(inputIssues)) {
    return fail('construction', 'form-state-input-invalid', 'Form fields and issues must be arrays.');
  }
  const checkedIssues = snapshotIssueInputs(inputIssues as readonly Issue<ID>[]);
  if (!checkedIssues.ok) return checkedIssues;
  const checkedFields: FieldInput<ID>[] = [];
  for (const inputField of inputFields as readonly FieldInput<ID>[]) {
    const field = snapshotFieldInput(inputField);
    if (!field.ok) return field;
    checkedFields.push(field.value);
  }
  let stateEntries = checkedFields.length + checkedIssues.value.length;
  for (const field of checkedFields) stateEntries += field.issues?.length ?? 0;
  if (stateEntries > limits.value.maxEntries) {
    return exceeded('form-entry-ceiling-exceeded', stateEntries, limits.value.maxEntries);
  }
  let output = reserveIssueRelations(checkedIssues.value, stateEntries, limits.value.maxOutputNodes);
  if (!output.ok) return output;
  for (const field of checkedFields) {
    output = reserveIssueRelations(field.issues ?? [], output.value, limits.value.maxOutputNodes);
    if (!output.ok) return output;
  }
  const fieldIDs = tryNormalizeStableIDs<ID>(checkedFields.map((field) => field.id));
  if (!fieldIDs.ok) return fieldIdentityError(fieldIDs.error.code);
  if (fieldIDs.value.some((id) => typeof id === 'string' && id.trim().length === 0)) {
    return fieldIdentityError('empty-id');
  }

  const fields: Field<ID>[] = [];
  for (const inputField of checkedFields) {
    const field = normalizeField<ID>(inputField, false);
    if (!field.ok) return field;
    fields.push(field.value);
  }

  const issues = normalizeIssues<ID>(checkedIssues.value, undefined);
  if (!issues.ok) return issues;
  const issueIds = [
    ...issues.value.map((issue) => issue.id),
    ...fields.flatMap((field) => field.issues.map((issue) => issue.id)),
  ];
  const normalizedIssueIDs = tryNormalizeStableIDs(issueIds);
  if (!normalizedIssueIDs.ok) {
    return fail(
      'construction',
      normalizedIssueIDs.error.code === 'duplicate-id'
        ? 'form-issue-id-duplicate'
        : 'form-issue-invalid',
      normalizedIssueIDs.error.code === 'duplicate-id'
        ? 'Form issue identifiers must be unique.'
        : 'Form issue identifiers must be valid stable IDs.',
    );
  }

  const registered = new Set(fields.map((field) => field.id));
  const incomingByField = new Map<ID, Issue<ID>[]>();
  const globalIssues: Issue<ID>[] = [];
  for (const issue of issues.value) {
    if (issue.fieldId === undefined || !registered.has(issue.fieldId)) {
      globalIssues.push(issue);
      continue;
    }
    const owned = incomingByField.get(issue.fieldId);
    if (owned === undefined) incomingByField.set(issue.fieldId, [issue]);
    else owned.push(issue);
  }
  const fieldsWithOwnedIssues = fields.map((field) => {
    const incoming = incomingByField.get(field.id);
    return incoming === undefined
      ? field
      : fieldWithIssues(field, Object.freeze([...field.issues, ...incoming]));
  });
  const projectedFields = projectRelatedIssues(fieldsWithOwnedIssues, globalIssues);

  const validation = createValidationState(
    validationGeneration,
    validationStatus,
    validationTrigger,
    validationIntent,
  );
  const submission = createSubmissionState(
    submissionGeneration,
    submissionStatus,
    submitCount,
    failure.value,
  );
  const state = buildState({
    validation,
    submission,
    fields: projectedFields,
    issues: Object.freeze(globalIssues),
  }, limits.value.maxOutputNodes);
  if (validation.status === 'valid' && !state.valid) {
    return fail(
      'construction',
      'form-validation-status-invalid',
      'A valid validation state requires the Form to have no issues.',
    );
  }
  if (
    submission.status === 'failed'
    && submission.failure === null
    && !state.allIssues.some((issue) => issue.source === 'server')
  ) {
    return fail(
      'construction',
      'form-submission-failure-context-invalid',
      'A failed Form submission requires a failure message or server issue.',
    );
  }
  return ok(state);
}
