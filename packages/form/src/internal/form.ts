import type { StableID } from '@sectile/core';
import { tryNormalizeStableIDs, validateStableID } from '@sectile/core/identity';
import {
  createMachineUpdate,
  type MachineUpdate,
} from '@sectile/core/revision';
import type { FormErrorCode } from '../error.js';
import type { FormResult as Result } from '../error.js';
import { fail, ok, unwrap } from './result.js';
import { DEFAULT_LIMITS, normalizeLimits, exceeded, type Limits } from './construction/limits.js';
import { tryCreateFormFieldPath, encodeSegments, type Path } from './construction/path.js';
import type { Command, Event, Field, FieldInput, FieldMeta, Issue, IssueSource, ReinitializeOptions, State, StateInput, Submission, SubmissionFailure, SubmissionStatus, Update, Validation, ValidationIntent, ValidationStatus, ValidationTrigger } from './state/contracts.js';

type CoreFormUpdate<ID extends StableID> = MachineUpdate<State<ID>, Command<ID>>;

const FORM_FIELD_CHUNK_SIZE = 64;
const FORM_INDEX_OVERLAY_LIMIT = 32;
const deletedIndexValue = Symbol('form-index-deleted');
const emptyFormIssues = Object.freeze([]) as readonly Issue<StableID>[];

class FormDeltaIndex<Key, Value> {
  readonly #base: ReadonlyMap<Key, Value>;
  readonly #parent: FormDeltaIndex<Key, Value> | null;
  readonly #changes: ReadonlyMap<Key, Value | typeof deletedIndexValue>;
  readonly #depth: number;

  private constructor(
    base: ReadonlyMap<Key, Value>,
    parent: FormDeltaIndex<Key, Value> | null,
    changes: ReadonlyMap<Key, Value | typeof deletedIndexValue>,
    depth: number,
  ) {
    this.#base = base;
    this.#parent = parent;
    this.#changes = changes;
    this.#depth = depth;
  }

  public static from<Key, Value>(entries: ReadonlyMap<Key, Value>): FormDeltaIndex<Key, Value> {
    return new FormDeltaIndex(new Map(entries), null, new Map(), 0);
  }

  public get(key: Key): Value | undefined {
    for (let index: FormDeltaIndex<Key, Value> | null = this; index !== null; index = index.#parent) {
      if (!index.#changes.has(key)) continue;
      const value = index.#changes.get(key);
      return value === deletedIndexValue ? undefined : value;
    }
    return this.#base.get(key);
  }

  public has(key: Key): boolean { return this.get(key) !== undefined; }

  public update(
    changes: ReadonlyMap<Key, Value | typeof deletedIndexValue>,
  ): FormDeltaIndex<Key, Value> {
    if (changes.size === 0) return this;
    if (this.#depth + 1 < FORM_INDEX_OVERLAY_LIMIT) {
      return new FormDeltaIndex(this.#base, this, new Map(changes), this.#depth + 1);
    }
    const compacted = this.materialize();
    applyIndexChanges(compacted, changes);
    return FormDeltaIndex.from(compacted);
  }

  public materialize(): Map<Key, Value> {
    const output = new Map(this.#base);
    const layers: FormDeltaIndex<Key, Value>[] = [];
    for (let index: FormDeltaIndex<Key, Value> | null = this; index !== null; index = index.#parent) {
      if (index.#changes.size > 0) layers.push(index);
    }
    for (let layer = layers.length - 1; layer >= 0; layer -= 1) {
      applyIndexChanges(output, layers[layer]!.#changes);
    }
    return output;
  }
}

function applyIndexChanges<Key, Value>(
  target: Map<Key, Value>,
  changes: ReadonlyMap<Key, Value | typeof deletedIndexValue>,
): void {
  for (const [key, value] of changes) {
    if (value === deletedIndexValue) target.delete(key);
    else target.set(key, value);
  }
}

class FormDeltaSet<Value> {
  readonly #index: FormDeltaIndex<Value, true>;
  readonly #size: number;
  readonly #overlayEntries: number;

  private constructor(index: FormDeltaIndex<Value, true>, size: number, overlayEntries: number) {
    this.#index = index;
    this.#size = size;
    this.#overlayEntries = overlayEntries;
  }

  public static from<Value>(values: Iterable<Value>): FormDeltaSet<Value> {
    const entries = new Map(Array.from(values, (value) => [value, true] as const));
    return new FormDeltaSet(FormDeltaIndex.from(entries), entries.size, 0);
  }

  public update(add: Iterable<Value>, remove: Iterable<Value>): FormDeltaSet<Value> {
    const requested = new Map<Value, true | typeof deletedIndexValue>();
    for (const value of remove) requested.set(value, deletedIndexValue);
    for (const value of add) requested.set(value, true);
    if (requested.size === 0) return this;
    const changes = new Map<Value, true | typeof deletedIndexValue>();
    let size = this.#size;
    for (const [value, next] of requested) {
      const contained = this.#index.has(value);
      if (contained && next === deletedIndexValue) {
        size -= 1;
        changes.set(value, next);
      } else if (!contained && next === true) {
        size += 1;
        changes.set(value, next);
      }
    }
    if (changes.size === 0) return this;
    if (size === 0) return FormDeltaSet.from([]);
    const overlayEntries = this.#overlayEntries + changes.size;
    if (overlayEntries > size) {
      const compacted = this.#index.materialize();
      applyIndexChanges(compacted, changes);
      return FormDeltaSet.from(compacted.keys());
    }
    return new FormDeltaSet(this.#index.update(changes), size, overlayEntries);
  }

  public values(): IterableIterator<Value> { return this.#index.materialize().keys(); }
}

interface FormPathOwnerNode<ID extends StableID> {
  owner: ID | null;
  children: Map<string, FormPathOwnerNode<ID>> | null;
}

interface FormPathOwnerCache<ID extends StableID> {
  queried: boolean;
  root: FormPathOwnerNode<ID> | null;
}

interface FormFieldStore<ID extends StableID> {
  readonly size: number;
  readonly pathOwners: FormPathOwnerCache<ID>;
  readonly chunks: readonly (readonly Field<ID>[])[];
  readonly indexByID: ReadonlyMap<ID, number>;
  readonly issueOwnerByID: FormDeltaIndex<StableID, ID>;
  readonly fieldIDsBySource: ReadonlyMap<IssueSource, FormDeltaSet<ID>>;
  readonly touchedCount: number;
  readonly dirtyCount: number;
  readonly invalidCount: number;
}

interface FormStatePrivate<ID extends StableID> {
  readonly fields: FormFieldStore<ID>;
  readonly issues: FormIssueStore<ID>;
  readonly maxOutputNodes: number;
}

interface FormIssueStore<ID extends StableID> {
  readonly outputNodes: number;
  readonly values: readonly Issue<ID>[];
  readonly byID: ReadonlyMap<StableID, Issue<ID>>;
  readonly bySource: ReadonlyMap<IssueSource, readonly Issue<ID>[]>;
  readonly allValues: readonly Issue<ID>[];
  readonly allByID: FormDeltaIndex<StableID, Issue<ID>>;
  readonly allBySource: ReadonlyMap<IssueSource, readonly Issue<ID>[]>;
  readonly relatedIssueIDsByField: ReadonlyMap<ID, readonly StableID[]>;
  readonly serverIssueIDsByField: ReadonlyMap<ID, readonly StableID[]>;
}

const states = new WeakMap<object, FormStatePrivate<StableID>>();
const fieldProjectionCache = new WeakMap<object, readonly Field<StableID>[]>();

function ownsIssuePath(fieldName: string, issueName: string): boolean {
  return issueName === fieldName
    || issueName.startsWith(`${fieldName}.`)
    || issueName.startsWith(`${fieldName}[`);
}

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

export function getFormField<ID extends StableID>(
  state: State<ID>,
  id: ID,
): Field<ID> | null {
  const privateState = states.get(state);
  if (privateState === undefined) {
    return state.fields.find((field) => field.id === id) ?? null;
  }
  return getStoredField(privateState.fields as FormFieldStore<ID>, id) ?? null;
}

export function getFormFieldIDByPath<ID extends StableID>(
  state: State<ID>,
  path: Path,
): ID | null {
  const normalized = tryCreateFormFieldPath(path);
  if (!normalized.ok) return null;
  const issueName = encodeSegments(normalized.value);
  const privateState = states.get(state);
  if (privateState === undefined) return scanPathOwner([state.fields], issueName);
  const store = privateState.fields as FormFieldStore<ID>;
  const cache = store.pathOwners;
  if (!cache.queried) {
    cache.queried = true;
    return scanPathOwner(store.chunks, issueName);
  }
  cache.root ??= createPathOwnerIndex(store.chunks);
  let node = cache.root;
  let owner: ID | null = null;
  for (let start = 0; start < issueName.length && node.children !== null;) {
    const end = pathOwnerTokenEnd(issueName, start);
    const next = node.children.get(issueName.slice(start, end));
    if (next === undefined) break;
    node = next;
    if (node.owner !== null) owner = node.owner;
    start = end;
  }
  return owner;
}

function createPathOwnerIndex<ID extends StableID>(chunks: readonly (readonly Field<ID>[])[]): FormPathOwnerNode<ID> {
  const root: FormPathOwnerNode<ID> = { owner: null, children: null };
  for (const fields of chunks) {
    for (const field of fields) {
      if (field.name === null) continue;
      let node = root;
      for (let start = 0; start < field.name.length;) {
        const end = pathOwnerTokenEnd(field.name, start);
        const token = field.name.slice(start, end);
        node.children ??= new Map();
        let next = node.children.get(token);
        if (next === undefined) {
          next = { owner: null, children: null };
          node.children.set(token, next);
        }
        node = next;
        start = end;
      }
      node.owner ??= field.id;
    }
  }
  return root;
}

// Delimiters stay attached to the following token, preserving raw name ownership.
function pathOwnerTokenEnd(name: string, start: number): number {
  let end = start + 1;
  while (end < name.length && name[end] !== '.' && name[end] !== '[') end += 1;
  return end;
}

function scanPathOwner<ID extends StableID>(chunks: readonly (readonly Field<ID>[])[], issueName: string): ID | null {
  let owner: Field<ID> | undefined;
  for (const fields of chunks) {
    for (const candidate of fields) {
      if (candidate.name === null || !ownsIssuePath(candidate.name, issueName)) continue;
      if (owner === undefined || candidate.name.length > (owner.name?.length ?? 0)) owner = candidate;
    }
  }
  return owner?.id ?? null;
}

export function getFormIssuesBySource<ID extends StableID>(
  state: State<ID>,
  source: IssueSource,
): readonly Issue<ID>[] {
  const store = states.get(state)?.issues as FormIssueStore<ID> | undefined;
  if (store !== undefined) {
    return store.allBySource.get(source)
      ?? emptyFormIssues as readonly Issue<ID>[];
  }
  return Object.freeze(state.allIssues.filter((issue) => issue.source === source));
}

export function getFormFieldIDsByIssueSource<ID extends StableID>(
  state: State<ID>,
  source: IssueSource,
): readonly ID[] {
  const privateState = states.get(state);
  if (privateState === undefined) {
    return Object.freeze(state.fields
      .filter((field) => field.issues.some((issue) => issue.source === source))
      .map((field) => field.id));
  }
  const fields = privateState.fields as FormFieldStore<ID>;
  return Object.freeze(Array.from(fields.fieldIDsBySource.get(source)?.values() ?? []));
}

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
  const previousSourceIssues = issueStore.allBySource.get(source) ?? emptyFormIssues;
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
  const nextIssues = removeFormIssues(issueStore, removed, globalIssues);
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
    }, fieldStore, createFormIssueStore([], fieldStore)),
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
  }, projectedFields, createFormIssueStore(globalIssues, projectedFields)));
}

function snapshotIssueInputs<ID extends StableID>(
  input: readonly Issue<ID>[],
): Result<readonly Issue<ID>[]> {
  if (!Array.isArray(input)) return fail('construction', 'form-state-input-invalid', 'Form issues must be an array.');
  const output: Issue<ID>[] = [];
  for (const candidate of input) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return fail('construction', 'form-issue-invalid', 'Every Form issue must be an object.');
    }
    const relatedFieldIds = candidate.relatedFieldIds;
    if (relatedFieldIds !== undefined && !Array.isArray(relatedFieldIds)) {
      return fail('construction', 'form-issue-related-field-id-invalid', 'Related Form field identifiers must be valid stable IDs.');
    }
    output.push({
      id: candidate.id,
      message: candidate.message,
      source: candidate.source,
      fieldId: candidate.fieldId,
      relatedFieldIds,
    });
  }
  return ok(output);
}

function snapshotFieldInput<ID extends StableID>(input: FieldInput<ID>): Result<FieldInput<ID>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('construction', 'form-state-input-invalid', 'Every Form field input must be an object.');
  }
  const issues = snapshotIssueInputs(input.issues ?? []);
  return issues.ok ? ok({
    id: input.id,
    name: input.name,
    touched: input.touched,
    dirty: input.dirty,
    issues: issues.value,
  } as FieldInput<ID>) : issues;
}

function normalizeField<ID extends StableID>(
  input: FieldInput<ID>,
  validateID = true,
): Result<Field<ID>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('construction', 'form-state-input-invalid', 'Every Form field input must be an object.');
  }
  if (validateID) {
    const identity = validateFormFieldID(input.id);
    if (!identity.ok) return identity;
  }
  if (
    (input.name !== undefined && input.name !== null && typeof input.name !== 'string')
    || (input.touched !== undefined && typeof input.touched !== 'boolean')
    || (input.dirty !== undefined && typeof input.dirty !== 'boolean')
  ) {
    return fail(
      'construction',
      'form-field-meta-invalid',
      'Form field metadata must use a string or null name and boolean flags.',
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
    valid: issues.value.length === 0,
    issues: issues.value,
    relatedIssues: Object.freeze([]) as readonly Issue<ID>[],
  }));
}

function issueOutputNodes<ID extends StableID>(issues: readonly Issue<ID>[], source?: IssueSource): number {
  let nodes = 0;
  for (const issue of issues) {
    if (source === undefined || issue.source === source) nodes += 1 + (issue.relatedFieldIds?.length ?? 0);
  }
  return nodes;
}

function reserveIssueRelations<ID extends StableID>(input: readonly Issue<ID>[], nodes: number, ceiling: number): Result<number> {
  if (nodes > ceiling) return exceeded('form-output-node-ceiling-exceeded', nodes, ceiling);
  for (const issue of input) {
    const relations = issue.relatedFieldIds?.length ?? 0;
    if (relations > ceiling - nodes) return exceeded('form-output-node-ceiling-exceeded', nodes + relations, ceiling);
    nodes += relations;
  }
  return ok(nodes);
}

function reserveIssueReplacement<ID extends StableID>(state: State<ID>, input: readonly Issue<ID>[], removedNodes: number, addedFields = 0): Result<number> {
  if (!Array.isArray(input)) return fail('transition-rejection', 'form-state-input-invalid', 'Form issues must be an array.');
  const current = states.get(state)!;
  const retained = current.fields.size + current.issues.outputNodes - removedNodes + addedFields;
  if (input.length > current.maxOutputNodes - retained) return exceeded('form-output-node-ceiling-exceeded', retained + input.length, current.maxOutputNodes);
  const result = reserveIssueRelations(input, retained + input.length, current.maxOutputNodes);
  return !result.ok && result.error.class !== 'resource-rejection' ? transitionError(result) : result;
}

function normalizeIssues<ID extends StableID>(
  input: readonly Issue<ID>[],
  fieldId: ID | undefined,
): Result<readonly Issue<ID>[]> {
  if (!Array.isArray(input)) {
    return fail('construction', 'form-state-input-invalid', 'Form issues must be an array.');
  }
  const issueInput = input as readonly Issue<ID>[];
  for (const issue of issueInput) {
    if (issue === null || typeof issue !== 'object' || Array.isArray(issue)) {
      return fail('construction', 'form-issue-invalid', 'Every Form issue must be an object.');
    }
  }
  const ids = tryNormalizeStableIDs(issueInput.map((issue) => issue.id));
  if (!ids.ok) {
    return ids.error.code === 'duplicate-id'
      ? fail('construction', 'form-issue-id-duplicate', 'Form issue identifiers must be unique.')
      : fail(
        'construction',
        'form-issue-invalid',
        'Form issue identifiers and messages must not be empty and IDs must be valid.',
      );
  }
  const issues: Issue<ID>[] = [];
  for (const issue of issueInput) {
    if (
      typeof issue.message !== 'string'
      || (typeof issue.id === 'string' && issue.id.trim().length === 0)
      || issue.message.trim().length === 0
      || !isIssueSource(issue.source)
    ) {
      return fail(
        'construction',
        'form-issue-invalid',
        'Form issue identifiers and messages must not be empty.',
      );
    }
    if (fieldId !== undefined && issue.fieldId !== undefined && issue.fieldId !== fieldId) {
      return fail(
        'construction',
        'form-issue-field-mismatch',
        'A field issue must reference its owning field.',
      );
    }
    const owner = fieldId ?? issue.fieldId;
    const related = tryNormalizeStableIDs<ID>(issue.relatedFieldIds ?? []);
    if (!related.ok) {
      return fail(
        'construction',
        related.error.code === 'duplicate-id'
          ? 'form-issue-related-field-id-duplicate'
          : 'form-issue-related-field-id-invalid',
        related.error.code === 'duplicate-id'
          ? 'Related Form field identifiers must be unique.'
          : 'Related Form field identifiers must be valid stable IDs.',
      );
    }
    const relatedFieldIds = Object.freeze(related.value.filter((id) => id !== owner));
    issues.push(Object.freeze({
      id: issue.id,
      message: issue.message.trim(),
      source: issue.source,
      ...(owner === undefined
        ? {}
        : { fieldId: owner }),
      ...(relatedFieldIds.length === 0 ? {} : { relatedFieldIds }),
    }));
  }
  return ok(Object.freeze(issues));
}

function projectRelatedIssues<ID extends StableID>(
  fields: readonly Field<ID>[],
  globalIssues: readonly Issue<ID>[],
): readonly Field<ID>[] {
  const registered = new Set(fields.map((field) => field.id));
  const relatedByField = new Map<ID, Issue<ID>[]>();
  const allIssues = [
    ...fields.flatMap((field) => field.issues),
    ...globalIssues,
  ];
  for (const issue of allIssues) {
    for (const id of issue.relatedFieldIds ?? []) {
      if (!registered.has(id)) continue;
      const related = relatedByField.get(id);
      if (related === undefined) relatedByField.set(id, [issue]);
      else related.push(issue);
    }
  }
  return Object.freeze(fields.map((field) => {
    const relatedIssues = Object.freeze(relatedByField.get(field.id) ?? []);
    if (sameIssues(field.relatedIssues, relatedIssues)) return field;
    return fieldWithIssues(field, field.issues, relatedIssues);
  }));
}

function createFieldStore<ID extends StableID>(
  fields: readonly Field<ID>[],
): FormFieldStore<ID> {
  const chunks: (readonly Field<ID>[])[] = [];
  const indexByID = new Map<ID, number>();
  const issueOwnerByID = new Map<StableID, ID>();
  const mutableIDsBySource = new Map<IssueSource, Set<ID>>();
  let touchedCount = 0;
  let dirtyCount = 0;
  let invalidCount = 0;
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]!;
    indexByID.set(field.id, index);
    if (field.touched) touchedCount += 1;
    if (field.dirty) dirtyCount += 1;
    if (!field.valid) invalidCount += 1;
    for (const issue of field.issues) {
      issueOwnerByID.set(issue.id, field.id);
    }
    for (const issue of [...field.issues, ...field.relatedIssues]) {
      let owners = mutableIDsBySource.get(issue.source);
      if (owners === undefined) {
        owners = new Set<ID>();
        mutableIDsBySource.set(issue.source, owners);
      }
      owners.add(field.id);
    }
    if (index % FORM_FIELD_CHUNK_SIZE === 0) chunks.push([]);
    (chunks[chunks.length - 1] as Field<ID>[]).push(field);
  }
  const fieldIDsBySource = new Map<IssueSource, FormDeltaSet<ID>>();
  for (const [source, ids] of mutableIDsBySource) {
    fieldIDsBySource.set(source, FormDeltaSet.from(ids));
  }
  return Object.freeze({
    size: fields.length,
    pathOwners: { queried: false, root: null },
    chunks: Object.freeze(chunks.map((chunk) => Object.freeze(chunk))),
    indexByID,
    issueOwnerByID: FormDeltaIndex.from(issueOwnerByID),
    fieldIDsBySource,
    touchedCount,
    dirtyCount,
    invalidCount,
  });
}

function fieldStoreOf<ID extends StableID>(state: State<ID>): FormFieldStore<ID> {
  return states.get(state as object)!.fields as FormFieldStore<ID>;
}

function issueStoreOf<ID extends StableID>(state: State<ID>): FormIssueStore<ID> {
  return states.get(state as object)!.issues as FormIssueStore<ID>;
}

function createFormIssueStore<ID extends StableID>(
  issues: readonly Issue<ID>[],
  fields: FormFieldStore<ID>,
  inputAllIssues?: readonly Issue<ID>[],
): FormIssueStore<ID> {
  const values = Object.freeze([...issues]);
  const byID = new Map<StableID, Issue<ID>>();
  const mutableBySource = new Map<IssueSource, Issue<ID>[]>();
  for (const issue of values) {
    byID.set(issue.id, issue);
    let sourceIssues = mutableBySource.get(issue.source);
    if (sourceIssues === undefined) {
      sourceIssues = [];
      mutableBySource.set(issue.source, sourceIssues);
    }
    sourceIssues.push(issue);
  }
  const bySource = new Map<IssueSource, readonly Issue<ID>[]>();
  for (const [source, sourceIssues] of mutableBySource) {
    bySource.set(source, Object.freeze(sourceIssues));
  }
  const allValues = inputAllIssues === undefined
    ? Object.freeze([
        ...materializeFields(fields).flatMap((field) => field.issues),
        ...values,
      ])
    : Object.freeze([...inputAllIssues]);
  const allByID = new Map<StableID, Issue<ID>>();
  const mutableAllBySource = new Map<IssueSource, Issue<ID>[]>();
  const mutableRelatedIssueIDsByField = new Map<ID, StableID[]>();
  const mutableServerIssueIDsByField = new Map<ID, StableID[]>();
  for (const issue of allValues) {
    allByID.set(issue.id, issue);
    let sourceIssues = mutableAllBySource.get(issue.source);
    if (sourceIssues === undefined) {
      sourceIssues = [];
      mutableAllBySource.set(issue.source, sourceIssues);
    }
    sourceIssues.push(issue);
    const related = issue.relatedFieldIds ?? [];
    for (const id of related) {
      if (!fields.indexByID.has(id)) continue;
      const issueIDs = mutableRelatedIssueIDsByField.get(id);
      if (issueIDs === undefined) mutableRelatedIssueIDsByField.set(id, [issue.id]);
      else issueIDs.push(issue.id);
    }
    if (issue.source !== 'server') continue;
    const owners = issue.fieldId === undefined ? related : [issue.fieldId, ...related];
    for (const id of owners) {
      if (!fields.indexByID.has(id)) continue;
      const issueIDs = mutableServerIssueIDsByField.get(id);
      if (issueIDs === undefined) mutableServerIssueIDsByField.set(id, [issue.id]);
      else issueIDs.push(issue.id);
    }
  }
  const allBySource = new Map<IssueSource, readonly Issue<ID>[]>();
  for (const [source, sourceIssues] of mutableAllBySource) {
    allBySource.set(source, Object.freeze(sourceIssues));
  }
  const relatedIssueIDsByField = new Map<ID, readonly StableID[]>();
  for (const [id, issueIDs] of mutableRelatedIssueIDsByField) {
    relatedIssueIDsByField.set(id, Object.freeze(issueIDs));
  }
  const serverIssueIDsByField = new Map<ID, readonly StableID[]>();
  for (const [id, issueIDs] of mutableServerIssueIDsByField) {
    serverIssueIDsByField.set(id, Object.freeze(issueIDs));
  }
  return Object.freeze({
    outputNodes: issueOutputNodes(allValues),
    values,
    byID,
    bySource,
    allValues,
    allByID: FormDeltaIndex.from(allByID),
    allBySource,
    relatedIssueIDsByField,
    serverIssueIDsByField,
  });
}

function removeFormIssues<ID extends StableID>(
  previous: FormIssueStore<ID>,
  removed: ReadonlySet<StableID>,
  globalIssues: readonly Issue<ID>[],
): FormIssueStore<ID> {
  const values = globalIssues === previous.values
    ? previous.values
    : Object.freeze([...globalIssues]);
  const byID = values === previous.values
    ? previous.byID
    : new Map(values.map((issue) => [issue.id, issue]));
  const bySource = values === previous.values
    ? previous.bySource
    : groupIssuesBySource(values);
  const allValues = Object.freeze(
    previous.allValues.filter((issue) => !removed.has(issue.id)),
  );
  const allByIDChanges = new Map<StableID, typeof deletedIndexValue>();
  for (const id of removed) allByIDChanges.set(id, deletedIndexValue);
  const allBySource = new Map(previous.allBySource);
  const serverIssues = previous.allBySource.get('server');
  if (serverIssues !== undefined) {
    const remaining = Object.freeze(serverIssues.filter((issue) => !removed.has(issue.id)));
    if (remaining.length === 0) allBySource.delete('server');
    else allBySource.set('server', remaining);
  }
  const serverIssueIDsByField = new Map(previous.serverIssueIDsByField);
  for (const [id, issueIDs] of previous.serverIssueIDsByField) {
    if (!issueIDs.some((issueID) => removed.has(issueID))) continue;
    const remaining = Object.freeze(issueIDs.filter((issueID) => !removed.has(issueID)));
    if (remaining.length === 0) serverIssueIDsByField.delete(id);
    else serverIssueIDsByField.set(id, remaining);
  }
  const relatedIssueIDsByField = new Map(previous.relatedIssueIDsByField);
  for (const [id, issueIDs] of previous.relatedIssueIDsByField) {
    if (!issueIDs.some((issueID) => removed.has(issueID))) continue;
    const remaining = Object.freeze(issueIDs.filter((issueID) => !removed.has(issueID)));
    if (remaining.length === 0) relatedIssueIDsByField.delete(id);
    else relatedIssueIDsByField.set(id, remaining);
  }
  return Object.freeze({
    outputNodes: issueOutputNodes(allValues),
    values,
    byID,
    bySource,
    allValues,
    allByID: previous.allByID.update(allByIDChanges),
    allBySource,
    relatedIssueIDsByField,
    serverIssueIDsByField,
  });
}

function groupIssuesBySource<ID extends StableID>(
  issues: readonly Issue<ID>[],
): ReadonlyMap<IssueSource, readonly Issue<ID>[]> {
  const mutable = new Map<IssueSource, Issue<ID>[]>();
  for (const issue of issues) {
    const sourceIssues = mutable.get(issue.source);
    if (sourceIssues === undefined) mutable.set(issue.source, [issue]);
    else sourceIssues.push(issue);
  }
  const grouped = new Map<IssueSource, readonly Issue<ID>[]>();
  for (const [source, sourceIssues] of mutable) {
    grouped.set(source, Object.freeze(sourceIssues));
  }
  return grouped;
}

function fieldAt<ID extends StableID>(
  store: FormFieldStore<ID>,
  index: number,
): Field<ID> | undefined {
  return store.chunks[Math.floor(index / FORM_FIELD_CHUNK_SIZE)]?.[
    index % FORM_FIELD_CHUNK_SIZE
  ];
}

function getStoredField<ID extends StableID>(
  store: FormFieldStore<ID>,
  id: ID,
): Field<ID> | undefined {
  const index = store.indexByID.get(id);
  return index === undefined ? undefined : fieldAt(store, index);
}

function materializeFields<ID extends StableID>(
  store: FormFieldStore<ID>,
): readonly Field<ID>[] {
  const cached = fieldProjectionCache.get(store as object);
  if (cached !== undefined) return cached as readonly Field<ID>[];
  const fields = Object.freeze(store.chunks.flatMap((chunk) => chunk));
  fieldProjectionCache.set(store as object, fields as readonly Field<StableID>[]);
  return fields;
}

function replaceStoredFields<ID extends StableID>(
  store: FormFieldStore<ID>,
  replacements: ReadonlyMap<ID, Field<ID>>,
): FormFieldStore<ID> {
  if (replacements.size === 0) return store;
  const chunks = [...store.chunks];
  const copiedChunks = new Set<number>();
  for (const [id, field] of replacements) {
    const index = store.indexByID.get(id);
    if (index === undefined) continue;
    const chunkIndex = Math.floor(index / FORM_FIELD_CHUNK_SIZE);
    if (!copiedChunks.has(chunkIndex)) {
      chunks[chunkIndex] = [...chunks[chunkIndex]!];
      copiedChunks.add(chunkIndex);
    }
    (chunks[chunkIndex] as Field<ID>[])[index % FORM_FIELD_CHUNK_SIZE] = field;
  }
  return createFieldStoreFromChunks(store, chunks, replacements);
}

function createFieldStoreFromChunks<ID extends StableID>(
  previous: FormFieldStore<ID>,
  chunks: readonly (readonly Field<ID>[])[],
  replacements: ReadonlyMap<ID, Field<ID>>,
): FormFieldStore<ID> {
  const issueOwnerChanges = new Map<StableID, ID | typeof deletedIndexValue>();
  const fieldIDsBySource = new Map(previous.fieldIDsBySource);
  const touchedSources = new Set<IssueSource>();
  let touchedCount = previous.touchedCount;
  let dirtyCount = previous.dirtyCount;
  let invalidCount = previous.invalidCount;
  let pathOwners = previous.pathOwners;
  for (const [id, next] of replacements) {
    const current = getStoredField(previous, id);
    if (current === undefined || current === next) continue;
    if (current.name !== next.name && pathOwners === previous.pathOwners) pathOwners = { queried: false, root: null };
    touchedCount += Number(next.touched) - Number(current.touched);
    dirtyCount += Number(next.dirty) - Number(current.dirty);
    invalidCount += Number(!next.valid) - Number(!current.valid);
    for (const issue of current.issues) {
      issueOwnerChanges.set(issue.id, deletedIndexValue);
      touchedSources.add(issue.source);
    }
    for (const issue of current.relatedIssues) touchedSources.add(issue.source);
  }
  for (const [id, next] of replacements) {
    const current = getStoredField(previous, id);
    if (current === undefined || current === next) continue;
    for (const issue of next.issues) {
      issueOwnerChanges.set(issue.id, id);
      touchedSources.add(issue.source);
    }
    for (const issue of next.relatedIssues) touchedSources.add(issue.source);
  }
  for (const source of touchedSources) {
    const add: ID[] = [];
    const remove: ID[] = [];
    for (const [id, next] of replacements) {
      const current = getStoredField(previous, id);
      if (current !== undefined && fieldHasIssueSource(current, source)) remove.push(id);
      if (fieldHasIssueSource(next, source)) add.push(id);
    }
    const current = fieldIDsBySource.get(source) ?? FormDeltaSet.from<ID>([]);
    fieldIDsBySource.set(source, current.update(add, remove));
  }
  return Object.freeze({
    size: previous.size,
    pathOwners,
    chunks: Object.freeze(chunks.map((chunk) => Object.freeze(chunk))),
    indexByID: previous.indexByID,
    issueOwnerByID: previous.issueOwnerByID.update(issueOwnerChanges),
    fieldIDsBySource,
    touchedCount,
    dirtyCount,
    invalidCount,
  });
}

function fieldHasIssueSource<ID extends StableID>(
  field: Field<ID>,
  source: IssueSource,
): boolean {
  return field.issues.some((issue) => issue.source === source)
    || field.relatedIssues.some((issue) => issue.source === source);
}

function buildState<ID extends StableID>(input: {
  readonly validation: Validation;
  readonly submission: Submission;
  readonly fields: readonly Field<ID>[];
  readonly issues: readonly Issue<ID>[];
}, maxOutputNodes = DEFAULT_LIMITS.maxOutputNodes): State<ID> {
  const fields = createFieldStore(input.fields);
  return buildStateFromStores(
    input,
    fields,
    createFormIssueStore(input.issues, fields),
    maxOutputNodes,
  );
}

function buildStateFromStores<ID extends StableID>(
  input: Omit<Parameters<typeof buildState<ID>>[0], 'fields' | 'issues'>,
  fields: FormFieldStore<ID>,
  issues: FormIssueStore<ID>,
  maxOutputNodes: number,
): State<ID> {
  let state!: State<ID>;
  state = Object.freeze({
    ...input,
    touched: fields.touchedCount > 0,
    dirty: fields.dirtyCount > 0,
    valid: issues.allValues.length === 0,
    get fields(): readonly Field<ID>[] {
      return materializeFields(fieldStoreOf(state));
    },
    issues: issues.values,
    allIssues: issues.allValues,
  });
  states.set(state, { fields, issues, maxOutputNodes } as FormStatePrivate<StableID>);
  return state;
}

interface FormStateChanges {
  readonly validation?: Validation;
  readonly submission?: Submission;
}

function deriveState<ID extends StableID>(
  state: State<ID>,
  changes: FormStateChanges = {},
  fields: FormFieldStore<ID> = fieldStoreOf(state),
  issues: FormIssueStore<ID> = issueStoreOf(state),
): State<ID> {
  const validation = changes.validation ?? state.validation;
  const submission = changes.submission ?? state.submission;
  if (
    validation === state.validation
    && submission === state.submission
    && fields === fieldStoreOf(state)
    && issues === issueStoreOf(state)
  ) return state;
  return buildStateFromStores({
    validation,
    submission,
  }, fields, issues, states.get(state)!.maxOutputNodes);
}

function deriveWithIssueProjection<ID extends StableID>(
  state: State<ID>,
  inputFields: readonly Field<ID>[],
  inputGlobalIssues: readonly Issue<ID>[],
  changes: FormStateChanges = {},
): State<ID> {
  const registered = new Set(inputFields.map((field) => field.id));
  const incomingByField = new Map<ID, Issue<ID>[]>();
  const globalIssues: Issue<ID>[] = [];
  for (const issue of inputGlobalIssues) {
    if (issue.fieldId === undefined || !registered.has(issue.fieldId)) {
      globalIssues.push(issue);
      continue;
    }
    const incoming = incomingByField.get(issue.fieldId);
    if (incoming === undefined) incomingByField.set(issue.fieldId, [issue]);
    else incoming.push(issue);
  }
  const frozenGlobalIssues = Object.freeze(globalIssues);
  const directFields = inputFields.map((field) => {
    const incoming = incomingByField.get(field.id) ?? [];
    return fieldWithIssues(
      field,
      Object.freeze([...field.issues, ...incoming]),
      Object.freeze([]),
    );
  });
  const fields = createFieldStore(projectRelatedIssues(directFields, frozenGlobalIssues));
  return deriveState(
    state,
    changes,
    fields,
    createFormIssueStore(frozenGlobalIssues, fields),
  );
}

function deriveWithIncrementalIssueProjection<ID extends StableID>(
  state: State<ID>,
  directReplacements: ReadonlyMap<ID, Field<ID>>,
  globalIssues: readonly Issue<ID>[],
  allIssues: readonly Issue<ID>[],
  affectedFieldIDs: ReadonlySet<ID>,
): State<ID> {
  let fields = replaceStoredFields(fieldStoreOf(state), directReplacements);
  const issues = createFormIssueStore(globalIssues, fields, allIssues);
  const relatedReplacements = new Map<ID, Field<ID>>();
  for (const id of affectedFieldIDs) {
    const field = getStoredField(fields, id);
    if (field === undefined) continue;
    const relatedIssues = Object.freeze(
      (issues.relatedIssueIDsByField.get(id) ?? []).flatMap((issueID) => {
        const issue = issues.allByID.get(issueID);
        return issue === undefined ? [] : [issue];
      }),
    );
    const next = fieldWithIssues(field, field.issues, relatedIssues);
    if (next !== field) relatedReplacements.set(id, next);
  }
  fields = replaceStoredFields(fields, relatedReplacements);
  return deriveState(state, {}, fields, issues);
}

function collectIssueFieldIDs<ID extends StableID>(
  issues: readonly Issue<ID>[],
): Set<ID> {
  const ids = new Set<ID>();
  for (const issue of issues) {
    if (issue.fieldId !== undefined) ids.add(issue.fieldId);
    for (const id of issue.relatedFieldIds ?? []) ids.add(id);
  }
  return ids;
}

function requireValidationGeneration<ID extends StableID>(
  state: State<ID>,
  generation: number,
): Result<true> {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    return fail(
      'transition-rejection',
      'form-validation-generation-invalid',
      'Validation generation must be a positive safe integer.',
    );
  }
  if (state.validation.status !== 'validating' || generation !== state.validation.generation) {
    return fail(
      'transition-rejection',
      'form-validation-generation-stale',
      'Validation result does not belong to the active generation.',
      { generation, currentGeneration: state.validation.generation },
    );
  }
  return ok(true);
}

function requireSubmissionGeneration<ID extends StableID>(
  state: State<ID>,
  generation: number,
): Result<true> {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    return fail(
      'transition-rejection',
      'form-submission-generation-invalid',
      'Submission generation must be a positive safe integer.',
    );
  }
  if (generation !== state.submission.generation) {
    return fail(
      'transition-rejection',
      'form-submission-generation-stale',
      'Submission result does not belong to the active generation.',
      { generation, currentGeneration: state.submission.generation },
    );
  }
  return ok(true);
}

function orderedIssues<ID extends StableID>(state: State<ID>): readonly Issue<ID>[] {
  return state.allIssues;
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
  const next = deriveState(state, {}, fields, createFormIssueStore(globalIssues, fields));
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

function fieldWithIssues<ID extends StableID>(
  field: Field<ID>,
  issues: readonly Issue<ID>[],
  relatedIssues: readonly Issue<ID>[] = field.relatedIssues,
): Field<ID> {
  const valid = issues.length === 0 && relatedIssues.length === 0;
  if (
    valid === field.valid
    && sameIssues(field.issues, issues)
    && sameIssues(field.relatedIssues, relatedIssues)
  ) return field;
  return Object.freeze({
    id: field.id,
    name: field.name,
    touched: field.touched,
    dirty: field.dirty,
    valid,
    issues,
    relatedIssues,
  });
}

function sameIssue<ID extends StableID>(
  left: Issue<ID>,
  right: Issue<ID>,
): boolean {
  return left.id === right.id
    && left.message === right.message
    && left.source === right.source
    && left.fieldId === right.fieldId
    && sameIDs(left.relatedFieldIds ?? [], right.relatedFieldIds ?? []);
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left === right || (
    left.length === right.length
    && left.every((id, index) => id === right[index])
  );
}

function sameIssues<ID extends StableID>(
  left: readonly Issue<ID>[],
  right: readonly Issue<ID>[],
): boolean {
  return left === right || (
    left.length === right.length
    && left.every((issue, index) => sameIssue(issue, right[index]!))
  );
}

function sameField<ID extends StableID>(
  left: Field<ID>,
  right: Field<ID>,
): boolean {
  return left === right || (
    left.id === right.id
    && left.name === right.name
    && left.touched === right.touched
    && left.dirty === right.dirty
    && left.valid === right.valid
    && sameIssues(left.issues, right.issues)
    && sameIssues(left.relatedIssues, right.relatedIssues)
  );
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

function firstInvalidField<ID extends StableID>(
  store: FormFieldStore<ID>,
): Field<ID> | undefined {
  for (const chunk of store.chunks) {
    for (const field of chunk) if (!field.valid) return field;
  }
  return undefined;
}

function firstIssueFocusField<ID extends StableID>(
  store: FormFieldStore<ID>,
  issues: readonly Issue<ID>[],
): Field<ID> | undefined {
  let primaryIndex = Number.POSITIVE_INFINITY;
  let primaryField: Field<ID> | undefined;
  for (const issue of issues) {
    if (issue.fieldId === undefined) continue;
    const index = store.indexByID.get(issue.fieldId);
    if (index === undefined || index >= primaryIndex) continue;
    const primary = getStoredField(store, issue.fieldId);
    if (primary === undefined || primary.valid) continue;
    primaryIndex = index;
    primaryField = primary;
  }
  if (primaryField !== undefined) return primaryField;
  let relatedIndex = Number.POSITIVE_INFINITY;
  let relatedField: Field<ID> | undefined;
  for (const issue of issues) {
    for (const id of issue.relatedFieldIds ?? []) {
      const index = store.indexByID.get(id);
      if (index === undefined || index >= relatedIndex) continue;
      const field = getStoredField(store, id);
      if (field === undefined || field.valid) continue;
      relatedIndex = index;
      relatedField = field;
    }
  }
  return relatedField ?? firstInvalidField(store);
}

function update<ID extends StableID>(
  state: State<ID>,
  commands: readonly Command<ID>[] = [],
): Result<Update<ID>> {
  return createMachineUpdate<State<ID>, Command<ID>, FormErrorCode>(
    state,
    commands,
  ) as Result<CoreFormUpdate<ID>>;
}

function validateFormFieldID<ID extends StableID>(id: ID): Result<true> {
  if (typeof id === 'string' && id.trim().length === 0) {
    return fail(
      'construction',
      'form-field-id-empty',
      'Form field identifiers must not be empty.',
    );
  }
  const error = validateStableID(id);
  if (error === null) return ok(true);
  if (error.code === 'empty-id') {
    return fail(
      'construction',
      'form-field-id-empty',
      'Form field identifiers must not be empty.',
    );
  }
  return fail(
    error.class,
    'form-field-id-invalid',
    'Form field identifiers must be valid stable IDs.',
    error.details,
  );
}

function fieldIdentityError(code: string): Result<never> {
  if (code === 'duplicate-id') {
    return fail(
      'construction',
      'form-field-id-duplicate',
      'Form field identifiers must be unique.',
    );
  }
  if (code === 'empty-id') {
    return fail(
      'construction',
      'form-field-id-empty',
      'Form field identifiers must not be empty.',
    );
  }
  return fail(
    'construction',
    'form-field-id-invalid',
    'Form field identifiers must be valid stable IDs.',
  );
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

function createValidationState(
  generation: number,
  status: ValidationStatus,
  trigger: ValidationTrigger | null,
  intent: ValidationIntent | null,
): Validation {
  return status === 'idle'
    ? Object.freeze({ generation, status, trigger: null, intent: null })
    : Object.freeze({
        generation,
        status,
        trigger: trigger as ValidationTrigger,
        intent: intent as ValidationIntent,
      });
}

function createSubmissionState(
  generation: number,
  status: SubmissionStatus,
  count: number,
  failure: SubmissionFailure | null,
): Submission {
  return status === 'failed'
    ? Object.freeze({ generation, status, count, failure })
    : Object.freeze({ generation, status, count, failure: null });
}

function normalizeSubmissionFailure(
  input: SubmissionFailure | null,
): Result<SubmissionFailure | null> {
  if (input === null) return ok(null);
  if (
    typeof input !== 'object'
    || typeof input.message !== 'string'
    || input.message.trim().length === 0
  ) {
    return fail(
      'construction',
      'form-submission-failure-invalid',
      'A Form submission failure message must not be empty.',
    );
  }
  return ok(Object.freeze({ message: input.message.trim() }));
}

function isValidationStatus(value: string): value is ValidationStatus {
  return value === 'idle'
    || value === 'validating'
    || value === 'valid'
    || value === 'invalid';
}

function isSubmissionStatus(value: string): value is SubmissionStatus {
  return value === 'idle'
    || value === 'submitting'
    || value === 'succeeded'
    || value === 'failed';
}

function isValidationTrigger(value: string): value is ValidationTrigger {
  return value === 'input' || value === 'blur' || value === 'submit';
}

function isValidationIntent(value: string): value is ValidationIntent {
  return value === 'interaction' || value === 'submission';
}

function isIssueSource(value: string): value is IssueSource {
  return value === 'native'
    || value === 'field'
    || value === 'form'
    || value === 'validate'
    || value === 'schema'
    || value === 'server';
}
