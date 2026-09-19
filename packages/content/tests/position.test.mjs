// CNT-04 CNT-05
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '../.verification-dist/schema.js';
import { transformDocument } from '../.verification-dist/transform.js';
import { validateDocument } from '../.verification-dist/validate.js';

const emptyData = Object.freeze({
  type: 'object',
  properties: Object.freeze({}),
});

function schemaDescriptor() {
  return Object.freeze({
    id: 'proof/position',
    version: 1,
    groups: Object.freeze([
      Object.freeze({
        id: 'blocks',
        kind: 'block',
        members: Object.freeze([
          baseRef('paragraph'),
          componentRef('proof/section'),
          componentRef('proof/related'),
        ]),
      }),
      Object.freeze({
        id: 'inline',
        kind: 'inline',
        members: Object.freeze([
          baseRef('text'),
          baseRef('hard-break'),
          componentRef('proof/badge'),
        ]),
      }),
    ]),
    blockContent: Object.freeze({
      kind: 'block',
      allowed: Object.freeze([{ type: 'group', id: 'blocks' }]),
    }),
    rootContent: Object.freeze({
      kind: 'block',
      allowed: Object.freeze([{ type: 'group', id: 'blocks' }]),
    }),
    inlineContent: Object.freeze({
      kind: 'inline',
      allowed: Object.freeze([{ type: 'group', id: 'inline' }]),
    }),
    components: Object.freeze([
      Object.freeze({
        id: 'proof/section',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: Object.freeze([
          Object.freeze({
            name: 'body',
            kind: 'block',
            allowed: Object.freeze([{ type: 'group', id: 'blocks' }]),
          }),
        ]),
      }),
      Object.freeze({
        id: 'proof/related',
        kind: 'block',
        componentVersion: 1,
        data: Object.freeze({
          type: 'object',
          properties: Object.freeze({
            target: Object.freeze({
              schema: Object.freeze({
                type: 'nodeRef',
                allowed: Object.freeze([
                  componentRef('proof/section'),
                ]),
              }),
            }),
          }),
        }),
        slots: Object.freeze([]),
      }),
      Object.freeze({
        id: 'proof/badge',
        kind: 'inline',
        componentVersion: 1,
        data: Object.freeze({
          type: 'object',
          properties: Object.freeze({
            label: Object.freeze({
              schema: Object.freeze({ type: 'string' }),
            }),
          }),
        }),
        slots: Object.freeze([]),
      }),
    ]),
  });
}

function compileFixture() {
  const result = compileContentSchema(schemaDescriptor());
  assert.equal(result.ok, true);
  return result.value;
}

function text(value, marks = []) {
  return Object.freeze({
    type: 'text',
    text: value,
    marks: Object.freeze(marks),
  });
}

function paragraph(id, value) {
  return Object.freeze({
    id,
    type: 'paragraph',
    children: Object.freeze([text(value)]),
  });
}

function documentFixture({ withReference = false } = {}) {
  const children = [
    Object.freeze({
      id: 'p1',
      type: 'paragraph',
      children: Object.freeze([
        text('ab'),
        Object.freeze({
          id: 'badge-1',
          type: 'component',
          kind: 'inline',
          component: 'proof/badge',
          componentVersion: 1,
          data: Object.freeze({ label: 'x' }),
          slots: Object.freeze([]),
        }),
        text('cd'),
      ]),
    }),
    paragraph('p2', 'hello'),
    Object.freeze({
      id: 'section-1',
      type: 'component',
      kind: 'block',
      component: 'proof/section',
      componentVersion: 1,
      data: Object.freeze({}),
      slots: Object.freeze([
        Object.freeze({
          name: 'body',
          kind: 'block',
          content: Object.freeze([
            paragraph('p3', 'inside'),
          ]),
        }),
      ]),
    }),
  ];

  if (withReference) {
    children.push(
      Object.freeze({
        id: 'related-1',
        type: 'component',
        kind: 'block',
        component: 'proof/related',
        componentVersion: 1,
        data: Object.freeze({ target: 'section-1' }),
        slots: Object.freeze([]),
      }),
    );
  }

  return Object.freeze({
    formatVersion: 1,
    schema: Object.freeze({
      id: 'proof/position',
      version: 1,
    }),
    root: Object.freeze({
      type: 'document',
      children: Object.freeze(children),
    }),
  });
}

function inlinePoint(id, offset, affinity = 'after') {
  return Object.freeze({
    type: 'inline',
    surface: Object.freeze({ type: 'node', id }),
    offset,
    affinity,
  });
}

function structuralPoint(container, index, affinity = 'after') {
  return Object.freeze({
    type: 'structural',
    container: Object.freeze(container),
    index,
    affinity,
  });
}

test('inline replacement maps text offsets across anonymous runs and atoms', () => {
  const schema = compileFixture();
  const document = documentFixture();

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'replace-inline',
        surface: { type: 'node', id: 'p1' },
        from: 2,
        to: 2,
        replacement: [text('X')],
      },
    ],
  });
  assert.equal(result.ok, true);

  const paragraphNode = result.value.document.root.children[0];
  assert.equal(paragraphNode.type, 'paragraph');
  assert.deepEqual(
    paragraphNode.children.map((node) =>
      node.type === 'text' ? node.text : node.id
    ),
    ['abX', 'badge-1', 'cd'],
  );

  assert.deepEqual(
    result.value.change.mapPoint(inlinePoint('p1', 2, 'before')),
    {
      status: 'mapped',
      point: inlinePoint('p1', 2, 'before'),
    },
  );
  assert.deepEqual(
    result.value.change.mapPoint(inlinePoint('p1', 2, 'after')),
    {
      status: 'mapped',
      point: inlinePoint('p1', 3, 'after'),
    },
  );
  assert.deepEqual(
    result.value.change.mapPoint(inlinePoint('p1', 4, 'after')),
    {
      status: 'mapped',
      point: inlinePoint('p1', 5, 'after'),
    },
  );
});

test('mark split and merge changes text runs without changing logical offsets', () => {
  const schema = compileFixture();
  const document = documentFixture();
  const strong = Object.freeze({ type: 'strong' });

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'set-mark',
        surface: { type: 'node', id: 'p2' },
        from: 1,
        to: 4,
        mark: strong,
        enabled: true,
      },
      {
        type: 'set-mark',
        surface: { type: 'node', id: 'p2' },
        from: 1,
        to: 4,
        mark: strong,
        enabled: false,
      },
    ],
  });
  assert.equal(result.ok, true);

  const paragraphNode = result.value.document.root.children[1];
  assert.equal(paragraphNode.type, 'paragraph');
  assert.deepEqual(paragraphNode.children, [
    {
      type: 'text',
      text: 'hello',
      marks: [],
    },
  ]);
  assert.deepEqual(
    result.value.change.mapPoint(inlinePoint('p2', 3)),
    {
      status: 'mapped',
      point: inlinePoint('p2', 3),
    },
  );
});

test('paragraph split and join map points without text-node identity', () => {
  const schema = compileFixture();
  const document = documentFixture();

  const split = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'split-paragraph',
        id: 'p2',
        offset: 2,
        newID: 'p2b',
      },
    ],
  });
  assert.equal(split.ok, true);

  assert.deepEqual(
    split.value.change.mapPoint(inlinePoint('p2', 4)),
    {
      status: 'mapped',
      point: inlinePoint('p2b', 2),
    },
  );
  assert.deepEqual(
    split.value.change.mapPoint(inlinePoint('p2', 2, 'before')),
    {
      status: 'mapped',
      point: inlinePoint('p2', 2, 'before'),
    },
  );
  assert.deepEqual(
    split.value.change.mapPoint(inlinePoint('p2', 2, 'after')),
    {
      status: 'mapped',
      point: inlinePoint('p2b', 0, 'after'),
    },
  );
  assert.deepEqual(
    split.value.change.mapPoint(
      structuralPoint({ type: 'root' }, 2, 'after'),
    ),
    {
      status: 'mapped',
      point: structuralPoint({ type: 'root' }, 3, 'after'),
    },
  );

  const joined = transformDocument(split.value.document, {
    schema,
    operations: [
      {
        type: 'join-paragraph',
        firstID: 'p2',
        secondID: 'p2b',
      },
    ],
  });
  assert.equal(joined.ok, true);
  assert.deepEqual(
    joined.value.change.mapPoint(inlinePoint('p2b', 1)),
    {
      status: 'mapped',
      point: inlinePoint('p2', 3),
    },
  );
  assert.deepEqual(
    joined.value.change.mapNodeID('p2b'),
    {
      status: 'mapped',
      id: 'p2',
    },
  );

  const paragraphNode = joined.value.document.root.children[1];
  assert.equal(paragraphNode.type, 'paragraph');
  assert.deepEqual(paragraphNode.children, [
    {
      type: 'text',
      text: 'hello',
      marks: [],
    },
  ]);
});

test('block move maps structural boundaries and preserves moved content points', () => {
  const schema = compileFixture();
  const document = documentFixture();

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'move-block',
        id: 'p1',
        target: {
          type: 'node',
          id: 'section-1',
          slot: 'body',
        },
        index: 1,
      },
    ],
  });
  assert.equal(result.ok, true);

  assert.deepEqual(
    result.value.change.mapPoint(inlinePoint('p1', 4)),
    {
      status: 'mapped',
      point: inlinePoint('p1', 4),
    },
  );
  assert.deepEqual(
    result.value.change.mapPoint(
      structuralPoint({ type: 'root' }, 1, 'after'),
    ),
    {
      status: 'mapped',
      point: structuralPoint({ type: 'root' }, 0, 'after'),
    },
  );
  assert.deepEqual(
    result.value.change.mapPoint(
      structuralPoint(
        { type: 'node', id: 'section-1', slot: 'body' },
        1,
        'after',
      ),
    ),
    {
      status: 'mapped',
      point: structuralPoint(
        { type: 'node', id: 'section-1', slot: 'body' },
        2,
        'after',
      ),
    },
  );

  const section = result.value.document.root.children[1];
  assert.equal(section.type, 'component');
  assert.deepEqual(
    section.slots[0].content.map((node) => node.id),
    ['p3', 'p1'],
  );
});

test('subtree removal explicitly loses descendant points and ids', () => {
  const schema = compileFixture();
  const document = documentFixture();

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'remove-block',
        id: 'section-1',
      },
    ],
  });
  assert.equal(result.ok, true);

  assert.deepEqual(
    result.value.change.mapPoint(inlinePoint('p3', 2)),
    {
      status: 'lost',
      reason: 'inline-surface-removed',
    },
  );
  assert.deepEqual(
    result.value.change.mapNodeID('p3'),
    {
      status: 'lost',
      reason: 'node-removed',
    },
  );
});

test('move into a descendant rejects atomically', () => {
  const schema = compileFixture();
  const document = documentFixture();
  const before = structuredClone(document);

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'move-block',
        id: 'section-1',
        target: { type: 'node', id: 'p3' },
        index: 0,
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-operation-invalid');
  assert.deepEqual(document, before);
});

test('surrogate-pair split rejects without publishing a candidate', () => {
  const schema = compileFixture();
  const document = structuredClone(documentFixture());
  const p2 = document.root.children.find((node) => node.id === 'p2');
  p2.children = [text('A😀B')];
  const valid = validateDocument(document, schema);
  assert.equal(valid.ok, true);

  const before = structuredClone(document);
  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'replace-inline',
        surface: { type: 'node', id: 'p2' },
        from: 2,
        to: 2,
        replacement: [text('X')],
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-position-invalid');
  assert.deepEqual(document, before);
});

test('dangling nodeRef rejects the whole batch', () => {
  const schema = compileFixture();
  const document = documentFixture({ withReference: true });
  const before = structuredClone(document);

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'remove-block',
        id: 'section-1',
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-component-data-invalid');
  assert.deepEqual(document, before);
});

test('later operation failure rolls back earlier candidate work', () => {
  const schema = compileFixture();
  const document = documentFixture();
  const before = structuredClone(document);

  const result = transformDocument(document, {
    schema,
    operations: [
      {
        type: 'remove-block',
        id: 'p1',
      },
      {
        type: 'remove-block',
        id: 'missing',
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-operation-invalid');
  assert.deepEqual(document, before);
});
