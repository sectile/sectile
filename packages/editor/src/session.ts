import { validateStableID } from '@sectile/core/identity';
import {
  requireInteraction,
  tryCreateInteractionState,
  type InteractionState,
  type InteractionStateInput,
} from '@sectile/core/interaction';
import {
  failResult,
  okResult,
  type CoreErrorCode,
  type Result,
} from '@sectile/core/result';
import type {
  InlineContentFragment,
  NodeID,
  PortableContentDocument,
} from '@sectile/content/document';
import type { ContentErrorCode } from '@sectile/content/error';
import {
  inlineFragmentNodeIDs,
  prepareInlineFragment,
} from '@sectile/content/fragment';
import { isEqual } from '@sectile/content/helpers';
import {
  contentCeilingExceeded,
  normalizeContentLimits,
  type ContentLimits,
} from '@sectile/content/limits';
import {
  prepareContent,
  replacePreparedText,
  type PreparedContentState,
} from '@sectile/content/prepared';
import type { InlineSurface } from '@sectile/content/position';
import type { DocumentIndex } from '@sectile/content/query';
import type { CompiledContentSchema } from '@sectile/content/schema';
import {
  transformDocument,
  type ContentOperation,
} from '@sectile/content/transform';
import type {
  EditorActionDefinition,
  EditorActionRegistry,
  EditorActionSessionView,
  EditorOrigin,
  EditorQueryDefinition,
  EditorTransactionContext,
} from './action.js';
import { createEditorActionRegistry } from './action.js';
import type { EditorErrorCode } from './error.js';
import {
  breakEditorHistoryCoalescing,
  clearEditorHistory,
  recordEditorHistory,
  redoEditorHistory,
  tryCreateEditorHistory,
  undoEditorHistory,
  type EditorHistoryIntent,
  type EditorHistoryState,
} from './history.js';
import {
  mapEditorSelection,
  resolveEditorTypingMarks,
  sameEditorSelection,
  validateEditorSelection,
  type EditorSelection,
} from './selection.js';

export type EditorSessionErrorCode =
  | EditorErrorCode
  | ContentErrorCode
  | CoreErrorCode;

export type EditorMutationIntent =
  | EditorHistoryIntent
  | 'undo'
  | 'redo';

export interface EditorMutationGuardRequest {
  readonly intent: EditorMutationIntent;
  readonly origin: EditorOrigin;
  readonly previousDocument: PortableContentDocument;
  readonly document: PortableContentDocument;
  readonly operations: readonly ContentOperation[];
  readonly selection: EditorSelection | null;
  readonly revision: number;
  readonly configEpoch: number;
}

export interface EditorAuthoringProfile {
  readonly id: string;
  allows(request: EditorMutationGuardRequest): boolean;
}

export interface EditorApplicationPolicy {
  readonly id: string;
  allows(request: EditorMutationGuardRequest): boolean;
}

export interface EditorSessionSnapshot {
  readonly document: PortableContentDocument;
  readonly schema: CompiledContentSchema;
  readonly contentLimits: ContentLimits;
  readonly index: DocumentIndex;
  readonly selection: EditorSelection | null;
  readonly revision: number;
  readonly configEpoch: number;
  readonly interaction: InteractionState;
  readonly profileID: string | null;
  readonly policyID: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export type EditorSessionEventKind =
  | 'transaction'
  | 'text-edit'
  | 'selection'
  | 'undo'
  | 'redo'
  | 'replace-document'
  | 'replace-schema'
  | 'reconfigure';

export interface EditorSessionEvent {
  readonly kind: EditorSessionEventKind;
  readonly origin: EditorOrigin;
  readonly previous: EditorSessionSnapshot;
  readonly current: EditorSessionSnapshot;
  readonly documentChanged: boolean;
  readonly selectionChanged: boolean;
}

export interface EditorSessionUpdate {
  readonly snapshot: EditorSessionSnapshot;
  readonly documentChanged: boolean;
  readonly selectionChanged: boolean;
  readonly observerErrors: readonly unknown[];
}

export interface EditorExpectedState {
  readonly expectedRevision?: number;
  readonly expectedConfigEpoch?: number;
}

export interface EditorTransactionRequest extends EditorExpectedState {
  readonly operations: readonly ContentOperation[];
  readonly selection?: EditorSelection | null;
  readonly origin?: EditorOrigin;
  readonly historyIntent?: EditorHistoryIntent;
}

export interface EditorTextEditRequest extends EditorExpectedState {
  readonly id: NodeID;
  readonly from: number;
  readonly to: number;
  readonly text: string;
  readonly selection?: EditorSelection | null;
  readonly origin?: EditorOrigin;
  readonly historyIntent?: Extract<
    EditorHistoryIntent,
    'typing' | 'composition' | 'delete-backward' | 'delete-forward' | 'paste'
  >;
}

export interface EditorInlineTextEditRequest extends EditorExpectedState {
  readonly surface: InlineSurface;
  readonly from: number;
  readonly to: number;
  readonly text: string;
  readonly affinity?: 'before' | 'after';
  readonly selection?: EditorSelection | null;
  readonly origin?: EditorOrigin;
  readonly historyIntent?: Extract<
    EditorHistoryIntent,
    'typing' | 'composition' | 'delete-backward' | 'delete-forward' | 'paste'
  >;
}

export interface EditorInlineFragmentInsertRequest extends EditorExpectedState {
  readonly surface: InlineSurface;
  readonly from: number;
  readonly to: number;
  readonly fragment: InlineContentFragment;
  readonly selection?: EditorSelection | null;
  readonly origin?: EditorOrigin;
  readonly historyIntent?: Extract<EditorHistoryIntent, 'paste' | 'command'>;
}

export interface EditorReplaceDocumentOptions extends EditorExpectedState {
  readonly selection?: EditorSelection | null;
  readonly origin?: EditorOrigin;
}

export interface EditorReplaceSchemaOptions extends EditorExpectedState {
  readonly selection?: EditorSelection | null;
  readonly origin?: EditorOrigin;
}

export interface EditorReconfigureOptions extends EditorExpectedState {
  readonly profile?: EditorAuthoringProfile | null;
  readonly policy?: EditorApplicationPolicy | null;
  readonly interaction?: InteractionStateInput;
  readonly origin?: EditorOrigin;
}

export interface EditorActionRunOptions extends EditorExpectedState {
  readonly origin?: EditorOrigin;
}

export interface EditorActionRunResult<Output> {
  readonly value: Output;
  readonly update: EditorSessionUpdate;
}

export interface EditorQueryRunOptions extends EditorExpectedState {}

export type EditorSessionListener = (event: EditorSessionEvent) => void;

export interface EditorSession {
  getSnapshot(): EditorSessionSnapshot;
  subscribe(listener: EditorSessionListener): () => void;
  setSelection(
    selection: EditorSelection | null,
    options?: EditorExpectedState & { readonly origin?: EditorOrigin },
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  transact(
    request: EditorTransactionRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  replaceText(
    request: EditorTextEditRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  replaceInlineText(
    request: EditorInlineTextEditRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  insertInlineFragment(
    request: EditorInlineFragmentInsertRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  undo(
    options?: EditorExpectedState & { readonly origin?: EditorOrigin },
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  redo(
    options?: EditorExpectedState & { readonly origin?: EditorOrigin },
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  replaceDocument(
    document: PortableContentDocument,
    options?: EditorReplaceDocumentOptions,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  replaceSchema(
    schema: CompiledContentSchema,
    document: PortableContentDocument,
    options?: EditorReplaceSchemaOptions,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  reconfigure(
    options: EditorReconfigureOptions,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode>;
  runAction<Args, Output, Code extends string>(
    definition: EditorActionDefinition<Args, Output, Code>,
    args: Args,
    options?: EditorActionRunOptions,
  ): Result<EditorActionRunResult<Output>, EditorSessionErrorCode | Code>;
  runQuery<Args, Output, Code extends string>(
    definition: EditorQueryDefinition<Args, Output, Code>,
    args: Args,
    options?: EditorQueryRunOptions,
  ): Result<Output, EditorSessionErrorCode | Code>;
  destroy(): void;
}

export interface EditorSessionOptions {
  readonly document: PortableContentDocument;
  readonly schema: CompiledContentSchema;
  readonly selection?: EditorSelection | null;
  readonly interaction?: InteractionStateInput;
  readonly historyLimit?: number;
  readonly contentLimits?: Partial<ContentLimits>;
  readonly profile?: EditorAuthoringProfile | null;
  readonly policy?: EditorApplicationPolicy | null;
  readonly actions?: EditorActionRegistry;
  readonly allocateNodeID?: () => NodeID;
}

export function createEditorSession(
  options: EditorSessionOptions,
): Result<EditorSession, EditorSessionErrorCode> {
  const interactionResult = tryCreateInteractionState(options.interaction);
  if (!interactionResult.ok) return interactionResult;

  const limitsResult = normalizeContentLimits(options.contentLimits);
  if (!limitsResult.ok) return limitsResult;
  const contentLimits = limitsResult.value;

  const historyResult = tryCreateEditorHistory(options.historyLimit);
  if (!historyResult.ok) return historyResult;

  const registryResult = options.actions === undefined
    ? createEditorActionRegistry()
    : okResult(options.actions);
  if (!registryResult.ok) return registryResult;

  const initial = snapshotContent(
    options.document,
    options.schema,
    contentLimits,
  );
  if (!initial.ok) return initial;

  const preparedResult = prepareContent(initial.value, options.schema, {
    limits: contentLimits,
  });
  if (!preparedResult.ok) return preparedResult;

  const initialSelection = validateEditorSelection(
    preparedResult.value.document,
    options.schema,
    options.selection ?? null,
    preparedResult.value.index,
  );
  if (!initialSelection.ok) return initialSelection;

  let schema = options.schema;
  let prepared = preparedResult.value;
  let selection = initialSelection.value;
  let interaction = interactionResult.value;
  let history = historyResult.value;
  let profile = options.profile ?? null;
  let policy = options.policy ?? null;
  const actions = registryResult.value;
  const listeners = new Set<EditorSessionListener>();
  let revision = 0;
  let configEpoch = 0;
  let destroyed = false;
  let publishing = false;
  let executingAction = false;

  const getSnapshot = (): EditorSessionSnapshot => Object.freeze({
    document: prepared.document,
    schema,
    contentLimits,
    index: prepared.index,
    selection,
    revision,
    configEpoch,
    interaction,
    profileID: profile?.id ?? null,
    policyID: policy?.id ?? null,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  });

  const checkReadable = (): Result<true, EditorErrorCode> => destroyed
    ? failResult(
        'resource-rejection',
        'editor-destroyed',
        'A destroyed Editor session cannot execute actions or queries.',
      )
    : okResult(true);

  const checkMutationLifecycle = (): Result<true, EditorErrorCode> => {
    if (destroyed) {
      return failResult(
        'resource-rejection',
        'editor-destroyed',
        'A destroyed Editor session cannot be mutated.',
      );
    }
    if (publishing || executingAction) {
      return failResult(
        'transition-rejection',
        'editor-observer-reentrant-mutation',
        'Editor mutation is not allowed during observer/action execution.',
      );
    }
    return okResult(true);
  };

  const checkExpected = (
    expected: EditorExpectedState,
  ): Result<true, EditorErrorCode> => {
    if (
      expected.expectedRevision !== undefined
      && expected.expectedRevision !== revision
    ) {
      return failResult(
        'transition-rejection',
        'editor-stale-revision',
        'Editor session revision does not match the expected revision.',
        {
          expected: expected.expectedRevision,
          actual: revision,
        },
      );
    }
    if (
      expected.expectedConfigEpoch !== undefined
      && expected.expectedConfigEpoch !== configEpoch
    ) {
      return failResult(
        'transition-rejection',
        'editor-stale-config',
        'Editor configuration epoch does not match the expected epoch.',
        {
          expected: expected.expectedConfigEpoch,
          actual: configEpoch,
        },
      );
    }
    return okResult(true);
  };

  const authorize = (
    nextDocument: PortableContentDocument,
    nextSelection: EditorSelection | null,
    operations: readonly ContentOperation[],
    intent: EditorMutationIntent,
    origin: EditorOrigin,
  ): Result<true, EditorErrorCode> => {
    const request: EditorMutationGuardRequest = Object.freeze({
      intent,
      origin,
      previousDocument: prepared.document,
      document: nextDocument,
      operations,
      selection: nextSelection,
      revision,
      configEpoch,
    });

    if (profile !== null) {
      let allowed: boolean;
      try {
        const candidate = profile.allows(request);
        if (isPromiseLike(candidate)) {
          return failResult(
            'transition-rejection',
            'editor-profile-async',
            'Authoring profiles must evaluate synchronously.',
            { profile: profile.id, intent },
          );
        }
        allowed = candidate;
      } catch {
        return failResult(
          'transition-rejection',
          'editor-profile-fault',
          'The active authoring profile failed while evaluating the Editor mutation.',
          { profile: profile.id, intent },
        );
      }
      if (allowed !== true) {
        return failResult(
          'transition-rejection',
          'editor-profile-rejected',
          'The active authoring profile rejected the Editor mutation.',
          { profile: profile.id, intent },
        );
      }
    }
    if (policy !== null) {
      let allowed: boolean;
      try {
        const candidate = policy.allows(request);
        if (isPromiseLike(candidate)) {
          return failResult(
            'transition-rejection',
            'editor-policy-async',
            'Application authoring policies must evaluate synchronously.',
            { policy: policy.id, intent },
          );
        }
        allowed = candidate;
      } catch {
        return failResult(
          'transition-rejection',
          'editor-policy-fault',
          'The active application policy failed while evaluating the Editor mutation.',
          { policy: policy.id, intent },
        );
      }
      if (allowed !== true) {
        return failResult(
          'transition-rejection',
          'editor-policy-rejected',
          'The active application policy rejected the Editor mutation.',
          { policy: policy.id, intent },
        );
      }
    }
    return okResult(true);
  };

  const nextRevision = (): Result<number, EditorErrorCode> => {
    if (revision === Number.MAX_SAFE_INTEGER) {
      return failResult(
        'resource-rejection',
        'editor-revision-ceiling-reached',
        'Editor revision cannot advance beyond the safe-integer ceiling.',
      );
    }
    return okResult(revision + 1);
  };

  const nextConfigEpoch = (): Result<number, EditorErrorCode> => {
    if (configEpoch === Number.MAX_SAFE_INTEGER) {
      return failResult(
        'resource-rejection',
        'editor-config-epoch-ceiling-reached',
        'Editor configuration epoch cannot advance beyond the safe-integer ceiling.',
      );
    }
    return okResult(configEpoch + 1);
  };

  const publish = (
    previous: EditorSessionSnapshot,
    kind: EditorSessionEventKind,
    origin: EditorOrigin,
    documentChanged: boolean,
    selectionChanged: boolean,
  ): EditorSessionUpdate => {
    const current = getSnapshot();
    const event: EditorSessionEvent = Object.freeze({
      kind,
      origin,
      previous,
      current,
      documentChanged,
      selectionChanged,
    });
    const observerErrors: unknown[] = [];

    publishing = true;
    try {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          observerErrors.push(error);
        }
      }
    } finally {
      publishing = false;
    }

    return Object.freeze({
      snapshot: current,
      documentChanged,
      selectionChanged,
      observerErrors: Object.freeze(observerErrors),
    });
  };

  const commitPrepared = (
    nextPrepared: PreparedContentState,
    nextSelection: EditorSelection | null,
    nextHistory: EditorHistoryState,
    kind: EditorSessionEventKind,
    origin: EditorOrigin,
    documentChanged: boolean,
    selectionChanged: boolean,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    if (!documentChanged && !selectionChanged) {
      return okResult(Object.freeze({
        snapshot: getSnapshot(),
        documentChanged: false,
        selectionChanged: false,
        observerErrors: Object.freeze([]),
      }));
    }

    const advanced = nextRevision();
    if (!advanced.ok) return advanced;
    const previous = getSnapshot();

    prepared = nextPrepared;
    selection = nextSelection;
    history = nextHistory;
    revision = advanced.value;

    return okResult(publish(
      previous,
      kind,
      origin,
      documentChanged,
      selectionChanged,
    ));
  };

  const setSelection = (
    nextSelection: EditorSelection | null,
    expected: EditorExpectedState & { readonly origin?: EditorOrigin } = {},
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(expected);
    if (!state.ok) return state;
    const permitted = requireInteraction(interaction, 'navigate');
    if (!permitted.ok) return permitted;

    const valid = validateEditorSelection(
      prepared.document,
      schema,
      nextSelection,
      prepared.index,
    );
    if (!valid.ok) return valid;

    const selectionChanged = !sameEditorSelection(selection, valid.value);
    return commitPrepared(
      prepared,
      valid.value,
      selectionChanged
        ? breakEditorHistoryCoalescing(history)
        : history,
      'selection',
      expected.origin ?? 'human',
      false,
      selectionChanged,
    );
  };

  const transactInternal = (
    request: EditorTransactionRequest,
    coalesceKey: string | null,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(request);
    if (!state.ok) return state;

    const operations = Object.freeze([...request.operations]);
    const hasDocumentMutation = operations.length > 0;
    const permitted = requireInteraction(
      interaction,
      hasDocumentMutation ? 'mutate' : 'navigate',
    );
    if (!permitted.ok) return permitted;

    if (!hasDocumentMutation) {
      return Object.hasOwn(request, 'selection')
        ? setSelection(request.selection ?? null, request)
        : okResult(Object.freeze({
            snapshot: getSnapshot(),
            documentChanged: false,
            selectionChanged: false,
            observerErrors: Object.freeze([]),
          }));
    }

    const transformed = transformDocument(prepared.document, {
      schema,
      operations,
      limits: contentLimits,
    });
    if (!transformed.ok) return transformed;

    const nextPreparedResult = prepareContent(
      transformed.value.document,
      schema,
      { limits: contentLimits },
    );
    if (!nextPreparedResult.ok) return nextPreparedResult;
    const nextPrepared = nextPreparedResult.value;

    const requestedSelection = Object.hasOwn(request, 'selection')
      ? request.selection ?? null
      : mapEditorSelection(selection, transformed.value.change);
    const validSelection = validateEditorSelection(
      nextPrepared.document,
      schema,
      requestedSelection,
      nextPrepared.index,
    );
    if (!validSelection.ok) return validSelection;

    const origin = request.origin ?? 'human';
    const intent = request.historyIntent ?? 'command';
    const authorized = authorize(
      nextPrepared.document,
      validSelection.value,
      operations,
      intent,
      origin,
    );
    if (!authorized.ok) return authorized;

    const documentChanged = !isEqual(
      prepared.document,
      nextPrepared.document,
    );
    const selectionChanged = !sameEditorSelection(
      selection,
      validSelection.value,
    );

    let nextHistory = history;
    if (documentChanged) {
      nextHistory = recordEditorHistory(history, Object.freeze({
        beforeDocument: prepared.document,
        afterDocument: nextPrepared.document,
        beforeSelection: selection,
        afterSelection: validSelection.value,
        intent,
        coalesceKey,
      }));
    } else if (selectionChanged) {
      nextHistory = breakEditorHistoryCoalescing(history);
    }

    return commitPrepared(
      documentChanged ? nextPrepared : prepared,
      validSelection.value,
      nextHistory,
      'transaction',
      origin,
      documentChanged,
      selectionChanged,
    );
  };

  const transact = (
    request: EditorTransactionRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> =>
    transactInternal(request, null);

  const replaceText = (
    request: EditorTextEditRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(request);
    if (!state.ok) return state;
    const permitted = requireInteraction(interaction, 'mutate');
    if (!permitted.ok) return permitted;

    const edited = replacePreparedText(prepared, {
      id: request.id,
      from: request.from,
      to: request.to,
      text: request.text,
    });
    if (!edited.ok) return edited;

    const requestedSelection = Object.hasOwn(request, 'selection')
      ? request.selection ?? null
      : mapEditorSelection(selection, edited.value.change);
    const validSelection = validateEditorSelection(
      edited.value.state.document,
      schema,
      requestedSelection,
      edited.value.state.index,
    );
    if (!validSelection.ok) return validSelection;

    const origin = request.origin ?? 'human';
    const intent = request.historyIntent ?? 'typing';
    const source = prepared.index.getNode(request.id);
    if (source?.type !== 'paragraph' && source?.type !== 'heading') {
      return failResult(
        'transition-rejection',
        'editor-selection-invalid',
        'Prepared text edit source is no longer available.',
        { id: request.id },
      );
    }
    const only = source.children[0];
    const sourceText = only?.type === 'text' ? only.text : '';
    const marks = only?.type === 'text'
      ? only.marks
      : Object.freeze([]);
    const policyOperation: ContentOperation = Object.freeze({
      type: 'replace-inline',
      surface: Object.freeze({ type: 'node', id: request.id }),
      from: request.from,
      to: request.to,
      replacement: request.text.length === 0
        ? Object.freeze([])
        : Object.freeze([
            Object.freeze({
              type: 'text',
              text: request.text,
              marks,
            }),
          ]),
    });
    const authorized = authorize(
      edited.value.state.document,
      validSelection.value,
      Object.freeze([policyOperation]),
      intent,
      origin,
    );
    if (!authorized.ok) return authorized;

    const documentChanged = (
      sourceText.slice(request.from, request.to) !== request.text
    );
    const selectionChanged = !sameEditorSelection(
      selection,
      validSelection.value,
    );

    let nextHistory = history;
    if (documentChanged) {
      const coalesceKey = inlineTextHistoryCoalesceKey(
        intent,
        Object.freeze({
          type: 'node',
          id: request.id,
        }),
        request.from,
        request.to,
        selection,
      );
      nextHistory = recordEditorHistory(history, Object.freeze({
        beforeDocument: prepared.document,
        afterDocument: edited.value.state.document,
        beforeSelection: selection,
        afterSelection: validSelection.value,
        intent,
        coalesceKey,
      }));
    } else if (selectionChanged) {
      nextHistory = breakEditorHistoryCoalescing(history);
    }

    return commitPrepared(
      documentChanged ? edited.value.state : prepared,
      validSelection.value,
      nextHistory,
      'text-edit',
      origin,
      documentChanged,
      selectionChanged,
    );
  };

  const replaceInlineText = (
    request: EditorInlineTextEditRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    if (request.surface.type === 'node') {
      const source = prepared.index.getNode(request.surface.id);
      if (
        (source?.type === 'paragraph' || source?.type === 'heading')
        && (
          source.children.length === 0
          || (
            source.children.length === 1
            && source.children[0]?.type === 'text'
          )
        )
      ) {
        return replaceText({
          id: request.surface.id,
          from: request.from,
          to: request.to,
          text: request.text,
          ...(Object.hasOwn(request, 'selection')
            ? { selection: request.selection ?? null }
            : {}),
          ...(request.origin === undefined ? {} : { origin: request.origin }),
          ...(request.historyIntent === undefined
            ? {}
            : { historyIntent: request.historyIntent }),
          ...(request.expectedRevision === undefined
            ? {}
            : { expectedRevision: request.expectedRevision }),
          ...(request.expectedConfigEpoch === undefined
            ? {}
            : { expectedConfigEpoch: request.expectedConfigEpoch }),
        });
      }
    }

    const marks = request.text.length === 0
      ? okResult(Object.freeze([]))
      : resolveEditorTypingMarks(
          prepared.index,
          Object.freeze({
            type: 'inline',
            surface: request.surface,
            offset: request.from,
            affinity: request.affinity ?? 'after',
          }),
        );
    if (!marks.ok) return marks;

    const operation: ContentOperation = Object.freeze({
      type: 'replace-inline',
      surface: request.surface,
      from: request.from,
      to: request.to,
      replacement: request.text.length === 0
        ? Object.freeze([])
        : Object.freeze([
            Object.freeze({
              type: 'text',
              text: request.text,
              marks: marks.value,
            }),
          ]),
    });

    const intent = request.historyIntent ?? 'typing';
    const coalesceKey = inlineTextHistoryCoalesceKey(
      intent,
      request.surface,
      request.from,
      request.to,
      selection,
    );
    return transactInternal({
      operations: Object.freeze([operation]),
      ...(Object.hasOwn(request, 'selection')
        ? { selection: request.selection ?? null }
        : {}),
      ...(request.origin === undefined ? {} : { origin: request.origin }),
      historyIntent: intent,
      ...(request.expectedRevision === undefined
        ? {}
        : { expectedRevision: request.expectedRevision }),
      ...(request.expectedConfigEpoch === undefined
        ? {}
        : { expectedConfigEpoch: request.expectedConfigEpoch }),
    }, coalesceKey);
  };

  const insertInlineFragment = (
    request: EditorInlineFragmentInsertRequest,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(request);
    if (!state.ok) return state;
    const permitted = requireInteraction(interaction, 'mutate');
    if (!permitted.ok) return permitted;

    const sourceIDs = inlineFragmentNodeIDs(request.fragment, {
      limits: contentLimits,
    });
    if (!sourceIDs.ok) return sourceIDs;

    const allocated = new Set<NodeID>();
    const idMap = new Map<NodeID, NodeID>();
    for (const sourceID of sourceIDs.value) {
      const nextID = allocateNodeID(allocated);
      if (!nextID.ok) return nextID;
      idMap.set(sourceID, nextID.value);
    }

    const fragment = prepareInlineFragment(request.fragment, {
      schema,
      idMap,
      limits: contentLimits,
    });
    if (!fragment.ok) return fragment;

    const operation: ContentOperation = Object.freeze({
      type: 'replace-inline',
      surface: request.surface,
      from: request.from,
      to: request.to,
      replacement: fragment.value.content,
    });

    return transactInternal({
      operations: Object.freeze([operation]),
      ...(Object.hasOwn(request, 'selection')
        ? { selection: request.selection ?? null }
        : {}),
      ...(request.origin === undefined ? {} : { origin: request.origin }),
      historyIntent: request.historyIntent ?? 'paste',
      ...(request.expectedRevision === undefined
        ? {}
        : { expectedRevision: request.expectedRevision }),
      ...(request.expectedConfigEpoch === undefined
        ? {}
        : { expectedConfigEpoch: request.expectedConfigEpoch }),
    }, null);
  };

  const restoreHistory = (
    direction: 'undo' | 'redo',
    expected: EditorExpectedState & { readonly origin?: EditorOrigin } = {},
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(expected);
    if (!state.ok) return state;
    const permitted = requireInteraction(interaction, 'mutate');
    if (!permitted.ok) return permitted;

    const restored = direction === 'undo'
      ? undoEditorHistory(history)
      : redoEditorHistory(history);
    if (!restored.ok) return restored;

    const nextPreparedResult = prepareContent(
      restored.value.document,
      schema,
      { limits: contentLimits },
    );
    if (!nextPreparedResult.ok) return nextPreparedResult;
    const nextPrepared = nextPreparedResult.value;

    const validSelection = validateEditorSelection(
      nextPrepared.document,
      schema,
      restored.value.selection,
      nextPrepared.index,
    );
    if (!validSelection.ok) return validSelection;

    const origin = expected.origin ?? 'human';
    const authorized = authorize(
      nextPrepared.document,
      validSelection.value,
      Object.freeze([]),
      direction,
      origin,
    );
    if (!authorized.ok) return authorized;

    return commitPrepared(
      nextPrepared,
      validSelection.value,
      restored.value.history,
      direction,
      origin,
      !isEqual(prepared.document, nextPrepared.document),
      !sameEditorSelection(selection, validSelection.value),
    );
  };

  const replaceDocument = (
    document: PortableContentDocument,
    expected: EditorReplaceDocumentOptions = {},
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(expected);
    if (!state.ok) return state;

    const immutable = snapshotContent(document, schema, contentLimits);
    if (!immutable.ok) return immutable;
    const nextPreparedResult = prepareContent(
      immutable.value,
      schema,
      { limits: contentLimits },
    );
    if (!nextPreparedResult.ok) return nextPreparedResult;
    const nextPrepared = nextPreparedResult.value;

    const requestedSelection = Object.hasOwn(expected, 'selection')
      ? expected.selection ?? null
      : null;
    const validSelection = validateEditorSelection(
      nextPrepared.document,
      schema,
      requestedSelection,
      nextPrepared.index,
    );
    if (!validSelection.ok) return validSelection;

    const epoch = nextConfigEpoch();
    if (!epoch.ok) return epoch;
    const advanced = nextRevision();
    if (!advanced.ok) return advanced;
    const previous = getSnapshot();
    const documentChanged = !isEqual(
      prepared.document,
      nextPrepared.document,
    );
    const selectionChanged = !sameEditorSelection(
      selection,
      validSelection.value,
    );

    prepared = nextPrepared;
    selection = validSelection.value;
    history = clearEditorHistory(history);
    configEpoch = epoch.value;
    revision = advanced.value;

    return okResult(publish(
      previous,
      'replace-document',
      expected.origin ?? 'system',
      documentChanged,
      selectionChanged,
    ));
  };

  const replaceSchema = (
    nextSchema: CompiledContentSchema,
    document: PortableContentDocument,
    expected: EditorReplaceSchemaOptions = {},
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(expected);
    if (!state.ok) return state;
    const epoch = nextConfigEpoch();
    if (!epoch.ok) return epoch;

    const immutable = snapshotContent(
      document,
      nextSchema,
      contentLimits,
    );
    if (!immutable.ok) return immutable;
    const nextPreparedResult = prepareContent(
      immutable.value,
      nextSchema,
      { limits: contentLimits },
    );
    if (!nextPreparedResult.ok) return nextPreparedResult;
    const nextPrepared = nextPreparedResult.value;

    const requestedSelection = Object.hasOwn(expected, 'selection')
      ? expected.selection ?? null
      : null;
    const validSelection = validateEditorSelection(
      nextPrepared.document,
      nextSchema,
      requestedSelection,
      nextPrepared.index,
    );
    if (!validSelection.ok) return validSelection;

    const advanced = nextRevision();
    if (!advanced.ok) return advanced;
    const previous = getSnapshot();
    const documentChanged = !isEqual(
      prepared.document,
      nextPrepared.document,
    );
    const selectionChanged = !sameEditorSelection(
      selection,
      validSelection.value,
    );

    schema = nextSchema;
    prepared = nextPrepared;
    selection = validSelection.value;
    history = clearEditorHistory(history);
    configEpoch = epoch.value;
    revision = advanced.value;

    return okResult(publish(
      previous,
      'replace-schema',
      expected.origin ?? 'system',
      documentChanged,
      selectionChanged,
    ));
  };

  const reconfigure = (
    options: EditorReconfigureOptions,
  ): Result<EditorSessionUpdate, EditorSessionErrorCode> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const state = checkExpected(options);
    if (!state.ok) return state;

    const nextInteraction = options.interaction === undefined
      ? okResult(interaction)
      : tryCreateInteractionState(options.interaction);
    if (!nextInteraction.ok) return nextInteraction;

    const nextProfile = Object.hasOwn(options, 'profile')
      ? options.profile ?? null
      : profile;
    const nextPolicy = Object.hasOwn(options, 'policy')
      ? options.policy ?? null
      : policy;

    const changed = (
      nextProfile !== profile
      || nextPolicy !== policy
      || nextInteraction.value.disabled !== interaction.disabled
      || nextInteraction.value.readOnly !== interaction.readOnly
    );
    if (!changed) {
      return okResult(Object.freeze({
        snapshot: getSnapshot(),
        documentChanged: false,
        selectionChanged: false,
        observerErrors: Object.freeze([]),
      }));
    }

    const epoch = nextConfigEpoch();
    if (!epoch.ok) return epoch;
    const advanced = nextRevision();
    if (!advanced.ok) return advanced;
    const previous = getSnapshot();

    profile = nextProfile;
    policy = nextPolicy;
    interaction = nextInteraction.value;
    history = breakEditorHistoryCoalescing(history);
    configEpoch = epoch.value;
    revision = advanced.value;

    return okResult(publish(
      previous,
      'reconfigure',
      options.origin ?? 'system',
      false,
      false,
    ));
  };

  const allocateNodeID = (
    allocated: Set<NodeID>,
  ): Result<NodeID, EditorErrorCode> => {
    if (options.allocateNodeID === undefined) {
      return failResult(
        'construction',
        'editor-id-allocator-missing',
        'This Editor session has no node ID allocator.',
      );
    }

    let id: NodeID;
    try {
      id = options.allocateNodeID();
    } catch {
      return failResult(
        'construction',
        'editor-id-invalid',
        'The Editor node ID allocator threw while allocating an ID.',
      );
    }

    if (typeof id !== 'string') {
      return failResult(
        'construction',
        'editor-id-invalid',
        'Editor node ID allocators must return string IDs.',
      );
    }

    const invalid = validateStableID(id);
    if (invalid !== null) {
      return failResult(
        invalid.class,
        'editor-id-invalid',
        invalid.message,
        invalid.details,
      );
    }
    if (allocated.has(id) || prepared.index.getNode(id) !== null) {
      return failResult(
        'transition-rejection',
        'editor-id-duplicate',
        'The Editor node ID allocator returned an ID already used in the document or transaction.',
        { id },
      );
    }
    allocated.add(id);
    return okResult(id);
  };

  const runAction = <Args, Output, Code extends string>(
    definition: EditorActionDefinition<Args, Output, Code>,
    args: Args,
    actionOptions: EditorActionRunOptions = {},
  ): Result<EditorActionRunResult<Output>, EditorSessionErrorCode | Code> => {
    const lifecycle = checkMutationLifecycle();
    if (!lifecycle.ok) return lifecycle;
    const expected = checkExpected(actionOptions);
    if (!expected.ok) return expected;

    const permitted = requireInteraction(interaction, 'navigate');
    if (!permitted.ok) return permitted;

    const registered = actions.action(definition.id);
    if (registered !== definition) {
      return failResult(
        'transition-rejection',
        'editor-action-unknown',
        'Editor action is not registered in this session.',
        { id: definition.id },
      );
    }

    const operations: ContentOperation[] = [];
    const allocated = new Set<NodeID>();
    let operationFailure: Result<never, ContentErrorCode> | null = null;
    let selected = false;
    let requestedSelection: EditorSelection | null = selection;

    const context: EditorTransactionContext = Object.freeze({
      view: createActionView(getSnapshot()),
      apply: (...nextOperations: readonly ContentOperation[]) => {
        if (operationFailure !== null) return;
        const actual = operations.length + nextOperations.length;
        if (actual > contentLimits.maxOperationsPerTransform) {
          operationFailure = contentCeilingExceeded(
            'content-operation-ceiling-exceeded',
            actual,
            contentLimits.maxOperationsPerTransform,
          );
          return;
        }
        operations.push(...nextOperations);
      },
      setSelection: (nextSelection: EditorSelection | null) => {
        selected = true;
        requestedSelection = nextSelection;
      },
      allocateNodeID: () => allocateNodeID(allocated),
    });

    const startRevision = revision;
    const startConfigEpoch = configEpoch;
    let actionResult: Result<Output, Code>;
    executingAction = true;
    try {
      let candidate: Result<Output, Code>;
      try {
        candidate = definition.run(context, args);
      } catch {
        return failResult(
          'transition-rejection',
          'editor-action-fault',
          'Editor action execution failed.',
          { id: definition.id },
        );
      }
      if (isPromiseLike(candidate)) {
        return failResult(
          'transition-rejection',
          'editor-action-async',
          'Editor actions must complete synchronously inside one atomic transaction.',
          { id: definition.id },
        );
      }
      actionResult = candidate;
    } finally {
      executingAction = false;
    }

    if (operationFailure !== null) return operationFailure;
    if (!actionResult.ok) return actionResult;

    const request: EditorTransactionRequest = {
      operations: Object.freeze(operations),
      expectedRevision: startRevision,
      expectedConfigEpoch: startConfigEpoch,
      origin: actionOptions.origin ?? 'human',
      historyIntent: definition.historyIntent ?? 'command',
      ...(selected ? { selection: requestedSelection } : {}),
    };
    const update = transact(request);
    if (!update.ok) return update;

    return okResult(Object.freeze({
      value: actionResult.value,
      update: update.value,
    }));
  };

  const runQuery = <Args, Output, Code extends string>(
    definition: EditorQueryDefinition<Args, Output, Code>,
    args: Args,
    queryOptions: EditorQueryRunOptions = {},
  ): Result<Output, EditorSessionErrorCode | Code> => {
    const readable = checkReadable();
    if (!readable.ok) return readable;
    const expected = checkExpected(queryOptions);
    if (!expected.ok) return expected;

    const registered = actions.query(definition.id);
    if (registered !== definition) {
      return failResult(
        'transition-rejection',
        'editor-query-unknown',
        'Editor query is not registered in this session.',
        { id: definition.id },
      );
    }

    let result: Result<Output, Code>;
    try {
      result = definition.read(createActionView(getSnapshot()), args);
    } catch {
      return failResult(
        'transition-rejection',
        'editor-query-fault',
        'Editor query execution failed.',
        { id: definition.id },
      );
    }
    if (isPromiseLike(result)) {
      return failResult(
        'transition-rejection',
        'editor-query-async',
        'Editor queries must complete synchronously against one session snapshot.',
        { id: definition.id },
      );
    }
    return result;
  };

  const session: EditorSession = Object.freeze({
    getSnapshot,
    subscribe: (listener: EditorSessionListener): (() => void) => {
      if (destroyed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSelection,
    transact,
    replaceText,
    replaceInlineText,
    insertInlineFragment,
    undo: (expected = {}) => restoreHistory('undo', expected),
    redo: (expected = {}) => restoreHistory('redo', expected),
    replaceDocument,
    replaceSchema,
    reconfigure,
    runAction,
    runQuery,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
    },
  });

  return okResult(session);
}

function createActionView(
  snapshot: EditorSessionSnapshot,
): EditorActionSessionView {
  return Object.freeze({
    document: snapshot.document,
    schema: snapshot.schema,
    contentLimits: snapshot.contentLimits,
    selection: snapshot.selection,
    revision: snapshot.revision,
    configEpoch: snapshot.configEpoch,
    disabled: snapshot.interaction.disabled,
    readOnly: snapshot.interaction.readOnly,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
  });
}

function snapshotContent(
  document: PortableContentDocument,
  schema: CompiledContentSchema,
  limits: ContentLimits,
): Result<PortableContentDocument, ContentErrorCode> {
  const transformed = transformDocument(document, {
    schema,
    operations: Object.freeze([]),
    limits,
  });
  return transformed.ok
    ? okResult(transformed.value.document)
    : transformed;
}

function inlineTextHistoryCoalesceKey(
  intent: EditorHistoryIntent,
  surface: InlineSurface,
  from: number,
  to: number,
  selection: EditorSelection | null,
): string | null {
  if (
    intent !== 'typing'
    && intent !== 'composition'
    && intent !== 'delete-backward'
    && intent !== 'delete-forward'
  ) {
    return null;
  }
  if (selection === null) return null;

  const { anchor, focus } = selection;
  if (
    anchor.type !== 'inline'
    || focus.type !== 'inline'
    || !sameInlineSurface(anchor.surface, surface)
    || !sameInlineSurface(focus.surface, surface)
  ) {
    return null;
  }

  const start = Math.min(anchor.offset, focus.offset);
  const end = Math.max(anchor.offset, focus.offset);
  const rangeMatches = start === from && end === to;
  const collapsed = start === end;
  const caretMatches = collapsed && (
    (intent === 'delete-backward' && start === to)
    || (intent === 'delete-forward' && start === from)
  );

  return rangeMatches || caretMatches
    ? `${intent}:${inlineSurfaceKey(surface)}`
    : null;
}

function sameInlineSurface(
  left: InlineSurface,
  right: InlineSurface,
): boolean {
  return (
    left.type === right.type
    && left.id === right.id
    && (
      left.type === 'node'
      || (
        right.type === 'slot'
        && left.slot === right.slot
      )
    )
  );
}

function inlineSurfaceKey(surface: InlineSurface): string {
  return surface.type === 'node'
    ? `node:${surface.id}`
    : `slot:${surface.id}:${surface.slot}`;
}

function isPromiseLike(
  value: unknown,
): value is PromiseLike<unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && 'then' in value
    && typeof (value as { readonly then?: unknown }).then === 'function'
  );
}
