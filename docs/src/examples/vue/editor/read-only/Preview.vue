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
  id: 'docs/editor-read-only',
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
    allowed: [baseRef('text')],
  },
  components: [],
});
if (!schemaResult.ok) throw new Error(schemaResult.error.message);

const authoringResult = compileAuthoringRegistry(schemaResult.value);
if (!authoringResult.ok) throw new Error(authoringResult.error.message);

const editorResult = createEditorSession({
  schema: schemaResult.value,
  document: {
    formatVersion: 1,
    schema: { id: 'docs/editor-read-only', version: 1 },
    root: {
      type: 'document',
      children: [{
        id: 'body',
        type: 'paragraph',
        children: [{
          type: 'text',
          text: 'Switch the same Editor session between editable and read-only.',
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
  const node = value.index.getNode('body');
  if (node?.type !== 'paragraph') return '';
  return node.children
    .map((child) => child.type === 'text' ? child.text : '')
    .join('');
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
        {{ snapshot.interaction.readOnly ? 'Enable editing' : 'Make read-only' }}
      </button>
    </div>

    <EditorRoot
      :editor="editor"
      :authoring="authoring"
      aria-label="Read-only reconfiguration example"
      @error="error = $event.message"
    >
      <template #default="{ snapshot: current }">
        <EditorInlineSurface
          as="p"
          :surface="{ type: 'node', id: 'body' }"
        >
          {{ paragraphText(current) }}
        </EditorInlineSurface>
      </template>
    </EditorRoot>

    <p data-example-editor-status>
      contenteditable={{ snapshot.interaction.readOnly ? 'false' : 'true' }}
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
