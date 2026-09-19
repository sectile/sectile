// CNT-02 CNT-03
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
  componentRef,
  typeKey,
} from '../.verification-dist/schema.js';
import {
  allowedChildren,
  canInsert,
  canMove,
  createDocumentIndex,
} from '../.verification-dist/query.js';
import { validateDocument } from '../.verification-dist/validate.js';

const emptyData = Object.freeze({
  type: 'object',
  properties: Object.freeze({}),
});

function blockSlot(name, allowed, options = {}) {
  return Object.freeze({
    name,
    kind: 'block',
    allowed: Object.freeze(allowed),
    ...options,
  });
}

function inlineSlot(name, allowed, options = {}) {
  return Object.freeze({
    name,
    kind: 'inline',
    allowed: Object.freeze(allowed),
    ...options,
  });
}

function schemaDescriptor() {
  return Object.freeze({
    id: 'demo/article-product',
    version: 1,
    headingLevels: Object.freeze([1, 2, 3]),
    groups: Object.freeze([
      Object.freeze({
        id: 'blocks',
        kind: 'block',
        members: Object.freeze([
          baseRef('paragraph'),
          baseRef('heading'),
          baseRef('blockquote'),
          baseRef('list'),
          baseRef('code-block'),
          componentRef('demo/section'),
          componentRef('demo/columns'),
          componentRef('demo/card'),
          componentRef('demo/cta'),
          componentRef('demo/related'),
        ]),
      }),
      Object.freeze({
        id: 'inline',
        kind: 'inline',
        members: Object.freeze([
          baseRef('text'),
          baseRef('hard-break'),
          componentRef('demo/badge'),
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
        id: 'demo/section',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: Object.freeze([
          blockSlot('body', [{ type: 'group', id: 'blocks' }]),
        ]),
      }),
      Object.freeze({
        id: 'demo/columns',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: Object.freeze([
          blockSlot(
            'items',
            [componentRef('demo/column')],
            { min: 1, max: 4 },
          ),
        ]),
      }),
      Object.freeze({
        id: 'demo/column',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: Object.freeze([
          blockSlot('body', [{ type: 'group', id: 'blocks' }]),
        ]),
      }),
      Object.freeze({
        id: 'demo/card',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: Object.freeze([
          inlineSlot(
            'title',
            [{ type: 'group', id: 'inline' }],
            { min: 1 },
          ),
          blockSlot('body', [{ type: 'group', id: 'blocks' }]),
        ]),
      }),
      Object.freeze({
        id: 'demo/cta',
        kind: 'block',
        componentVersion: 1,
        data: Object.freeze({
          type: 'object',
          properties: Object.freeze({
            destination: Object.freeze({
              schema: Object.freeze({ type: 'string' }),
            }),
          }),
        }),
        slots: Object.freeze([
          inlineSlot(
            'label',
            [{ type: 'group', id: 'inline' }],
            { min: 1 },
          ),
        ]),
      }),
      Object.freeze({
        id: 'demo/related',
        kind: 'block',
        componentVersion: 1,
        data: Object.freeze({
          type: 'object',
          properties: Object.freeze({
            target: Object.freeze({
              schema: Object.freeze({
                type: 'nodeRef',
                allowed: Object.freeze([
                  componentRef('demo/section'),
                ]),
              }),
            }),
          }),
        }),
        slots: Object.freeze([]),
      }),
      Object.freeze({
        id: 'demo/badge',
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

function column(id, paragraphID, value) {
  return Object.freeze({
    id,
    type: 'component',
    kind: 'block',
    component: 'demo/column',
    componentVersion: 1,
    data: Object.freeze({}),
    slots: Object.freeze([
      Object.freeze({
        name: 'body',
        kind: 'block',
        content: Object.freeze([paragraph(paragraphID, value)]),
      }),
    ]),
  });
}

function documentFixture() {
  return Object.freeze({
    formatVersion: 1,
    schema: Object.freeze({
      id: 'demo/article-product',
      version: 1,
    }),
    root: Object.freeze({
      type: 'document',
      children: Object.freeze([
        Object.freeze({
          id: 'h1',
          type: 'heading',
          level: 1,
          children: Object.freeze([
            text('Product '),
            Object.freeze({
              id: 'badge-1',
              type: 'component',
              kind: 'inline',
              component: 'demo/badge',
              componentVersion: 1,
              data: Object.freeze({ label: 'New' }),
              slots: Object.freeze([]),
            }),
          ]),
        }),
        Object.freeze({
          id: 'p1',
          type: 'paragraph',
          children: Object.freeze([
            text('Intro '),
            Object.freeze({
              id: 'badge-2',
              type: 'component',
              kind: 'inline',
              component: 'demo/badge',
              componentVersion: 1,
              data: Object.freeze({ label: 'Featured' }),
              slots: Object.freeze([]),
            }),
            text(' text'),
          ]),
        }),
        Object.freeze({
          id: 'section-1',
          type: 'component',
          kind: 'block',
          component: 'demo/section',
          componentVersion: 1,
          data: Object.freeze({}),
          slots: Object.freeze([
            Object.freeze({
              name: 'body',
              kind: 'block',
              content: Object.freeze([
                paragraph('p2', 'Inside section'),
              ]),
            }),
          ]),
        }),
        Object.freeze({
          id: 'columns-1',
          type: 'component',
          kind: 'block',
          component: 'demo/columns',
          componentVersion: 1,
          data: Object.freeze({}),
          slots: Object.freeze([
            Object.freeze({
              name: 'items',
              kind: 'block',
              content: Object.freeze([
                column('column-1', 'p3', 'Left'),
                column('column-2', 'p4', 'Right'),
              ]),
            }),
          ]),
        }),
        Object.freeze({
          id: 'card-1',
          type: 'component',
          kind: 'block',
          component: 'demo/card',
          componentVersion: 1,
          data: Object.freeze({}),
          slots: Object.freeze([
            Object.freeze({
              name: 'title',
              kind: 'inline',
              content: Object.freeze([text('Card title')]),
            }),
            Object.freeze({
              name: 'body',
              kind: 'block',
              content: Object.freeze([
                paragraph('p5', 'Card body'),
              ]),
            }),
          ]),
        }),
        Object.freeze({
          id: 'cta-1',
          type: 'component',
          kind: 'block',
          component: 'demo/cta',
          componentVersion: 1,
          data: Object.freeze({
            destination: 'product:123',
          }),
          slots: Object.freeze([
            Object.freeze({
              name: 'label',
              kind: 'inline',
              content: Object.freeze([text('Buy now')]),
            }),
          ]),
        }),
        Object.freeze({
          id: 'related-1',
          type: 'component',
          kind: 'block',
          component: 'demo/related',
          componentVersion: 1,
          data: Object.freeze({
            target: 'section-1',
          }),
          slots: Object.freeze([]),
        }),
      ]),
    }),
  });
}

function compileFixture() {
  const compiled = compileContentSchema(schemaDescriptor());
  assert.equal(compiled.ok, true);
  return compiled.value;
}

test('one compiled grammar validates representative structured content', () => {
  const schema = compileFixture();
  const document = documentFixture();
  const validation = validateDocument(document, schema);
  assert.equal(validation.ok, true);
});

test('the same grammar query is usable by menus and agent constraints', () => {
  const schema = compileFixture();
  const document = documentFixture();
  const index = createDocumentIndex(document);
  assert.equal(index.ok, true);

  const root = allowedChildren(document, {
    schema,
    target: { type: 'root' },
  });
  assert.equal(root.ok, true);

  const menuChoices = root.value.allowed.map(typeKey);
  const agentAllowedTypes = root.value.allowed.map(typeKey);
  assert.deepEqual(menuChoices, agentAllowedTypes);
  assert.equal(menuChoices.includes('component:demo/section'), true);
  assert.equal(menuChoices.includes('component:demo/columns'), true);
  assert.equal(menuChoices.includes('component:demo/column'), false);

  const paragraphInline = allowedChildren(document, {
    schema,
    index: index.value,
    target: { type: 'node', id: 'p1' },
  });
  assert.equal(paragraphInline.ok, true);
  assert.deepEqual(
    paragraphInline.value.allowed.map(typeKey),
    ['base:text', 'base:hard-break', 'component:demo/badge'],
  );
});

test('insert and move capabilities preserve slot grammar and ancestry', () => {
  const schema = compileFixture();
  const document = documentFixture();
  const index = createDocumentIndex(document);
  assert.equal(index.ok, true);

  const canAddColumn = canInsert(document, {
    schema,
    index: index.value,
    target: {
      type: 'node',
      id: 'columns-1',
      slot: 'items',
    },
    candidate: componentRef('demo/column'),
  });
  assert.deepEqual(canAddColumn, { ok: true, value: true });

  const cannotAddParagraph = canInsert(document, {
    schema,
    index: index.value,
    target: {
      type: 'node',
      id: 'columns-1',
      slot: 'items',
    },
    candidate: baseRef('paragraph'),
  });
  assert.deepEqual(cannotAddParagraph, { ok: true, value: false });

  const moveParagraph = canMove(document, {
    schema,
    index: index.value,
    nodeID: 'p2',
    target: {
      type: 'node',
      id: 'column-1',
      slot: 'body',
    },
  });
  assert.deepEqual(moveParagraph, { ok: true, value: true });

  const moveIntoDescendant = canMove(document, {
    schema,
    index: index.value,
    nodeID: 'columns-1',
    target: {
      type: 'node',
      id: 'column-1',
      slot: 'body',
    },
  });
  assert.deepEqual(moveIntoDescendant, { ok: true, value: false });
});

test('slot order, cardinality, component versions, and nodeRef targets are enforced', () => {
  const schema = compileFixture();
  const document = documentFixture();

  const reversedCard = structuredClone(document);
  const card = reversedCard.root.children.find((node) => node.id === 'card-1');
  card.slots.reverse();
  const slotOrder = validateDocument(reversedCard, schema);
  assert.equal(slotOrder.ok, false);
  assert.equal(slotOrder.error.code, 'content-slot-order-invalid');

  const emptyColumns = structuredClone(document);
  const columns = emptyColumns.root.children.find((node) => node.id === 'columns-1');
  columns.slots[0].content.length = 0;
  const cardinality = validateDocument(emptyColumns, schema);
  assert.equal(cardinality.ok, false);
  assert.equal(cardinality.error.code, 'content-cardinality-invalid');

  const wrongVersion = structuredClone(document);
  const cta = wrongVersion.root.children.find((node) => node.id === 'cta-1');
  cta.componentVersion = 2;
  const version = validateDocument(wrongVersion, schema);
  assert.equal(version.ok, false);
  assert.equal(version.error.code, 'content-component-version-mismatch');

  const badRef = structuredClone(document);
  const related = badRef.root.children.find((node) => node.id === 'related-1');
  related.data.target = 'p1';
  const ref = validateDocument(badRef, schema);
  assert.equal(ref.ok, false);
  assert.equal(ref.error.code, 'content-component-data-invalid');
});

test('compiler rejects cycles, role drift, and list-item escape', () => {
  const base = schemaDescriptor();

  const cyclic = structuredClone(base);
  cyclic.groups = [
    {
      id: 'a',
      kind: 'block',
      members: [{ type: 'group', id: 'b' }],
    },
    {
      id: 'b',
      kind: 'block',
      members: [{ type: 'group', id: 'a' }],
    },
  ];
  const cycle = compileContentSchema(cyclic);
  assert.equal(cycle.ok, false);
  assert.equal(cycle.error.code, 'content-group-cycle');

  const roleDrift = structuredClone(base);
  roleDrift.rootContent = {
    kind: 'block',
    allowed: [{ type: 'group', id: 'inline' }],
  };
  const role = compileContentSchema(roleDrift);
  assert.equal(role.ok, false);
  assert.equal(role.error.code, 'content-role-mismatch');

  const listItemEscape = structuredClone(base);
  listItemEscape.blockContent.allowed = [baseRef('list-item')];
  const listItem = compileContentSchema(listItemEscape);
  assert.equal(listItem.ok, false);
  assert.equal(listItem.error.code, 'content-type-reference-invalid');
});

test('heading-level policy is owned by the compiled schema', () => {
  const schema = compileFixture();
  const document = structuredClone(documentFixture());
  const heading = document.root.children.find((node) => node.id === 'h1');
  heading.level = 4;
  const validation = validateDocument(document, schema);
  assert.equal(validation.ok, false);
  assert.equal(validation.error.code, 'content-heading-level-invalid');
});


test('move capability rejects source-min violations before transform execution', () => {
  const schema = compileFixture();
  const document = structuredClone(documentFixture());

  const firstColumns = document.root.children.find(
    (node) => node.id === 'columns-1',
  );
  assert.notEqual(firstColumns, undefined);
  assert.equal(firstColumns.type, 'component');
  firstColumns.slots[0].content.splice(1, 1);

  document.root.children.push({
    id: 'columns-2',
    type: 'component',
    kind: 'block',
    component: 'demo/columns',
    componentVersion: 1,
    data: {},
    slots: [{
      name: 'items',
      kind: 'block',
      content: [
        column('column-3', 'p6', 'Third'),
      ],
    }],
  });

  const valid = validateDocument(document, schema);
  assert.equal(valid.ok, true);
  const index = createDocumentIndex(document);
  assert.equal(index.ok, true);

  const moveLastRequiredColumn = canMove(document, {
    schema,
    index: index.value,
    nodeID: 'column-1',
    target: {
      type: 'node',
      id: 'columns-2',
      slot: 'items',
    },
  });
  assert.deepEqual(moveLastRequiredColumn, { ok: true, value: false });
});

test('blockquote capability uses the same intrinsic minimum as validation', () => {
  const schema = compileFixture();
  const document = structuredClone(documentFixture());
  document.root.children.push({
    id: 'quote-1',
    type: 'blockquote',
    children: [
      paragraph('quote-p1', 'Only child'),
    ],
  });
  document.root.children.push({
    id: 'quote-2',
    type: 'blockquote',
    children: [
      paragraph('quote-p2', 'Target child'),
    ],
  });

  const valid = validateDocument(document, schema);
  assert.equal(valid.ok, true);
  const index = createDocumentIndex(document);
  assert.equal(index.ok, true);

  const moveLastQuoteChild = canMove(document, {
    schema,
    index: index.value,
    nodeID: 'quote-p1',
    target: {
      type: 'node',
      id: 'quote-2',
    },
  });
  assert.deepEqual(moveLastQuoteChild, { ok: true, value: false });
});


test('oneOf data schema requires exactly one matching variant', () => {
  const descriptor = {
    id: 'proof/oneof',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [componentRef('proof/union')],
    },
    rootContent: {
      kind: 'block',
      allowed: [componentRef('proof/union')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [{
      id: 'proof/union',
      kind: 'block',
      componentVersion: 1,
      data: {
        type: 'oneOf',
        variants: [
          { type: 'number' },
          { type: 'enum', values: [1] },
        ],
      },
      slots: [],
    }],
  };
  const compiled = compileContentSchema(descriptor);
  assert.equal(compiled.ok, true);

  const makeDocument = (data) => ({
    formatVersion: 1,
    schema: { id: 'proof/oneof', version: 1 },
    root: {
      type: 'document',
      children: [{
        id: 'union-1',
        type: 'component',
        kind: 'block',
        component: 'proof/union',
        componentVersion: 1,
        data,
        slots: [],
      }],
    },
  });

  assert.equal(validateDocument(makeDocument(2), compiled.value).ok, true);
  const ambiguous = validateDocument(makeDocument(1), compiled.value);
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.error.code, 'content-component-data-invalid');
});
