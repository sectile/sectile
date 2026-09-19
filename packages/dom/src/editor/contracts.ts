import type { Result, SectileError } from '@sectile/core/result';
import type { ContentErrorCode } from '@sectile/content/error';
import type {
  CompiledAuthoringRegistry,
  ComponentAuthoringSurface,
  EditorAuthoringErrorCode,
} from '@sectile/editor/authoring';
import type {
  EditorSelection,
} from '@sectile/editor/selection';
import type {
  EditorSession,
  EditorSessionErrorCode,
  EditorSessionSnapshot,
} from '@sectile/editor/session';

export type DOMEditorErrorCode =
  | 'dom-editor-render-fault'
  | 'dom-editor-selection-invalid'
  | 'dom-editor-clipboard-invalid'
  | 'dom-editor-input-unsupported';

export type DOMEditorFailureCode =
  | DOMEditorErrorCode
  | EditorSessionErrorCode
  | EditorAuthoringErrorCode
  | ContentErrorCode;

export interface EditorRenderContext {
  readonly root: HTMLElement;
  readonly snapshot: EditorSessionSnapshot;
  readonly authoringSurfaces: readonly ComponentAuthoringSurface[];
}

export type EditorSelectionRestoration =
  | 'synchronous'
  | 'deferred';

export interface EditorOptions {
  readonly root: HTMLElement;
  readonly editor: EditorSession;
  readonly authoring: CompiledAuthoringRegistry;
  readonly render: (context: EditorRenderContext) => void;
  readonly spellcheck?: boolean;
  readonly selectionRestoration?: EditorSelectionRestoration;
  readonly onError?: (error: SectileError<DOMEditorFailureCode>) => void;
}

export type EditorDOMSelectionResult =
  | {
      readonly status: 'mapped';
      readonly selection: EditorSelection;
    }
  | {
      readonly status: 'isolated';
    }
  | {
      readonly status: 'invalid';
    };

export interface EditorConnection {
  getSnapshot(): EditorSessionSnapshot;
  refresh(): Result<EditorSessionSnapshot, DOMEditorFailureCode>;
  readSelection(): EditorDOMSelectionResult;
  setSelection(selection: EditorSelection | null): boolean;
  disconnect(): void;
}
