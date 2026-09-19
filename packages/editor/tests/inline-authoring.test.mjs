// EDT-10 EDT-11
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema';
import { createEditorSession } from '../.verification-dist/session.js';

const strong = Object.freeze({ type: 'strong' });

function schema() {
  const compiled = compileContentSchema({
    id: 'editor/inline-authoring',
    version: 1,
    groups: [
      {
        id: 'blocks',
        kind: 'block',
        members: [
          baseRef('paragraph'),
          componentRef('editor/card'),
        ],
      },
      {
        id: 'inline',
        kind: 'inline',
        members: [
          baseRef('text'),
          baseRef('hard-break'),
          componentRef('editor/target'),
          componentRef('editor/ref'),
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
        id: 'editor/card',
        kind: 'block',
        componentVersion: 1,
        data: {
          type: 'object',
          properties: {},
        },
        slots: [{
          name: 'title',
          kind: 'inline',
          allowed: [{ type: 'group', id: 'inline' }],
        }],
      },
      {
        id: 'editor/target',
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
      {
        id: 'editor/ref',
        kind: 'inline',
        componentVersion: 1,
        data: {
          type: 'object',
          properties: {
            target: {
              schema: {
                type: 'nodeRef',
                allowed: [componentRef('editor/target')],
              },
            },
          },
        },
        slots: [],
      },
    ],
  });
  assert.equal(compiled.ok, true);
  return compiled.value;
}

function text(value, marks = []) {
  return {
    type: 'text',
    text: value,
    marks,
  };
}

function target(id, label) {
  return {
    id,
    type: 'component',
    kind: 'inline',
    component: 'editor/target',
    componentVersion: 1,
    data: { label },
    slots: [],
  };
}

function ref(id, targetID) {
  return {
    id,
    type: 'component',
    kind: 'inline',
    component: 'editor/ref',
    componentVersion: 1,
    data: { target: targetID },
    slots: [],
  };
}

function documentFixture() {
  return {
    formatVersion: 1,
    schema: {
      id: 'editor/inline-authoring',
      version: 1,
    },
    root: {
      type: 'document',
      children: [
        {
          id: 'rich',
          type: 'paragraph',
          children: [
            text('bo', [strong]),
            text('ld'),
          ],
        },
        {
          id: 'fragment-host',
          type: 'paragraph',
          children: [
            text('A'),
            target('outside-target', 'outside'),
            text('B'),
          ],
        },
        {
          id: 'card-1',
          type: 'component',
          kind: 'block',
          component: 'editor/card',
          componentVersion: 1,
          data: {},
          slots: [{
            name: 'title',
            kind: 'inline',
            content: [
              text('Ti', [strong]),
              text('tle'),
            ],
          }],
        },
      ],
    },
  };
}

function point(surface, offset, affinity = 'after') {
  return {
    type: 'inline',
    surface,
    offset,
    affinity,
  };
}

function collapsed(surface, offset, affinity = 'after') {
  const value = point(surface, offset, affinity);
  return {
    anchor: value,
    focus: value,
    direction: 'forward',
  };
}

function session(options = {}) {
  const created = createEditorSession({
    document: documentFixture(),
    schema: schema(),
    selection: collapsed({ type: 'node', id: 'rich' }, 1),
    historyLimit: 20,
    ...options,
  });
  assert.equal(created.ok, true);
  return created.value;
}

function node(editor, id) {
  const value = editor.getSnapshot().index.getNode(id);
  assert.notEqual(value, null);
  return value;
}

test('rich inline typing preserves mark context and undo', () => {
  const editor = session();
  const selection = collapsed({ type: 'node', id: 'rich' }, 2);

  const edited = editor.replaceInlineText({
    surface: { type: 'node', id: 'rich' },
    from: 1,
    to: 1,
    text: 'X',
    selection,
  });
  assert.equal(edited.ok, true);

  const paragraph = node(editor, 'rich');
  assert.equal(paragraph.type, 'paragraph');
  assert.deepEqual(paragraph.children, [
    {
      type: 'text',
      text: 'bXo',
      marks: [{ type: 'strong' }],
    },
    {
      type: 'text',
      text: 'ld',
      marks: [],
    },
  ]);

  assert.equal(editor.undo().ok, true);
  assert.deepEqual(node(editor, 'rich').children, [
    {
      type: 'text',
      text: 'bo',
      marks: [{ type: 'strong' }],
    },
    {
      type: 'text',
      text: 'ld',
      marks: [],
    },
  ]);
});

test('typing affinity chooses the adjacent mark context at a rich boundary', () => {
  const afterEditor = session();
  assert.equal(afterEditor.replaceInlineText({
    surface: { type: 'node', id: 'rich' },
    from: 2,
    to: 2,
    text: 'A',
    affinity: 'after',
  }).ok, true);
  assert.deepEqual(node(afterEditor, 'rich').children, [
    {
      type: 'text',
      text: 'boA',
      marks: [{ type: 'strong' }],
    },
    {
      type: 'text',
      text: 'ld',
      marks: [],
    },
  ]);

  const beforeEditor = session();
  assert.equal(beforeEditor.replaceInlineText({
    surface: { type: 'node', id: 'rich' },
    from: 2,
    to: 2,
    text: 'B',
    affinity: 'before',
  }).ok, true);
  assert.deepEqual(node(beforeEditor, 'rich').children, [
    {
      type: 'text',
      text: 'bo',
      marks: [{ type: 'strong' }],
    },
    {
      type: 'text',
      text: 'Bld',
      marks: [],
    },
  ]);
});

test('rich and slot typing share one coalescing history policy', () => {
  const editor = session();

  assert.equal(editor.replaceInlineText({
    surface: { type: 'node', id: 'rich' },
    from: 1,
    to: 1,
    text: 'a',
    selection: collapsed({ type: 'node', id: 'rich' }, 2),
  }).ok, true);
  assert.equal(editor.replaceInlineText({
    surface: { type: 'node', id: 'rich' },
    from: 2,
    to: 2,
    text: 'b',
    selection: collapsed({ type: 'node', id: 'rich' }, 3),
  }).ok, true);
  assert.equal(editor.undo().ok, true);
  assert.deepEqual(node(editor, 'rich').children[0], {
    type: 'text',
    text: 'bo',
    marks: [{ type: 'strong' }],
  });

  const slotSurface = { type: 'slot', id: 'card-1', slot: 'title' };
  assert.equal(editor.setSelection(collapsed(slotSurface, 1)).ok, true);
  assert.equal(editor.replaceInlineText({
    surface: slotSurface,
    from: 1,
    to: 1,
    text: 'X',
    selection: collapsed(slotSurface, 2),
  }).ok, true);

  const card = node(editor, 'card-1');
  assert.equal(card.type, 'component');
  assert.deepEqual(card.slots[0].content[0], {
    type: 'text',
    text: 'TXi',
    marks: [{ type: 'strong' }],
  });
});

test('inline fragment insertion allocates fresh IDs remaps internal refs and is one history unit', () => {
  const allocated = ['target-copy', 'ref-copy'];
  const editor = session({
    allocateNodeID: () => allocated.shift(),
  });
  const fragment = {
    formatVersion: 1,
    schema: {
      id: 'editor/inline-authoring',
      version: 1,
    },
    kind: 'inline',
    content: [
      target('target-source', 'copied'),
      ref('ref-source', 'target-source'),
    ],
  };

  const inserted = editor.insertInlineFragment({
    surface: { type: 'node', id: 'fragment-host' },
    from: 3,
    to: 3,
    fragment,
    selection: collapsed(
      { type: 'node', id: 'fragment-host' },
      5,
    ),
  });
  assert.equal(inserted.ok, true);

  const host = node(editor, 'fragment-host');
  assert.equal(host.type, 'paragraph');
  const components = host.children.filter((child) => child.type === 'component');
  assert.deepEqual(
    components.map((child) => [child.id, child.data]),
    [
      ['outside-target', { label: 'outside' }],
      ['target-copy', { label: 'copied' }],
      ['ref-copy', { target: 'target-copy' }],
    ],
  );

  assert.equal(editor.undo().ok, true);
  assert.equal(
    node(editor, 'fragment-host').children.some(
      (child) =>
        child.type === 'component'
        && (child.id === 'target-copy' || child.id === 'ref-copy'),
    ),
    false,
  );
});

test('fragment insertion preserves valid external node references', () => {
  const editor = session({
    allocateNodeID: () => 'external-ref-copy',
  });
  const fragment = {
    formatVersion: 1,
    schema: {
      id: 'editor/inline-authoring',
      version: 1,
    },
    kind: 'inline',
    content: [
      ref('ref-source', 'outside-target'),
    ],
  };

  const inserted = editor.insertInlineFragment({
    surface: { type: 'node', id: 'fragment-host' },
    from: 3,
    to: 3,
    fragment,
  });
  assert.equal(inserted.ok, true);

  const host = node(editor, 'fragment-host');
  assert.equal(host.type, 'paragraph');
  const copied = host.children.find(
    (child) =>
      child.type === 'component'
      && child.id === 'external-ref-copy',
  );
  assert.equal(copied?.type, 'component');
  assert.deepEqual(copied.data, { target: 'outside-target' });
});

test('component fragment insertion requires an Editor node ID allocator and is failure-atomic', () => {
  const editor = session();
  const before = editor.getSnapshot();
  const fragment = {
    formatVersion: 1,
    schema: {
      id: 'editor/inline-authoring',
      version: 1,
    },
    kind: 'inline',
    content: [
      target('target-source', 'copied'),
    ],
  };

  const result = editor.insertInlineFragment({
    surface: { type: 'node', id: 'fragment-host' },
    from: 3,
    to: 3,
    fragment,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'editor-id-allocator-missing');

  const after = editor.getSnapshot();
  assert.equal(after.revision, before.revision);
  assert.equal(after.document, before.document);
  assert.equal(after.canUndo, false);
});
