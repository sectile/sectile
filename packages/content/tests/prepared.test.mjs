// CNT-06 CNT-10
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '../.verification-dist/schema.js';
import {
  prepareContent,
  replacePreparedText,
} from '../.verification-dist/prepared.js';

function compileSchema() {
  const result = compileContentSchema({
    id: 'proof/prepared',
    version: 1,
    groups: [
      {
        id: 'blocks',
        kind: 'block',
        members: [
          baseRef('paragraph'),
          componentRef('proof/section'),
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
      allowed: [baseRef('text'), baseRef('hard-break')],
    },
    components: [
      {
        id: 'proof/section',
        kind: 'block',
        componentVersion: 1,
        data: {
          type: 'object',
          properties: {
            label: {
              schema: { type: 'string' },
              optional: true,
            },
          },
        },
        slots: [
          {
            name: 'body',
            kind: 'block',
            allowed: [{ type: 'group', id: 'blocks' }],
          },
        ],
      },
    ],
  });
  assert.equal(result.ok, true);
  return result.value;
}

function paragraph(id, text) {
  return Object.freeze({
    id,
    type: 'paragraph',
    children: Object.freeze([
      Object.freeze({
        type: 'text',
        text,
        marks: Object.freeze([]),
      }),
    ]),
  });
}

test('prepared text edit preserves unchanged root siblings and updates retained node view', () => {
  const schema = compileSchema();
  const original = Object.freeze({
    formatVersion: 1,
    schema: Object.freeze({
      id: 'proof/prepared',
      version: 1,
    }),
    root: Object.freeze({
      type: 'document',
      children: Object.freeze([
        paragraph('p1', 'hello'),
        paragraph('p2', 'stable'),
      ]),
    }),
  });

  const prepared = prepareContent(original, schema);
  assert.equal(prepared.ok, true);

  const edited = replacePreparedText(prepared.value, {
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(edited.ok, true);

  assert.notEqual(edited.value.state.document, original);
  assert.notEqual(
    edited.value.state.document.root,
    original.root,
  );
  assert.notEqual(
    edited.value.state.document.root.children[0],
    original.root.children[0],
  );
  assert.equal(
    edited.value.state.document.root.children[1],
    original.root.children[1],
  );

  const nextP1 = edited.value.state.document.root.children[0];
  assert.equal(nextP1.type, 'paragraph');
  assert.equal(nextP1.children[0].text, 'hello!');
  assert.equal(
    edited.value.state.index.getNode('p1'),
    nextP1,
  );
  assert.equal(
    prepared.value.index.getNode('p1'),
    original.root.children[0],
  );

  assert.deepEqual(
    edited.value.change.mapPoint({
      type: 'inline',
      surface: { type: 'node', id: 'p1' },
      offset: 5,
      affinity: 'after',
    }),
    {
      status: 'mapped',
      point: {
        type: 'inline',
        surface: { type: 'node', id: 'p1' },
        offset: 6,
        affinity: 'after',
      },
    },
  );
});

test('prepared text edit clones only the nested ancestor path', () => {
  const schema = compileSchema();
  const stable = paragraph('p-stable', 'stable');
  const nested = paragraph('p-nested', 'inside');
  const section = Object.freeze({
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
        content: Object.freeze([nested]),
      }),
    ]),
  });
  const original = Object.freeze({
    formatVersion: 1,
    schema: Object.freeze({
      id: 'proof/prepared',
      version: 1,
    }),
    root: Object.freeze({
      type: 'document',
      children: Object.freeze([stable, section]),
    }),
  });

  const prepared = prepareContent(original, schema);
  assert.equal(prepared.ok, true);
  const edited = replacePreparedText(prepared.value, {
    id: 'p-nested',
    from: 6,
    to: 6,
    text: '!',
  });
  assert.equal(edited.ok, true);

  const nextStable = edited.value.state.document.root.children[0];
  const nextSection = edited.value.state.document.root.children[1];
  assert.equal(nextStable, stable);
  assert.notEqual(nextSection, section);
  assert.equal(nextSection.type, 'component');

  const nextNested = nextSection.slots[0].content[0];
  assert.notEqual(nextNested, nested);
  assert.equal(nextNested.type, 'paragraph');
  assert.equal(nextNested.children[0].text, 'inside!');
  assert.equal(
    edited.value.state.index.getNode('section-1'),
    nextSection,
  );
  assert.equal(
    edited.value.state.index.getNode('p-nested'),
    nextNested,
  );
});

test('prepared fast path rejects surfaces that need inline-structure index updates', () => {
  const schema = compileSchema();
  const document = {
    formatVersion: 1,
    schema: {
      id: 'proof/prepared',
      version: 1,
    },
    root: {
      type: 'document',
      children: [
        {
          id: 'p1',
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'a',
              marks: [],
            },
            {
              type: 'hard-break',
            },
          ],
        },
      ],
    },
  };

  const prepared = prepareContent(document, schema);
  assert.equal(prepared.ok, true);
  const result = replacePreparedText(prepared.value, {
    id: 'p1',
    from: 0,
    to: 1,
    text: 'b',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-operation-invalid');
});


test('prepared state composes edits across distinct nodes without mutating earlier states', () => {
  const schema = compileSchema();
  const original = Object.freeze({
    formatVersion: 1,
    schema: Object.freeze({
      id: 'proof/prepared',
      version: 1,
    }),
    root: Object.freeze({
      type: 'document',
      children: Object.freeze([
        paragraph('p1', 'one'),
        paragraph('p2', 'two'),
      ]),
    }),
  });

  const prepared = prepareContent(original, schema);
  assert.equal(prepared.ok, true);

  const first = replacePreparedText(prepared.value, {
    id: 'p1',
    from: 3,
    to: 3,
    text: '!',
  });
  assert.equal(first.ok, true);

  const second = replacePreparedText(first.value.state, {
    id: 'p2',
    from: 3,
    to: 3,
    text: '?',
  });
  assert.equal(second.ok, true);

  const firstP1 = first.value.state.index.getNode('p1');
  const firstP2 = first.value.state.index.getNode('p2');
  const secondP1 = second.value.state.index.getNode('p1');
  const secondP2 = second.value.state.index.getNode('p2');
  assert.equal(firstP1?.type, 'paragraph');
  assert.equal(firstP2?.type, 'paragraph');
  assert.equal(secondP1?.type, 'paragraph');
  assert.equal(secondP2?.type, 'paragraph');

  assert.equal(firstP1.children[0].text, 'one!');
  assert.equal(firstP2.children[0].text, 'two');
  assert.equal(secondP1.children[0].text, 'one!');
  assert.equal(secondP2.children[0].text, 'two?');

  assert.equal(
    prepared.value.document.root.children[0],
    original.root.children[0],
  );
  assert.equal(
    prepared.value.document.root.children[1],
    original.root.children[1],
  );
  assert.equal(
    second.value.state.index.getNode('p1'),
    second.value.state.document.root.children[0],
  );
  assert.equal(
    second.value.state.index.getNode('p2'),
    second.value.state.document.root.children[1],
  );
});


test('prepared text edits preserve the configured per-string ceiling', () => {
  const schema = compileSchema();
  const document = {
    formatVersion: 1,
    schema: {
      id: 'proof/prepared',
      version: 1,
    },
    root: {
      type: 'document',
      children: [paragraph('p1', 'hello')],
    },
  };

  const prepared = prepareContent(document, schema, {
    limits: {
      maxStringCodeUnits: 5,
    },
  });
  assert.equal(prepared.ok, true);

  const result = replacePreparedText(prepared.value, {
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.error.code,
    'content-string-code-unit-ceiling-exceeded',
  );
});

test('prepared text edits preserve the aggregate authored-string ceiling', () => {
  const schema = compileSchema();
  const document = {
    formatVersion: 1,
    schema: {
      id: 'proof/prepared',
      version: 1,
    },
    root: {
      type: 'document',
      children: [
        paragraph('p1', 'x'),
        {
          id: 'section-1',
          type: 'component',
          kind: 'block',
          component: 'proof/section',
          componentVersion: 1,
          data: {
            label: 'abc',
          },
          slots: [{
            name: 'body',
            kind: 'block',
            content: [],
          }],
        },
      ],
    },
  };

  const prepared = prepareContent(document, schema, {
    limits: {
      maxTotalStringCodeUnits: 10,
    },
  });
  assert.equal(prepared.ok, true);

  const allowed = replacePreparedText(prepared.value, {
    id: 'p1',
    from: 1,
    to: 1,
    text: '!',
  });
  assert.equal(allowed.ok, true);

  const rejected = replacePreparedText(allowed.value.state, {
    id: 'p1',
    from: 2,
    to: 2,
    text: '!',
  });
  assert.equal(rejected.ok, false);
  assert.equal(
    rejected.error.code,
    'content-total-string-code-unit-ceiling-exceeded',
  );
});
