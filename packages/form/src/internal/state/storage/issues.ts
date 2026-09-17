import type { Issue, IssueSource } from '../contracts.js';
import { issueOutputNodes } from '../records.js';
import { deleted, DeltaIndex } from './delta.js';
import { type FieldStore, materializeFields } from './fields.js';
import type { StableID } from '@sectile/core';

export const emptyIssues = Object.freeze([]) as readonly Issue<StableID>[];

export interface IssueStore<ID extends StableID> {
  readonly outputNodes: number;
  readonly values: readonly Issue<ID>[];
  readonly byID: ReadonlyMap<StableID, Issue<ID>>;
  readonly bySource: ReadonlyMap<IssueSource, readonly Issue<ID>[]>;
  readonly allValues: readonly Issue<ID>[];
  readonly allByID: DeltaIndex<StableID, Issue<ID>>;
  readonly allBySource: ReadonlyMap<IssueSource, readonly Issue<ID>[]>;
  readonly relatedIssueIDsByField: ReadonlyMap<ID, readonly StableID[]>;
  readonly serverIssueIDsByField: ReadonlyMap<ID, readonly StableID[]>;
}

export function createIssueStore<ID extends StableID>(
  issues: readonly Issue<ID>[],
  fields: FieldStore<ID>,
  inputAllIssues?: readonly Issue<ID>[],
): IssueStore<ID> {
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
    allByID: DeltaIndex.from(allByID),
    allBySource,
    relatedIssueIDsByField,
    serverIssueIDsByField,
  });
}

export function removeIssues<ID extends StableID>(
  previous: IssueStore<ID>,
  removed: ReadonlySet<StableID>,
  globalIssues: readonly Issue<ID>[],
): IssueStore<ID> {
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
  const allByIDChanges = new Map<StableID, typeof deleted>();
  for (const id of removed) allByIDChanges.set(id, deleted);
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
