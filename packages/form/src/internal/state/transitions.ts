import type { FormErrorCode, FormResult as Result } from '../../error.js';
import { exceeded } from '../construction/limits.js';
import { fail, ok } from '../result.js';
import type { Command, Event, Field, FieldInput, FieldMeta, Issue, IssueSource, ReinitializeOptions, State, SubmissionFailure, Update, ValidationIntent, ValidationTrigger } from './contracts.js';
import { tryCreateFormState } from './create.js';
import { collectIssueFieldIDs, deriveWithIncrementalIssueProjection, deriveWithIssueProjection, projectRelatedIssues } from './projection.js';
import { firstIssueFocusField, orderedIssues } from './query.js';
import { fieldWithIssues, issueOutputNodes, normalizeField, normalizeIssues, reserveIssueRelations, sameField, sameIssues, snapshotFieldInput, snapshotIssueInputs } from './records.js';
import { createSubmissionState, createValidationState, normalizeSubmissionFailure, requireSubmissionGeneration, requireValidationGeneration } from './status.js';
import { createFieldStore, getStoredField, materializeFields, replaceStoredFields } from './storage/fields.js';
import { createIssueStore, emptyIssues, removeIssues } from './storage/issues.js';
import { deriveState, fieldStoreOf, issueStoreOf, states } from './storage/snapshot.js';
import type { StableID } from '@sectile/core';
import { tryNormalizeStableIDs, validateStableID } from '@sectile/core/identity';
import { createMachineUpdate, type MachineUpdate } from '@sectile/core/revision';

type CoreUpdate<ID extends StableID> = MachineUpdate<State<ID>, Command<ID>>;

export function setFormFieldMeta<ID extends StableID>(
  state: State<ID>,
  id: ID,
  meta: FieldMeta,
): Result<Update<ID>> {
  return applyFormEvent(state, { type: 'set-field-meta', id, meta });
}

export function replaceFormFieldIssues<ID extends StableID>(
  state: State<ID>,
  id: ID,
  source: IssueSource,
  issues: readonly Issue<ID>[],
): Result<Update<ID>> {
  return applyFormEvent(state, { type: 'replace-field-issues', id, source, issues });
}

export function upsertFormFieldIssue<ID extends StableID>(
  state: State<ID>,
  id: ID,
  issue: Issue<ID>,
): Result<Update<ID>> {
  return applyFormEvent(state, { type: 'upsert-field-issue', id, issue });
}

export function removeFormFieldIssue<ID extends StableID>(
  state: State<ID>,
  id: ID,
  issueId: StableID,
): Result<Update<ID>> {
  return applyFormEvent(state, { type: 'remove-field-issue', id, issueId });
}

export function clearFormFieldIssues<ID extends StableID>(
  state: State<ID>,
  id: ID,
  source?: IssueSource,
): Result<Update<ID>> {
  return applyFormEvent(state, { type: 'clear-field-issues', id, ...(source === undefined ? {} : { source }) });
}

export function applyFormEvent<ID extends StableID>(
  state: State<ID>,
  event: Event<ID>,
): Result<Update<ID>> {
  if (!states.has(state)) {
    const current = tryCreateFormState(state);
    if (!current.ok) {
      return fail('transition-rejection', current.error.code, current.error.message);
    }
    state = current.value;
  }

  if (event === 'reset') return reset(state);
  if (typeof event === 'object' && event !== null) {
    if (event.type === 'register-field') return registerField(state, event.field);
    if (event.type === 'unregister-field') return unregisterField(state, event.id);
    if (event.type === 'set-field-meta') return setFieldMeta(state, event.id, event.meta);
    if (event.type === 'replace-field-issues') {
      return replaceFieldIssues(state, event.id, event.source, event.issues);
    }
    if (event.type === 'upsert-field-issue') return upsertFieldIssue(state, event.id, event.issue);
    if (event.type === 'remove-field-issue') return removeFieldIssue(state, event.id, event.issueId);
    if (event.type === 'clear-field-issues') return clearFieldIssues(state, event.id, event.source);
    if (event.type === 'reorder-fields') return reorderFields(state, event.ids);
    if (event.type === 'field-value-changed') return fieldValueChanged(state, event.id);
    if (event.type === 'replace-issues') {
      if (event.generation !== undefined) {
        const currentGeneration = requireValidationGeneration(state, event.generation);
        if (!currentGeneration.ok) return currentGeneration;
      }
      return replaceIssues(state, event.source, event.issues);
    }
    if (event.type === 'validation-invalidated') return invalidateValidation(state);
    if (event.type === 'reinitialize') return reinitialize(state, event.options);
    if (event.type === 'validation-started') {
      return startValidation(state, event.trigger, event.intent);
    }
    if (event.type === 'validation-completed') {
      return completeValidation(state, event.trigger, event.intent, event.generation);
    }
    if (event.type === 'submit-failed') {
      return submitFailed(
        state,
        event.generation,
        event.failure ?? null,
        event.issues ?? [],
      );
    }
    if (event.type === 'submit-started') {
      const currentGeneration = requireSubmissionGeneration(state, event.generation);
      if (!currentGeneration.ok) return currentGeneration;
      if (
        state.submission.status !== 'idle'
        || state.validation.status !== 'valid'
        || state.validation.intent !== 'submission'
      ) {
        return fail(
          'transition-rejection',
          'form-submit-not-requested',
          'Form submission can start only after a valid submit request.',
        );
      }
      return update(deriveState(state, {
        submission: createSubmissionState(
          state.submission.generation,
          'submitting',
          state.submission.count,
          null,
        ),
      }));
    }
    if (event.type === 'submit-succeeded') {
      const currentGeneration = requireSubmissionGeneration(state, event.generation);
      if (!currentGeneration.ok) return currentGeneration;
      if (state.submission.status !== 'submitting') {
        return fail(
          'transition-rejection',
          'form-submit-not-pending',
          'Form submission can succeed only while pending.',
        );
      }
      const cleared = withoutIssueSource(state, 'server');
      return update(deriveState(cleared, {
        submission: createSubmissionState(
          cleared.submission.generation,
          'succeeded',
          cleared.submission.count,
          null,
        ),
      }));
    }
  }
  return fail(
    'transition-rejection',
    'form-event-invalid',
    'Form event must be reset or a recognized event object.',
  );
}

function registerField<ID extends StableID>(
  state: State<ID>,
  input: FieldInput<ID>,
): Result<Update<ID>> {
  const captured = snapshotFieldInput(input);
  if (!captured.ok) return transitionError(captured);
  const fieldInput = captured.value;
  const store = fieldStoreOf(state);
  const current = getStoredField(store, fieldInput.id);
  const budget = reserveIssueReplacement(state, fieldInput.issues ?? [], issueOutputNodes(current?.issues ?? []), current === undefined ? 1 : 0);
  if (!budget.ok) return budget;
  const normalized = normalizeField(fieldInput);
  if (!normalized.ok) return transitionError(normalized);
  const ownership = validateFieldIssueOwnership(state, normalized.value, fieldInput.id);
  if (!ownership.ok) return ownership;
  if (current !== undefined && sameField(current, normalized.value)) return update(state);
  const currentFields = materializeFields(store);
  if (current !== undefined) {
    const next = deriveWithIssueProjection(
      state,
      currentFields.map((field) => field.id === fieldInput.id ? normalized.value : field),
      state.issues,
    );
    return update(afterIssueMutation(state, next));
  }
  const next = deriveWithIssueProjection(
    state,
    [...currentFields, normalized.value],
    state.issues,
  );
  return invalidateValidation(afterIssueMutation(state, next));
}

function unregisterField<ID extends StableID>(
  state: State<ID>,
  id: ID,
): Result<Update<ID>> {
  const store = fieldStoreOf(state);
  if (!store.indexByID.has(id)) {
    return fail(
      'transition-rejection',
      'form-field-id-missing',
      'The Form field to unregister does not exist.',
    );
  }
  const next = deriveWithIssueProjection(
    state,
    materializeFields(store).filter((field) => field.id !== id),
    state.issues,
  );
  return invalidateValidation(afterIssueMutation(state, next));
}

function setFieldMeta<ID extends StableID>(
  state: State<ID>,
  id: ID,
  meta: FieldMeta,
): Result<Update<ID>> {
  if (
    (meta.name !== undefined && meta.name !== null && typeof meta.name !== 'string')
    || (meta.touched !== undefined && typeof meta.touched !== 'boolean')
    || (meta.dirty !== undefined && typeof meta.dirty !== 'boolean')
  ) {
    return fail(
      'transition-rejection',
      'form-field-meta-invalid',
      'Form field metadata must use a string or null name and boolean flags.',
    );
  }
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  const next = Object.freeze({
    id: current.id,
    name: meta.name === undefined ? current.name : meta.name?.trim() || null,
    touched: meta.touched ?? current.touched,
    dirty: meta.dirty ?? current.dirty,
    valid: current.valid,
    issues: current.issues,
    relatedIssues: current.relatedIssues,
  });
  if (sameField(current, next)) return update(state);
  return update(deriveState(
    state,
    {},
    replaceStoredFields(store, new Map([[id, next]])),
  ));
}

function replaceFieldIssues<ID extends StableID>(
  state: State<ID>,
  id: ID,
  source: IssueSource,
  input: readonly Issue<ID>[],
): Result<Update<ID>> {
  const captured = snapshotIssueInputs(input);
  if (!captured.ok) return transitionError(captured);
  const issueInput = captured.value;
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  const budget = reserveIssueReplacement(state, issueInput, issueOutputNodes(current.issues, source));
  if (!budget.ok) return budget;
  if (issueInput.some((issue) => issue.source !== source)) {
    return fail(
      'transition-rejection',
      'form-issue-source-mismatch',
      'Every replacement issue must match the requested source.',
    );
  }
  const normalized = normalizeIssues(issueInput, id);
  if (!normalized.ok) return transitionError(normalized);
  if (normalized.value.some((issue) => current.issues.some(
    (candidate) => candidate.id === issue.id && candidate.source !== source,
  ))) return duplicateIssueID();
  const issues = Object.freeze([
    ...current.issues.filter((issue) => issue.source !== source),
    ...normalized.value,
  ]);
  const next = fieldWithIssues(current, issues);
  const ownership = validateFieldIssueOwnership(state, next, id);
  if (!ownership.ok) return ownership;
  if (sameField(current, next)) return update(state);
  return replaceOneField(state, id, next);
}

function upsertFieldIssue<ID extends StableID>(
  state: State<ID>,
  id: ID,
  input: Issue<ID>,
): Result<Update<ID>> {
  const captured = snapshotIssueInputs([input]);
  if (!captured.ok) return transitionError(captured);
  const issueInput = captured.value[0]!;
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  const index = current.issues.findIndex((candidate) => candidate.id === issueInput.id);
  const budget = reserveIssueReplacement(state, captured.value, index < 0 ? 0 : issueOutputNodes([current.issues[index]!]));
  if (!budget.ok) return budget;
  const normalized = normalizeIssues(captured.value, id);
  if (!normalized.ok) return transitionError(normalized);
  const issue = normalized.value[0]!;
  const issues = [...current.issues];
  if (index < 0) issues.push(issue);
  else issues[index] = issue;
  const next = fieldWithIssues(current, Object.freeze(issues));
  const ownership = validateFieldIssueOwnership(state, next, id);
  if (!ownership.ok) return ownership;
  if (sameField(current, next)) return update(state);
  return replaceOneField(state, id, next);
}

function removeFieldIssue<ID extends StableID>(
  state: State<ID>,
  id: ID,
  issueId: StableID,
): Result<Update<ID>> {
  if (validateStableID(issueId) !== null) {
    return fail(
      'transition-rejection',
      'form-issue-invalid',
      'Form issue identifiers must be valid stable IDs.',
    );
  }
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  if (!current.issues.some((issue) => issue.id === issueId)) return update(state);
  return replaceOneField(
    state,
    id,
    fieldWithIssues(current, Object.freeze(current.issues.filter((issue) => issue.id !== issueId))),
  );
}

function clearFieldIssues<ID extends StableID>(
  state: State<ID>,
  id: ID,
  source?: IssueSource,
): Result<Update<ID>> {
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  const issues = source === undefined
    ? Object.freeze([]) as readonly Issue<ID>[]
    : Object.freeze(current.issues.filter((issue) => issue.source !== source));
  if (issues.length === current.issues.length) return update(state);
  return replaceOneField(state, id, fieldWithIssues(current, issues));
}

function replaceOneField<ID extends StableID>(
  state: State<ID>,
  id: ID,
  field: Field<ID>,
): Result<Update<ID>> {
  const current = getStoredField(fieldStoreOf(state), id)!;
  const affected = collectIssueFieldIDs([...current.issues, ...field.issues]);
  affected.add(id);
  const allIssues = Object.freeze([
    ...state.allIssues.filter((issue) => issue.fieldId !== id),
    ...field.issues,
  ]);
  const next = deriveWithIncrementalIssueProjection(
    state,
    new Map([[id, field]]),
    state.issues,
    allIssues,
    affected,
  );
  return update(afterIssueMutation(state, next));
}

function reorderFields<ID extends StableID>(
  state: State<ID>,
  ids: readonly ID[],
): Result<Update<ID>> {
  const store = fieldStoreOf(state);
  if (ids.length !== store.size) {
    return fail(
      'transition-rejection',
      'form-field-order-invalid',
      'Form field order must contain every registered field exactly once.',
    );
  }
  const normalized = tryNormalizeStableIDs(ids);
  if (!normalized.ok) return invalidFieldOrder();
  const fields: Field<ID>[] = [];
  for (const id of normalized.value) {
    const field = getStoredField(store, id);
    if (field === undefined) return invalidFieldOrder();
    fields.push(field);
  }
  const current = materializeFields(store);
  if (current.every((field, index) => field.id === fields[index]!.id)) return update(state);
  return update(deriveWithIssueProjection(state, fields, state.issues));
}

function replaceIssues<ID extends StableID>(
  state: State<ID>,
  source: IssueSource,
  inputIssues: readonly Issue<ID>[],
): Result<Update<ID>> {
  const captured = snapshotIssueInputs(inputIssues);
  return captured.ok ? replaceIssuesCaptured(state, source, captured.value) : transitionError(captured);
}

function replaceIssuesCaptured<ID extends StableID>(
  state: State<ID>,
  source: IssueSource,
  issueInput: readonly Issue<ID>[],
): Result<Update<ID>> {
  const budget = reserveIssueReplacement(state, issueInput, issueOutputNodes(issueStoreOf(state).allBySource.get(source) ?? []));
  if (!budget.ok) return budget;
  if (issueInput.some((issue) => issue.source !== source)) {
    return fail(
      'transition-rejection',
      'form-issue-source-mismatch',
      'Every replacement issue must match the requested source.',
    );
  }
  const normalized = normalizeIssues(issueInput, undefined);
  if (!normalized.ok) return transitionError(normalized);
  const store = fieldStoreOf(state);
  const incomingByField = new Map<ID, Issue<ID>[]>();
  const globalIncoming: Issue<ID>[] = [];
  for (const issue of normalized.value) {
    const owner = issue.fieldId;
    if (owner === undefined || !store.indexByID.has(owner)) {
      globalIncoming.push(issue);
      continue;
    }
    let fieldIssues = incomingByField.get(owner);
    if (fieldIssues === undefined) {
      fieldIssues = [];
      incomingByField.set(owner, fieldIssues);
    }
    fieldIssues.push(issue);
  }
  const collision = validateSourceReplacementOwnership(
    state,
    source,
    normalized.value,
  );
  if (!collision.ok) return collision;
  const affected = new Set<ID>(store.fieldIDsBySource.get(source)?.values() ?? []);
  for (const id of incomingByField.keys()) affected.add(id);
  const replacements = new Map<ID, Field<ID>>();
  for (const id of affected) {
    const current = getStoredField(store, id);
    if (current === undefined) continue;
    const fieldIssues = Object.freeze([
      ...current.issues.filter((issue) => issue.source !== source),
      ...(incomingByField.get(id) ?? []),
    ]);
    const next = fieldWithIssues(current, fieldIssues);
    if (!sameField(current, next)) replacements.set(id, next);
  }
  const issueStore = issueStoreOf(state);
  const globalIssues = Object.freeze([
    ...issueStore.values.filter((issue) => issue.source !== source),
    ...globalIncoming,
  ]);
  if (replacements.size === 0 && sameIssues(issueStore.values, globalIssues)) {
    return update(state);
  }
  const previousSourceIssues = issueStore.allBySource.get(source) ?? emptyIssues;
  const relationAffected = collectIssueFieldIDs([
    ...previousSourceIssues as readonly Issue<ID>[],
    ...normalized.value,
  ]);
  for (const id of affected) relationAffected.add(id);
  const allIssues = Object.freeze([
    ...issueStore.allValues.filter((issue) => issue.source !== source),
    ...normalized.value,
  ]);
  const next = deriveWithIncrementalIssueProjection(
    state,
    replacements,
    globalIssues,
    allIssues,
    relationAffected,
  );
  return update(afterIssueMutation(state, next));
}

function invalidateValidation<ID extends StableID>(
  state: State<ID>,
): Result<Update<ID>> {
  if (state.validation.status === 'idle') return update(state);
  return update(deriveState(state, {
    validation: createValidationState(state.validation.generation, 'idle', null, null),
  }));
}

function fieldValueChanged<ID extends StableID>(
  state: State<ID>,
  id: ID,
): Result<Update<ID>> {
  const fields = fieldStoreOf(state);
  if (!fields.indexByID.has(id)) return missingField();
  const issueStore = issueStoreOf(state);
  const relatedIssueIDs = issueStore.serverIssueIDsByField.get(id);
  if (relatedIssueIDs === undefined || relatedIssueIDs.length === 0) {
    return invalidateValidation(state);
  }
  const removed = new Set(relatedIssueIDs);
  const affected = new Set<ID>();
  let removesGlobalIssue = false;
  for (const issueID of relatedIssueIDs) {
    const issue = issueStore.allByID.get(issueID);
    if (issue === undefined) continue;
    if (issueStore.byID.has(issueID)) removesGlobalIssue = true;
    if (issue.fieldId !== undefined) affected.add(issue.fieldId);
    for (const relatedID of issue.relatedFieldIds ?? []) affected.add(relatedID);
  }
  const replacements = new Map<ID, Field<ID>>();
  for (const affectedID of affected) {
    const field = getStoredField(fields, affectedID);
    if (field === undefined) continue;
    replacements.set(affectedID, fieldWithIssues(
      field,
      Object.freeze(field.issues.filter((issue) => !removed.has(issue.id))),
      Object.freeze(field.relatedIssues.filter((issue) => !removed.has(issue.id))),
    ));
  }
  const nextFields = replaceStoredFields(fields, replacements);
  const globalIssues = removesGlobalIssue
    ? Object.freeze(issueStore.values.filter((issue) => !removed.has(issue.id)))
    : issueStore.values;
  const nextIssues = removeIssues(issueStore, removed, globalIssues);
  const submission = state.submission.status === 'failed'
    && state.submission.failure === null
    && !nextIssues.allBySource.has('server')
    ? createSubmissionState(
        state.submission.generation,
        'idle',
        state.submission.count,
        null,
      )
    : state.submission;
  return update(deriveState(state, {
    validation: state.validation.status === 'idle'
      ? state.validation
      : createValidationState(state.validation.generation, 'idle', null, null),
    submission,
  }, nextFields, nextIssues));
}

function startValidation<ID extends StableID>(
  state: State<ID>,
  trigger: ValidationTrigger,
  intent: ValidationIntent,
): Result<Update<ID>> {
  if (state.submission.status === 'submitting') {
    return fail(
      'transition-rejection',
      'form-validation-during-submit',
      'Form validation cannot start while submission is pending.',
    );
  }
  if (state.validation.generation === Number.MAX_SAFE_INTEGER) {
    return fail(
      'resource-rejection',
      'form-validation-generation-exhausted',
      'Form validation generation cannot advance beyond the safe-integer ceiling.',
    );
  }
  const submission = intent === 'submission';
  if (submission && state.submission.count === Number.MAX_SAFE_INTEGER) {
    return fail(
      'resource-rejection',
      'form-submit-count-invalid',
      'Form submit count cannot advance beyond the safe-integer ceiling.',
    );
  }
  const current = submission ? withoutIssueSource(state, 'server') : state;
  return update(deriveState(current, {
    validation: createValidationState(
      current.validation.generation + 1,
      'validating',
      trigger,
      intent,
    ),
    ...(submission ? {
      submission: createSubmissionState(
        current.submission.generation,
        'idle',
        current.submission.count + 1,
        null,
      ),
    } : {}),
  }));
}

function completeValidation<ID extends StableID>(
  state: State<ID>,
  trigger: ValidationTrigger,
  intent: ValidationIntent,
  generation: number,
): Result<Update<ID>> {
  const currentGeneration = requireValidationGeneration(state, generation);
  if (!currentGeneration.ok) return currentGeneration;
  if (
    state.validation.status !== 'validating'
    || state.validation.trigger !== trigger
    || state.validation.intent !== intent
  ) {
    return fail(
      'transition-rejection',
      'form-validation-not-pending',
      'Form validation can complete only for the active validation run.',
    );
  }
  const completed = deriveState(state, {
    validation: createValidationState(
      state.validation.generation,
      state.valid ? 'valid' : 'invalid',
      trigger,
      intent,
    ),
  });
  if (intent !== 'submission') return update(completed);

  if (completed.valid) {
    if (completed.submission.generation === Number.MAX_SAFE_INTEGER) {
      return fail(
        'resource-rejection',
        'form-submission-generation-exhausted',
        'Form submission generation cannot advance beyond the safe-integer ceiling.',
      );
    }
    const submissionGeneration = completed.submission.generation + 1;
    return update(
      deriveState(completed, {
        submission: createSubmissionState(
          submissionGeneration,
          'idle',
          completed.submission.count,
          null,
        ),
      }),
      [{ type: 'submit-requested', generation: submissionGeneration }],
    );
  }
  const allIssues = orderedIssues(completed);
  const firstInvalid = firstIssueFocusField(fieldStoreOf(completed), allIssues);
  const commands: Command<ID>[] = [];
  if (trigger === 'submit' && firstInvalid !== undefined) {
    commands.push({ type: 'focus-field', id: firstInvalid.id });
  }
  if (allIssues.length > 0) {
    commands.push({
      type: 'announce-summary',
      issueIds: Object.freeze(allIssues.map((issue) => issue.id)),
    });
  }
  return update(completed, commands);
}

function submitFailed<ID extends StableID>(
  state: State<ID>,
  generation: number,
  failureInput: SubmissionFailure | null,
  issues: readonly Issue<ID>[],
): Result<Update<ID>> {
  const validation = state.validation;
  const currentGeneration = requireSubmissionGeneration(state, generation);
  if (!currentGeneration.ok) return currentGeneration;
  if (state.submission.status !== 'submitting') {
    return fail(
      'transition-rejection',
      'form-submit-not-pending',
      'Form submission can fail only while pending.',
    );
  }
  const captured = snapshotIssueInputs(issues);
  if (!captured.ok) return transitionError(captured);
  const issueInput = captured.value;
  if (issueInput.some((issue) => issue.source !== 'server')) {
    return fail(
      'transition-rejection',
      'form-submit-issue-source-invalid',
      'Submit failure issues must use the server source.',
    );
  }
  const failure = normalizeSubmissionFailure(failureInput);
  if (!failure.ok) return transitionError(failure);
  if (failure.value === null && issueInput.length === 0) {
    return fail(
      'transition-rejection',
      'form-submit-failure-empty',
      'A failed Form submission requires a failure message or server issue.',
    );
  }
  const replaced = replaceIssuesCaptured(state, 'server', issueInput);
  if (!replaced.ok) return replaced;
  const issueState = replaced.value.state;
  const failed = deriveState(issueState, {
    ...(issueInput.length === 0 ? {} : {
      validation: createValidationState(
        validation.generation,
        'invalid',
        validation.trigger,
        validation.intent,
      ),
    }),
    submission: createSubmissionState(
      issueState.submission.generation,
      'failed',
      issueState.submission.count,
      failure.value,
    ),
  });
  const ordered = orderedIssues(failed);
  const firstInvalid = firstIssueFocusField(fieldStoreOf(failed), ordered);
  const commands: Command<ID>[] = [];
  if (firstInvalid !== undefined) commands.push({ type: 'focus-field', id: firstInvalid.id });
  if (ordered.length > 0) {
    commands.push({
      type: 'announce-summary',
      issueIds: Object.freeze(ordered.map((issue) => issue.id)),
    });
  }
  if (failure.value !== null && ordered.length === 0) {
    commands.push({ type: 'announce-submission-failure' });
  }
  return update(failed, commands);
}

function reset<ID extends StableID>(state: State<ID>): Result<Update<ID>> {
  const fields = materializeFields(fieldStoreOf(state)).map((field) => Object.freeze({
    ...field,
    touched: false,
    dirty: false,
    valid: true,
    issues: Object.freeze([]) as readonly Issue<ID>[],
    relatedIssues: Object.freeze([]) as readonly Issue<ID>[],
  }));
  const fieldStore = createFieldStore(fields);
  return update(
    deriveState(state, {
      validation: createValidationState(state.validation.generation, 'idle', null, null),
      submission: createSubmissionState(state.submission.generation, 'idle', 0, null),
    }, fieldStore, createIssueStore([], fieldStore)),
    fields.map((field) => ({ type: 'reset-field', id: field.id })),
  );
}

function reinitialize<ID extends StableID>(
  state: State<ID>,
  options: ReinitializeOptions = {},
): Result<Update<ID>> {
  const preserveTouched = options.preserve?.touched === true;
  const preserveValidation = options.preserve?.validation === true;
  const preserveSubmission = options.preserve?.submission === true;
  const keepIssue = (issue: Issue<ID>): boolean => (
    issue.source === 'form' || issue.source === 'field'
      ? true
      : issue.source === 'server' ? preserveSubmission : preserveValidation
  );
  const fields = materializeFields(fieldStoreOf(state)).map((field) => {
    const issues = Object.freeze(field.issues.filter(keepIssue));
    return fieldWithIssues(Object.freeze({
      ...field,
      touched: preserveTouched ? field.touched : false,
      dirty: false,
    }), issues, Object.freeze([]));
  });
  const globalIssues = Object.freeze(state.issues.filter(keepIssue));
  const projectedFields = createFieldStore(projectRelatedIssues(fields, globalIssues));
  return update(deriveState(state, {
    validation: preserveValidation
      ? state.validation
      : createValidationState(state.validation.generation, 'idle', null, null),
    submission: preserveSubmission
      ? state.submission
      : createSubmissionState(state.submission.generation, 'idle', 0, null),
  }, projectedFields, createIssueStore(globalIssues, projectedFields)));
}

function reserveIssueReplacement<ID extends StableID>(state: State<ID>, input: readonly Issue<ID>[], removedNodes: number, addedFields = 0): Result<number> {
  if (!Array.isArray(input)) return fail('transition-rejection', 'form-state-input-invalid', 'Form issues must be an array.');
  const current = states.get(state)!;
  const retained = current.fields.size + current.issues.outputNodes - removedNodes + addedFields;
  if (input.length > current.maxOutputNodes - retained) return exceeded('form-output-node-ceiling-exceeded', retained + input.length, current.maxOutputNodes);
  const result = reserveIssueRelations(input, retained + input.length, current.maxOutputNodes);
  return !result.ok && result.error.class !== 'resource-rejection' ? transitionError(result) : result;
}

function withoutIssueSource<ID extends StableID>(
  state: State<ID>,
  source: IssueSource,
): State<ID> {
  const store = fieldStoreOf(state);
  const issueStore = issueStoreOf(state);
  if (!issueStore.allBySource.has(source)) return state;
  const globalIssues = Object.freeze(
    issueStore.values.filter((issue) => issue.source !== source),
  );
  const directFields = materializeFields(store).map((field) => fieldWithIssues(
    field,
    Object.freeze(field.issues.filter((issue) => issue.source !== source)),
    Object.freeze([]),
  ));
  const fields = createFieldStore(projectRelatedIssues(directFields, globalIssues));
  const next = deriveState(state, {}, fields, createIssueStore(globalIssues, fields));
  return afterIssueMutation(state, next);
}

function afterIssueMutation<ID extends StableID>(
  previous: State<ID>,
  next: State<ID>,
): State<ID> {
  if (next === previous) return next;
  const validation = previous.validation.status === 'idle'
    || previous.validation.status === 'validating'
    ? previous.validation
    : createValidationState(previous.validation.generation, 'idle', null, null);
  const submission = previous.submission.status === 'failed'
    && previous.submission.failure === null
    && !issueStoreOf(next).allBySource.has('server')
    ? createSubmissionState(
        previous.submission.generation,
        'idle',
        previous.submission.count,
        null,
      )
    : previous.submission;
  return deriveState(next, { validation, submission });
}

function validateFieldIssueOwnership<ID extends StableID>(
  state: State<ID>,
  field: Field<ID>,
  replacingOwner: ID,
): Result<true> {
  const store = fieldStoreOf(state);
  const globalIssues = issueStoreOf(state).byID;
  for (const issue of field.issues) {
    const owner = store.issueOwnerByID.get(issue.id);
    if (globalIssues.has(issue.id) || (owner !== undefined && owner !== replacingOwner)) {
      return duplicateIssueID();
    }
  }
  return ok(true);
}

function validateSourceReplacementOwnership<ID extends StableID>(
  state: State<ID>,
  source: IssueSource,
  issues: readonly Issue<ID>[],
): Result<true> {
  const store = fieldStoreOf(state);
  const global = issueStoreOf(state);
  for (const issue of issues) {
    if (global.byID.has(issue.id)) {
      const existing = global.byID.get(issue.id);
      if (existing?.source !== source) return duplicateIssueID();
    }
    const owner = store.issueOwnerByID.get(issue.id);
    if (owner !== undefined) {
      const existing = getStoredField(store, owner)?.issues.find(
        (candidate) => candidate.id === issue.id,
      );
      if (existing?.source !== source) return duplicateIssueID();
    }
  }
  return ok(true);
}

function duplicateIssueID<T = never>(): Result<T> {
  return fail(
    'transition-rejection',
    'form-issue-id-duplicate',
    'Form issue identifiers must be unique.',
  );
}

function missingField<T = never>(): Result<T> {
  return fail(
    'transition-rejection',
    'form-field-id-missing',
    'The Form field does not exist.',
  );
}

function update<ID extends StableID>(
  state: State<ID>,
  commands: readonly Command<ID>[] = [],
): Result<Update<ID>> {
  return createMachineUpdate<State<ID>, Command<ID>, FormErrorCode>(
    state,
    commands,
  ) as Result<CoreUpdate<ID>>;
}

function invalidFieldOrder(): Result<never> {
  return fail(
    'transition-rejection',
    'form-field-order-invalid',
    'Form field order must contain every registered field exactly once.',
  );
}

function transitionError<T>(result: Result<T>): Result<never> {
  if (result.ok) {
    return fail('internal-invariant', 'form-result-unexpected', 'Expected a failed result.');
  }
  return fail('transition-rejection', result.error.code, result.error.message);
}
