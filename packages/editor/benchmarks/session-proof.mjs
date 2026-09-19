import { performance } from 'node:perf_hooks';
import { baseRef, compileContentSchema } from '@sectile/content/schema';
import { createEditorSession } from '../dist/session.js';

const compiled = compileContentSchema({
  id: 'proof/editor-benchmark',
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
if (!compiled.ok) throw new Error(compiled.error.message);

const rows = [];
for (const size of [1_000, 10_000, 50_000]) {
  const document = createDocument(size);
  const editor = createEditorSession({
    document,
    schema: compiled.value,
    historyLimit: 100,
  });
  if (!editor.ok) throw new Error(editor.error.message);

  const replaceTextMs = median(() => {
    const snapshot = editor.value.getSnapshot();
    const node = snapshot.index.getNode('p0');
    if (node?.type !== 'paragraph') throw new Error('missing p0');
    const child = node.children[0];
    const length = child?.type === 'text' ? child.text.length : 0;
    const result = editor.value.replaceText({
      id: 'p0',
      from: length,
      to: length,
      text: '!',
      historyIntent: 'typing',
    });
    if (!result.ok) throw new Error(result.error.message);
  }, 15);

  rows.push({ size, replaceTextMs });
}

const semanticDocument = createDocument(10_000);
const semanticMs = medianWithSetup(
  () => {
    const editor = createEditorSession({
      document: semanticDocument,
      schema: compiled.value,
      historyLimit: 100,
    });
    if (!editor.ok) throw new Error(editor.error.message);
    return editor.value;
  },
  (editor) => {
    const result = editor.transact({
      operations: [{
        type: 'replace-inline',
        surface: { type: 'node', id: 'p0' },
        from: 8,
        to: 8,
        replacement: [{
          type: 'text',
          text: '!',
          marks: [],
        }],
      }],
      historyIntent: 'command',
    });
    if (!result.ok) throw new Error(result.error.message);
  },
  5,
);

console.log(JSON.stringify({
  node: process.version,
  rows,
  semantic10kMs: semanticMs,
  notes: {
    replaceText:
      'prepared Content edit + selection mapping/validation + bounded Editor history/publication; session preparation excluded',
    transact:
      'semantic Content transform + prepare + selection/history/publication',
  },
}, null, 2));

function createDocument(size) {
  return {
    formatVersion: 1,
    schema: {
      id: 'proof/editor-benchmark',
      version: 1,
    },
    root: {
      type: 'document',
      children: Array.from({ length: size }, (_, index) => ({
        id: `p${index}`,
        type: 'paragraph',
        children: [{
          type: 'text',
          text: 'abcdefgh',
          marks: [],
        }],
      })),
    },
  };
}

function median(run, samples) {
  const values = [];
  for (let index = 0; index < samples; index += 1) {
    globalThis.gc?.();
    const started = performance.now();
    run();
    values.push(performance.now() - started);
  }
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)];
}

function medianWithSetup(setup, run, samples) {
  const values = [];
  for (let index = 0; index < samples; index += 1) {
    const state = setup();
    globalThis.gc?.();
    const started = performance.now();
    run(state);
    values.push(performance.now() - started);
  }
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)];
}
