// EDT-04
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
} from '@sectile/content/schema';
import { prepareContent } from '@sectile/content/prepared';
import {
  createCollapsedSelection,
  mapEditorSelection,
  validateEditorSelection,
} from '../.verification-dist/selection.js';
import { transformDocument } from '@sectile/content/transform';

function schema() {
  const compiled = compileContentSchema({
    id: 'editor/selection',
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
      allowed: [baseRef('text')],
    },
  });
  assert.equal(compiled.ok, true);
  return compiled.value;
}

function document() {
  return {
    formatVersion: 1,
    schema: { id: 'editor/selection', version: 1 },
    root: {
      type: 'document',
      children: [{
        id: 'p1',
        type: 'paragraph',
        children: [{
          type: 'text',
          text: 'hello',
          marks: [],
        }],
      }],
    },
  };
}

test('structural selection accepts block containers and rejects inline containers', () => {
  const compiled = schema();
  const prepared = prepareContent(document(), compiled);
  assert.equal(prepared.ok, true);

  const rootSelection = createCollapsedSelection({
    type: 'structural',
    container: { type: 'root' },
    index: 1,
    affinity: 'after',
  });
  assert.equal(
    validateEditorSelection(
      prepared.value.document,
      compiled,
      rootSelection,
      prepared.value.index,
    ).ok,
    true,
  );

  const inlineContainer = createCollapsedSelection({
    type: 'structural',
    container: { type: 'node', id: 'p1' },
    index: 1,
    affinity: 'after',
  });
  const rejected = validateEditorSelection(
    prepared.value.document,
    compiled,
    inlineContainer,
    prepared.value.index,
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'editor-selection-invalid');
});

test('inline selection rejects out-of-range offsets', () => {
  const compiled = schema();
  const prepared = prepareContent(document(), compiled);
  assert.equal(prepared.ok, true);

  const rejected = validateEditorSelection(
    prepared.value.document,
    compiled,
    createCollapsedSelection({
      type: 'inline',
      surface: { type: 'node', id: 'p1' },
      offset: 6,
      affinity: 'after',
    }),
    prepared.value.index,
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'editor-selection-invalid');
});

test('selection mapping returns null when a selected surface is deleted', () => {
  const compiled = schema();
  const source = document();
  const transformed = transformDocument(source, {
    schema: compiled,
    operations: [{
      type: 'remove-block',
      id: 'p1',
    }],
  });
  assert.equal(transformed.ok, true);

  const selection = createCollapsedSelection({
    type: 'inline',
    surface: { type: 'node', id: 'p1' },
    offset: 2,
    affinity: 'after',
  });
  assert.equal(
    mapEditorSelection(selection, transformed.value.change),
    null,
  );
});


test('inline selection rejects UTF-16 surrogate-pair interiors', () => {
  const compiled = schema();
  const source = document();
  source.root.children[0].children[0].text = 'A😀B';
  const prepared = prepareContent(source, compiled);
  assert.equal(prepared.ok, true);

  const rejected = validateEditorSelection(
    prepared.value.document,
    compiled,
    createCollapsedSelection({
      type: 'inline',
      surface: { type: 'node', id: 'p1' },
      offset: 2,
      affinity: 'after',
    }),
    prepared.value.index,
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'editor-selection-invalid');

  const valid = validateEditorSelection(
    prepared.value.document,
    compiled,
    createCollapsedSelection({
      type: 'inline',
      surface: { type: 'node', id: 'p1' },
      offset: 3,
      affinity: 'after',
    }),
    prepared.value.index,
  );
  assert.equal(valid.ok, true);
});
