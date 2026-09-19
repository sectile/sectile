// EDT-06
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema';
import {
  collectAuthoringSurfaces,
  compileAuthoringRegistry,
} from '../.verification-dist/authoring.js';

const emptyData = {
  type: 'object',
  properties: {},
};

function schema() {
  const compiled = compileContentSchema({
    id: 'editor/authoring',
    version: 1,
    groups: [
      {
        id: 'blocks',
        kind: 'block',
        members: [
          baseRef('paragraph'),
          componentRef('editor/section'),
          componentRef('editor/layout'),
          componentRef('editor/atom'),
        ],
      },
      {
        id: 'inline',
        kind: 'inline',
        members: [
          baseRef('text'),
          componentRef('editor/badge'),
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
        id: 'editor/section',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: [{
          name: 'body',
          kind: 'block',
          allowed: [{ type: 'group', id: 'blocks' }],
        }],
      },
      {
        id: 'editor/layout',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: [
          {
            name: 'left',
            kind: 'block',
            allowed: [{ type: 'group', id: 'blocks' }],
          },
          {
            name: 'right',
            kind: 'block',
            allowed: [{ type: 'group', id: 'blocks' }],
          },
        ],
      },
      {
        id: 'editor/atom',
        kind: 'block',
        componentVersion: 1,
        data: emptyData,
        slots: [],
      },
      {
        id: 'editor/badge',
        kind: 'inline',
        componentVersion: 1,
        data: emptyData,
        slots: [],
      },
    ],
  });
  assert.equal(compiled.ok, true);
  return compiled.value;
}

function text(value) {
  return { type: 'text', text: value, marks: [] };
}

function paragraph(id, value, badge = false) {
  return {
    id,
    type: 'paragraph',
    children: [
      text(value),
      ...(badge ? [{
        id: 'badge-1',
        type: 'component',
        kind: 'inline',
        component: 'editor/badge',
        componentVersion: 1,
        data: {},
        slots: [],
      }] : []),
    ],
  };
}

function document() {
  return {
    formatVersion: 1,
    schema: { id: 'editor/authoring', version: 1 },
    root: {
      type: 'document',
      children: [
        paragraph('p-root', 'Root', true),
        {
          id: 'layout-1',
          type: 'component',
          kind: 'block',
          component: 'editor/layout',
          componentVersion: 1,
          data: {},
          slots: [
            {
              name: 'left',
              kind: 'block',
              content: [{
                id: 'section-1',
                type: 'component',
                kind: 'block',
                component: 'editor/section',
                componentVersion: 1,
                data: {},
                slots: [{
                  name: 'body',
                  kind: 'block',
                  content: [paragraph('p-nested', 'Nested')],
                }],
              }],
            },
            {
              name: 'right',
              kind: 'block',
              content: [],
            },
          ],
        },
        {
          id: 'atom-1',
          type: 'component',
          kind: 'block',
          component: 'editor/atom',
          componentVersion: 1,
          data: {},
          slots: [],
        },
      ],
    },
  };
}

function byID(surfaces, id) {
  const surface = surfaces.find((candidate) => candidate.id === id);
  assert.notEqual(surface, undefined);
  return surface;
}

test('default authoring modes derive atom, flow and isolated slots', () => {
  const registry = compileAuthoringRegistry(schema());
  assert.equal(registry.ok, true);

  assert.equal(registry.value.definition('editor/badge').mode, 'atom');
  assert.equal(registry.value.definition('editor/atom').mode, 'atom');
  assert.equal(registry.value.definition('editor/section').mode, 'flow');
  assert.equal(registry.value.definition('editor/layout').mode, 'slots');
});

test('surfaces expose host-owned flow/slot targets including empty regions', () => {
  const compiled = schema();
  const registry = compileAuthoringRegistry(compiled);
  assert.equal(registry.ok, true);

  const surfaces = collectAuthoringSurfaces(document(), {
    schema: compiled,
    registry: registry.value,
  });
  assert.equal(surfaces.ok, true);
  assert.deepEqual(
    surfaces.value.map((surface) => surface.id),
    ['badge-1', 'layout-1', 'section-1', 'atom-1'],
  );

  const badge = byID(surfaces.value, 'badge-1');
  assert.equal(badge.selection, 'atomic');
  assert.deepEqual(badge.mounts, []);

  const layout = byID(surfaces.value, 'layout-1');
  assert.equal(layout.selection, 'isolated-slots');
  assert.deepEqual(layout.mounts, [
    {
      name: 'left',
      kind: 'block',
      frame: 'slot',
      target: { type: 'node', id: 'layout-1', slot: 'left' },
    },
    {
      name: 'right',
      kind: 'block',
      frame: 'slot',
      target: { type: 'node', id: 'layout-1', slot: 'right' },
    },
  ]);

  const section = byID(surfaces.value, 'section-1');
  assert.equal(section.selection, 'flow');
  assert.deepEqual(section.mounts, [{
    name: 'body',
    kind: 'block',
    frame: 'flow',
    target: { type: 'node', id: 'section-1', slot: 'body' },
  }]);
});

test('one-slot components may opt into isolated slots without changing persisted content', () => {
  const compiled = schema();
  const source = document();
  const before = structuredClone(source);

  const registry = compileAuthoringRegistry(compiled, [{
    component: 'editor/section',
    mode: 'slots',
    label: 'Section',
    description: 'Structured region',
    keywords: ['region'],
    initializerAction: 'section/insert',
    actionIDs: ['section/convert'],
    agentDescription: 'A semantic content section.',
  }]);
  assert.equal(registry.ok, true);

  const surfaces = collectAuthoringSurfaces(source, {
    schema: compiled,
    registry: registry.value,
  });
  assert.equal(surfaces.ok, true);
  const section = byID(surfaces.value, 'section-1');
  assert.equal(section.selection, 'isolated-slots');
  assert.equal(section.mounts[0].frame, 'slot');

  const definition = registry.value.definition('editor/section');
  assert.equal(definition.label, 'Section');
  assert.equal(definition.initializerAction, 'section/insert');
  assert.deepEqual(definition.actionIDs, ['section/convert']);
  assert.deepEqual(source, before);
});

test('incompatible modes and unknown/duplicate definitions reject at construction', () => {
  const compiled = schema();

  const inlineFlow = compileAuthoringRegistry(compiled, [{
    component: 'editor/badge',
    mode: 'flow',
  }]);
  assert.equal(inlineFlow.ok, false);
  assert.equal(
    inlineFlow.error.code,
    'editor-authoring-mode-invalid',
  );

  const multiFlow = compileAuthoringRegistry(compiled, [{
    component: 'editor/layout',
    mode: 'flow',
  }]);
  assert.equal(multiFlow.ok, false);
  assert.equal(
    multiFlow.error.code,
    'editor-authoring-mode-invalid',
  );

  const unknown = compileAuthoringRegistry(compiled, [{
    component: 'editor/missing',
  }]);
  assert.equal(unknown.ok, false);
  assert.equal(
    unknown.error.code,
    'editor-authoring-component-unknown',
  );

  const duplicate = compileAuthoringRegistry(compiled, [
    { component: 'editor/section' },
    { component: 'editor/section' },
  ]);
  assert.equal(duplicate.ok, false);
  assert.equal(
    duplicate.error.code,
    'editor-authoring-component-duplicate',
  );
});

test('authoring surface traversal rejects documents outside the active schema', () => {
  const compiled = schema();
  const registry = compileAuthoringRegistry(compiled);
  assert.equal(registry.ok, true);

  const invalid = document();
  invalid.root.children[0].type = 'heading';
  invalid.root.children[0].level = 1;

  const result = collectAuthoringSurfaces(invalid, {
    schema: compiled,
    registry: registry.value,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-child-invalid');
});


test('authoring surface validation accepts the caller Content limits', () => {
  const compiled = schema();
  const registry = compileAuthoringRegistry(compiled);
  assert.equal(registry.ok, true);

  const rejected = collectAuthoringSurfaces(document(), {
    schema: compiled,
    registry: registry.value,
    limits: { maxNodes: 1 },
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'content-node-ceiling-exceeded');
});
