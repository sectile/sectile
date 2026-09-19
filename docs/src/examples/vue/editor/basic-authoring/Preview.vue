<script setup lang="ts">
import { onUnmounted, shallowRef } from 'vue';
import { baseRef, compileContentSchema } from '@sectile/content/schema';
import { compileAuthoringRegistry } from '@sectile/editor/authoring';
import {
  createEditorSession,
  type EditorSessionSnapshot,
} from '@sectile/editor/session';
import {
  EditorInlineSurface,
  EditorRoot,
} from '@sectile/vue/editor';

const schemaResult = compileContentSchema({
  id: 'docs/editor-basic',
  version: 1,
  groups: [],
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
    allowed: [baseRef('text'), baseRef('hard-break')],
  },
  components: [],
});
if (!schemaResult.ok) throw new Error(schemaResult.error.message);

const authoringResult = compileAuthoringRegistry(schemaResult.value);
if (!authoringResult.ok) throw new Error(authoringResult.error.message);

const editorResult = createEditorSession({
  schema: schemaResult.value,
  historyLimit: 20,
  document: {
    formatVersion: 1,
    schema: { id: 'docs/editor-basic', version: 1 },
    root: {
      type: 'document',
      children: [{
        id: 'intro',
        type: 'paragraph',
        children: [{
          type: 'text',
          text: 'Edit this paragraph. The document stays renderer-neutral.',
          marks: [],
        }],
      }],
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

function paragraphText(value: EditorSessionSnapshot): string {
  const node = value.index.getNode('intro');
  if (node?.type !== 'paragraph') return '';
  return node.children
    .map((child) => child.type === 'text' ? child.text : '\n')
    .join('');
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
      <button type="button" :disabled="!snapshot.canUndo" @click="undo">Undo</button>
      <button type="button" :disabled="!snapshot.canRedo" @click="redo">Redo</button>
    </div>

    <EditorRoot
      :editor="editor"
      :authoring="authoring"
      aria-label="Portable Content editor"
      @error="error = $event.message"
    >
      <template #default="{ snapshot: current }">
        <EditorInlineSurface
          as="p"
          :surface="{ type: 'node', id: 'intro' }"
        >
          {{ paragraphText(current) }}
        </EditorInlineSurface>
      </template>
    </EditorRoot>

    <p data-example-editor-status>
      Revision {{ snapshot.revision }} ·
      {{ snapshot.canUndo ? 'Undo available' : 'No local history yet' }}
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
