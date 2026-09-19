// CNT-09
import assert from 'node:assert/strict';
import test from 'node:test';
import { isEmpty, isEqual } from '../.verification-dist/helpers.js';

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

function documentWith(children, schemaVersion = 1) {
  return {
    formatVersion: 1,
    schema: {
      id: 'helpers/test',
      version: schemaVersion,
    },
    root: {
      type: 'document',
      children,
    },
  };
}

test('exact equality ignores object key insertion order in component data', () => {
  const left = documentWith([{
    id: 'component-1',
    type: 'component',
    kind: 'block',
    component: 'helpers/card',
    componentVersion: 1,
    data: {
      title: 'A',
      nested: {
        first: 1,
        second: true,
      },
    },
    slots: [],
  }]);

  const right = documentWith([{
    id: 'component-1',
    type: 'component',
    kind: 'block',
    component: 'helpers/card',
    componentVersion: 1,
    data: {
      nested: {
        second: true,
        first: 1,
      },
      title: 'A',
    },
    slots: [],
  }]);

  assert.equal(isEqual(left, right), true);
});

test('exact equality includes ids versions order marks and component data', () => {
  const base = documentWith([
    paragraph('p1', [
      text('A', [{ type: 'strong' }]),
    ]),
    paragraph('p2', [text('B')]),
  ]);

  assert.equal(isEqual(base, structuredClone(base)), true);

  const idChanged = structuredClone(base);
  idChanged.root.children[0].id = 'p-other';
  assert.equal(isEqual(base, idChanged), false);

  const versionChanged = structuredClone(base);
  versionChanged.schema.version = 2;
  assert.equal(isEqual(base, versionChanged), false);

  const reordered = structuredClone(base);
  reordered.root.children.reverse();
  assert.equal(isEqual(base, reordered), false);

  const marksChanged = structuredClone(base);
  marksChanged.root.children[0].children[0].marks = [{ type: 'emphasis' }];
  assert.equal(isEqual(base, marksChanged), false);
});

test('strict emptiness treats whitespace hard breaks and components as content', () => {
  assert.equal(isEmpty(documentWith([])), true);
  assert.equal(isEmpty(documentWith([paragraph('p1', [])])), true);
  assert.equal(
    isEmpty(documentWith([paragraph('p1', [text('   ')])])),
    false,
  );
  assert.equal(
    isEmpty(documentWith([paragraph('p1', [{ type: 'hard-break' }])])),
    false,
  );
  assert.equal(
    isEmpty(documentWith([{
      id: 'component-1',
      type: 'component',
      kind: 'block',
      component: 'helpers/empty-widget',
      componentVersion: 1,
      data: {},
      slots: [],
    }])),
    false,
  );
});

test('empty code and empty containers stay empty until authored content appears', () => {
  assert.equal(
    isEmpty(documentWith([{
      id: 'code-1',
      type: 'code-block',
      text: '',
    }])),
    true,
  );
  assert.equal(
    isEmpty(documentWith([{
      id: 'code-1',
      type: 'code-block',
      text: ' ',
    }])),
    false,
  );
  assert.equal(
    isEmpty({
      formatVersion: 1,
      schema: { id: 'helpers/test', version: 1 },
      kind: 'inline',
      content: [],
    }),
    true,
  );
  assert.equal(
    isEmpty({
      formatVersion: 1,
      schema: { id: 'helpers/test', version: 1 },
      kind: 'inline',
      content: [text('x')],
    }),
    false,
  );
});
