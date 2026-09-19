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
  EditorRoot,
} from '@sectile/vue/editor';

const schemaResult = compileContentSchema({
  id: 'docs/editor-basic',
  version: 1,
  groups: [],
  blockContent: {
    kind: 'block',
    allowed: [
      baseRef('heading'),
      baseRef('paragraph'),
      componentRef('docs/callout'),
    ],
  },
  rootContent: {
    kind: 'block',
    allowed: [
      baseRef('heading'),
      baseRef('paragraph'),
      componentRef('docs/callout'),
    ],
  },
  inlineContent: {
    kind: 'inline',
    allowed: [baseRef('text'), baseRef('hard-break')],
  },
  components: [{
    id: 'docs/callout',
    kind: 'block',
    componentVersion: 1,
    data: { type: 'object', properties: {} },
    slots: [{
      name: 'body',
      kind: 'block',
      allowed: [baseRef('paragraph')],
    }],
  }],
});
if (!schemaResult.ok) throw new Error(schemaResult.error.message);

const authoringResult = compileAuthoringRegistry(schemaResult.value, [{
  component: 'docs/callout',
  label: 'Callout',
  mode: 'flow',
}]);
if (!authoringResult.ok) throw new Error(authoringResult.error.message);

const editorResult = createEditorSession({
  schema: schemaResult.value,
  historyLimit: 20,
  document: {
    formatVersion: 1,
    schema: { id: 'docs/editor-basic', version: 1 },
    root: {
      type: 'document',
      children: [
        {
          id: 'title',
          type: 'heading',
          level: 2,
          children: [{
            type: 'text',
            text: 'Portable authoring, structured by contract',
            marks: [],
          }],
        },
        {
          id: 'intro',
          type: 'paragraph',
          children: [{
            type: 'text',
            text: 'The Editor session can format and update this paragraph without making Vue the document authority.',
            marks: [],
          }],
        },
        {
          id: 'callout',
          type: 'component',
          kind: 'block',
          component: 'docs/callout',
          componentVersion: 1,
          data: {},
          slots: [{
            name: 'body',
            kind: 'block',
            content: [{
              id: 'callout-body',
              type: 'paragraph',
              children: [{
                type: 'text',
                text: 'This callout is a registered Content component with an editor-managed slot.',
                marks: [],
              }],
            }],
          }],
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
    .map((child) => child.type === 'text' ? child.text : '\n')
    .join('');
}

function introIsStrong(value: EditorSessionSnapshot): boolean {
  const node = value.index.getNode('intro');
  if (node?.type !== 'paragraph') return false;
  const text = node.children.find((child) => child.type === 'text');
  return text?.type === 'text'
    && text.marks.some((mark) => mark.type === 'strong');
}

function calloutMounts(
  surfaces: readonly ComponentAuthoringSurface[],
): readonly ComponentAuthoringSurface['mounts'][number][] {
  return surfaces.find((surface) => surface.id === 'callout')?.mounts ?? [];
}

function toggleStrong(): void {
  const value = nodeText(snapshot.value, 'intro');
  const result = editor.transact({
    operations: [{
      type: 'set-mark',
      surface: { type: 'node', id: 'intro' },
      from: 0,
      to: value.length,
      mark: { type: 'strong' },
      enabled: !introIsStrong(snapshot.value),
    }],
    historyIntent: 'command',
  });
  error.value = result.ok ? null : result.error.message;
}

function appendSentence(): void {
  const value = nodeText(snapshot.value, 'intro');
  const result = editor.transact({
    operations: [{
      type: 'replace-inline',
      surface: { type: 'node', id: 'intro' },
      from: value.length,
      to: value.length,
      replacement: [{
        type: 'text',
        text: ' One transaction, one history entry.',
        marks: [],
      }],
    }],
    historyIntent: 'command',
  });
  error.value = result.ok ? null : result.error.message;
}

function undo(): void {
  const result = editor.undo();
  error.value = result.ok ? null : result.error.message;
}

function redo(): void {
  const result = editor.redo();
  error.value = result.ok ? null : result.error.message;
}
</script>

<template>
  <div data-example-editor>
    <div data-example-editor-toolbar>
      <button type="button" @click="toggleStrong">
        {{ introIsStrong(snapshot) ? 'Remove strong' : 'Strong intro' }}
      </button>
      <button type="button" @click="appendSentence">Append sentence</button>
      <button type="button" :disabled="!snapshot.canUndo" @click="undo">Undo</button>
      <button type="button" :disabled="!snapshot.canRedo" @click="redo">Redo</button>
    </div>

    <EditorRoot
      :editor="editor"
      :authoring="authoring"
      aria-label="Structured Portable Content editor"
      @error="error = $event.message"
    >
      <template #default="{ snapshot: current, authoringSurfaces }">
        <article data-example-editor-document>
          <EditorInlineSurface
            as="h2"
            :surface="{ type: 'node', id: 'title' }"
          >
            {{ nodeText(current, 'title') }}
          </EditorInlineSurface>

          <EditorInlineSurface
            as="p"
            :surface="{ type: 'node', id: 'intro' }"
          >
            <strong v-if="introIsStrong(current)">
              {{ nodeText(current, 'intro') }}
            </strong>
            <template v-else>
              {{ nodeText(current, 'intro') }}
            </template>
          </EditorInlineSurface>

          <aside data-example-editor-callout>
            <span data-example-editor-callout-label>Callout component</span>
            <EditorAuthoringMount
              v-for="mount in calloutMounts(authoringSurfaces)"
              :key="mount.name"
              v-bind="{ ownerID: 'callout', mount }"
            >
              <EditorInlineSurface
                as="p"
                :surface="{ type: 'node', id: 'callout-body' }"
              >
                {{ nodeText(current, 'callout-body') }}
              </EditorInlineSurface>
            </EditorAuthoringMount>
          </aside>
        </article>
      </template>
    </EditorRoot>

    <p data-example-editor-status>
      3 structured blocks · revision {{ snapshot.revision }} ·
      {{ snapshot.canUndo ? 'undo available' : 'history empty' }}
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
