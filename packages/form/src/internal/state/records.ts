import type { FormResult as Result } from '../../error.js';
import { exceeded } from '../construction/limits.js';
import { fail, ok } from '../result.js';
import type { Field, FieldInput, Issue, IssueSource } from './contracts.js';
import type { StableID } from '@sectile/core';
import { tryNormalizeStableIDs, validateStableID } from '@sectile/core/identity';

export function snapshotIssueInputs<ID extends StableID>(
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

export function snapshotFieldInput<ID extends StableID>(input: FieldInput<ID>): Result<FieldInput<ID>> {
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

export function normalizeField<ID extends StableID>(
  input: FieldInput<ID>,
  validateID = true,
): Result<Field<ID>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('construction', 'form-state-input-invalid', 'Every Form field input must be an object.');
  }
  if (validateID) {
    const identity = validateFieldID(input.id);
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

export function normalizeIssues<ID extends StableID>(
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

export function issueOutputNodes<ID extends StableID>(issues: readonly Issue<ID>[], source?: IssueSource): number {
  let nodes = 0;
  for (const issue of issues) {
    if (source === undefined || issue.source === source) nodes += 1 + (issue.relatedFieldIds?.length ?? 0);
  }
  return nodes;
}

export function reserveIssueRelations<ID extends StableID>(input: readonly Issue<ID>[], nodes: number, ceiling: number): Result<number> {
  if (nodes > ceiling) return exceeded('form-output-node-ceiling-exceeded', nodes, ceiling);
  for (const issue of input) {
    const relations = issue.relatedFieldIds?.length ?? 0;
    if (relations > ceiling - nodes) return exceeded('form-output-node-ceiling-exceeded', nodes + relations, ceiling);
    nodes += relations;
  }
  return ok(nodes);
}

export function fieldWithIssues<ID extends StableID>(
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

export function sameIssues<ID extends StableID>(
  left: readonly Issue<ID>[],
  right: readonly Issue<ID>[],
): boolean {
  return left === right || (
    left.length === right.length
    && left.every((issue, index) => sameIssue(issue, right[index]!))
  );
}

export function sameField<ID extends StableID>(
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

function validateFieldID<ID extends StableID>(id: ID): Result<true> {
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

export function fieldIdentityError(code: string): Result<never> {
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

function isIssueSource(value: string): value is IssueSource {
  return value === 'native'
    || value === 'field'
    || value === 'form'
    || value === 'validate'
    || value === 'schema'
    || value === 'server';
}
