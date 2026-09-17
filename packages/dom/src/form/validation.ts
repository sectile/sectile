import { getFormFieldIDByPath, type FormIssue, type FormState, type FormSubmissionFailure } from '@sectile/form/state';
import type { FormFieldPath } from '@sectile/form/path';
import type { StandardSchemaV1 } from '@sectile/form/schema';
import type { StableID } from '@sectile/core';
import type { FormParticipant, FormValidationIssue, FormValidationResult } from './contracts.js';
import { readParticipantName, validationTargets } from './participants.js';

export function collectNativeIssues<ID extends StableID>(
  participants: ReadonlyMap<ID, FormParticipant<ID>>,
): readonly FormIssue<ID>[] {
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
}

export function mapValidationIssues<ID extends StableID>(
  state: FormState<ID>,
  source: 'validate' | 'schema',
  issues: readonly FormValidationIssue[],
): readonly FormIssue<ID>[] {
  return Object.freeze(issues.map((issue, index) => {
    const owner = issue.path === undefined ? null : getFormFieldIDByPath(state, issue.path);
    const relatedFieldIds = resolveRelatedFieldIDs(state, issue.relatedPaths ?? [], owner);
    return Object.freeze({
      id: `${source}:${owner ?? 'form'}:${index}`,
      message: issue.message,
      source,
      ...(owner === null ? {} : { fieldId: owner }),
      ...(relatedFieldIds.length === 0 ? {} : { relatedFieldIds }),
    });
  }));
}

export function resolveRelatedFieldIDs<ID extends StableID>(
  state: FormState<ID>,
  paths: readonly FormFieldPath[],
  owner: ID | null,
): readonly ID[] {
  const ids = new Set<ID>();
  for (const path of paths) {
    const id = getFormFieldIDByPath(state, path);
    if (id !== null && id !== owner) ids.add(id);
  }
  return Object.freeze([...ids]);
}

export function summaryMessage<ID extends StableID>(
  issues: readonly FormIssue<ID>[],
  failure: FormSubmissionFailure | null,
): string {
  return [failure?.message, ...issues.map((issue) => issue.message)]
    .filter((message): message is string => message !== undefined)
    .join(' ');
}

export function validationException(_reason: unknown): FormValidationResult {
  return Object.freeze({
    issues: Object.freeze([{ message: 'Form validation failed.' }]),
  });
}

export function schemaException<Output>(_reason: unknown): StandardSchemaV1.FailureResult {
  return Object.freeze({
    issues: Object.freeze([{ message: 'Schema validation failed.' }]),
  });
}

export function standardSchemaPath(
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

export function orderedIssues<ID extends StableID>(state: FormState<ID>): readonly FormIssue<ID>[] {
  return state.allIssues;
}
