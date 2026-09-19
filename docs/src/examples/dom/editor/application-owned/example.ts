import type {
  InlineNode,
  JSONValue,
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
    headingLevels: [1, 2, 3],
    groups: [],
    blockContent: {
      kind: 'block',
      allowed: [
        baseRef('heading'),
        baseRef('paragraph'),
        baseRef('blockquote'),
        baseRef('list'),
        baseRef('code-block'),
        componentRef('docs/dom-media'),
        componentRef('docs/dom-callout'),
      ],
    },
    rootContent: {
      kind: 'block',
      allowed: [
        baseRef('heading'),
        baseRef('paragraph'),
        baseRef('blockquote'),
        baseRef('list'),
        baseRef('code-block'),
        componentRef('docs/dom-media'),
        componentRef('docs/dom-callout'),
      ],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text'), baseRef('hard-break')],
    },
    components: [
      {
        id: 'docs/dom-media',
        kind: 'block',
        componentVersion: 1,
        data: {
          type: 'object',
          properties: {
            title: { schema: { type: 'string' } },
            caption: { schema: { type: 'string' } },
          },
        },
        slots: [],
      },
      {
        id: 'docs/dom-callout',
        kind: 'block',
        componentVersion: 1,
        data: { type: 'object', properties: {} },
        slots: [{
          name: 'body',
          kind: 'block',
          allowed: [baseRef('paragraph')],
        }],
      },
    ],
  });
  if (!schemaResult.ok) throw new Error(schemaResult.error.message);

  const authoringResult = compileAuthoringRegistry(schemaResult.value, [
    {
      component: 'docs/dom-media',
      label: 'Media',
      mode: 'atom',
    },
    {
      component: 'docs/dom-callout',
      label: 'Callout',
      mode: 'flow',
    },
  ]);
  if (!authoringResult.ok) throw new Error(authoringResult.error.message);

  const editorResult = createEditorSession({
    schema: schemaResult.value,
    historyLimit: 40,
    document: {
      formatVersion: 1,
      schema: { id: 'docs/dom-editor', version: 1 },
      root: {
        type: 'document',
        children: [
          {
            id: 'title',
            type: 'heading',
            level: 1,
            children: [{
              type: 'text',
              text: 'Application-owned product brief',
              marks: [],
            }],
          },
          {
            id: 'deck',
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'The application creates every DOM node while ',
                marks: [],
              },
              {
                type: 'text',
                text: 'Editor',
                marks: [{ type: 'code' }],
              },
              {
                type: 'text',
                text: ' owns selection, transactions, and history.',
                marks: [],
              },
            ],
          },
          {
            id: 'cover',
            type: 'component',
            kind: 'block',
            component: 'docs/dom-media',
            componentVersion: 1,
            data: {
              title: 'Host-owned rendering',
              caption: 'A schema-backed atom projected entirely by application code.',
            },
            slots: [],
          },
          {
            id: 'overview-title',
            type: 'heading',
            level: 2,
            children: [{
              type: 'text',
              text: 'Production editing without canonical DOM state',
              marks: [],
            }],
          },
          {
            id: 'overview',
            type: 'paragraph',
            children: [{
              type: 'text',
              text: 'Select text in any editable block. The toolbar applies marks only to that logical range and the connection rerenders from the committed document snapshot.',
              marks: [],
            }],
          },
          {
            id: 'quote',
            type: 'blockquote',
            children: [{
              id: 'quote-copy',
              type: 'paragraph',
              children: [{
                type: 'text',
                text: 'The DOM can be replaced after every transaction because document identity does not live in the rendered markup.',
                marks: [{ type: 'emphasis' }],
              }],
            }],
          },
          {
            id: 'highlights-title',
            type: 'heading',
            level: 2,
            children: [{
              type: 'text',
              text: 'What the host is responsible for',
              marks: [],
            }],
          },
          {
            id: 'highlights',
            type: 'list',
            ordered: false,
            children: [
              {
                id: 'highlight-1',
                type: 'list-item',
                children: [{
                  id: 'highlight-1-copy',
                  type: 'paragraph',
                  children: [{
                    type: 'text',
                    text: 'Render the current structured snapshot into application markup.',
                    marks: [],
                  }],
                }],
              },
              {
                id: 'highlight-2',
                type: 'list-item',
                children: [{
                  id: 'highlight-2-copy',
                  type: 'paragraph',
                  children: [{
                    type: 'text',
                    text: 'Mark editable inline surfaces and component authoring mounts.',
                    marks: [],
                  }],
                }],
              },
              {
                id: 'highlight-3',
                type: 'list-item',
                children: [{
                  id: 'highlight-3-copy',
                  type: 'paragraph',
                  children: [{
                    type: 'text',
                    text: 'Dispose listeners and resources when the host is unmounted.',
                    marks: [],
                  }],
                }],
              },
            ],
          },
          {
            id: 'code-sample',
            type: 'code-block',
            text: "const connection = createEditor({\n  root, editor, authoring, render\n})",
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
                  text: 'The callout slot remains editable even though its surrounding component markup is host-defined.',
                  marks: [{ type: 'strong' }],
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
  const historyGroup = document.createElement('div');
  const formatGroup = document.createElement('div');
  const status = document.createElement('span');
  const footer = document.createElement('div');
  const markButtons: Record<FormatMark, HTMLButtonElement> = {
    strong: document.createElement('button'),
    emphasis: document.createElement('button'),
    code: document.createElement('button'),
  };
  const clear = document.createElement('button');
  const undo = document.createElement('button');
  const redo = document.createElement('button');
  const separator = document.createElement('span');

  root.dataset['exampleEditor'] = '';
  toolbar.dataset['exampleEditorToolbar'] = '';
  historyGroup.dataset['exampleEditorToolbarGroup'] = '';
  formatGroup.dataset['exampleEditorToolbarGroup'] = '';
  status.dataset['exampleEditorToolbarState'] = '';
  footer.dataset['exampleEditorFooter'] = '';
  separator.dataset['exampleEditorToolbarSeparator'] = '';
  separator.setAttribute('aria-hidden', 'true');
  editorElement.setAttribute('aria-label', 'Application-owned production editor');

  configureToolButton(undo, '↶', 'Undo');
  configureToolButton(redo, '↷', 'Redo');
  configureToolButton(markButtons.strong, 'B', 'Bold');
  configureToolButton(markButtons.emphasis, 'I', 'Italic');
  configureToolButton(markButtons.code, '</>', 'Inline code');
  configureToolButton(clear, 'Tx', 'Clear formatting');

  historyGroup.append(undo, redo);
  formatGroup.append(
    markButtons.strong,
    markButtons.emphasis,
    markButtons.code,
    clear,
  );
  toolbar.append(historyGroup, separator, formatGroup, status);

  const connection = createEditor({
    root: editorElement,
    editor,
    authoring: authoringResult.value,
    render({ snapshot, authoringSurfaces }) {
      const article = document.createElement('article');
      article.dataset['exampleEditorDocument'] = '';

      appendInlineSurface(
        article,
        'h1',
        'title',
        inlineChildren(snapshot, 'title'),
      );

      const deck = appendInlineSurface(
        article,
        'p',
        'deck',
        inlineChildren(snapshot, 'deck'),
      );
      deck.dataset['exampleEditorDeck'] = '';

      const media = document.createElement('figure');
      media.dataset['exampleEditorMedia'] = '';
      media.contentEditable = 'false';
      const mediaArt = document.createElement('div');
      mediaArt.dataset['exampleEditorMediaArt'] = '';
      const mediaKicker = document.createElement('span');
      mediaKicker.textContent = 'Structured content';
      const mediaTitle = document.createElement('strong');
      mediaTitle.textContent = componentString(snapshot, 'cover', 'title');
      mediaArt.append(mediaKicker, mediaTitle);
      const mediaCaption = document.createElement('figcaption');
      mediaCaption.textContent = componentString(snapshot, 'cover', 'caption');
      media.append(mediaArt, mediaCaption);
      article.append(media);

      appendInlineSurface(
        article,
        'h2',
        'overview-title',
        inlineChildren(snapshot, 'overview-title'),
      );
      appendInlineSurface(
        article,
        'p',
        'overview',
        inlineChildren(snapshot, 'overview'),
      );

      const quote = document.createElement('blockquote');
      quote.dataset['exampleEditorQuote'] = '';
      appendInlineSurface(
        quote,
        'p',
        'quote-copy',
        inlineChildren(snapshot, 'quote-copy'),
      );
      article.append(quote);

      appendInlineSurface(
        article,
        'h2',
        'highlights-title',
        inlineChildren(snapshot, 'highlights-title'),
      );

      const list = document.createElement('ul');
      list.dataset['exampleEditorList'] = '';
      for (const id of [
        'highlight-1-copy',
        'highlight-2-copy',
        'highlight-3-copy',
      ]) {
        const item = document.createElement('li');
        appendInlineSurface(item, 'p', id, inlineChildren(snapshot, id));
        list.append(item);
      }
      article.append(list);

      const pre = document.createElement('pre');
      pre.dataset['exampleEditorCode'] = '';
      pre.contentEditable = 'false';
      const code = document.createElement('code');
      code.textContent = codeBlockText(snapshot, 'code-sample');
      pre.append(code);
      article.append(pre);

      const callout = document.createElement('aside');
      callout.dataset['exampleEditorCallout'] = '';
      const label = document.createElement('span');
      label.dataset['exampleEditorCalloutLabel'] = '';
      label.textContent = 'Component slot';
      callout.append(label);

      const surface = authoringSurfaces.find((candidate) => candidate.id === 'callout');
      const mount = surface?.mounts.find((candidate) => candidate.name === 'body');
      if (mount !== undefined) {
        const mountElement = document.createElement('div');
        markEditorAuthoringMount(mountElement, 'callout', mount);
        appendInlineSurface(
          mountElement,
          'p',
          'callout-copy',
          inlineChildren(snapshot, 'callout-copy'),
        );
        callout.append(mountElement);
      }
      article.append(callout);

      editorElement.replaceChildren(article);
      updateToolbar(snapshot);
      footer.replaceChildren(
        textSpan(`Revision ${snapshot.revision}`),
        textSpan(snapshot.canUndo ? 'Unsaved local history' : 'Document is current'),
      );
    },
  });

  const preventToolbarFocus = (event: MouseEvent): void => {
    event.preventDefault();
  };
  const allButtons = [
    undo,
    redo,
    markButtons.strong,
    markButtons.emphasis,
    markButtons.code,
    clear,
  ];
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

  const clearFormatting = (): void => {
    const current = editor.getSnapshot();
    const range = selectedInlineRange(current);
    if (range === null || current.selection === null) return;

    const result = editor.transact({
      operations: [
        markOperation(range, markByType.strong, false),
        markOperation(range, markByType.emphasis, false),
        markOperation(range, markByType.code, false),
      ],
      selection: current.selection,
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
  const keyboardShortcuts = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      toggleMark('strong');
      return;
    }
    if (key === 'i') {
      event.preventDefault();
      toggleMark('emphasis');
      return;
    }
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redoHistory();
      else undoHistory();
    }
  };

  clear.addEventListener('click', clearFormatting);
  undo.addEventListener('click', undoHistory);
  redo.addEventListener('click', redoHistory);
  editorElement.addEventListener('keydown', keyboardShortcuts);

  const unsubscribe = editor.subscribe((event) => {
    updateToolbar(event.current);
  });

  root.replaceChildren(toolbar, editorElement, footer);
  updateToolbar(editor.getSnapshot());

  return () => {
    unsubscribe();
    for (const type of Object.keys(markHandlers) as FormatMark[]) {
      markButtons[type].removeEventListener('click', markHandlers[type]);
    }
    clear.removeEventListener('click', clearFormatting);
    undo.removeEventListener('click', undoHistory);
    redo.removeEventListener('click', redoHistory);
    editorElement.removeEventListener('keydown', keyboardShortcuts);
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
    clear.disabled = !formatEnabled;
    undo.disabled = !value.canUndo;
    redo.disabled = !value.canRedo;
    status.textContent = selectionLabel(value);
  }
}

function configureToolButton(
  button: HTMLButtonElement,
  text: string,
  label: string,
): void {
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.title = label;
}

function textSpan(value: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = value;
  return span;
}

function markOperation(
  range: InlineRange,
  mark: TextMark,
  enabled: boolean,
) {
  return {
    type: 'set-mark' as const,
    surface: range.surface,
    from: range.from,
    to: range.to,
    mark,
    enabled,
  };
}

function inlineChildren(
  value: EditorSessionSnapshot,
  id: string,
): readonly InlineNode[] {
  const node = value.index.getNode(id);
  return node?.type === 'paragraph' || node?.type === 'heading'
    ? node.children
    : [];
}

function codeBlockText(value: EditorSessionSnapshot, id: string): string {
  const node = value.index.getNode(id);
  return node?.type === 'code-block' ? node.text : '';
}

function componentString(
  value: EditorSessionSnapshot,
  id: string,
  key: string,
): string {
  const node = value.index.getNode(id);
  if (node?.type !== 'component') return '';
  return stringFromData(node.data, key);
}

function stringFromData(data: JSONValue, key: string): string {
  if (data === null || Array.isArray(data) || typeof data !== 'object') return '';
  const record = data as Readonly<Record<string, JSONValue>>;
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function appendInlineSurface(
  parent: HTMLElement,
  tag: 'h1' | 'h2' | 'p',
  id: string,
  children: readonly InlineNode[],
): HTMLElement {
  const element = document.createElement(tag);
  markEditorInlineSurface(element, { type: 'node', id });
  appendInline(element, children);
  parent.append(element);
  return element;
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

function selectionLabel(value: EditorSessionSnapshot): string {
  const range = selectedInlineRange(value);
  return range === null
    ? 'Select text to format'
    : `${range.to - range.from} characters selected`;
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
