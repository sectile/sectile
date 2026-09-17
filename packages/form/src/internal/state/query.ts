import { encodeSegments, type Path, tryCreateFormFieldPath } from '../construction/path.js';
import type { Field, Issue, IssueSource, State } from './contracts.js';
import { type FieldStore, getStoredField, type PathOwnerNode } from './storage/fields.js';
import { emptyIssues, type IssueStore } from './storage/issues.js';
import { states } from './storage/snapshot.js';
import type { StableID } from '@sectile/core';

function ownsIssuePath(fieldName: string, issueName: string): boolean {
  return issueName === fieldName
    || issueName.startsWith(`${fieldName}.`)
    || issueName.startsWith(`${fieldName}[`);
}

export function getFormField<ID extends StableID>(
  state: State<ID>,
  id: ID,
): Field<ID> | null {
  const privateState = states.get(state);
  if (privateState === undefined) {
    return state.fields.find((field) => field.id === id) ?? null;
  }
  return getStoredField(privateState.fields as FieldStore<ID>, id) ?? null;
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
  const store = privateState.fields as FieldStore<ID>;
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

function createPathOwnerIndex<ID extends StableID>(chunks: readonly (readonly Field<ID>[])[]): PathOwnerNode<ID> {
  const root: PathOwnerNode<ID> = { owner: null, children: null };
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
  const store = states.get(state)?.issues as IssueStore<ID> | undefined;
  if (store !== undefined) {
    return store.allBySource.get(source)
      ?? emptyIssues as readonly Issue<ID>[];
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
  const fields = privateState.fields as FieldStore<ID>;
  return Object.freeze(Array.from(fields.fieldIDsBySource.get(source)?.values() ?? []));
}

export function orderedIssues<ID extends StableID>(state: State<ID>): readonly Issue<ID>[] {
  return state.allIssues;
}

function firstInvalidField<ID extends StableID>(
  store: FieldStore<ID>,
): Field<ID> | undefined {
  for (const chunk of store.chunks) {
    for (const field of chunk) if (!field.valid) return field;
  }
  return undefined;
}

export function firstIssueFocusField<ID extends StableID>(
  store: FieldStore<ID>,
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
