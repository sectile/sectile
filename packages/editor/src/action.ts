import { failResult, okResult, type Result } from '@sectile/core/result';
import type { NodeID, PortableContentDocument } from '@sectile/content/document';
import type { ContentLimits } from '@sectile/content/limits';
import type { CompiledContentSchema } from '@sectile/content/schema';
import type { ContentOperation } from '@sectile/content/transform';
import type { EditorErrorCode } from './error.js';
import type { EditorHistoryIntent } from './history.js';
import type { EditorSelection } from './selection.js';

export type EditorOrigin = 'human' | 'agent' | 'system';

export interface EditorActionSessionView {
  readonly document: PortableContentDocument;
  readonly schema: CompiledContentSchema;
  readonly contentLimits: ContentLimits;
  readonly selection: EditorSelection | null;
  readonly revision: number;
  readonly configEpoch: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface EditorTransactionContext {
  readonly view: EditorActionSessionView;
  apply(...operations: readonly ContentOperation[]): void;
  setSelection(selection: EditorSelection | null): void;
  allocateNodeID(): Result<NodeID, EditorErrorCode>;
}

export interface EditorActionDefinition<
  Args,
  Output,
  Code extends string = never,
> {
  readonly id: string;
  readonly historyIntent?: EditorHistoryIntent;
  readonly run: (
    context: EditorTransactionContext,
    args: Args,
  ) => Result<Output, Code>;
}

export interface EditorQueryDefinition<
  Args,
  Output,
  Code extends string = never,
> {
  readonly id: string;
  readonly read: (
    view: EditorActionSessionView,
    args: Args,
  ) => Result<Output, Code>;
}

export type AnyEditorActionDefinition =
  EditorActionDefinition<never, unknown, string>;

export type AnyEditorQueryDefinition =
  EditorQueryDefinition<never, unknown, string>;

export interface EditorActionRegistry {
  readonly actionIDs: readonly string[];
  readonly queryIDs: readonly string[];
  action(id: string): AnyEditorActionDefinition | null;
  query(id: string): AnyEditorQueryDefinition | null;
}

export function defineEditorAction<
  Args,
  Output,
  Code extends string = never,
>(
  definition: EditorActionDefinition<Args, Output, Code>,
): EditorActionDefinition<Args, Output, Code> {
  return Object.freeze(definition);
}

export function defineEditorQuery<
  Args,
  Output,
  Code extends string = never,
>(
  definition: EditorQueryDefinition<Args, Output, Code>,
): EditorQueryDefinition<Args, Output, Code> {
  return Object.freeze(definition);
}

export function createEditorActionRegistry(
  options: {
    readonly actions?: readonly AnyEditorActionDefinition[];
    readonly queries?: readonly AnyEditorQueryDefinition[];
  } = {},
): Result<EditorActionRegistry, EditorErrorCode> {
  const actions = new Map<string, AnyEditorActionDefinition>();
  for (const action of options.actions ?? []) {
    const id = validateDefinitionID(action.id);
    if (!id.ok) return id;
    if (actions.has(action.id)) {
      return failResult(
        'construction',
        'editor-action-duplicate',
        'Editor action IDs must be unique.',
        { id: action.id },
      );
    }
    actions.set(action.id, Object.freeze(action));
  }

  const queries = new Map<string, AnyEditorQueryDefinition>();
  for (const query of options.queries ?? []) {
    const id = validateDefinitionID(query.id);
    if (!id.ok) return id;
    if (queries.has(query.id)) {
      return failResult(
        'construction',
        'editor-query-duplicate',
        'Editor query IDs must be unique.',
        { id: query.id },
      );
    }
    queries.set(query.id, Object.freeze(query));
  }

  return okResult(Object.freeze({
    actionIDs: Object.freeze([...actions.keys()]),
    queryIDs: Object.freeze([...queries.keys()]),
    action: (id: string) => actions.get(id) ?? null,
    query: (id: string) => queries.get(id) ?? null,
  }));
}

function validateDefinitionID(
  id: string,
): Result<true, EditorErrorCode> {
  if (
    typeof id !== 'string'
    || id.length === 0
    || id.length > 255
    || !/^[a-z0-9][a-z0-9._/-]*$/u.test(id)
  ) {
    return failResult(
      'construction',
      'editor-definition-id-invalid',
      'Editor action/query IDs must be bounded lowercase identifiers.',
      { id },
    );
  }
  return okResult(true);
}
