import { baseRef, compileContentSchema } from '@sectile/content/schema';
import { compileAuthoringRegistry } from '@sectile/editor/authoring';
import { createEditorSession } from '@sectile/editor/session';
import {
  createEditor,
  markEditorInlineSurface,
} from '@sectile/dom/editor';

export function mountExample(root: HTMLElement): () => void {
  const schemaResult = compileContentSchema({
    id: 'docs/dom-editor-history',
    version: 1,
    groups: [],
    blockContent: {
      kind: 'block',
      allowed: [baseRef('paragraph')],
    },
    rootContent: {
      kind: 'block',
      allowed: [baseRef('paragraph')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [],
  });
  if (!schemaResult.ok) throw new Error(schemaResult.error.message);

  const authoringResult = compileAuthoringRegistry(schemaResult.value);
  if (!authoringResult.ok) throw new Error(authoringResult.error.message);

  const editorResult = createEditorSession({
    schema: schemaResult.value,
    historyLimit: 20,
    document: {
      formatVersion: 1,
      schema: { id: 'docs/dom-editor-history', version: 1 },
      root: {
        type: 'document',
        children: [{
          id: 'note',
          type: 'paragraph',
          children: [{
            type: 'text',
            text: 'History belongs to the Editor session.',
            marks: [],
          }],
        }],
      },
    },
  });
  if (!editorResult.ok) throw new Error(editorResult.error.message);

  const editor = editorResult.value;
  const editorElement = document.createElement('div');
  const toolbar = document.createElement('div');
  const append = document.createElement('button');
  const undo = document.createElement('button');
  const redo = document.createElement('button');
  const status = document.createElement('p');

  root.dataset['exampleEditor'] = '';
  toolbar.dataset['exampleEditorToolbar'] = '';
  status.dataset['exampleEditorStatus'] = '';
  editorElement.setAttribute('aria-label', 'Editor history example');

  append.type = undo.type = redo.type = 'button';
  append.textContent = 'Append word';
  undo.textContent = 'Undo';
  redo.textContent = 'Redo';
  toolbar.append(append, undo, redo);

  const connection = createEditor({
    root: editorElement,
    editor,
    authoring: authoringResult.value,
    render({ snapshot }) {
      const node = snapshot.index.getNode('note');
      if (node?.type !== 'paragraph') return;

      const paragraph = document.createElement('p');
      markEditorInlineSurface(paragraph, { type: 'node', id: 'note' });
      paragraph.textContent = node.children
        .map((child) => child.type === 'text' ? child.text : '')
        .join('');
      editorElement.replaceChildren(paragraph);

      undo.disabled = !snapshot.canUndo;
      redo.disabled = !snapshot.canRedo;
      status.textContent = `Revision ${snapshot.revision} · ${snapshot.canUndo ? 'undo available' : 'history empty'}`;
    },
  });

  const appendWord = (): void => {
    const node = editor.getSnapshot().index.getNode('note');
    if (node?.type !== 'paragraph') return;
    const text = node.children[0];
    const length = text?.type === 'text' ? text.text.length : 0;
    editor.replaceText({
      id: 'note',
      from: length,
      to: length,
      text: ' edited',
      historyIntent: 'typing',
    });
  };
  const undoHistory = (): void => {
    editor.undo();
  };
  const redoHistory = (): void => {
    editor.redo();
  };

  append.addEventListener('click', appendWord);
  undo.addEventListener('click', undoHistory);
  redo.addEventListener('click', redoHistory);
  root.replaceChildren(toolbar, editorElement, status);

  return () => {
    append.removeEventListener('click', appendWord);
    undo.removeEventListener('click', undoHistory);
    redo.removeEventListener('click', redoHistory);
    connection.disconnect();
    editor.destroy();
    root.replaceChildren();
    delete root.dataset['exampleEditor'];
  };
}
