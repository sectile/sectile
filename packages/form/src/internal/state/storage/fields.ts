import type { Field, IssueSource } from '../contracts.js';
import { deleted, DeltaIndex, DeltaSet } from './delta.js';
import type { StableID } from '@sectile/core';

const CHUNK_SIZE = 64;

export interface PathOwnerNode<ID extends StableID> {
  owner: ID | null;
  children: Map<string, PathOwnerNode<ID>> | null;
}

interface PathOwnerCache<ID extends StableID> {
  queried: boolean;
  root: PathOwnerNode<ID> | null;
}

export interface FieldStore<ID extends StableID> {
  readonly size: number;
  readonly pathOwners: PathOwnerCache<ID>;
  readonly chunks: readonly (readonly Field<ID>[])[];
  readonly indexByID: ReadonlyMap<ID, number>;
  readonly issueOwnerByID: DeltaIndex<StableID, ID>;
  readonly fieldIDsBySource: ReadonlyMap<IssueSource, DeltaSet<ID>>;
  readonly touchedCount: number;
  readonly dirtyCount: number;
  readonly invalidCount: number;
}

const projections = new WeakMap<object, readonly Field<StableID>[]>();

export function createFieldStore<ID extends StableID>(
  fields: readonly Field<ID>[],
): FieldStore<ID> {
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
    if (index % CHUNK_SIZE === 0) chunks.push([]);
    (chunks[chunks.length - 1] as Field<ID>[]).push(field);
  }
  const fieldIDsBySource = new Map<IssueSource, DeltaSet<ID>>();
  for (const [source, ids] of mutableIDsBySource) {
    fieldIDsBySource.set(source, DeltaSet.from(ids));
  }
  return Object.freeze({
    size: fields.length,
    pathOwners: { queried: false, root: null },
    chunks: Object.freeze(chunks.map((chunk) => Object.freeze(chunk))),
    indexByID,
    issueOwnerByID: DeltaIndex.from(issueOwnerByID),
    fieldIDsBySource,
    touchedCount,
    dirtyCount,
    invalidCount,
  });
}

function fieldAt<ID extends StableID>(
  store: FieldStore<ID>,
  index: number,
): Field<ID> | undefined {
  return store.chunks[Math.floor(index / CHUNK_SIZE)]?.[
    index % CHUNK_SIZE
  ];
}

export function getStoredField<ID extends StableID>(
  store: FieldStore<ID>,
  id: ID,
): Field<ID> | undefined {
  const index = store.indexByID.get(id);
  return index === undefined ? undefined : fieldAt(store, index);
}

export function materializeFields<ID extends StableID>(
  store: FieldStore<ID>,
): readonly Field<ID>[] {
  const cached = projections.get(store as object);
  if (cached !== undefined) return cached as readonly Field<ID>[];
  const fields = Object.freeze(store.chunks.flatMap((chunk) => chunk));
  projections.set(store as object, fields as readonly Field<StableID>[]);
  return fields;
}

export function replaceStoredFields<ID extends StableID>(
  store: FieldStore<ID>,
  replacements: ReadonlyMap<ID, Field<ID>>,
): FieldStore<ID> {
  if (replacements.size === 0) return store;
  const chunks = [...store.chunks];
  const copiedChunks = new Set<number>();
  for (const [id, field] of replacements) {
    const index = store.indexByID.get(id);
    if (index === undefined) continue;
    const chunkIndex = Math.floor(index / CHUNK_SIZE);
    if (!copiedChunks.has(chunkIndex)) {
      chunks[chunkIndex] = [...chunks[chunkIndex]!];
      copiedChunks.add(chunkIndex);
    }
    (chunks[chunkIndex] as Field<ID>[])[index % CHUNK_SIZE] = field;
  }
  return createFieldStoreFromChunks(store, chunks, replacements);
}

function createFieldStoreFromChunks<ID extends StableID>(
  previous: FieldStore<ID>,
  chunks: readonly (readonly Field<ID>[])[],
  replacements: ReadonlyMap<ID, Field<ID>>,
): FieldStore<ID> {
  const issueOwnerChanges = new Map<StableID, ID | typeof deleted>();
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
      issueOwnerChanges.set(issue.id, deleted);
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
    const current = fieldIDsBySource.get(source) ?? DeltaSet.from<ID>([]);
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
