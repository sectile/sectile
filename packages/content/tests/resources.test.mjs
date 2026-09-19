// CNT-08
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '../.verification-dist/schema.js';
import { validateDocument } from '../.verification-dist/validate.js';

function text(value, marks = []) {
  return {
    type: 'text',
    text: value,
    marks,
  };
}

function paragraph(id, value, marks = []) {
  return {
    id,
    type: 'paragraph',
    children: [text(value, marks)],
  };
}

function simpleSchema(options) {
  const result = compileContentSchema({
    id: 'resource/test',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [baseRef('paragraph'), baseRef('blockquote')],
    },
    rootContent: {
      kind: 'block',
      allowed: [baseRef('paragraph'), baseRef('blockquote')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text'), baseRef('hard-break')],
    },
  }, options);
  assert.equal(result.ok, true);
  return result.value;
}

function documentWith(children) {
  return {
    formatVersion: 1,
    schema: {
      id: 'resource/test',
      version: 1,
    },
    root: {
      type: 'document',
      children,
    },
  };
}

test('invalid configured ceilings reject before validation work', () => {
  const schema = simpleSchema();
  const result = validateDocument(
    documentWith([paragraph('p1', 'x')]),
    schema,
    { limits: { maxNodes: 0 } },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-limit-invalid');
});

test('document node and depth ceilings reject bounded input', () => {
  const schema = simpleSchema();

  const nodeLimit = validateDocument(
    documentWith([paragraph('p1', 'a'), paragraph('p2', 'b')]),
    schema,
    { limits: { maxNodes: 3 } },
  );
  assert.equal(nodeLimit.ok, false);
  assert.equal(nodeLimit.error.code, 'content-node-ceiling-exceeded');

  const depthLimit = validateDocument(
    documentWith([{
      id: 'q1',
      type: 'blockquote',
      children: [{
        id: 'q2',
        type: 'blockquote',
        children: [paragraph('p1', 'x')],
      }],
    }]),
    schema,
    { limits: { maxDepth: 2 } },
  );
  assert.equal(depthLimit.ok, false);
  assert.equal(depthLimit.error.code, 'content-depth-ceiling-exceeded');
});

test('ID and authored string ceilings reject oversized content', () => {
  const schema = simpleSchema();

  const idLimit = validateDocument(
    documentWith([paragraph('long-id', 'x')]),
    schema,
    { limits: { maxIDCodeUnits: 4 } },
  );
  assert.equal(idLimit.ok, false);
  assert.equal(idLimit.error.code, 'content-id-code-unit-ceiling-exceeded');

  const stringLimit = validateDocument(
    documentWith([paragraph('p1', 'abcde')]),
    schema,
    { limits: { maxStringCodeUnits: 4 } },
  );
  assert.equal(stringLimit.ok, false);
  assert.equal(stringLimit.error.code, 'content-string-code-unit-ceiling-exceeded');

  const totalLimit = validateDocument(
    documentWith([paragraph('p1', 'abc'), paragraph('p2', 'def')]),
    schema,
    { limits: { maxTotalStringCodeUnits: 5 } },
  );
  assert.equal(totalLimit.ok, false);
  assert.equal(
    totalLimit.error.code,
    'content-total-string-code-unit-ceiling-exceeded',
  );
});

test('mark ceiling is independent from node and text ceilings', () => {
  const schema = simpleSchema();
  const result = validateDocument(
    documentWith([
      paragraph('p1', 'x', [
        { type: 'strong' },
        { type: 'emphasis' },
        { type: 'code' },
        { type: 'link', href: '/x' },
      ]),
    ]),
    schema,
    { limits: { maxMarksPerText: 3 } },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-mark-ceiling-exceeded');
});

test('schema compiler bounds components, groups, slots and data-schema depth', () => {
  const component = (id) => ({
    id,
    kind: 'block',
    componentVersion: 1,
    data: {
      type: 'object',
      properties: {},
    },
    slots: [],
  });

  const tooManyComponents = compileContentSchema({
    id: 'resource/catalog',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [componentRef('resource/a')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [component('resource/a'), component('resource/b')],
  }, {
    limits: { maxComponents: 1 },
  });
  assert.equal(tooManyComponents.ok, false);
  assert.equal(
    tooManyComponents.error.code,
    'content-component-ceiling-exceeded',
  );

  const tooManyGroups = compileContentSchema({
    id: 'resource/catalog',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [baseRef('paragraph')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    groups: [
      { id: 'a', kind: 'block', members: [baseRef('paragraph')] },
      { id: 'b', kind: 'block', members: [baseRef('paragraph')] },
    ],
  }, {
    limits: { maxGroups: 1 },
  });
  assert.equal(tooManyGroups.ok, false);
  assert.equal(tooManyGroups.error.code, 'content-group-ceiling-exceeded');

  const tooManySlots = compileContentSchema({
    id: 'resource/catalog',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [componentRef('resource/a')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [{
      ...component('resource/a'),
      slots: [
        { name: 'one', kind: 'block', allowed: [baseRef('paragraph')] },
        { name: 'two', kind: 'block', allowed: [baseRef('paragraph')] },
      ],
    }],
  }, {
    limits: { maxSlotsPerComponent: 1 },
  });
  assert.equal(tooManySlots.ok, false);
  assert.equal(tooManySlots.error.code, 'content-slot-ceiling-exceeded');

  const deepDataSchema = compileContentSchema({
    id: 'resource/catalog',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [componentRef('resource/a')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [{
      ...component('resource/a'),
      data: {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    }],
  }, {
    limits: { maxDepth: 2 },
  });
  assert.equal(deepDataSchema.ok, false);
  assert.equal(deepDataSchema.error.code, 'content-depth-ceiling-exceeded');
});

test('component data value budget and cyclic data reject safely', () => {
  const compiled = compileContentSchema({
    id: 'resource/data',
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [componentRef('resource/data-node')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text')],
    },
    components: [{
      id: 'resource/data-node',
      kind: 'block',
      componentVersion: 1,
      data: {
        type: 'array',
        items: { type: 'number' },
      },
      slots: [],
    }],
  });
  assert.equal(compiled.ok, true);

  const makeDocument = (data) => ({
    formatVersion: 1,
    schema: { id: 'resource/data', version: 1 },
    root: {
      type: 'document',
      children: [{
        id: 'data-1',
        type: 'component',
        kind: 'block',
        component: 'resource/data-node',
        componentVersion: 1,
        data,
        slots: [],
      }],
    },
  });

  const valueLimit = validateDocument(
    makeDocument([1, 2, 3]),
    compiled.value,
    { limits: { maxValues: 3 } },
  );
  assert.equal(valueLimit.ok, false);
  assert.equal(valueLimit.error.code, 'content-value-ceiling-exceeded');

  const cyclic = [];
  cyclic.push(cyclic);
  const cycle = validateDocument(makeDocument(cyclic), compiled.value);
  assert.equal(cycle.ok, false);
  assert.equal(cycle.error.code, 'content-component-data-invalid');
});
