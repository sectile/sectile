import type {
  InlineNode,
  TextMark,
} from '@sectile/content/document';
import type { InlineSurface } from '@sectile/content/position';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema';
import { compileAuthoringRegistry } from '@sectile/editor/authoring';
import {
  createEditorSession,
  type EditorSessionSnapshot,
} from '@sectile/editor/session';
import {
  createEditor,
  markEditorAuthoringMount,
  markEditorInlineSurface,
} from '@sectile/dom/editor';

type FormatMark = 'strong' | 'emphasis' | 'code';

interface InlineRange {
  readonly surface: InlineSurface;
  readonly from: number;
  readonly to: number;
}

const markByType = {
  strong: { type: 'strong' },
  emphasis: { type: 'emphasis' },
  code: { type: 'code' },
} as const satisfies Record<FormatMark, TextMark>;

export function mountExample(root: HTMLElement): () => void {
  const schemaResult = compileContentSchema({
    id: 'docs/dom-editor',
    version: 1,
    groups: [],
    blockContent: {
      kind: 'block',
      allowed: [
        baseRef('heading'),
        baseRef('paragraph'),
        componentRef('docs/dom-callout'),
      ],
    },
    rootContent: {
      kind: 'block',
      allowed: [
        baseRef('heading'),
        baseRef('paragraph'),
        componentRef('docs/dom-callout'),
      ],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [{
      id: 'docs/dom-callout',
      kind: 'block',
      componentVersion: 1,
      data: { type: 'object', properties: {} },
      slots: [{
        name: 'body',
        kind: 'block',
        allowed: [baseRef('paragraph')],
      }],
    }],
  });
  if (!schemaResult.ok) throw new Error(schemaResult.error.message);

  const authoringResult = compileAuthoringRegistry(schemaResult.value, [{
    component: 'docs/dom-callout',
    label: 'Callout',
    mode: 'flow',
  }]);
  if (!authoringResult.ok) throw new Error(authoringResult.error.message);

  const editorResult = createEditorSession({
    schema: schemaResult.value,
    historyLimit: 20,
    document: {
      formatVersion: 1,
      schema: { id: 'docs/dom-editor', version: 1 },
      root: {
        type: 'document',
        children: [
          {
            id: 'title',
            type: 'heading',
            level: 2,
            children: [{
              type: 'text',
              text: 'Product launch brief',
              marks: [],
            }],
          },
          {
            id: 'intro',
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Select a range in this application-owned DOM and format ',
                marks: [],
              },
              {
                type: 'text',
                text: 'only that selection',
                marks: [{ type: 'strong' }],
              },
              {
                type: 'text',
                text: '. The Editor keeps the logical selection and history.',
                marks: [],
              },
            ],
          },
          {
            id: 'callout',
            type: 'component',
            kind: 'block',
            component: 'docs/dom-callout',
            componentVersion: 1,
            data: {},
            slots: [{
              name: 'body',
              kind: 'block',
              content: [{
                id: 'callout-copy',
                type: 'paragraph',
                children: [{
                  type: 'text',
                  text: 'This callout remains a schema-backed component slot.',
                  marks: [{ type: 'emphasis' }],
                }],
              }],
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
  const status = document.createElement('p');
  const markButtons: Record<FormatMark, HTMLButtonElement> = {
    strong: document.createElement('button'),
    emphasis: document.createElement('button'),
    code: document.createElement('button'),
  };
  const undo = document.createElement('button');
  const redo = document.createElement('button');
  const separator = document.createElement('span');

  root.dataset['exampleEditor'] = '';
  toolbar.dataset['exampleEditorToolbar'] = '';
  status.dataset['exampleEditorStatus'] = '';
  separator.dataset['exampleEditorToolbarSeparator'] = '';
  separator.setAttribute('aria-hidden', 'true');
  editorElement.setAttribute('aria-label', 'Application-owned rich text editor');

  markButtons.strong.textContent = 'Bold';
  markButtons.emphasis.textContent = 'Italic';
  markButtons.code.textContent = 'Code';
  undo.textContent = 'Undo';
  redo.textContent = 'Redo';

  const allButtons = [
    markButtons.strong,
    markButtons.emphasis,
    markButtons.code,
    undo,
    redo,
  ];
  for (const button of allButtons) button.type = 'button';
  toolbar.append(
    markButtons.strong,
    markButtons.emphasis,
    markButtons.code,
    separator,
    undo,
    redo,
  );

  const connection = createEditor({
    root: editorElement,
    editor,
    authoring: authoringResult.value,
    render({ snapshot, authoringSurfaces }) {
      const title = snapshot.index.getNode('title');
      const intro = snapshot.index.getNode('intro');
      const calloutCopy = snapshot.index.getNode('callout-copy');
      if (
        title?.type !== 'heading'
        || intro?.type !== 'paragraph'
        || calloutCopy?.type !== 'paragraph'
      ) {
        return;
      }

      const article = document.createElement('article');
      article.dataset['exampleEditorDocument'] = '';

      const heading = document.createElement('h2');
      markEditorInlineSurface(heading, { type: 'node', id: 'title' });
      appendInline(heading, title.children);

      const paragraph = document.createElement('p');
      markEditorInlineSurface(paragraph, { type: 'node', id: 'intro' });
      appendInline(paragraph, intro.children);

      const callout = document.createElement('aside');
      callout.dataset['exampleEditorCallout'] = '';
      const label = document.createElement('span');
      label.dataset['exampleEditorCalloutLabel'] = '';
      label.textContent = 'Callout component';
      callout.append(label);

      const surface = authoringSurfaces.find((candidate) => candidate.id === 'callout');
      const mount = surface?.mounts.find((candidate) => candidate.name === 'body');
      if (mount !== undefined) {
        const mountElement = document.createElement('div');
        markEditorAuthoringMount(mountElement, 'callout', mount);
        const calloutParagraph = document.createElement('p');
        markEditorInlineSurface(calloutParagraph, {
          type: 'node',
          id: 'callout-copy',
        });
        appendInline(calloutParagraph, calloutCopy.children);
        mountElement.append(calloutParagraph);
        callout.append(mountElement);
      }

      article.append(heading, paragraph, callout);
      editorElement.replaceChildren(article);
      updateToolbar(snapshot);
    },
  });

  const preventToolbarFocus = (event: MouseEvent): void => {
    event.preventDefault();
  };
  for (const button of allButtons) {
    button.addEventListener('mousedown', preventToolbarFocus);
  }

  const markHandlers: Record<FormatMark, () => void> = {
    strong: () => toggleMark('strong'),
    emphasis: () => toggleMark('emphasis'),
    code: () => toggleMark('code'),
  };
  for (const type of Object.keys(markHandlers) as FormatMark[]) {
    markButtons[type].addEventListener('click', markHandlers[type]);
  }

  const undoHistory = (): void => {
    const result = editor.undo();
    if (!result.ok) status.textContent = result.error.message;
  };
  const redoHistory = (): void => {
    const result = editor.redo();
    if (!result.ok) status.textContent = result.error.message;
  };
  undo.addEventListener('click', undoHistory);
  redo.addEventListener('click', redoHistory);

  const unsubscribe = editor.subscribe((event) => {
    updateToolbar(event.current);
  });

  root.replaceChildren(toolbar, editorElement, status);
  updateToolbar(editor.getSnapshot());

  return () => {
    unsubscribe();
    for (const type of Object.keys(markHandlers) as FormatMark[]) {
      markButtons[type].removeEventListener('click', markHandlers[type]);
    }
    undo.removeEventListener('click', undoHistory);
    redo.removeEventListener('click', redoHistory);
    for (const button of allButtons) {
      button.removeEventListener('mousedown', preventToolbarFocus);
    }
    connection.disconnect();
    editor.destroy();
    root.replaceChildren();
    delete root.dataset['exampleEditor'];
  };

  function toggleMark(type: FormatMark): void {
    const current = editor.getSnapshot();
    const range = selectedInlineRange(current);
    if (range === null || current.selection === null) return;

    const result = editor.transact({
      operations: [{
        type: 'set-mark',
        surface: range.surface,
        from: range.from,
        to: range.to,
        mark: markByType[type],
        enabled: !selectedRangeHasMark(current, type),
      }],
      selection: current.selection,
      historyIntent: 'command',
    });
    if (!result.ok) status.textContent = result.error.message;
  }

  function updateToolbar(value: EditorSessionSnapshot): void {
    const formatEnabled = canFormat(value);
    for (const type of Object.keys(markButtons) as FormatMark[]) {
      const button = markButtons[type];
      button.disabled = !formatEnabled;
      button.setAttribute(
        'aria-pressed',
        selectedRangeHasMark(value, type) ? 'true' : 'false',
      );
    }
    undo.disabled = !value.canUndo;
    redo.disabled = !value.canRedo;

    const range = selectedInlineRange(value);
    status.textContent = range === null
      ? `Select text inside one block to format it · revision ${value.revision}`
      : `${range.to - range.from} characters selected · revision ${value.revision}`;
  }
}

function selectedInlineRange(value: EditorSessionSnapshot): InlineRange | null {
  const selection = value.selection;
  if (
    selection === null
    || selection.anchor.type !== 'inline'
    || selection.focus.type !== 'inline'
    || !sameSurface(selection.anchor.surface, selection.focus.surface)
    || selection.anchor.offset === selection.focus.offset
  ) {
    return null;
  }
  return {
    surface: selection.anchor.surface,
    from: Math.min(selection.anchor.offset, selection.focus.offset),
    to: Math.max(selection.anchor.offset, selection.focus.offset),
  };
}

function sameSurface(left: InlineSurface, right: InlineSurface): boolean {
  return left.type === right.type
    && left.id === right.id
    && (
      left.type === 'node'
      || (right.type === 'slot' && left.slot === right.slot)
    );
}

function canFormat(value: EditorSessionSnapshot): boolean {
  return !value.interaction.disabled
    && !value.interaction.readOnly
    && selectedInlineRange(value) !== null;
}

function selectedRangeHasMark(
  value: EditorSessionSnapshot,
  type: FormatMark,
): boolean {
  const range = selectedInlineRange(value);
  if (range === null || range.surface.type !== 'node') return false;
  const node = value.index.getNode(range.surface.id);
  if (node?.type !== 'paragraph' && node?.type !== 'heading') return false;

  let cursor = 0;
  let foundText = false;
  for (const child of node.children) {
    const length = child.type === 'text' ? child.text.length : 1;
    const end = cursor + length;
    if (
      child.type === 'text'
      && end > range.from
      && cursor < range.to
    ) {
      foundText = true;
      if (!child.marks.some((mark) => mark.type === type)) return false;
    }
    cursor = end;
  }
  return foundText;
}

function appendInline(
  parent: HTMLElement,
  children: readonly InlineNode[],
): void {
  for (const child of children) {
    if (child.type !== 'text') continue;
    let content: Node = document.createTextNode(child.text);
    for (const mark of child.marks) {
      const wrapper = document.createElement(
        mark.type === 'strong'
          ? 'strong'
          : mark.type === 'emphasis'
            ? 'em'
            : mark.type === 'code'
              ? 'code'
              : 'a',
      );
      if (mark.type === 'link') {
        wrapper.setAttribute('href', mark.href);
        if (mark.title !== undefined) wrapper.setAttribute('title', mark.title);
      }
      wrapper.append(content);
      content = wrapper;
    }
    parent.append(content);
  }
}
