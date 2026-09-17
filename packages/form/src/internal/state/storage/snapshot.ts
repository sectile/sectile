import { DEFAULT_LIMITS } from '../../construction/limits.js';
import type { Field, Issue, State, Submission, Validation } from '../contracts.js';
import { createFieldStore, type FieldStore, materializeFields } from './fields.js';
import { createIssueStore, type IssueStore } from './issues.js';
import type { StableID } from '@sectile/core';

interface StatePrivate<ID extends StableID> {
  readonly fields: FieldStore<ID>;
  readonly issues: IssueStore<ID>;
  readonly maxOutputNodes: number;
}

export const states: WeakMap<object, StatePrivate<StableID>> = new WeakMap();

export function fieldStoreOf<ID extends StableID>(state: State<ID>): FieldStore<ID> {
  return states.get(state as object)!.fields as FieldStore<ID>;
}

export function issueStoreOf<ID extends StableID>(state: State<ID>): IssueStore<ID> {
  return states.get(state as object)!.issues as IssueStore<ID>;
}

export function buildState<ID extends StableID>(input: {
  readonly validation: Validation;
  readonly submission: Submission;
  readonly fields: readonly Field<ID>[];
  readonly issues: readonly Issue<ID>[];
}, maxOutputNodes: number = DEFAULT_LIMITS.maxOutputNodes): State<ID> {
  const fields = createFieldStore(input.fields);
  return buildStateFromStores(
    input,
    fields,
    createIssueStore(input.issues, fields),
    maxOutputNodes,
  );
}

function buildStateFromStores<ID extends StableID>(
  input: Omit<Parameters<typeof buildState<ID>>[0], 'fields' | 'issues'>,
  fields: FieldStore<ID>,
  issues: IssueStore<ID>,
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
  states.set(state, { fields, issues, maxOutputNodes } as StatePrivate<StableID>);
  return state;
}

export interface StateChanges {
  readonly validation?: Validation;
  readonly submission?: Submission;
}

export function deriveState<ID extends StableID>(
  state: State<ID>,
  changes: StateChanges = {},
  fields: FieldStore<ID> = fieldStoreOf(state),
  issues: IssueStore<ID> = issueStoreOf(state),
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
