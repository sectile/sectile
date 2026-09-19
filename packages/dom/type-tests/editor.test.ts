import * as DOM from '@sectile/dom';
import {
  createEditor,
  editorAuthoringMountAttributes,
  editorInlineSurfaceAttributes,
  editorRootAttributes,
  tryCreateEditor,
  type EditorConnection,
  type EditorDOMAttributes,
  type EditorOptions,
  type EditorSelectionRestoration,
} from '@sectile/dom/editor';
import type { CompiledAuthoringRegistry } from '@sectile/editor/authoring';
import type { EditorSession } from '@sectile/editor/session';

declare const root: HTMLElement;
declare const editor: EditorSession;
declare const authoring: CompiledAuthoringRegistry;

const options: EditorOptions = {
  root,
  editor,
  authoring,
  render: ({ root: target, snapshot, authoringSurfaces }) => {
    target.replaceChildren();
    void snapshot;
    void authoringSurfaces;
  },
};

const deferred: EditorSelectionRestoration = 'deferred';
const rootAttributes: EditorDOMAttributes = editorRootAttributes(
  editor.getSnapshot(),
);
const surfaceAttributes: EditorDOMAttributes = editorInlineSurfaceAttributes({
  type: 'node',
  id: 'paragraph',
});
const mountAttributes: EditorDOMAttributes = editorAuthoringMountAttributes(
  'owner',
  {
    name: 'title',
    kind: 'inline',
    frame: 'slot',
    target: {
      type: 'node',
      id: 'paragraph',
      slot: 'title',
    },
  },
);
void deferred;
void rootAttributes;
void surfaceAttributes;
void mountAttributes;

const connection: EditorConnection = createEditor(options);
void connection;

const fallible = tryCreateEditor(options);
if (fallible.ok) {
  fallible.value.disconnect();
}

// @ts-expect-error Editor remains a focused optional-peer subpath.
DOM.createEditor;
