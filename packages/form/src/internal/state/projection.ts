import type { Field, Issue, State } from './contracts.js';
import { fieldWithIssues, sameIssues } from './records.js';
import { createFieldStore, getStoredField, replaceStoredFields } from './storage/fields.js';
import { createIssueStore } from './storage/issues.js';
import { deriveState, fieldStoreOf, type StateChanges } from './storage/snapshot.js';
import type { StableID } from '@sectile/core';

export function projectRelatedIssues<ID extends StableID>(
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

export function deriveWithIssueProjection<ID extends StableID>(
  state: State<ID>,
  inputFields: readonly Field<ID>[],
  inputGlobalIssues: readonly Issue<ID>[],
  changes: StateChanges = {},
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
    createIssueStore(frozenGlobalIssues, fields),
  );
}

export function deriveWithIncrementalIssueProjection<ID extends StableID>(
  state: State<ID>,
  directReplacements: ReadonlyMap<ID, Field<ID>>,
  globalIssues: readonly Issue<ID>[],
  allIssues: readonly Issue<ID>[],
  affectedFieldIDs: ReadonlySet<ID>,
): State<ID> {
  let fields = replaceStoredFields(fieldStoreOf(state), directReplacements);
  const issues = createIssueStore(globalIssues, fields, allIssues);
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

export function collectIssueFieldIDs<ID extends StableID>(
  issues: readonly Issue<ID>[],
): Set<ID> {
  const ids = new Set<ID>();
  for (const issue of issues) {
    if (issue.fieldId !== undefined) ids.add(issue.fieldId);
    for (const id of issue.relatedFieldIds ?? []) ids.add(id);
  }
  return ids;
}
