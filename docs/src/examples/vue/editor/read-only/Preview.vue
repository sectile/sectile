<script setup lang="ts">
import { onUnmounted, shallowRef } from 'vue';
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema';
import {
  compileAuthoringRegistry,
  type ComponentAuthoringSurface,
} from '@sectile/editor/authoring';
import {
  createEditorSession,
  type EditorSessionSnapshot,
} from '@sectile/editor/session';
import {
  EditorAuthoringMount,
  EditorInlineSurface,
  EditorIsolatedFrame,
  EditorRoot,
} from '@sectile/vue/editor';

const schemaResult = compileContentSchema({
  id: 'docs/editor-read-only',
  version: 1,
  groups: [],
  blockContent: {
    kind: 'block',
    allowed: [
      baseRef('heading'),
      baseRef('paragraph'),
      componentRef('docs/comparison'),
    ],
  },
  rootContent: {
    kind: 'block',
    allowed: [
      baseRef('heading'),
      componentRef('docs/comparison'),
    ],
  },
  inlineContent: {
    kind: 'inline',
    allowed: [baseRef('text')],
  },
  components: [{
    id: 'docs/comparison',
    kind: 'block',
    componentVersion: 1,
    data: { type: 'object', properties: {} },
    slots: [
      {
        name: 'before',
        kind: 'block',
        allowed: [baseRef('paragraph')],
      },
      {
        name: 'after',
        kind: 'block',
        allowed: [baseRef('paragraph')],
      },
    ],
  }],
});
if (!schemaResult.ok) throw new Error(schemaResult.error.message);

const authoringResult = compileAuthoringRegistry(schemaResult.value, [{
  component: 'docs/comparison',
  label: 'Before / after comparison',
  mode: 'slots',
}]);
if (!authoringResult.ok) throw new Error(authoringResult.error.message);

const editorResult = createEditorSession({
  schema: schemaResult.value,
  historyLimit: 20,
  document: {
    formatVersion: 1,
    schema: { id: 'docs/editor-read-only', version: 1 },
    root: {
      type: 'document',
      children: [
        {
          id: 'review-title',
          type: 'heading',
          level: 2,
          children: [{
            type: 'text',
            text: 'Review a structured comparison',
            marks: [],
          }],
        },
        {
          id: 'comparison',
          type: 'component',
          kind: 'block',
          component: 'docs/comparison',
          componentVersion: 1,
          data: {},
          slots: [
            {
              name: 'before',
              kind: 'block',
              content: [{
                id: 'before-copy',
                type: 'paragraph',
                children: [{
                  type: 'text',
                  text: 'Before: a plain paragraph with no supporting detail.',
                  marks: [],
                }],
              }],
            },
            {
              name: 'after',
              kind: 'block',
              content: [{
                id: 'after-copy',
                type: 'paragraph',
                children: [{
                  type: 'text',
                  text: 'After: each slot keeps its own editing boundary.',
                  marks: [],
                }],
              }],
            },
          ],
        },
      ],
    },
  },
});
if (!editorResult.ok) throw new Error(editorResult.error.message);

const editor = editorResult.value;
const authoring = authoringResult.value;
const snapshot = shallowRef(editor.getSnapshot());
const error = shallowRef<string | null>(null);
const unsubscribe = editor.subscribe((event) => {
  snapshot.value = event.current;
});

onUnmounted(() => {
  unsubscribe();
  editor.destroy();
});

function nodeText(value: EditorSessionSnapshot, id: string): string {
  const node = value.index.getNode(id);
  if (node?.type !== 'paragraph' && node?.type !== 'heading') return '';
  return node.children
    .map((child) => child.type === 'text' ? child.text : '')
    .join('');
}

function comparisonMounts(
  surfaces: readonly ComponentAuthoringSurface[],
): readonly ComponentAuthoringSurface['mounts'][number][] {
  return surfaces.find((surface) => surface.id === 'comparison')?.mounts ?? [];
}

function slotNodeID(name: string): string {
  return name === 'before' ? 'before-copy' : 'after-copy';
}

function toggleReadOnly(): void {
  const result = editor.reconfigure({
    interaction: {
      readOnly: !snapshot.value.interaction.readOnly,
    },
  });
  error.value = result.ok ? null : result.error.message;
}
</script>

<template>
  <div data-example-editor>
    <div data-example-editor-toolbar>
      <button type="button" @click="toggleReadOnly">
        {{ snapshot.interaction.readOnly ? 'Enable editing' : 'Enter review mode' }}
      </button>
    </div>

    <EditorRoot
      :editor="editor"
      :authoring="authoring"
      aria-label="Structured comparison editor"
      @error="error = $event.message"
    >
      <template #default="{ snapshot: current, authoringSurfaces }">
        <article data-example-editor-document>
          <EditorInlineSurface
            as="h2"
            :surface="{ type: 'node', id: 'review-title' }"
          >
            {{ nodeText(current, 'review-title') }}
          </EditorInlineSurface>

          <section data-example-editor-layout>
            <EditorIsolatedFrame
              v-for="mount in comparisonMounts(authoringSurfaces)"
              :key="mount.name"
              :frame="mount.name"
            >
              <span data-example-editor-slot-label>
                {{ mount.name === 'before' ? 'Before' : 'After' }}
              </span>
              <EditorAuthoringMount
                v-bind="{ ownerID: 'comparison', mount }"
              >
                <EditorInlineSurface
                  as="p"
                  :surface="{ type: 'node', id: slotNodeID(mount.name) }"
                >
                  {{ nodeText(current, slotNodeID(mount.name)) }}
                </EditorInlineSurface>
              </EditorAuthoringMount>
            </EditorIsolatedFrame>
          </section>
        </article>
      </template>
    </EditorRoot>

    <p data-example-editor-status>
      isolated slots ·
      {{ snapshot.interaction.readOnly ? 'review mode' : 'editing enabled' }}
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
