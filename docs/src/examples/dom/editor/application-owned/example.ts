import { baseRef, compileContentSchema } from '@sectile/content/schema';
import { compileAuthoringRegistry } from '@sectile/editor/authoring';
import { createEditorSession } from '@sectile/editor/session';
import {
  createEditor,
  markEditorInlineSurface,
} from '@sectile/dom/editor';

export function mountExample(root: HTMLElement): () => void {
  const schemaResult = compileContentSchema({
    id: 'docs/dom-editor',
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
    document: {
      formatVersion: 1,
      schema: { id: 'docs/dom-editor', version: 1 },
      root: {
        type: 'document',
        children: [{
          id: 'body',
          type: 'paragraph',
          children: [{
            type: 'text',
            text: 'This markup belongs to the application. Sectile owns the editing connection.',
            marks: [],
          }],
        }],
      },
    },
  });
  if (!editorResult.ok) throw new Error(editorResult.error.message);

  const editor = editorResult.value;
  const editorElement = document.createElement('div');
  const status = document.createElement('p');
  const append = document.createElement('button');

  root.dataset['exampleEditor'] = '';
  editorElement.setAttribute('aria-label', 'Application-owned editor host');
  status.dataset['exampleEditorStatus'] = '';
  append.type = 'button';
  append.textContent = 'Append !';

  const connection = createEditor({
    root: editorElement,
    editor,
    authoring: authoringResult.value,
    render({ snapshot }) {
      const node = snapshot.index.getNode('body');
      if (node?.type !== 'paragraph') return;

      const paragraph = document.createElement('p');
      markEditorInlineSurface(paragraph, { type: 'node', id: 'body' });
      paragraph.textContent = node.children
        .map((child) => child.type === 'text' ? child.text : '')
        .join('');
      editorElement.replaceChildren(paragraph);
      status.textContent = `Revision ${snapshot.revision}`;
    },
  });

  const appendText = (): void => {
    const node = editor.getSnapshot().index.getNode('body');
    if (node?.type !== 'paragraph') return;
    const text = node.children[0];
    const length = text?.type === 'text' ? text.text.length : 0;
    const result = editor.replaceText({
      id: 'body',
      from: length,
      to: length,
      text: '!',
      historyIntent: 'typing',
    });
    if (!result.ok) status.textContent = result.error.message;
  };

  append.addEventListener('click', appendText);
  const toolbar = document.createElement('div');
  toolbar.dataset['exampleEditorToolbar'] = '';
  toolbar.append(append);
  root.replaceChildren(toolbar, editorElement, status);

  return () => {
    append.removeEventListener('click', appendText);
    connection.disconnect();
    editor.destroy();
    root.replaceChildren();
    delete root.dataset['exampleEditor'];
  };
}
