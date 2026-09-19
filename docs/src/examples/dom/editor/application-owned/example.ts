import type { InlineNode } from '@sectile/content/document';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema';
import { compileAuthoringRegistry } from '@sectile/editor/authoring';
import { createEditorSession } from '@sectile/editor/session';
import {
  createEditor,
  markEditorAuthoringMount,
  markEditorInlineSurface,
} from '@sectile/dom/editor';

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
              text: 'Application-owned structured editor',
              marks: [],
            }],
          },
          {
            id: 'intro',
            type: 'paragraph',
            children: [{
              type: 'text',
              text: 'The DOM host owns these elements while the Editor owns document transitions.',
              marks: [],
            }],
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
                  text: 'Component slots stay addressable without turning the DOM into canonical state.',
                  marks: [],
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
  const toggleStrong = document.createElement('button');
  const append = document.createElement('button');
  const status = document.createElement('p');

  root.dataset['exampleEditor'] = '';
  toolbar.dataset['exampleEditorToolbar'] = '';
  status.dataset['exampleEditorStatus'] = '';
  editorElement.setAttribute('aria-label', 'Application-owned structured editor');
  toggleStrong.type = append.type = 'button';
  toggleStrong.textContent = 'Toggle strong';
  append.textContent = 'Append sentence';
  toolbar.append(toggleStrong, append);

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
      status.textContent = `3 structured blocks · revision ${snapshot.revision}`;
    },
  });

  const toggleStrongMark = (): void => {
    const node = editor.getSnapshot().index.getNode('intro');
    if (node?.type !== 'paragraph') return;
    const text = node.children.find((child) => child.type === 'text');
    const length = text?.type === 'text' ? text.text.length : 0;
    const enabled = !(
      text?.type === 'text'
      && text.marks.some((mark) => mark.type === 'strong')
    );
    const result = editor.transact({
      operations: [{
        type: 'set-mark',
        surface: { type: 'node', id: 'intro' },
        from: 0,
        to: length,
        mark: { type: 'strong' },
        enabled,
      }],
      historyIntent: 'command',
    });
    if (!result.ok) status.textContent = result.error.message;
  };

  const appendSentence = (): void => {
    const node = editor.getSnapshot().index.getNode('intro');
    if (node?.type !== 'paragraph') return;
    const length = node.children.reduce(
      (total, child) => total + (child.type === 'text' ? child.text.length : 1),
      0,
    );
    const result = editor.transact({
      operations: [{
        type: 'replace-inline',
        surface: { type: 'node', id: 'intro' },
        from: length,
        to: length,
        replacement: [{
          type: 'text',
          text: ' The connection re-renders from the committed snapshot.',
          marks: [],
        }],
      }],
      historyIntent: 'command',
    });
    if (!result.ok) status.textContent = result.error.message;
  };

  toggleStrong.addEventListener('click', toggleStrongMark);
  append.addEventListener('click', appendSentence);
  root.replaceChildren(toolbar, editorElement, status);

  return () => {
    toggleStrong.removeEventListener('click', toggleStrongMark);
    append.removeEventListener('click', appendSentence);
    connection.disconnect();
    editor.destroy();
    root.replaceChildren();
    delete root.dataset['exampleEditor'];
  };
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
