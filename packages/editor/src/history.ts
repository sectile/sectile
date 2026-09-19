import { failResult, okResult, type Result } from '@sectile/core/result';
import type { PortableContentDocument } from '@sectile/content/document';
import type { EditorErrorCode } from './error.js';
import type { EditorSelection } from './selection.js';

export const DEFAULT_EDITOR_HISTORY_LIMIT = 100;
export const MAX_EDITOR_HISTORY_LIMIT = 10_000;

export type EditorHistoryIntent =
  | 'typing'
  | 'composition'
  | 'delete-backward'
  | 'delete-forward'
  | 'paste'
  | 'format'
  | 'structure'
  | 'component-data'
  | 'command';

export interface EditorHistoryEntry {
  readonly beforeDocument: PortableContentDocument;
  readonly afterDocument: PortableContentDocument;
  readonly beforeSelection: EditorSelection | null;
  readonly afterSelection: EditorSelection | null;
  readonly intent: EditorHistoryIntent;
  readonly coalesceKey: string | null;
}

export interface EditorHistoryState {
  readonly limit: number;
  readonly past: readonly EditorHistoryEntry[];
  readonly future: readonly EditorHistoryEntry[];
  readonly openCoalesceKey: string | null;
}

export interface EditorHistoryRestore {
  readonly history: EditorHistoryState;
  readonly document: PortableContentDocument;
  readonly selection: EditorSelection | null;
  readonly entry: EditorHistoryEntry;
}

export function tryCreateEditorHistory(
  limit: number = DEFAULT_EDITOR_HISTORY_LIMIT,
): Result<EditorHistoryState, EditorErrorCode> {
  if (
    !Number.isSafeInteger(limit)
    || limit < 0
    || limit > MAX_EDITOR_HISTORY_LIMIT
  ) {
    return failResult(
      'construction',
      'editor-history-limit-invalid',
      'Editor history limit must be a safe integer within the supported range.',
      {
        limit,
        maximum: MAX_EDITOR_HISTORY_LIMIT,
      },
    );
  }

  return okResult(Object.freeze({
    limit,
    past: Object.freeze([]),
    future: Object.freeze([]),
    openCoalesceKey: null,
  }));
}

export function recordEditorHistory(
  state: EditorHistoryState,
  entry: EditorHistoryEntry,
): EditorHistoryState {
  if (state.limit === 0) {
    return Object.freeze({
      ...state,
      past: Object.freeze([]),
      future: Object.freeze([]),
      openCoalesceKey: null,
    });
  }

  const canCoalesce = (
    entry.coalesceKey !== null
    && state.openCoalesceKey === entry.coalesceKey
    && state.future.length === 0
    && state.past.length > 0
  );

  let past: readonly EditorHistoryEntry[];
  if (canCoalesce) {
    const previous = state.past[state.past.length - 1];
    if (previous === undefined) {
      past = Object.freeze([entry]);
    } else {
      const merged: EditorHistoryEntry = Object.freeze({
        beforeDocument: previous.beforeDocument,
        afterDocument: entry.afterDocument,
        beforeSelection: previous.beforeSelection,
        afterSelection: entry.afterSelection,
        intent: entry.intent,
        coalesceKey: entry.coalesceKey,
      });
      past = Object.freeze([
        ...state.past.slice(0, -1),
        merged,
      ]);
    }
  } else {
    past = Object.freeze([
      ...state.past,
      entry,
    ].slice(-state.limit));
  }

  return Object.freeze({
    limit: state.limit,
    past,
    future: Object.freeze([]),
    openCoalesceKey: entry.coalesceKey,
  });
}

export function breakEditorHistoryCoalescing(
  state: EditorHistoryState,
): EditorHistoryState {
  return state.openCoalesceKey === null
    ? state
    : Object.freeze({
        ...state,
        openCoalesceKey: null,
      });
}

export function clearEditorHistory(
  state: EditorHistoryState,
): EditorHistoryState {
  if (
    state.past.length === 0
    && state.future.length === 0
    && state.openCoalesceKey === null
  ) {
    return state;
  }
  return Object.freeze({
    limit: state.limit,
    past: Object.freeze([]),
    future: Object.freeze([]),
    openCoalesceKey: null,
  });
}

export function undoEditorHistory(
  state: EditorHistoryState,
): Result<EditorHistoryRestore, EditorErrorCode> {
  const entry = state.past[state.past.length - 1];
  if (entry === undefined) {
    return failResult(
      'transition-rejection',
      'editor-history-empty',
      'Editor history has no undo entry.',
    );
  }

  const history: EditorHistoryState = Object.freeze({
    limit: state.limit,
    past: Object.freeze(state.past.slice(0, -1)),
    future: Object.freeze([entry, ...state.future]),
    openCoalesceKey: null,
  });
  return okResult(Object.freeze({
    history,
    document: entry.beforeDocument,
    selection: entry.beforeSelection,
    entry,
  }));
}

export function redoEditorHistory(
  state: EditorHistoryState,
): Result<EditorHistoryRestore, EditorErrorCode> {
  const entry = state.future[0];
  if (entry === undefined) {
    return failResult(
      'transition-rejection',
      'editor-history-empty',
      'Editor history has no redo entry.',
    );
  }

  const history: EditorHistoryState = Object.freeze({
    limit: state.limit,
    past: Object.freeze([
      ...state.past,
      entry,
    ].slice(-state.limit)),
    future: Object.freeze(state.future.slice(1)),
    openCoalesceKey: null,
  });
  return okResult(Object.freeze({
    history,
    document: entry.afterDocument,
    selection: entry.afterSelection,
    entry,
  }));
}
