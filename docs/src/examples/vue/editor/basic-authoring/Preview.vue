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
  JSONValue,
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
  headingLevels: [1, 2, 3],
  groups: [],
  blockContent: {
    kind: 'block',
    allowed: [
      baseRef('heading'),
      baseRef('paragraph'),
      baseRef('blockquote'),
      baseRef('list'),
      baseRef('code-block'),
      componentRef('docs/media'),
      componentRef('docs/callout'),
    ],
  },
  rootContent: {
    kind: 'block',
    allowed: [
      baseRef('heading'),
      baseRef('paragraph'),
      baseRef('blockquote'),
      baseRef('list'),
      baseRef('code-block'),
      componentRef('docs/media'),
      componentRef('docs/callout'),
    ],
  },
  inlineContent: {
    kind: 'inline',
    allowed: [baseRef('text'), baseRef('hard-break')],
  },
  components: [
    {
      id: 'docs/media',
      kind: 'block',
      componentVersion: 1,
      data: {
        type: 'object',
        properties: {
          title: { schema: { type: 'string' } },
          caption: { schema: { type: 'string' } },
        },
      },
      slots: [],
    },
    {
      id: 'docs/callout',
      kind: 'block',
      componentVersion: 1,
      data: { type: 'object', properties: {} },
      slots: [{
        name: 'body',
        kind: 'block',
        allowed: [baseRef('paragraph')],
      }],
    },
  ],
});
if (!schemaResult.ok) throw new Error(schemaResult.error.message);

const authoringResult = compileAuthoringRegistry(schemaResult.value, [
  {
    component: 'docs/media',
    label: 'Media',
    mode: 'atom',
  },
  {
    component: 'docs/callout',
    label: 'Callout',
    mode: 'flow',
  },
]);
if (!authoringResult.ok) throw new Error(authoringResult.error.message);

const editorResult = createEditorSession({
  schema: schemaResult.value,
  historyLimit: 40,
  document: {
    formatVersion: 1,
    schema: { id: 'docs/editor-basic', version: 1 },
    root: {
      type: 'document',
      children: [
        {
          id: 'title',
          type: 'heading',
          level: 1,
          children: [{
            type: 'text',
            text: 'Shipping a structured editor without renderer lock-in',
            marks: [],
          }],
        },
        {
          id: 'deck',
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'A production-style document backed by ',
              marks: [],
            },
            {
              type: 'text',
              text: 'Portable Content',
              marks: [{ type: 'strong' }],
            },
            {
              type: 'text',
              text: ', with ',
              marks: [],
            },
            {
              type: 'text',
              text: 'logical selection',
              marks: [{ type: 'emphasis' }],
            },
            {
              type: 'text',
              text: ' and transaction history owned by ',
              marks: [],
            },
            {
              type: 'text',
              text: 'Editor',
              marks: [{ type: 'code' }],
            },
            {
              type: 'text',
              text: '.',
              marks: [],
            },
          ],
        },
        {
          id: 'cover',
          type: 'component',
          kind: 'block',
          component: 'docs/media',
          componentVersion: 1,
          data: {
            title: 'Portable authoring',
            caption: 'The media block is a schema-backed atom rendered by the host.',
          },
          slots: [],
        },
        {
          id: 'overview-title',
          type: 'heading',
          level: 2,
          children: [{
            type: 'text',
            text: 'What the document model owns',
            marks: [],
          }],
        },
        {
          id: 'overview',
          type: 'paragraph',
          children: [{
            type: 'text',
            text: 'Select any text in the editable blocks below. Bold, Italic, and Code apply to exactly that range, while the host only projects the committed snapshot.',
            marks: [],
          }],
        },
        {
          id: 'quote',
          type: 'blockquote',
          children: [{
            id: 'quote-copy',
            type: 'paragraph',
            children: [{
              type: 'text',
              text: 'Portable semantics stay independent from the DOM or Vue renderer that happens to present them.',
              marks: [{ type: 'emphasis' }],
            }],
          }],
        },
        {
          id: 'highlights-title',
          type: 'heading',
          level: 2,
          children: [{
            type: 'text',
            text: 'Editing capabilities',
            marks: [],
          }],
        },
        {
          id: 'highlights',
          type: 'list',
          ordered: false,
          children: [
            {
              id: 'highlight-1',
              type: 'list-item',
              children: [{
                id: 'highlight-1-copy',
                type: 'paragraph',
                children: [{
                  type: 'text',
                  text: 'Native browser selection mapped to logical document positions.',
                  marks: [],
                }],
              }],
            },
            {
              id: 'highlight-2',
              type: 'list-item',
              children: [{
                id: 'highlight-2-copy',
                type: 'paragraph',
                children: [{
                  type: 'text',
                  text: 'Inline marks, typing, clipboard, composition, and local undo/redo.',
                  marks: [],
                }],
              }],
            },
            {
              id: 'highlight-3',
              type: 'list-item',
              children: [{
                id: 'highlight-3-copy',
                type: 'paragraph',
                children: [{
                  type: 'text',
                  text: 'Schema-backed components and isolated authoring slots.',
                  marks: [],
                }],
              }],
            },
          ],
        },
        {
          id: 'code-sample',
          type: 'code-block',
          text: "editor.transact({\n  operations,\n  historyIntent: 'command'\n})",
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
                text: 'This callout body is another editable surface inside a registered Content component.',
                marks: [{ type: 'strong' }],
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

function codeBlockText(value: EditorSessionSnapshot, id: string): string {
  const node = value.index.getNode(id);
  return node?.type === 'code-block' ? node.text : '';
}

function componentString(
  value: EditorSessionSnapshot,
  id: string,
  key: string,
): string {
  const node = value.index.getNode(id);
  if (node?.type !== 'component') return '';
  return stringFromData(node.data, key);
}

function stringFromData(data: JSONValue, key: string): string {
  if (data === null || Array.isArray(data) || typeof data !== 'object') return '';
  const record = data as Readonly<Record<string, JSONValue>>;
  const value = record[key];
  return typeof value === 'string' ? value : '';
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

function hasInlineFormattingTarget(value: EditorSessionSnapshot): boolean {
  const selection = value.selection;
  return !value.interaction.disabled
    && !value.interaction.readOnly
    && selection !== null
    && selection.anchor.type === 'inline'
    && selection.focus.type === 'inline'
    && sameSurface(selection.anchor.surface, selection.focus.surface);
}

function canFormat(value: EditorSessionSnapshot): boolean {
  return hasInlineFormattingTarget(value);
}

function hasCollapsedInlineCaret(value: EditorSessionSnapshot): boolean {
  const selection = value.selection;
  return hasInlineFormattingTarget(value)
    && selection !== null
    && selection.anchor.type === 'inline'
    && selection.focus.type === 'inline'
    && selection.anchor.offset === selection.focus.offset;
}

function selectionLabel(value: EditorSessionSnapshot): string {
  const range = selectedInlineRange(value);
  if (range !== null) return `${range.to - range.from} characters selected`;
  if (hasCollapsedInlineCaret(value)) {
    const active = value.typingMarks
      .filter((mark) => mark.type !== 'link')
      .map((mark) => mark.type);
    return active.length === 0
      ? 'Caret · plain text'
      : `Caret · ${active.join(' + ')}`;
  }
  return 'Place the caret or select text';
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

function formatMarkIsActive(
  value: EditorSessionSnapshot,
  type: FormatMark,
): boolean {
  const range = selectedInlineRange(value);
  return range === null
    ? hasCollapsedInlineCaret(value)
      && value.typingMarks.some((mark) => mark.type === type)
    : selectedRangeHasMark(value, type);
}

function toggleMark(type: FormatMark): void {
  const current = snapshot.value;
  if (!canFormat(current) || current.selection === null) return;
  const range = selectedInlineRange(current);

  if (range === null) {
    const result = editor.setTypingMark(
      type,
      !formatMarkIsActive(current, type),
    );
    error.value = result.ok ? null : result.error.message;
    return;
  }

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

function clearFormatting(): void {
  const current = snapshot.value;
  if (!canFormat(current) || current.selection === null) return;
  const range = selectedInlineRange(current);

  if (range === null) {
    for (const type of ['strong', 'emphasis', 'code'] as const) {
      if (!current.typingMarks.some((mark) => mark.type === type)) continue;
      const result = editor.setTypingMark(type, false);
      if (!result.ok) {
        error.value = result.error.message;
        return;
      }
    }
    error.value = null;
    return;
  }

  const result = editor.transact({
    operations: [
      {
        type: 'set-mark',
        surface: range.surface,
        from: range.from,
        to: range.to,
        mark: markByType.strong,
        enabled: false,
      },
      {
        type: 'set-mark',
        surface: range.surface,
        from: range.from,
        to: range.to,
        mark: markByType.emphasis,
        enabled: false,
      },
      {
        type: 'set-mark',
        surface: range.surface,
        from: range.from,
        to: range.to,
        mark: markByType.code,
        enabled: false,
      },
    ],
    selection: current.selection,
    historyIntent: 'command',
  });
  error.value = result.ok ? null : result.error.message;
}

function handleEditorKeydown(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'b') {
    event.preventDefault();
    toggleMark('strong');
    return;
  }
  if (key === 'i') {
    event.preventDefault();
    toggleMark('emphasis');
    return;
  }
  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  }
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
    <div data-example-editor-toolbar aria-label="Editor toolbar">
      <div data-example-editor-toolbar-group>
        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          :disabled="!snapshot.canUndo"
          @mousedown.prevent
          @click="undo"
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          :disabled="!snapshot.canRedo"
          @mousedown.prevent
          @click="redo"
        >
          ↷
        </button>
      </div>

      <span data-example-editor-toolbar-separator aria-hidden="true" />

      <div data-example-editor-toolbar-group>
        <button
          type="button"
          aria-label="Bold"
          title="Bold"
          :disabled="!canFormat(snapshot)"
          :aria-pressed="formatMarkIsActive(snapshot, 'strong')"
          @mousedown.prevent
          @click="toggleMark('strong')"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-label="Italic"
          title="Italic"
          :disabled="!canFormat(snapshot)"
          :aria-pressed="formatMarkIsActive(snapshot, 'emphasis')"
          @mousedown.prevent
          @click="toggleMark('emphasis')"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          aria-label="Code"
          title="Inline code"
          :disabled="!canFormat(snapshot)"
          :aria-pressed="formatMarkIsActive(snapshot, 'code')"
          @mousedown.prevent
          @click="toggleMark('code')"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          aria-label="Clear formatting"
          title="Clear formatting"
          :disabled="!canFormat(snapshot)"
          @mousedown.prevent
          @click="clearFormatting"
        >
          Tx
        </button>
      </div>

      <span data-example-editor-toolbar-state>
        {{ selectionLabel(snapshot) }}
      </span>
    </div>

    <EditorRoot
      :editor="editor"
      :authoring="authoring"
      aria-label="Production-style structured editor"
      @keydown="handleEditorKeydown"
      @error="error = $event.message"
    >
      <template #default="{ snapshot: current, authoringSurfaces }">
        <article data-example-editor-document>
          <EditorInlineSurface
            as="h1"
            :surface="{ type: 'node', id: 'title' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'title')" />
          </EditorInlineSurface>

          <EditorInlineSurface
            as="p"
            data-example-editor-deck
            :surface="{ type: 'node', id: 'deck' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'deck')" />
          </EditorInlineSurface>

          <figure data-example-editor-media contenteditable="false">
            <div data-example-editor-media-art aria-hidden="true">
              <span>Structured content</span>
              <strong>{{ componentString(current, 'cover', 'title') }}</strong>
            </div>
            <figcaption>
              {{ componentString(current, 'cover', 'caption') }}
            </figcaption>
          </figure>

          <EditorInlineSurface
            as="h2"
            :surface="{ type: 'node', id: 'overview-title' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'overview-title')" />
          </EditorInlineSurface>

          <EditorInlineSurface
            as="p"
            :surface="{ type: 'node', id: 'overview' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'overview')" />
          </EditorInlineSurface>

          <blockquote data-example-editor-quote>
            <EditorInlineSurface
              as="p"
              :surface="{ type: 'node', id: 'quote-copy' }"
            >
              <InlineContent :nodes="inlineChildren(current, 'quote-copy')" />
            </EditorInlineSurface>
          </blockquote>

          <EditorInlineSurface
            as="h2"
            :surface="{ type: 'node', id: 'highlights-title' }"
          >
            <InlineContent :nodes="inlineChildren(current, 'highlights-title')" />
          </EditorInlineSurface>

          <ul data-example-editor-list>
            <li>
              <EditorInlineSurface
                as="p"
                :surface="{ type: 'node', id: 'highlight-1-copy' }"
              >
                <InlineContent :nodes="inlineChildren(current, 'highlight-1-copy')" />
              </EditorInlineSurface>
            </li>
            <li>
              <EditorInlineSurface
                as="p"
                :surface="{ type: 'node', id: 'highlight-2-copy' }"
              >
                <InlineContent :nodes="inlineChildren(current, 'highlight-2-copy')" />
              </EditorInlineSurface>
            </li>
            <li>
              <EditorInlineSurface
                as="p"
                :surface="{ type: 'node', id: 'highlight-3-copy' }"
              >
                <InlineContent :nodes="inlineChildren(current, 'highlight-3-copy')" />
              </EditorInlineSurface>
            </li>
          </ul>

          <pre data-example-editor-code contenteditable="false"><code>{{ codeBlockText(current, 'code-sample') }}</code></pre>

          <aside data-example-editor-callout>
            <span data-example-editor-callout-label>Component slot</span>
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

    <div data-example-editor-footer>
      <span>Revision {{ snapshot.revision }}</span>
      <span>{{ snapshot.canUndo ? 'Unsaved local history' : 'Document is current' }}</span>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
