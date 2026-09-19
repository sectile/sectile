// CNT-11
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inlineFragmentNodeIDs,
  prepareInlineFragment,
} from '../.verification-dist/fragment.js';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '../.verification-dist/schema.js';
import { transformDocument } from '../.verification-dist/transform.js';

function schema() {
  const result = compileContentSchema({
    id: 'fragment/test',
    version: 1,
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
      allowed: [
        baseRef('text'),
        componentRef('fragment/target'),
        componentRef('fragment/ref'),
      ],
    },
    components: [
      {
        id: 'fragment/target',
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
        id: 'fragment/ref',
        kind: 'inline',
        componentVersion: 1,
        data: {
          type: 'object',
          properties: {
            target: {
              schema: {
                type: 'nodeRef',
                allowed: [componentRef('fragment/target')],
              },
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

function target(id, label) {
  return {
    id,
    type: 'component',
    kind: 'inline',
    component: 'fragment/target',
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
    component: 'fragment/ref',
    componentVersion: 1,
    data: { target: targetID },
    slots: [],
  };
}

function documentFixture() {
  return {
    formatVersion: 1,
    schema: {
      id: 'fragment/test',
      version: 1,
    },
    root: {
      type: 'document',
      children: [{
        id: 'p1',
        type: 'paragraph',
        children: [
          { type: 'text', text: 'A', marks: [] },
          target('outside-target', 'outside'),
          { type: 'text', text: 'B', marks: [] },
        ],
      }],
    },
  };
}

test('inline fragment ID inventory is ordered and rejects duplicates', () => {
  const fragment = {
    formatVersion: 1,
    schema: { id: 'fragment/test', version: 1 },
    kind: 'inline',
    content: [
      target('target-1', 'one'),
      ref('ref-1', 'target-1'),
    ],
  };

  const ids = inlineFragmentNodeIDs(fragment);
  assert.deepEqual(ids, {
    ok: true,
    value: ['target-1', 'ref-1'],
  });

  const duplicate = structuredClone(fragment);
  duplicate.content[1].id = 'target-1';
  const rejected = inlineFragmentNodeIDs(duplicate);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'content-fragment-invalid');
});

test('prepareInlineFragment remaps copied IDs and declared internal nodeRef values', () => {
  const compiled = schema();
  const fragment = {
    formatVersion: 1,
    schema: { id: 'fragment/test', version: 1 },
    kind: 'inline',
    content: [
      target('target-1', 'one'),
      ref('ref-1', 'target-1'),
    ],
  };
  const prepared = prepareInlineFragment(fragment, {
    schema: compiled,
    idMap: new Map([
      ['target-1', 'target-copy'],
      ['ref-1', 'ref-copy'],
    ]),
  });
  assert.equal(prepared.ok, true);
  assert.deepEqual(
    prepared.value.content.map((node) =>
      node.type === 'component'
        ? [node.id, node.data]
        : [node.type]
    ),
    [
      ['target-copy', { label: 'one' }],
      ['ref-copy', { target: 'target-copy' }],
    ],
  );
});

test('external nodeRef values remain stable and final destination validation decides them', () => {
  const compiled = schema();
  const fragment = {
    formatVersion: 1,
    schema: { id: 'fragment/test', version: 1 },
    kind: 'inline',
    content: [
      ref('ref-1', 'outside-target'),
    ],
  };
  const prepared = prepareInlineFragment(fragment, {
    schema: compiled,
    idMap: new Map([
      ['ref-1', 'ref-copy'],
    ]),
  });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.value.content[0].data, {
    target: 'outside-target',
  });

  const inserted = transformDocument(documentFixture(), {
    schema: compiled,
    operations: [{
      type: 'replace-inline',
      surface: { type: 'node', id: 'p1' },
      from: 3,
      to: 3,
      replacement: prepared.value.content,
    }],
  });
  assert.equal(inserted.ok, true);

  const paragraph = inserted.value.document.root.children[0];
  assert.equal(paragraph.type, 'paragraph');
  assert.equal(
    paragraph.children.some(
      (node) => node.type === 'component' && node.id === 'ref-copy',
    ),
    true,
  );
});

test('prepared copied internal references survive final destination validation', () => {
  const compiled = schema();
  const fragment = {
    formatVersion: 1,
    schema: { id: 'fragment/test', version: 1 },
    kind: 'inline',
    content: [
      target('target-1', 'copied'),
      ref('ref-1', 'target-1'),
    ],
  };
  const prepared = prepareInlineFragment(fragment, {
    schema: compiled,
    idMap: new Map([
      ['target-1', 'target-copy'],
      ['ref-1', 'ref-copy'],
    ]),
  });
  assert.equal(prepared.ok, true);

  const inserted = transformDocument(documentFixture(), {
    schema: compiled,
    operations: [{
      type: 'replace-inline',
      surface: { type: 'node', id: 'p1' },
      from: 3,
      to: 3,
      replacement: prepared.value.content,
    }],
  });
  assert.equal(inserted.ok, true);
});

test('fragment preparation rejects missing duplicate and schema-incompatible mappings', () => {
  const compiled = schema();
  const fragment = {
    formatVersion: 1,
    schema: { id: 'fragment/test', version: 1 },
    kind: 'inline',
    content: [
      target('target-1', 'one'),
      ref('ref-1', 'target-1'),
    ],
  };

  const missing = prepareInlineFragment(fragment, {
    schema: compiled,
    idMap: new Map([
      ['target-1', 'target-copy'],
    ]),
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'content-fragment-invalid');

  const duplicate = prepareInlineFragment(fragment, {
    schema: compiled,
    idMap: new Map([
      ['target-1', 'same-copy'],
      ['ref-1', 'same-copy'],
    ]),
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'content-fragment-invalid');

  const wrongSchema = structuredClone(fragment);
  wrongSchema.schema.version = 2;
  const incompatible = prepareInlineFragment(wrongSchema, {
    schema: compiled,
    idMap: new Map([
      ['target-1', 'target-copy'],
      ['ref-1', 'ref-copy'],
    ]),
  });
  assert.equal(incompatible.ok, false);
  assert.equal(incompatible.error.code, 'content-fragment-invalid');
});
