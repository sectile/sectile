import type { StableID } from '@sectile/core';
import { tryNormalizeStableIDs, validateStableID } from '@sectile/core/identity';
import {
  createMachineUpdate,
  type MachineUpdate,
} from '@sectile/core/revision';
import type { FormErrorCode } from '../error.js';
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

export type FormValidationState =
  | {
      readonly generation: number;
      readonly status: 'idle';
      readonly trigger: null;
      readonly intent: null;
    }
  | {
      readonly generation: number;
      readonly status: Exclude<FormValidationStatus, 'idle'>;
      readonly trigger: FormValidationTrigger;
      readonly intent: FormValidationIntent;
    };

export interface FormSubmissionFailure {
  readonly message: string;
}

export type FormSubmissionState =
  | {
      readonly generation: number;
      readonly status: Exclude<FormSubmissionStatus, 'failed'>;
      readonly count: number;
      readonly failure: null;
    }
  | {
      readonly generation: number;
      readonly status: 'failed';
      readonly count: number;
      readonly failure: FormSubmissionFailure | null;
    };

export interface FormReinitializeOptions {
  readonly preserve?: {
    readonly touched?: boolean;
    readonly validation?: boolean;
    readonly submission?: boolean;
  };
}

export interface FormIssue<ID extends StableID = StableID> {
  readonly id: StableID;
  readonly message: string;
  readonly source: FormIssueSource;
  readonly fieldId?: ID;
  readonly relatedFieldIds?: readonly ID[];
}

export interface FormFieldInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly name?: string | null;
  readonly touched?: boolean;
  readonly dirty?: boolean;
  readonly issues?: readonly FormIssue<ID>[];
}

export interface FormFieldMetaInput {
  readonly name?: string | null;
  readonly touched?: boolean;
  readonly dirty?: boolean;
}

export interface FormFieldState<ID extends StableID = StableID> {
  readonly id: ID;
  readonly name: string | null;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly issues: readonly FormIssue<ID>[];
  readonly relatedIssues: readonly FormIssue<ID>[];
}

export interface FormState<ID extends StableID = StableID> {
  readonly validation: FormValidationState;
  readonly submission: FormSubmissionState;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly fields: readonly FormFieldState<ID>[];
  readonly issues: readonly FormIssue<ID>[];
  readonly allIssues: readonly FormIssue<ID>[];
}

export type FormEvent<ID extends StableID = StableID> =
  | { readonly type: 'register-field'; readonly field: FormFieldInput<ID> }
  | { readonly type: 'unregister-field'; readonly id: ID }
  | {
      readonly type: 'set-field-meta';
      readonly id: ID;
      readonly meta: FormFieldMetaInput;
    }
  | {
      readonly type: 'replace-field-issues';
      readonly id: ID;
      readonly source: FormIssueSource;
      readonly issues: readonly FormIssue<ID>[];
    }
  | { readonly type: 'upsert-field-issue'; readonly id: ID; readonly issue: FormIssue<ID> }
  | { readonly type: 'remove-field-issue'; readonly id: ID; readonly issueId: StableID }
  | { readonly type: 'clear-field-issues'; readonly id: ID; readonly source?: FormIssueSource }
  | { readonly type: 'reorder-fields'; readonly ids: readonly ID[] }
  | {
      readonly type: 'replace-issues';
      readonly source: FormIssueSource;
      readonly issues: readonly FormIssue<ID>[];
      readonly generation?: number;
    }
  | { readonly type: 'field-value-changed'; readonly id: ID }
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
  | {
      readonly type: 'submit-failed';
      readonly generation: number;
      readonly failure?: FormSubmissionFailure | null;
      readonly issues?: readonly FormIssue<ID>[];
    }
  | { readonly type: 'reinitialize'; readonly options?: FormReinitializeOptions }
  | 'reset';

export type FormCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus-field'; readonly id: ID }
  | { readonly type: 'announce-summary'; readonly issueIds: readonly StableID[] }
  | { readonly type: 'announce-submission-failure' }
  | { readonly type: 'submit-requested'; readonly generation: number }
  | { readonly type: 'reset-field'; readonly id: ID };

export interface FormUpdate<ID extends StableID = StableID> {
  readonly state: FormState<ID>;
  readonly commands: readonly FormCommand<ID>[];
}

type CoreFormUpdate<ID extends StableID> = MachineUpdate<FormState<ID>, FormCommand<ID>>;

const FORM_FIELD_CHUNK_SIZE = 64;
const FORM_INDEX_OVERLAY_LIMIT = 32;
const deletedIndexValue = Symbol('form-index-deleted');
const emptyFormIssues = Object.freeze([]) as readonly FormIssue<StableID>[];

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

  private constructor(index: FormDeltaIndex<Value, true>, size: number) {
    this.#index = index;
    this.#size = size;
  }

  public static from<Value>(values: Iterable<Value>): FormDeltaSet<Value> {
    const entries = new Map(Array.from(values, (value) => [value, true] as const));
    return new FormDeltaSet(FormDeltaIndex.from(entries), entries.size);
  }

  public update(add: Iterable<Value>, remove: Iterable<Value>): FormDeltaSet<Value> {
    const changes = new Map<Value, true | typeof deletedIndexValue>();
    for (const value of remove) changes.set(value, deletedIndexValue);
    for (const value of add) changes.set(value, true);
    if (changes.size === 0) return this;
    let size = this.#size;
    for (const [value, next] of changes) {
      const contained = this.#index.has(value);
      if (contained && next === deletedIndexValue) size -= 1;
      else if (!contained && next === true) size += 1;
    }
    if (size === 0) return FormDeltaSet.from([]);
    return new FormDeltaSet(this.#index.update(changes), size);
  }

  public values(): IterableIterator<Value> { return this.#index.materialize().keys(); }
}

interface FormFieldStore<ID extends StableID> {
  readonly size: number;
  readonly chunks: readonly (readonly FormFieldState<ID>[])[];
  readonly indexByID: ReadonlyMap<ID, number>;
  readonly issueOwnerByID: FormDeltaIndex<StableID, ID>;
  readonly fieldIDsBySource: ReadonlyMap<FormIssueSource, FormDeltaSet<ID>>;
  readonly touchedCount: number;
  readonly dirtyCount: number;
  readonly invalidCount: number;
}

interface FormStatePrivate<ID extends StableID> {
  readonly fields: FormFieldStore<ID>;
  readonly issues: FormIssueStore<ID>;
}

interface FormIssueStore<ID extends StableID> {
  readonly values: readonly FormIssue<ID>[];
  readonly byID: ReadonlyMap<StableID, FormIssue<ID>>;
  readonly bySource: ReadonlyMap<FormIssueSource, readonly FormIssue<ID>[]>;
  readonly allValues: readonly FormIssue<ID>[];
  readonly allByID: FormDeltaIndex<StableID, FormIssue<ID>>;
  readonly allBySource: ReadonlyMap<FormIssueSource, readonly FormIssue<ID>[]>;
  readonly relatedIssueIDsByField: ReadonlyMap<ID, readonly StableID[]>;
  readonly serverIssueIDsByField: ReadonlyMap<ID, readonly StableID[]>;
}

const formStatePrivate = new WeakMap<object, FormStatePrivate<StableID>>();
const fieldProjectionCache = new WeakMap<object, readonly FormFieldState<StableID>[]>();

export interface FormStateInput<ID extends StableID = StableID> {
  readonly validation?: FormValidationState;
  readonly submission?: FormSubmissionState;
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

function ownsIssuePath(fieldName: string, issueName: string): boolean {
  return issueName === fieldName
    || issueName.startsWith(`${fieldName}.`)
    || issueName.startsWith(`${fieldName}[`);
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
  const validationInput = input.validation ?? {
    generation: 0,
    status: 'idle',
    trigger: null,
    intent: null,
  };
  const submissionInput = input.submission ?? {
    generation: 0,
    status: 'idle',
    count: 0,
    failure: null,
  };
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

  const inputFields = input.fields ?? [];
  const fieldIDs = tryNormalizeStableIDs(inputFields.map((field) => field.id));
  if (!fieldIDs.ok) return fieldIdentityError(fieldIDs.error.code);
  if (fieldIDs.value.some((id) => id.trim().length === 0)) {
    return fieldIdentityError('empty-id');
  }

  const fields: FormFieldState<ID>[] = [];
  for (const inputField of inputFields) {
    const field = normalizeField(inputField, false);
    if (!field.ok) return field;
    fields.push(field.value);
  }

  const issues = normalizeIssues(input.issues ?? [], undefined);
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
  const incomingByField = new Map<ID, FormIssue<ID>[]>();
  const globalIssues: FormIssue<ID>[] = [];
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
  });
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
  state: FormState<ID>,
  id: ID,
): FormFieldState<ID> | null {
  const privateState = formStatePrivate.get(state);
  if (privateState === undefined) {
    return state.fields.find((field) => field.id === id) ?? null;
  }
  return getStoredField(privateState.fields as FormFieldStore<ID>, id) ?? null;
}

export function getFormFieldIDByPath<ID extends StableID>(
  state: FormState<ID>,
  path: FormFieldPath,
): ID | null {
  const normalized = tryCreateFormFieldPath(path);
  if (!normalized.ok) return null;
  const issueName = encodeSegments(normalized.value);
  let owner: FormFieldState<ID> | undefined;
  const privateState = formStatePrivate.get(state);
  const fields = privateState === undefined
    ? state.fields
    : materializeFields(privateState.fields as FormFieldStore<ID>);
  for (const candidate of fields) {
    if (
      candidate.name === null
      || !ownsIssuePath(candidate.name, issueName)
    ) continue;
    if (owner === undefined || candidate.name.length > (owner.name?.length ?? 0)) {
      owner = candidate;
    }
  }
  return owner?.id ?? null;
}

export function getFormIssuesBySource<ID extends StableID>(
  state: FormState<ID>,
  source: FormIssueSource,
): readonly FormIssue<ID>[] {
  const store = formStatePrivate.get(state)?.issues as FormIssueStore<ID> | undefined;
  if (store !== undefined) {
    return store.allBySource.get(source)
      ?? emptyFormIssues as readonly FormIssue<ID>[];
  }
  return Object.freeze(state.allIssues.filter((issue) => issue.source === source));
}

export function getFormFieldIDsByIssueSource<ID extends StableID>(
  state: FormState<ID>,
  source: FormIssueSource,
): readonly ID[] {
  const privateState = formStatePrivate.get(state);
  if (privateState === undefined) {
    return Object.freeze(state.fields
      .filter((field) => field.issues.some((issue) => issue.source === source))
      .map((field) => field.id));
  }
  const fields = privateState.fields as FormFieldStore<ID>;
  return Object.freeze(Array.from(fields.fieldIDsBySource.get(source)?.values() ?? []));
}

export function setFormFieldMeta<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  meta: FormFieldMetaInput,
): Result<FormUpdate<ID>> {
  return applyFormEvent(state, { type: 'set-field-meta', id, meta });
}

export function replaceFormFieldIssues<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  source: FormIssueSource,
  issues: readonly FormIssue<ID>[],
): Result<FormUpdate<ID>> {
  return applyFormEvent(state, { type: 'replace-field-issues', id, source, issues });
}

export function upsertFormFieldIssue<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  issue: FormIssue<ID>,
): Result<FormUpdate<ID>> {
  return applyFormEvent(state, { type: 'upsert-field-issue', id, issue });
}

export function removeFormFieldIssue<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  issueId: StableID,
): Result<FormUpdate<ID>> {
  return applyFormEvent(state, { type: 'remove-field-issue', id, issueId });
}

export function clearFormFieldIssues<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  source?: FormIssueSource,
): Result<FormUpdate<ID>> {
  return applyFormEvent(state, { type: 'clear-field-issues', id, ...(source === undefined ? {} : { source }) });
}

export function applyFormEvent<ID extends StableID>(
  state: FormState<ID>,
  event: FormEvent<ID>,
): Result<FormUpdate<ID>> {
  if (!formStatePrivate.has(state)) {
    const current = tryCreateFormState(state);
    if (!current.ok) {
      return fail('transition-rejection', current.error.code, current.error.message);
    }
    state = current.value;
  }

  if (typeof event !== 'string') {
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
  return reset(state);
}

function registerField<ID extends StableID>(
  state: FormState<ID>,
  input: FormFieldInput<ID>,
): Result<FormUpdate<ID>> {
  const normalized = normalizeField(input);
  if (!normalized.ok) return transitionError(normalized);
  const ownership = validateFieldIssueOwnership(state, normalized.value, input.id);
  if (!ownership.ok) return ownership;
  const store = fieldStoreOf(state);
  const current = getStoredField(store, input.id);
  if (current !== undefined && sameField(current, normalized.value)) return update(state);
  const currentFields = materializeFields(store);
  if (current !== undefined) {
    const next = deriveWithIssueProjection(
      state,
      currentFields.map((field) => field.id === input.id ? normalized.value : field),
      state.issues,
    );
    return update(afterIssueMutation(state, next));
  }
  const next = deriveWithIssueProjection(
    state,
    [...currentFields, normalized.value],
    state.issues,
  );
  return update(afterIssueMutation(state, next));
}

function unregisterField<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
): Result<FormUpdate<ID>> {
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
  return update(afterIssueMutation(state, next));
}

function setFieldMeta<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  meta: FormFieldMetaInput,
): Result<FormUpdate<ID>> {
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
  state: FormState<ID>,
  id: ID,
  source: FormIssueSource,
  input: readonly FormIssue<ID>[],
): Result<FormUpdate<ID>> {
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  if (input.some((issue) => issue.source !== source)) {
    return fail(
      'transition-rejection',
      'form-issue-source-mismatch',
      'Every replacement issue must match the requested source.',
    );
  }
  const normalized = normalizeIssues(input, id);
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
  state: FormState<ID>,
  id: ID,
  input: FormIssue<ID>,
): Result<FormUpdate<ID>> {
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  const normalized = normalizeIssues([input], id);
  if (!normalized.ok) return transitionError(normalized);
  const issue = normalized.value[0]!;
  const index = current.issues.findIndex((candidate) => candidate.id === issue.id);
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
  state: FormState<ID>,
  id: ID,
  issueId: StableID,
): Result<FormUpdate<ID>> {
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
  state: FormState<ID>,
  id: ID,
  source?: FormIssueSource,
): Result<FormUpdate<ID>> {
  const store = fieldStoreOf(state);
  const current = getStoredField(store, id);
  if (current === undefined) return missingField();
  const issues = source === undefined
    ? Object.freeze([]) as readonly FormIssue<ID>[]
    : Object.freeze(current.issues.filter((issue) => issue.source !== source));
  if (issues.length === current.issues.length) return update(state);
  return replaceOneField(state, id, fieldWithIssues(current, issues));
}

function replaceOneField<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
  field: FormFieldState<ID>,
): Result<FormUpdate<ID>> {
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
  state: FormState<ID>,
  ids: readonly ID[],
): Result<FormUpdate<ID>> {
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
  const fields: FormFieldState<ID>[] = [];
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
  const store = fieldStoreOf(state);
  const incomingByField = new Map<ID, FormIssue<ID>[]>();
  const globalIncoming: FormIssue<ID>[] = [];
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
  const replacements = new Map<ID, FormFieldState<ID>>();
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
    ...previousSourceIssues as readonly FormIssue<ID>[],
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
  state: FormState<ID>,
): Result<FormUpdate<ID>> {
  if (state.validation.status === 'idle') return update(state);
  return update(deriveState(state, {
    validation: createValidationState(state.validation.generation, 'idle', null, null),
  }));
}

function fieldValueChanged<ID extends StableID>(
  state: FormState<ID>,
  id: ID,
): Result<FormUpdate<ID>> {
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
    if (issue.fieldId === undefined) removesGlobalIssue = true;
    else affected.add(issue.fieldId);
    for (const relatedID of issue.relatedFieldIds ?? []) affected.add(relatedID);
  }
  const replacements = new Map<ID, FormFieldState<ID>>();
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
  state: FormState<ID>,
  trigger: FormValidationTrigger,
  intent: FormValidationIntent,
): Result<FormUpdate<ID>> {
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
  state: FormState<ID>,
  trigger: FormValidationTrigger,
  intent: FormValidationIntent,
  generation: number,
): Result<FormUpdate<ID>> {
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
  failureInput: FormSubmissionFailure | null,
  issues: readonly FormIssue<ID>[],
): Result<FormUpdate<ID>> {
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
  if (issues.some((issue) => issue.source !== 'server')) {
    return fail(
      'transition-rejection',
      'form-submit-issue-source-invalid',
      'Submit failure issues must use the server source.',
    );
  }
  const failure = normalizeSubmissionFailure(failureInput);
  if (!failure.ok) return transitionError(failure);
  if (failure.value === null && issues.length === 0) {
    return fail(
      'transition-rejection',
      'form-submit-failure-empty',
      'A failed Form submission requires a failure message or server issue.',
    );
  }
  const replaced = replaceIssues(state, 'server', issues);
  if (!replaced.ok) return replaced;
  const issueState = replaced.value.state;
  const failed = deriveState(issueState, {
    ...(issues.length === 0 ? {} : {
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
  const commands: FormCommand<ID>[] = [];
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

function reset<ID extends StableID>(state: FormState<ID>): Result<FormUpdate<ID>> {
  const fields = materializeFields(fieldStoreOf(state)).map((field) => Object.freeze({
    ...field,
    touched: false,
    dirty: false,
    valid: true,
    issues: Object.freeze([]) as readonly FormIssue<ID>[],
    relatedIssues: Object.freeze([]) as readonly FormIssue<ID>[],
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
  state: FormState<ID>,
  options: FormReinitializeOptions = {},
): Result<FormUpdate<ID>> {
  const preserveTouched = options.preserve?.touched === true;
  const preserveValidation = options.preserve?.validation === true;
  const preserveSubmission = options.preserve?.submission === true;
  const keepIssue = (issue: FormIssue<ID>): boolean => (
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

function normalizeField<ID extends StableID>(
  input: FormFieldInput<ID>,
  validateID = true,
): Result<FormFieldState<ID>> {
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
    relatedIssues: Object.freeze([]) as readonly FormIssue<ID>[],
  }));
}

function normalizeIssues<ID extends StableID>(
  input: readonly FormIssue<ID>[],
  fieldId: ID | undefined,
): Result<readonly FormIssue<ID>[]> {
  const ids = tryNormalizeStableIDs(input.map((issue) => issue.id));
  if (!ids.ok) {
    return ids.error.code === 'duplicate-id'
      ? fail('construction', 'form-issue-id-duplicate', 'Form issue identifiers must be unique.')
      : fail(
        'construction',
        'form-issue-invalid',
        'Form issue identifiers and messages must not be empty and IDs must be valid.',
      );
  }
  const issues: FormIssue<ID>[] = [];
  for (const issue of input) {
    if (
      typeof issue.message !== 'string'
      || issue.id.trim().length === 0
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
    const related = tryNormalizeStableIDs(issue.relatedFieldIds ?? []);
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
  fields: readonly FormFieldState<ID>[],
  globalIssues: readonly FormIssue<ID>[],
): readonly FormFieldState<ID>[] {
  const registered = new Set(fields.map((field) => field.id));
  const relatedByField = new Map<ID, FormIssue<ID>[]>();
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
  fields: readonly FormFieldState<ID>[],
): FormFieldStore<ID> {
  const chunks: (readonly FormFieldState<ID>[])[] = [];
  const indexByID = new Map<ID, number>();
  const issueOwnerByID = new Map<StableID, ID>();
  const mutableIDsBySource = new Map<FormIssueSource, Set<ID>>();
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
    (chunks[chunks.length - 1] as FormFieldState<ID>[]).push(field);
  }
  const fieldIDsBySource = new Map<FormIssueSource, FormDeltaSet<ID>>();
  for (const [source, ids] of mutableIDsBySource) {
    fieldIDsBySource.set(source, FormDeltaSet.from(ids));
  }
  return Object.freeze({
    size: fields.length,
    chunks: Object.freeze(chunks.map((chunk) => Object.freeze(chunk))),
    indexByID,
    issueOwnerByID: FormDeltaIndex.from(issueOwnerByID),
    fieldIDsBySource,
    touchedCount,
    dirtyCount,
    invalidCount,
  });
}

function fieldStoreOf<ID extends StableID>(state: FormState<ID>): FormFieldStore<ID> {
  return formStatePrivate.get(state as object)!.fields as FormFieldStore<ID>;
}

function issueStoreOf<ID extends StableID>(state: FormState<ID>): FormIssueStore<ID> {
  return formStatePrivate.get(state as object)!.issues as FormIssueStore<ID>;
}

function createFormIssueStore<ID extends StableID>(
  issues: readonly FormIssue<ID>[],
  fields: FormFieldStore<ID>,
  inputAllIssues?: readonly FormIssue<ID>[],
): FormIssueStore<ID> {
  const values = Object.freeze([...issues]);
  const byID = new Map<StableID, FormIssue<ID>>();
  const mutableBySource = new Map<FormIssueSource, FormIssue<ID>[]>();
  for (const issue of values) {
    byID.set(issue.id, issue);
    let sourceIssues = mutableBySource.get(issue.source);
    if (sourceIssues === undefined) {
      sourceIssues = [];
      mutableBySource.set(issue.source, sourceIssues);
    }
    sourceIssues.push(issue);
  }
  const bySource = new Map<FormIssueSource, readonly FormIssue<ID>[]>();
  for (const [source, sourceIssues] of mutableBySource) {
    bySource.set(source, Object.freeze(sourceIssues));
  }
  const allValues = inputAllIssues === undefined
    ? Object.freeze([
        ...materializeFields(fields).flatMap((field) => field.issues),
        ...values,
      ])
    : Object.freeze([...inputAllIssues]);
  const allByID = new Map<StableID, FormIssue<ID>>();
  const mutableAllBySource = new Map<FormIssueSource, FormIssue<ID>[]>();
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
  const allBySource = new Map<FormIssueSource, readonly FormIssue<ID>[]>();
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
  globalIssues: readonly FormIssue<ID>[],
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
  issues: readonly FormIssue<ID>[],
): ReadonlyMap<FormIssueSource, readonly FormIssue<ID>[]> {
  const mutable = new Map<FormIssueSource, FormIssue<ID>[]>();
  for (const issue of issues) {
    const sourceIssues = mutable.get(issue.source);
    if (sourceIssues === undefined) mutable.set(issue.source, [issue]);
    else sourceIssues.push(issue);
  }
  const grouped = new Map<FormIssueSource, readonly FormIssue<ID>[]>();
  for (const [source, sourceIssues] of mutable) {
    grouped.set(source, Object.freeze(sourceIssues));
  }
  return grouped;
}

function fieldAt<ID extends StableID>(
  store: FormFieldStore<ID>,
  index: number,
): FormFieldState<ID> | undefined {
  return store.chunks[Math.floor(index / FORM_FIELD_CHUNK_SIZE)]?.[
    index % FORM_FIELD_CHUNK_SIZE
  ];
}

function getStoredField<ID extends StableID>(
  store: FormFieldStore<ID>,
  id: ID,
): FormFieldState<ID> | undefined {
  const index = store.indexByID.get(id);
  return index === undefined ? undefined : fieldAt(store, index);
}

function materializeFields<ID extends StableID>(
  store: FormFieldStore<ID>,
): readonly FormFieldState<ID>[] {
  const cached = fieldProjectionCache.get(store as object);
  if (cached !== undefined) return cached as readonly FormFieldState<ID>[];
  const fields = Object.freeze(store.chunks.flatMap((chunk) => chunk));
  fieldProjectionCache.set(store as object, fields as readonly FormFieldState<StableID>[]);
  return fields;
}

function replaceStoredFields<ID extends StableID>(
  store: FormFieldStore<ID>,
  replacements: ReadonlyMap<ID, FormFieldState<ID>>,
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
    (chunks[chunkIndex] as FormFieldState<ID>[])[index % FORM_FIELD_CHUNK_SIZE] = field;
  }
  return createFieldStoreFromChunks(store, chunks, replacements);
}

function createFieldStoreFromChunks<ID extends StableID>(
  previous: FormFieldStore<ID>,
  chunks: readonly (readonly FormFieldState<ID>[])[],
  replacements: ReadonlyMap<ID, FormFieldState<ID>>,
): FormFieldStore<ID> {
  const issueOwnerChanges = new Map<StableID, ID | typeof deletedIndexValue>();
  const fieldIDsBySource = new Map(previous.fieldIDsBySource);
  const touchedSources = new Set<FormIssueSource>();
  let touchedCount = previous.touchedCount;
  let dirtyCount = previous.dirtyCount;
  let invalidCount = previous.invalidCount;
  for (const [id, next] of replacements) {
    const current = getStoredField(previous, id);
    if (current === undefined || current === next) continue;
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
  field: FormFieldState<ID>,
  source: FormIssueSource,
): boolean {
  return field.issues.some((issue) => issue.source === source)
    || field.relatedIssues.some((issue) => issue.source === source);
}

function buildState<ID extends StableID>(input: {
  readonly validation: FormValidationState;
  readonly submission: FormSubmissionState;
  readonly fields: readonly FormFieldState<ID>[];
  readonly issues: readonly FormIssue<ID>[];
}): FormState<ID> {
  const fields = createFieldStore(input.fields);
  return buildStateFromStores(
    input,
    fields,
    createFormIssueStore(input.issues, fields),
  );
}

function buildStateFromStores<ID extends StableID>(
  input: Omit<Parameters<typeof buildState<ID>>[0], 'fields' | 'issues'>,
  fields: FormFieldStore<ID>,
  issues: FormIssueStore<ID>,
): FormState<ID> {
  let state!: FormState<ID>;
  state = Object.freeze({
    ...input,
    touched: fields.touchedCount > 0,
    dirty: fields.dirtyCount > 0,
    valid: issues.allValues.length === 0,
    get fields(): readonly FormFieldState<ID>[] {
      return materializeFields(fieldStoreOf(state));
    },
    issues: issues.values,
    allIssues: issues.allValues,
  });
  formStatePrivate.set(state, { fields, issues } as FormStatePrivate<StableID>);
  return state;
}

interface FormStateChanges {
  readonly validation?: FormValidationState;
  readonly submission?: FormSubmissionState;
}

function deriveState<ID extends StableID>(
  state: FormState<ID>,
  changes: FormStateChanges = {},
  fields: FormFieldStore<ID> = fieldStoreOf(state),
  issues: FormIssueStore<ID> = issueStoreOf(state),
): FormState<ID> {
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
  }, fields, issues);
}

function deriveWithIssueProjection<ID extends StableID>(
  state: FormState<ID>,
  inputFields: readonly FormFieldState<ID>[],
  inputGlobalIssues: readonly FormIssue<ID>[],
  changes: FormStateChanges = {},
): FormState<ID> {
  const registered = new Set(inputFields.map((field) => field.id));
  const incomingByField = new Map<ID, FormIssue<ID>[]>();
  const globalIssues: FormIssue<ID>[] = [];
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
  state: FormState<ID>,
  directReplacements: ReadonlyMap<ID, FormFieldState<ID>>,
  globalIssues: readonly FormIssue<ID>[],
  allIssues: readonly FormIssue<ID>[],
  affectedFieldIDs: ReadonlySet<ID>,
): FormState<ID> {
  let fields = replaceStoredFields(fieldStoreOf(state), directReplacements);
  const issues = createFormIssueStore(globalIssues, fields, allIssues);
  const relatedReplacements = new Map<ID, FormFieldState<ID>>();
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
  issues: readonly FormIssue<ID>[],
): Set<ID> {
  const ids = new Set<ID>();
  for (const issue of issues) {
    if (issue.fieldId !== undefined) ids.add(issue.fieldId);
    for (const id of issue.relatedFieldIds ?? []) ids.add(id);
  }
  return ids;
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

function orderedIssues<ID extends StableID>(state: FormState<ID>): readonly FormIssue<ID>[] {
  return state.allIssues;
}

function withoutIssueSource<ID extends StableID>(
  state: FormState<ID>,
  source: FormIssueSource,
): FormState<ID> {
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
  previous: FormState<ID>,
  next: FormState<ID>,
): FormState<ID> {
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
  field: FormFieldState<ID>,
  issues: readonly FormIssue<ID>[],
  relatedIssues: readonly FormIssue<ID>[] = field.relatedIssues,
): FormFieldState<ID> {
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
  left: FormIssue<ID>,
  right: FormIssue<ID>,
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
  left: readonly FormIssue<ID>[],
  right: readonly FormIssue<ID>[],
): boolean {
  return left === right || (
    left.length === right.length
    && left.every((issue, index) => sameIssue(issue, right[index]!))
  );
}

function sameField<ID extends StableID>(
  left: FormFieldState<ID>,
  right: FormFieldState<ID>,
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
  state: FormState<ID>,
  field: FormFieldState<ID>,
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
  state: FormState<ID>,
  source: FormIssueSource,
  issues: readonly FormIssue<ID>[],
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
): FormFieldState<ID> | undefined {
  for (const chunk of store.chunks) {
    for (const field of chunk) if (!field.valid) return field;
  }
  return undefined;
}

function firstIssueFocusField<ID extends StableID>(
  store: FormFieldStore<ID>,
  issues: readonly FormIssue<ID>[],
): FormFieldState<ID> | undefined {
  for (const issue of issues) {
    if (issue.fieldId === undefined) continue;
    const primary = getStoredField(store, issue.fieldId);
    if (primary !== undefined && !primary.valid) return primary;
  }
  let relatedIndex = Number.POSITIVE_INFINITY;
  let relatedField: FormFieldState<ID> | undefined;
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
  state: FormState<ID>,
  commands: readonly FormCommand<ID>[] = [],
): Result<FormUpdate<ID>> {
  return createMachineUpdate<FormState<ID>, FormCommand<ID>, FormErrorCode>(
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
  status: FormValidationStatus,
  trigger: FormValidationTrigger | null,
  intent: FormValidationIntent | null,
): FormValidationState {
  return status === 'idle'
    ? Object.freeze({ generation, status, trigger: null, intent: null })
    : Object.freeze({
        generation,
        status,
        trigger: trigger as FormValidationTrigger,
        intent: intent as FormValidationIntent,
      });
}

function createSubmissionState(
  generation: number,
  status: FormSubmissionStatus,
  count: number,
  failure: FormSubmissionFailure | null,
): FormSubmissionState {
  return status === 'failed'
    ? Object.freeze({ generation, status, count, failure })
    : Object.freeze({ generation, status, count, failure: null });
}

function normalizeSubmissionFailure(
  input: FormSubmissionFailure | null,
): Result<FormSubmissionFailure | null> {
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

function isIssueSource(value: string): value is FormIssueSource {
  return value === 'native'
    || value === 'field'
    || value === 'form'
    || value === 'validate'
    || value === 'schema'
    || value === 'server';
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
