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
      allowed: [baseRef('heading'), baseRef('paragraph')],
    },
    rootContent: {
      kind: 'block',
      allowed: [baseRef('heading'), baseRef('paragraph')],
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
        children: [
          {
            id: 'history-title',
            type: 'heading',
            level: 2,
            children: [{
              type: 'text',
              text: 'Release approval',
              marks: [],
            }],
          },
          {
            id: 'summary',
            type: 'paragraph',
            children: [{
              type: 'text',
              text: 'Status: pending review',
              marks: [],
            }],
          },
          {
            id: 'details',
            type: 'paragraph',
            children: [{
              type: 'text',
              text: 'Release notes are waiting for approval.',
              marks: [],
            }],
          },
        ],
      },
    },
  });
  if (!editorResult.ok) throw new Error(editorResult.error.message);

  const editor = editorResult.value;
  const editorElement = document.createElement('div');
  const toolbar = document.createElement('div');
  const transact = document.createElement('button');
  const undo = document.createElement('button');
  const redo = document.createElement('button');
  const status = document.createElement('p');

  root.dataset['exampleEditor'] = '';
  toolbar.dataset['exampleEditorToolbar'] = '';
  status.dataset['exampleEditorStatus'] = '';
  editorElement.setAttribute('aria-label', 'Release approval editor');

  transact.type = undo.type = redo.type = 'button';
  transact.textContent = 'Approve release';
  undo.textContent = 'Undo approval';
  redo.textContent = 'Redo approval';
  toolbar.append(transact, undo, redo);

  const connection = createEditor({
    root: editorElement,
    editor,
    authoring: authoringResult.value,
    render({ snapshot }) {
      const title = snapshot.index.getNode('history-title');
      const summary = snapshot.index.getNode('summary');
      const details = snapshot.index.getNode('details');
      if (
        title?.type !== 'heading'
        || summary?.type !== 'paragraph'
        || details?.type !== 'paragraph'
      ) {
        return;
      }

      const article = document.createElement('article');
      article.dataset['exampleEditorDocument'] = '';

      const heading = document.createElement('h2');
      markEditorInlineSurface(heading, { type: 'node', id: 'history-title' });
      heading.textContent = textOf(title.children);

      const transactionGrid = document.createElement('div');
      transactionGrid.dataset['exampleEditorTransaction'] = '';

      const summaryCard = document.createElement('section');
      const summaryLabel = document.createElement('span');
      summaryLabel.dataset['exampleEditorSlotLabel'] = '';
      summaryLabel.textContent = 'Status';
      const summaryParagraph = document.createElement('p');
      markEditorInlineSurface(summaryParagraph, { type: 'node', id: 'summary' });
      summaryParagraph.textContent = textOf(summary.children);
      summaryCard.append(summaryLabel, summaryParagraph);

      const detailCard = document.createElement('section');
      const detailLabel = document.createElement('span');
      detailLabel.dataset['exampleEditorSlotLabel'] = '';
      detailLabel.textContent = 'Release notes';
      const detailParagraph = document.createElement('p');
      markEditorInlineSurface(detailParagraph, { type: 'node', id: 'details' });
      detailParagraph.textContent = textOf(details.children);
      detailCard.append(detailLabel, detailParagraph);

      transactionGrid.append(summaryCard, detailCard);
      article.append(heading, transactionGrid);
      editorElement.replaceChildren(article);

      transact.disabled = textOf(summary.children) === 'Status: approved';
      undo.disabled = !snapshot.canUndo;
      redo.disabled = !snapshot.canRedo;
      status.textContent = `Approval updates both blocks as one history entry · revision ${snapshot.revision}`;
    },
  });

  const runTransaction = (): void => {
    const current = editor.getSnapshot();
    const summary = current.index.getNode('summary');
    const details = current.index.getNode('details');
    if (summary?.type !== 'paragraph' || details?.type !== 'paragraph') return;

    const summaryLength = textOf(summary.children).length;
    const detailsLength = textOf(details.children).length;
    const result = editor.transact({
      operations: [
        {
          type: 'replace-inline',
          surface: { type: 'node', id: 'summary' },
          from: 0,
          to: summaryLength,
          replacement: [{
            type: 'text',
            text: 'Status: approved',
            marks: [],
          }],
        },
        {
          type: 'replace-inline',
          surface: { type: 'node', id: 'details' },
          from: 0,
          to: detailsLength,
          replacement: [{
            type: 'text',
            text: 'Release notes approved for publication.',
            marks: [],
          }],
        },
      ],
      historyIntent: 'command',
    });
    if (!result.ok) status.textContent = result.error.message;
  };

  const undoHistory = (): void => {
    const result = editor.undo();
    if (!result.ok) status.textContent = result.error.message;
  };

  const redoHistory = (): void => {
    const result = editor.redo();
    if (!result.ok) status.textContent = result.error.message;
  };

  transact.addEventListener('click', runTransaction);
  undo.addEventListener('click', undoHistory);
  redo.addEventListener('click', redoHistory);
  root.replaceChildren(toolbar, editorElement, status);

  return () => {
    transact.removeEventListener('click', runTransaction);
    undo.removeEventListener('click', undoHistory);
    redo.removeEventListener('click', redoHistory);
    connection.disconnect();
    editor.destroy();
    root.replaceChildren();
    delete root.dataset['exampleEditor'];
  };
}

function textOf(
  children: readonly { readonly type: string; readonly text?: string }[],
): string {
  return children.map((child) => child.type === 'text' ? child.text ?? '' : '').join('');
}
