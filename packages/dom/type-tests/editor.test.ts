import * as DOM from '@sectile/dom';
import {
  createEditor,
  tryCreateEditor,
  type EditorConnection,
  type EditorOptions,
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

const connection: EditorConnection = createEditor(options);
void connection;

const fallible = tryCreateEditor(options);
if (fallible.ok) {
  fallible.value.disconnect();
}

// @ts-expect-error Editor remains a focused optional-peer subpath.
DOM.createEditor;
