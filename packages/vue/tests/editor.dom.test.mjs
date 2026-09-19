import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  CompositionEvent: browserWindow.CompositionEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  onUpdated,
  shallowRef,
} = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const {
  baseRef,
  compileContentSchema,
} = await import('@sectile/content/schema');
const {
  compileAuthoringRegistry,
} = await import('@sectile/editor/authoring');
const {
  createEditorSession,
} = await import('@sectile/editor/session');
const {
  readEditorDOMSelection,
} = await import('@sectile/dom/editor');
const {
  EditorHardBreak,
  EditorInlineSurface,
  EditorRoot,
} = await import('../.verification-dist/editor.js');

function createFixture(value, selectionOffset = null) {
  const schema = compileContentSchema({
    id: 'vue/editor-test',
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
  assert.equal(schema.ok, true);
  const authoring = compileAuthoringRegistry(schema.value);
  assert.equal(authoring.ok, true);
  const point = selectionOffset === null ? null : {
    type: 'inline',
    surface: { type: 'node', id: 'p1' },
    offset: selectionOffset,
    affinity: 'after',
  };
  const editor = createEditorSession({
    schema: schema.value,
    ...(point === null ? {} : {
      selection: {
        anchor: point,
        focus: point,
        direction: 'forward',
      },
    }),
    document: {
      formatVersion: 1,
      schema: { id: 'vue/editor-test', version: 1 },
      root: {
        type: 'document',
        children: [{
          id: 'p1',
          type: 'paragraph',
          children: [{
            type: 'text',
            text: value,
            marks: [],
          }],
        }],
      },
    },
  });
  assert.equal(editor.ok, true);
  return {
    editor: editor.value,
    authoring: authoring.value,
  };
}

function renderEditor(editor, authoring, rootProps = {}) {
  return h(
    EditorRoot,
    { editor, authoring, ...rootProps },
    {
      default: ({ snapshot }) => {
        const paragraph = snapshot.document.root.children[0];
        assert.equal(paragraph.type, 'paragraph');
        return h(
          EditorInlineSurface,
          {
            as: 'p',
            surface: { type: 'node', id: paragraph.id },
          },
          {
            default: () => paragraph.children.map((child) => (
              child.type === 'text' ? child.text : ''
            )).join(''),
          },
        );
      },
    },
  );
}

test('Vue Editor is SSR-safe, hydrates stable anatomy, and projects Editor updates', async () => {
  const fixture = createFixture('hello', 5);
  const component = defineComponent({
    setup: () => () => renderEditor(fixture.editor, fixture.authoring),
  });
  const html = await renderToString(createSSRApp(component));
  assert.match(html, /data-scope="editor"/u);
  assert.match(html, /data-part="root"/u);
  assert.match(html, /contenteditable="true"/u);
  assert.match(html, /data-sectile-editor-surface-id="p1"/u);
  assert.match(html, />hello</u);

  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    assert.deepEqual(warnings, []);
    const paragraph = host.querySelector('p');
    assert.equal(paragraph?.textContent, 'hello');
    const editorRoot = host.querySelector('[data-scope="editor"]');
    assert.ok(editorRoot instanceof HTMLElement);
    assert.deepEqual(readEditorDOMSelection(editorRoot), {
      status: 'mapped',
      selection: fixture.editor.getSnapshot().selection,
    });

    const changed = fixture.editor.replaceInlineText({
      surface: { type: 'node', id: 'p1' },
      from: 5,
      to: 5,
      text: '!',
    });
    assert.equal(changed.ok, true);
    await nextTick();
    await nextTick();
    assert.equal(host.querySelector('p')?.textContent, 'hello!');
    assert.deepEqual(readEditorDOMSelection(editorRoot), {
      status: 'mapped',
      selection: fixture.editor.getSnapshot().selection,
    });
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue Editor reconnects when the Editor session prop changes and retires the old connection', async () => {
  const first = createFixture('first');
  const second = createFixture('second');
  const current = shallowRef(first.editor);
  const component = defineComponent({
    setup: () => () => renderEditor(current.value, first.authoring),
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(component);
  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    assert.equal(host.querySelector('p')?.textContent, 'first');

    current.value = second.editor;
    await nextTick();
    await nextTick();
    assert.equal(host.querySelector('p')?.textContent, 'second');

    const stale = first.editor.replaceInlineText({
      surface: { type: 'node', id: 'p1' },
      from: 5,
      to: 5,
      text: '!',
    });
    assert.equal(stale.ok, true);
    await nextTick();
    assert.equal(host.querySelector('p')?.textContent, 'second');

    const active = second.editor.replaceInlineText({
      surface: { type: 'node', id: 'p1' },
      from: 6,
      to: 6,
      text: '!',
    });
    assert.equal(active.ok, true);
    await nextTick();
    await nextTick();
    assert.equal(host.querySelector('p')?.textContent, 'second!');
  } finally {
    app.unmount();
    host.remove();
  }
});


test('Vue Editor retires the previous DOM connection before root replacement completes', async () => {
  const fixture = createFixture('hello');
  const tag = shallowRef('div');
  const editorRoot = shallowRef(null);
  let initialConnection = null;
  let connectionDuringUpdate = undefined;
  const component = defineComponent({
    setup() {
      onUpdated(() => {
        if (initialConnection !== null) {
          connectionDuringUpdate = editorRoot.value?.getConnection() ?? null;
        }
      });
      return () => renderEditor(
        fixture.editor,
        fixture.authoring,
        {
          ref: editorRoot,
          as: tag.value,
        },
      );
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(component);
  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    initialConnection = editorRoot.value?.getConnection() ?? null;
    assert.notEqual(initialConnection, null);
    assert.equal(host.querySelector('[data-scope="editor"]')?.tagName, 'DIV');

    tag.value = 'section';
    await nextTick();

    assert.equal(host.querySelector('[data-scope="editor"]')?.tagName, 'SECTION');
    assert.equal(connectionDuringUpdate, null);

    await nextTick();
    assert.notEqual(editorRoot.value?.getConnection() ?? null, initialConnection);
  } finally {
    app.unmount();
    host.remove();
  }
});


test('Vue EditorHardBreak supports asChild composition without losing its marker', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(
      EditorHardBreak,
      { asChild: true },
      { default: () => h('span', { id: 'hard-break' }) },
    ),
  }));
  assert.match(html, /id="hard-break"/u);
  assert.match(html, /data-sectile-editor-hard-break/u);
});
