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
  | { readonly type: 'reinitialize'; readonly options?: FormReinitializeOptions }
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

type CoreFormUpdate<ID extends StableID> = MachineUpdate<FormState<ID>, FormCommand<ID>>;

const FORM_FIELD_CHUNK_SIZE = 64;
const FORM_INDEX_OVERLAY_LIMIT = 32;
const deletedIndexValue = Symbol('form-index-deleted');

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
}

const formStatePrivate = new WeakMap<object, FormStatePrivate<StableID>>();
const fieldProjectionCache = new WeakMap<object, readonly FormFieldState<StableID>[]>();

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
      return update(deriveState(state, { submissionStatus: 'submitting' }));
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
      const cleared = withoutIssueSource(state, 'server');
      return update(deriveState(cleared, { submissionStatus: 'succeeded' }));
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
  if (current !== undefined) {
    return update(deriveState(
      state,
      {},
      replaceStoredFields(store, new Map([[input.id, normalized.value]])),
    ));
  }
  return update(deriveState(
    state,
    {},
    createFieldStore([...materializeFields(store), normalized.value]),
  ));
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
  return update(deriveState(
    state,
    {},
    createFieldStore(materializeFields(store).filter((field) => field.id !== id)),
  ));
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
  return update(deriveState(
    state,
    {},
    replaceStoredFields(fieldStoreOf(state), new Map([[id, field]])),
  ));
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
  return update(deriveState(state, {}, createFieldStore(fields)));
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
  const nextIssueStore = sameIssues(issueStore.values, globalIssues)
    ? issueStore
    : createFormIssueStore(globalIssues);
  if (replacements.size === 0 && nextIssueStore === issueStore) return update(state);
  return update(deriveState(
    state,
    {},
    replaceStoredFields(store, replacements),
    nextIssueStore,
  ));
}

function invalidateValidation<ID extends StableID>(
  state: FormState<ID>,
): Result<FormUpdate<ID>> {
  if (state.validationStatus === 'idle' && state.submissionStatus === 'idle') {
    return update(state);
  }
  return update(deriveState(state, {
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
  return update(deriveState(current, {
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
  const completed = deriveState(state, {
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
      deriveState(completed, { submissionGeneration }),
      [{ type: 'submit-requested', generation: submissionGeneration }],
    );
  }
  const allIssues = orderedIssues(completed);
  const firstInvalid = firstInvalidField(fieldStoreOf(completed));
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
  const failed = deriveState(replaced.value.state, { submissionStatus: 'failed' });
  const ordered = orderedIssues(failed);
  const firstInvalid = firstInvalidField(fieldStoreOf(failed));
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
  const fields = materializeFields(fieldStoreOf(state)).map((field) => Object.freeze({
    ...field,
    touched: false,
    dirty: false,
    valid: true,
    issues: Object.freeze([]) as readonly FormIssue<ID>[],
  }));
  return update(
    deriveState(state, {
      validationStatus: 'idle',
      validationTrigger: null,
      validationIntent: null,
      submissionStatus: 'idle',
      submitCount: 0,
      submitted: false,
    }, createFieldStore(fields), createFormIssueStore([])),
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
    return Object.freeze({
      ...field,
      touched: preserveTouched ? field.touched : false,
      dirty: false,
      valid: issues.length === 0,
      issues,
    });
  });
  return update(deriveState(state, {
    validationStatus: preserveValidation ? state.validationStatus : 'idle',
    validationTrigger: preserveValidation ? state.validationTrigger : null,
    validationIntent: preserveValidation ? state.validationIntent : null,
    submissionStatus: preserveSubmission ? state.submissionStatus : 'idle',
    submitCount: preserveSubmission ? state.submitCount : 0,
    submitted: preserveSubmission ? state.submitted : false,
  }, createFieldStore(fields), createFormIssueStore(state.issues.filter(keepIssue))));
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
  return Object.freeze({ values, byID, bySource });
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
  }
  for (const [id, next] of replacements) {
    const current = getStoredField(previous, id);
    if (current === undefined || current === next) continue;
    for (const issue of next.issues) {
      issueOwnerChanges.set(issue.id, id);
      touchedSources.add(issue.source);
    }
  }
  for (const source of touchedSources) {
    const add: ID[] = [];
    const remove: ID[] = [];
    for (const [id, next] of replacements) {
      const current = getStoredField(previous, id);
      if (current?.issues.some((issue) => issue.source === source) === true) remove.push(id);
      if (next.issues.some((issue) => issue.source === source)) add.push(id);
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
  return buildStateFromStores(
    input,
    createFieldStore(input.fields),
    createFormIssueStore(input.issues),
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
    valid: issues.values.length === 0 && fields.invalidCount === 0,
    get fields(): readonly FormFieldState<ID>[] {
      return materializeFields(fieldStoreOf(state));
    },
    issues: issues.values,
  });
  formStatePrivate.set(state, { fields, issues } as FormStatePrivate<StableID>);
  return state;
}

type FormStateChanges = Partial<Pick<FormState,
  | 'validationGeneration'
  | 'validationStatus'
  | 'validationTrigger'
  | 'validationIntent'
  | 'submissionGeneration'
  | 'submissionStatus'
  | 'submitCount'
  | 'submitted'
>>;

function deriveState<ID extends StableID>(
  state: FormState<ID>,
  changes: FormStateChanges = {},
  fields: FormFieldStore<ID> = fieldStoreOf(state),
  issues: FormIssueStore<ID> = issueStoreOf(state),
): FormState<ID> {
  return buildStateFromStores({
    validationGeneration: changes.validationGeneration ?? state.validationGeneration,
    validationStatus: changes.validationStatus ?? state.validationStatus,
    validationTrigger: changes.validationTrigger === undefined
      ? state.validationTrigger
      : changes.validationTrigger,
    validationIntent: changes.validationIntent === undefined
      ? state.validationIntent
      : changes.validationIntent,
    submissionGeneration: changes.submissionGeneration ?? state.submissionGeneration,
    submissionStatus: changes.submissionStatus ?? state.submissionStatus,
    submitCount: changes.submitCount ?? state.submitCount,
    submitted: changes.submitted ?? state.submitted,
  }, fields, issues);
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

function orderedIssues<ID extends StableID>(state: FormState<ID>): readonly FormIssue<ID>[] {
  const issues: FormIssue<ID>[] = [];
  for (const chunk of fieldStoreOf(state).chunks) {
    for (const field of chunk) issues.push(...field.issues);
  }
  issues.push(...state.issues);
  return issues;
}

function withoutIssueSource<ID extends StableID>(
  state: FormState<ID>,
  source: FormIssueSource,
): FormState<ID> {
  const store = fieldStoreOf(state);
  const replacements = new Map<ID, FormFieldState<ID>>();
  for (const id of store.fieldIDsBySource.get(source)?.values() ?? []) {
    const current = getStoredField(store, id);
    if (current !== undefined) {
      replacements.set(current.id, fieldWithIssues(
        current,
        Object.freeze(current.issues.filter((issue) => issue.source !== source)),
      ));
    }
  }
  const issueStore = issueStoreOf(state);
  const nextIssues = issueStore.bySource.has(source)
    ? createFormIssueStore(issueStore.values.filter((issue) => issue.source !== source))
    : issueStore;
  if (replacements.size === 0 && nextIssues === issueStore) return state;
  return deriveState(state, {}, replaceStoredFields(store, replacements), nextIssues);
}

function fieldWithIssues<ID extends StableID>(
  field: FormFieldState<ID>,
  issues: readonly FormIssue<ID>[],
): FormFieldState<ID> {
  return Object.freeze({
    id: field.id,
    name: field.name,
    touched: field.touched,
    dirty: field.dirty,
    valid: issues.length === 0,
    issues,
  });
}

function sameIssue<ID extends StableID>(
  left: FormIssue<ID>,
  right: FormIssue<ID>,
): boolean {
  return left.id === right.id
    && left.message === right.message
    && left.source === right.source
    && left.fieldId === right.fieldId;
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
