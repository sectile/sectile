<script setup lang="ts">
import {
  defineComponent,
  h,
  onUnmounted,
  shallowRef,
  type PropType,
  type VNodeChild,
} from 'vue';
import type {
  InlineNode,
  TextMark,
} from '@sectile/content/document';
import type { InlineSurface } from '@sectile/content/position';
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

type FormatMark = 'strong' | 'emphasis' | 'code';

interface InlineRange {
  readonly surface: InlineSurface;
  readonly from: number;
  readonly to: number;
}

const markByType = {
  strong: { type: 'strong' },
  emphasis: { type: 'emphasis' },
  code: { type: 'code' },
} as const satisfies Record<FormatMark, TextMark>;

const InlineContent = defineComponent({
  name: 'ExampleInlineContent',
  props: {
    nodes: {
      type: Array as PropType<readonly InlineNode[]>,
      required: true,
    },
  },
  setup(props) {
    return (): readonly VNodeChild[] => props.nodes.map((node, index) => {
      if (node.type === 'hard-break') return h('br', { key: index });
      if (node.type !== 'text') {
        return h('span', { key: index }, 'Inline component');
      }

      let content: VNodeChild = node.text;
      for (let markIndex = node.marks.length - 1; markIndex >= 0; markIndex -= 1) {
        const mark = node.marks[markIndex];
        if (mark === undefined) continue;
        content = mark.type === 'strong'
          ? h('strong', content)
          : mark.type === 'emphasis'
            ? h('em', content)
            : mark.type === 'code'
              ? h('code', content)
              : h('a', {
                  href: mark.href,
                  ...(mark.title === undefined ? {} : { title: mark.title }),
                }, content);
      }
      return h('span', { key: index }, [content]);
    });
  },
});

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
            text: 'Release notes',
            marks: [],
          }],
        },
        {
          id: 'intro',
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'Select text in this article and format only that range. ',
              marks: [],
            },
            {
              type: 'text',
              text: 'Portable Content',
              marks: [{ type: 'strong' }],
            },
            {
              type: 'text',
              text: ' remains the document model while ',
              marks: [],
            },
            {
              type: 'text',
              text: 'Editor',
              marks: [{ type: 'code' }],
            },
            {
              type: 'text',
              text: ' owns selection, transactions, and history.',
              marks: [],
            },
          ],
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
                text: 'The callout body is another editable surface backed by the same document.',
                marks: [{ type: 'emphasis' }],
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

function inlineChildren(
  value: EditorSessionSnapshot,
  id: string,
): readonly InlineNode[] {
  const node = value.index.getNode(id);
  return node?.type === 'paragraph' || node?.type === 'heading'
    ? node.children
    : [];
}

function calloutMounts(
  surfaces: readonly ComponentAuthoringSurface[],
): readonly ComponentAuthoringSurface['mounts'][number][] {
  return surfaces.find((surface) => surface.id === 'callout')?.mounts ?? [];
}

function selectedInlineRange(value: EditorSessionSnapshot): InlineRange | null {
  const selection = value.selection;
  if (
    selection === null
    || selection.anchor.type !== 'inline'
    || selection.focus.type !== 'inline'
    || !sameSurface(selection.anchor.surface, selection.focus.surface)
    || selection.anchor.offset === selection.focus.offset
  ) {
    return null;
  }
  return {
    surface: selection.anchor.surface,
    from: Math.min(selection.anchor.offset, selection.focus.offset),
    to: Math.max(selection.anchor.offset, selection.focus.offset),
  };
}

function sameSurface(left: InlineSurface, right: InlineSurface): boolean {
  return left.type === right.type
    && left.id === right.id
    && (
      left.type === 'node'
      || (right.type === 'slot' && left.slot === right.slot)
    );
}

function canFormat(value: EditorSessionSnapshot): boolean {
  return !value.interaction.disabled
    && !value.interaction.readOnly
    && selectedInlineRange(value) !== null;
}

function selectedRangeHasMark(
  value: EditorSessionSnapshot,
  type: FormatMark,
): boolean {
  const range = selectedInlineRange(value);
  if (range === null || range.surface.type !== 'node') return false;
  const node = value.index.getNode(range.surface.id);
  if (node?.type !== 'paragraph' && node?.type !== 'heading') return false;

  let cursor = 0;
  let foundText = false;
  for (const child of node.children) {
    const length = child.type === 'text' ? child.text.length : 1;
    const end = cursor + length;
    if (
      child.type === 'text'
      && end > range.from
      && cursor < range.to
    ) {
      foundText = true;
      if (!child.marks.some((mark) => mark.type === type)) return false;
    }
    cursor = end;
  }
  return foundText;
}

function toggleMark(type: FormatMark): void {
  const current = snapshot.value;
  const range = selectedInlineRange(current);
  if (range === null || current.selection === null) return;

  const result = editor.transact({
    operations: [{
      type: 'set-mark',
      surface: range.surface,
      from: range.from,
      to: range.to,
      mark: markByType[type],
      enabled: !selectedRangeHasMark(current, type),
    }],
    selection: current.selection,
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
    <div data-example-editor-toolbar aria-label="Text formatting">
      <button
        type="button"
        :disabled="!canFormat(snapshot)"
        :aria-pressed="selectedRangeHasMark(snapshot, 'strong')"
        @mousedown.prevent
        @click="toggleMark('strong')"
      >
        Bold
      </button>
      <button
        type="button"
        :disabled="!canFormat(snapshot)"
        :aria-pressed="selectedRangeHasMark(snapshot, 'emphasis')"
        @mousedown.prevent
        @click="toggleMark('emphasis')"
      >
        Italic
      </button>
      <button
        type="button"
        :disabled="!canFormat(snapshot)"
        :aria-pressed="selectedRangeHasMark(snapshot, 'code')"
        @mousedown.prevent
        @click="toggleMark('code')"
      >
        Code
      </button>
      <span data-example-editor-toolbar-separator aria-hidden="true" />
      <button
        type="button"
        :disabled="!snapshot.canUndo"
        @mousedown.prevent
        @click="undo"
      >
        Undo
      </button>
      <button
        type="button"
        :disabled="!snapshot.canRedo"
        @mousedown.prevent
        @click="redo"
      >
        Redo
      </button>
    </div>

    <EditorRoot
      :editor="editor"
      :authoring="authoring"
      aria-label="Rich text release notes editor"
      @error="error = $event.message"
    >
      <template #default="{ snapshot: current, authoringSurfaces }">
        <article data-example-editor-document>
          <EditorInlineSurface
            as="h2"
            :surface="{ type: 'node', id: 'title' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'title')" />
          </EditorInlineSurface>

          <EditorInlineSurface
            as="p"
            :surface="{ type: 'node', id: 'intro' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'intro')" />
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
                <InlineContent :nodes="inlineChildren(current, 'callout-body')" />
              </EditorInlineSurface>
            </EditorAuthoringMount>
          </aside>
        </article>
      </template>
    </EditorRoot>

    <p data-example-editor-status>
      {{ canFormat(snapshot)
        ? 'Formatting applies to the current text selection.'
        : 'Select text inside one block to format it.' }}
      · revision {{ snapshot.revision }}
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
