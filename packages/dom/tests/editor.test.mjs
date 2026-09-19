import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema';
import {
  compileAuthoringRegistry,
} from '@sectile/editor/authoring';
import {
  createEditorSession,
} from '@sectile/editor/session';
import {
  createEditor,
  EDITOR_FRAGMENT_MIME,
  markEditorAuthoringMount,
  markEditorHardBreak,
  markEditorInlineAtom,
  markEditorInlineSurface,
  markEditorIsolatedFrame,
} from '../.verification-dist/editor.js';

const emptyData = Object.freeze({
  type: 'object',
  properties: Object.freeze({}),
});

function schema() {
  const result = compileContentSchema({
    id: 'dom/editor-test',
    version: 1,
    groups: [
      {
        id: 'blocks',
        kind: 'block',
        members: [
          baseRef('paragraph'),
          componentRef('dom/card'),
        ],
      },
      {
        id: 'inline',
        kind: 'inline',
        members: [
          baseRef('text'),
          baseRef('hard-break'),
          componentRef('dom/badge'),
        ],
      },
    ],
    blockContent: {
      kind: 'block',
      allowed: [{ type: 'group', id: 'blocks' }],
    },
    rootContent: {
      kind: 'block',
      allowed: [{ type: 'group', id: 'blocks' }],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [{ type: 'group', id: 'inline' }],
    },
    components: [
      {
        id: 'dom/card',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: [
          {
            name: 'title',
            kind: 'inline',
            allowed: [{ type: 'group', id: 'inline' }],
          },
          {
            name: 'body',
            kind: 'block',
            allowed: [{ type: 'group', id: 'blocks' }],
          },
        ],
      },
      {
        id: 'dom/badge',
        kind: 'inline',
        componentVersion: 1,
        data: {
          type: 'object',
          properties: {
            label: {
              schema: { type: 'string' },
            },
          },
        },
        slots: [],
      },
    ],
  });
  assert.equal(result.ok, true);
  return result.value;
}

function text(value, marks = []) {
  return {
    type: 'text',
    text: value,
    marks,
  };
}

function paragraph(id, children) {
  return {
    id,
    type: 'paragraph',
    children,
  };
}

function documentFixture() {
  return {
    formatVersion: 1,
    schema: {
      id: 'dom/editor-test',
      version: 1,
    },
    root: {
      type: 'document',
      children: [
        paragraph('p1', [text('hello')]),
        paragraph('rich', [
          text('bo', [{ type: 'strong' }]),
          text('ld'),
        ]),
        {
          id: 'card-1',
          type: 'component',
          kind: 'block',
          component: 'dom/card',
          componentVersion: 1,
          data: {},
          slots: [
            {
              name: 'title',
              kind: 'inline',
              content: [text('Title')],
            },
            {
              name: 'body',
              kind: 'block',
              content: [
                paragraph('p2', [
                  text('A'),
                  { type: 'hard-break' },
                  text('B'),
                ]),
              ],
            },
          ],
        },
      ],
    },
  };
}

function setup(options = {}) {
  const window = new Window();
  const document = window.document;
  const root = document.createElement('div');
  document.body.append(root);
  const compiled = schema();
  const authoring = compileAuthoringRegistry(compiled);
  assert.equal(authoring.ok, true);
  let generatedID = 0;
  const session = createEditorSession({
    document: options.document ?? documentFixture(),
    schema: compiled,
    historyLimit: 20,
    allocateNodeID: options.allocateNodeID
      ?? (() => `generated-${++generatedID}`),
  });
  assert.equal(session.ok, true);
  const errors = [];
  const connection = createEditor({
    root,
    editor: session.value,
    authoring: authoring.value,
    render: renderFixture,
    onError: (error) => errors.push(error),
  });
  return {
    window,
    document,
    root,
    session: session.value,
    connection,
    errors,
  };
}

function renderFixture({ root, snapshot, authoringSurfaces }) {
  const surfaces = new Map(
    authoringSurfaces.map((surface) => [surface.id, surface]),
  );
  root.replaceChildren();
  for (const node of snapshot.document.root.children) {
    root.append(renderBlock(root.ownerDocument, node, surfaces));
  }
}

function renderBlock(document, node, surfaces) {
  if (node.type === 'paragraph' || node.type === 'heading') {
    const element = document.createElement(
      node.type === 'heading' ? `h${node.level}` : 'p',
    );
    markEditorInlineSurface(element, {
      type: 'node',
      id: node.id,
    });
    renderInline(document, element, node.children);
    return element;
  }

  if (node.type === 'blockquote') {
    const element = document.createElement('blockquote');
    for (const child of node.children) {
      element.append(renderBlock(document, child, surfaces));
    }
    return element;
  }

  if (node.type === 'list') {
    const element = document.createElement(node.ordered ? 'ol' : 'ul');
    for (const child of node.children) {
      element.append(renderBlock(document, child, surfaces));
    }
    return element;
  }

  if (node.type === 'list-item') {
    const element = document.createElement('li');
    for (const child of node.children) {
      element.append(renderBlock(document, child, surfaces));
    }
    return element;
  }

  if (node.type === 'code-block') {
    const element = document.createElement('pre');
    element.textContent = node.text;
    return element;
  }

  const surface = surfaces.get(node.id);
  assert.ok(surface);
  const wrapper = document.createElement('section');
  wrapper.dataset.component = node.component;
  if (surface.mode === 'atom') {
    wrapper.contentEditable = 'false';
    return wrapper;
  }
  if (surface.mode === 'slots') wrapper.contentEditable = 'false';

  for (const mount of surface.mounts) {
    const slot = node.slots.find((candidate) => candidate.name === mount.name);
    assert.ok(slot);
    const element = document.createElement('div');
    markEditorAuthoringMount(element, node.id, mount);
    if (slot.kind === 'inline') {
      renderInline(document, element, slot.content);
    } else {
      for (const child of slot.content) {
        element.append(renderBlock(document, child, surfaces));
      }
    }
    wrapper.append(element);
  }
  return wrapper;
}

function renderInline(document, parent, nodes) {
  for (const node of nodes) {
    if (node.type === 'text') {
      let target = parent;
      for (const mark of node.marks) {
        const wrapper = document.createElement(
          mark.type === 'strong' ? 'strong' : 'span',
        );
        target.append(wrapper);
        target = wrapper;
      }
      target.append(document.createTextNode(node.text));
      continue;
    }
    if (node.type === 'hard-break') {
      const element = document.createElement('br');
      markEditorHardBreak(element);
      parent.append(element);
      continue;
    }
    const atom = document.createElement('span');
    atom.textContent = node.data.label;
    markEditorInlineAtom(atom, node.id);
    parent.append(atom);
  }
}

function compositionEvent(window, type, data) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'data', {
    value: data,
    enumerable: true,
  });
  return event;
}

function collapsed(id, offset) {
  const point = {
    type: 'inline',
    surface: { type: 'node', id },
    offset,
    affinity: 'after',
  };
  return {
    anchor: point,
    focus: point,
    direction: 'forward',
  };
}

function slotCollapsed(id, slot, offset) {
  const point = {
    type: 'inline',
    surface: { type: 'slot', id, slot },
    offset,
    affinity: 'after',
  };
  return {
    anchor: point,
    focus: point,
    direction: 'forward',
  };
}

function paragraphText(session, id) {
  const node = session.getSnapshot().index.getNode(id);
  assert.equal(node?.type, 'paragraph');
  return node.children
    .map((child) => child.type === 'text' ? child.text : '\n')
    .join('');
}

function slotText(session, id, slotName) {
  const node = session.getSnapshot().index.getNode(id);
  assert.equal(node?.type, 'component');
  const slot = node.slots.find((candidate) => candidate.name === slotName);
  assert.equal(slot?.kind, 'inline');
  return slot.content.map((child) => child.type === 'text' ? child.text : '').join('');
}

test('prepared text edits reuse the current authoring surface projection', () => {
  const window = new Window();
  const document = window.document;
  const root = document.createElement('div');
  document.body.append(root);
  const compiled = schema();
  const baseAuthoring = compileAuthoringRegistry(compiled);
  assert.equal(baseAuthoring.ok, true);
  let definitionCalls = 0;
  const authoring = Object.freeze({
    definition: (component) => {
      definitionCalls += 1;
      return baseAuthoring.value.definition(component);
    },
    all: () => baseAuthoring.value.all(),
  });
  const session = createEditorSession({
    document: documentFixture(),
    schema: compiled,
    historyLimit: 20,
  });
  assert.equal(session.ok, true);
  const connection = createEditor({
    root,
    editor: session.value,
    authoring,
    render: renderFixture,
  });
  const initialDefinitionCalls = definitionCalls;
  assert.ok(initialDefinitionCalls > 0);

  const edited = session.value.replaceInlineText({
    surface: { type: 'node', id: 'p1' },
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(edited.ok, true);
  assert.equal(root.textContent.includes('hello!'), true);
  assert.equal(definitionCalls, initialDefinitionCalls);

  const transacted = session.value.transact({
    operations: [{
      type: 'replace-inline',
      surface: { type: 'node', id: 'p1' },
      from: 6,
      to: 6,
      replacement: [text('?')],
    }],
    historyIntent: 'command',
  });
  assert.equal(transacted.ok, true);
  assert.ok(definitionCalls > initialDefinitionCalls);
  connection.disconnect();
});

test('nested mark wrappers round-trip logical selection without renderer coupling', () => {
  const { connection, session } = setup();
  const selection = collapsed('rich', 1);
  assert.equal(session.setSelection(selection).ok, true);
  assert.equal(connection.setSelection(selection), true);
  assert.deepEqual(connection.readSelection(), {
    status: 'mapped',
    selection,
  });
  connection.disconnect();
});

test('beforeinput insertText uses the prepared Editor text path and rerenders', () => {
  const { window, root, session, connection, errors } = setup();
  const selection = collapsed('p1', 5);
  assert.equal(connection.setSelection(selection), true);
  const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);
  const event = new window.InputEvent('beforeinput', {
    inputType: 'insertText',
    data: '!',
    bubbles: true,
    cancelable: true,
  });
  surface.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(paragraphText(session, 'p1'), 'hello!');
  assert.equal(root.textContent.includes('hello!'), true);
  assert.deepEqual(errors, []);
  assert.equal(session.undo().ok, true);
  assert.equal(paragraphText(session, 'p1'), 'hello');
  connection.disconnect();
});

test('collapsed typing marks drive subsequent beforeinput text formatting', () => {
  const { window, root, session, connection, errors } = setup();
  const selection = collapsed('p1', 5);
  assert.equal(session.setSelection(selection).ok, true);
  assert.equal(connection.setSelection(selection), true);

  const enabled = session.setTypingMark('strong', true);
  assert.equal(enabled.ok, true);
  assert.deepEqual(enabled.value.snapshot.typingMarks, [{ type: 'strong' }]);

  let surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);
  surface.dispatchEvent(new window.InputEvent('beforeinput', {
    inputType: 'insertText',
    data: 'X',
    bubbles: true,
    cancelable: true,
  }));

  let node = session.getSnapshot().index.getNode('p1');
  assert.equal(node?.type, 'paragraph');
  assert.deepEqual(node.children, [
    text('hello'),
    text('X', [{ type: 'strong' }]),
  ]);
  assert.deepEqual(session.getSnapshot().typingMarks, [{ type: 'strong' }]);

  const disabled = session.setTypingMark('strong', false);
  assert.equal(disabled.ok, true);
  assert.deepEqual(disabled.value.snapshot.typingMarks, []);

  surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);
  surface.dispatchEvent(new window.InputEvent('beforeinput', {
    inputType: 'insertText',
    data: 'Y',
    bubbles: true,
    cancelable: true,
  }));

  node = session.getSnapshot().index.getNode('p1');
  assert.equal(node?.type, 'paragraph');
  assert.deepEqual(node.children, [
    text('hello'),
    text('X', [{ type: 'strong' }]),
    text('Y'),
  ]);
  assert.deepEqual(errors, []);

  const undone = session.undo();
  assert.equal(undone.ok, true);
  assert.deepEqual(undone.value.snapshot.typingMarks, []);
  connection.disconnect();
});

test('simple inline component slots use semantic Editor transactions', () => {
  const { window, root, session, connection, errors } = setup();
  const selection = slotCollapsed('card-1', 'title', 5);
  assert.equal(connection.setSelection(selection), true);
  const surface = root.querySelector(
    '[data-sectile-editor-surface-id="card-1"][data-sectile-editor-surface-slot="title"]',
  );
  assert.ok(surface);
  surface.dispatchEvent(new window.InputEvent('beforeinput', {
    inputType: 'insertText',
    data: '!',
    bubbles: true,
    cancelable: true,
  }));
  assert.equal(slotText(session, 'card-1', 'title'), 'Title!');
  assert.deepEqual(errors, []);
  connection.disconnect();
});

test('typing into multi-run rich content preserves logical mark context', () => {
  const { window, root, session, connection, errors } = setup();
  const selection = collapsed('rich', 2);
  assert.equal(connection.setSelection(selection), true);
  const surface = root.querySelector('[data-sectile-editor-surface-id="rich"]');
  assert.ok(surface);
  const event = new window.InputEvent('beforeinput', {
    inputType: 'insertText',
    data: 'X',
    bubbles: true,
    cancelable: true,
  });
  surface.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  const node = session.getSnapshot().index.getNode('rich');
  assert.equal(node?.type, 'paragraph');
  assert.deepEqual(node.children, [
    {
      type: 'text',
      text: 'boX',
      marks: [{ type: 'strong' }],
    },
    {
      type: 'text',
      text: 'ld',
      marks: [],
    },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(root.textContent.includes('boXld'), true);
  assert.equal(session.undo().ok, true);
  assert.equal(root.textContent.includes('bold'), true);
  connection.disconnect();
});

test('DOM selection rejects surrogate interiors and maps valid Unicode boundaries', () => {
  const document = documentFixture();
  document.root.children[0].children = [text('A😀B')];
  const { root, connection } = setup({ document });

  assert.equal(connection.setSelection(collapsed('p1', 2)), false);
  assert.equal(connection.setSelection(collapsed('p1', 3)), true);

  const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);
  const textNode = surface.firstChild;
  assert.equal(textNode?.nodeType, 3);
  const selection = root.ownerDocument.defaultView.getSelection();
  selection.setBaseAndExtent(textNode, 2, textNode, 2);
  assert.deepEqual(connection.readSelection(), { status: 'invalid' });
  connection.disconnect();
});

test('backward and forward deletion consume one valid Unicode content unit', () => {
  {
    const document = documentFixture();
    document.root.children[0].children = [text('A😀B')];
    const { window, root, session, connection, errors } = setup({ document });
    assert.equal(connection.setSelection(collapsed('p1', 3)), true);
    const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
    assert.ok(surface);
    const event = new window.InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      bubbles: true,
      cancelable: true,
    });
    surface.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(paragraphText(session, 'p1'), 'AB');
    assert.deepEqual(errors, []);
    connection.disconnect();
  }

  {
    const document = documentFixture();
    document.root.children[0].children = [text('A😀B')];
    const { window, root, session, connection, errors } = setup({ document });
    assert.equal(connection.setSelection(collapsed('p1', 1)), true);
    const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
    assert.ok(surface);
    const event = new window.InputEvent('beforeinput', {
      inputType: 'deleteContentForward',
      bubbles: true,
      cancelable: true,
    });
    surface.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(paragraphText(session, 'p1'), 'AB');
    assert.deepEqual(errors, []);
    connection.disconnect();
  }
});

test('composition commits one Editor history entry', () => {
  const { window, root, session, connection, errors } = setup();
  const selection = collapsed('p1', 5);
  assert.equal(connection.setSelection(selection), true);
  const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);
  root.dispatchEvent(compositionEvent(window, 'compositionstart', ''));
  root.dispatchEvent(compositionEvent(window, 'compositionupdate', '글'));
  root.dispatchEvent(compositionEvent(window, 'compositionend', '글'));
  assert.deepEqual(errors, []);
  assert.equal(paragraphText(session, 'p1'), 'hello글');
  assert.equal(session.undo().ok, true);
  assert.equal(paragraphText(session, 'p1'), 'hello');
  connection.disconnect();
});

test('portable clipboard copy/paste preserves text fragments and cut mutates through Editor', () => {
  const { window, root, session, connection } = setup();
  const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);

  const rangeSelection = {
    anchor: {
      type: 'inline',
      surface: { type: 'node', id: 'p1' },
      offset: 1,
      affinity: 'after',
    },
    focus: {
      type: 'inline',
      surface: { type: 'node', id: 'p1' },
      offset: 4,
      affinity: 'after',
    },
    direction: 'forward',
  };
  assert.equal(connection.setSelection(rangeSelection), true);

  const clipboard = new window.DataTransfer();
  const copy = new window.ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    clipboardData: clipboard,
  });
  surface.dispatchEvent(copy);
  assert.equal(copy.defaultPrevented, true);
  assert.equal(clipboard.getData('text/plain'), 'ell');
  assert.equal(clipboard.getData(EDITOR_FRAGMENT_MIME).length > 0, true);

  const end = collapsed('p1', 5);
  assert.equal(connection.setSelection(end), true);
  const paste = new window.ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: clipboard,
  });
  surface.dispatchEvent(paste);
  assert.equal(paragraphText(session, 'p1'), 'helloell');

  const cutClipboard = new window.DataTransfer();
  assert.equal(connection.setSelection(rangeSelection), true);
  const currentSurface = root.querySelector(
    '[data-sectile-editor-surface-id="p1"]',
  );
  assert.ok(currentSurface);
  const cut = new window.ClipboardEvent('cut', {
    bubbles: true,
    cancelable: true,
    clipboardData: cutClipboard,
  });
  currentSurface.dispatchEvent(cut);
  assert.equal(cut.defaultPrevented, true);
  assert.equal(cutClipboard.getData('text/plain'), 'ell');
  assert.equal(paragraphText(session, 'p1'), 'hoell');
  connection.disconnect();
});

test('inline component fragment paste allocates a fresh ID through Editor', () => {
  const document = documentFixture();
  document.root.children[0].children = [
    text('A'),
    {
      id: 'badge-1',
      type: 'component',
      kind: 'inline',
      component: 'dom/badge',
      componentVersion: 1,
      data: { label: 'New' },
      slots: [],
    },
    text('B'),
  ];
  const { window, root, session, connection, errors } = setup({
    document,
    allocateNodeID: () => 'badge-generated',
  });
  const surface = root.querySelector('[data-sectile-editor-surface-id="p1"]');
  assert.ok(surface);

  const clipboard = new window.DataTransfer();
  clipboard.setData(EDITOR_FRAGMENT_MIME, JSON.stringify({
    formatVersion: 1,
    schema: { id: 'dom/editor-test', version: 1 },
    kind: 'inline',
    content: [{
      id: 'badge-copy',
      type: 'component',
      kind: 'inline',
      component: 'dom/badge',
      componentVersion: 1,
      data: { label: 'Copy' },
      slots: [],
    }],
  }));
  assert.equal(connection.setSelection(collapsed('p1', 0)), true);
  const paste = new window.ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: clipboard,
  });
  surface.dispatchEvent(paste);
  assert.equal(paste.defaultPrevented, true);
  assert.deepEqual(errors, []);

  const node = session.getSnapshot().index.getNode('p1');
  assert.equal(node?.type, 'paragraph');
  const pasted = node.children.find(
    (child) =>
      child.type === 'component'
      && child.id === 'badge-generated',
  );
  assert.equal(pasted?.type, 'component');
  assert.deepEqual(pasted.data, { label: 'Copy' });
  assert.equal(session.undo().ok, true);
  assert.equal(
    session.getSnapshot().index.getNode('badge-generated'),
    null,
  );
  connection.disconnect();
});

test('selection cannot cross isolated authoring frames', () => {
  const { document, root, connection } = setup();
  const mounts = root.querySelectorAll('[data-sectile-editor-isolated-frame]');
  assert.equal(mounts.length, 2);
  const left = mounts[0];
  const right = mounts[1];
  assert.ok(left);
  assert.ok(right);
  const rightSurface = right.querySelector(
    '[data-sectile-editor-surface-id="p2"]',
  );
  assert.ok(rightSurface);

  const selection = document.defaultView.getSelection();
  selection.setBaseAndExtent(left, 0, rightSurface, 0);
  assert.deepEqual(connection.readSelection(), { status: 'isolated' });
  connection.disconnect();
});

test('disconnect releases listeners and restores only attributes still owned by the connection', () => {
  const window = new Window();
  const document = window.document;
  const root = document.createElement('div');
  root.setAttribute('contenteditable', 'plaintext-only');
  root.setAttribute('aria-readonly', 'mixed');
  document.body.append(root);

  const compiled = schema();
  const authoring = compileAuthoringRegistry(compiled);
  assert.equal(authoring.ok, true);
  const session = createEditorSession({
    document: documentFixture(),
    schema: compiled,
  });
  assert.equal(session.ok, true);

  let renders = 0;
  const connection = createEditor({
    root,
    editor: session.value,
    authoring: authoring.value,
    render: (context) => {
      renders += 1;
      renderFixture(context);
    },
  });
  assert.equal(root.getAttribute('data-scope'), 'editor');
  assert.equal(root.getAttribute('contenteditable'), 'true');
  root.setAttribute('aria-readonly', 'consumer-change');
  connection.disconnect();

  assert.equal(root.getAttribute('data-scope'), null);
  assert.equal(root.getAttribute('contenteditable'), 'plaintext-only');
  assert.equal(root.getAttribute('aria-readonly'), 'consumer-change');

  const before = session.value.getSnapshot().revision;
  root.dispatchEvent(new window.InputEvent('beforeinput', {
    inputType: 'insertText',
    data: 'x',
    bubbles: true,
    cancelable: true,
  }));
  assert.equal(session.value.getSnapshot().revision, before);
  assert.equal(renders, 1);
});
