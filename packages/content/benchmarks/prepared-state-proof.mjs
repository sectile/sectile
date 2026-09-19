import { performance } from 'node:perf_hooks';
import {
  baseRef,
  compileContentSchema,
  prepareContent,
  replacePreparedText,
  transformDocument,
} from '../dist/index.js';

const compiled = compileContentSchema({
  id: 'proof/prepared-benchmark',
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
    allowed: [baseRef('text'), baseRef('hard-break')],
  },
});
if (!compiled.ok) throw new Error(compiled.error.message);

const sizes = [1_000, 10_000, 50_000];
const rows = [];

for (const size of sizes) {
  const document = createDocument(size);

  const prepareMs = median(() => {
    const prepared = prepareContent(document, compiled.value);
    if (!prepared.ok) throw new Error(prepared.error.message);
  }, 3);

  const naiveMs = median(() => {
    const result = transformDocument(document, {
      schema: compiled.value,
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
    });
    if (!result.ok) throw new Error(result.error.message);
  }, 3);

  const prepared = prepareContent(document, compiled.value);
  if (!prepared.ok) throw new Error(prepared.error.message);

  const preparedSingleMs = median(() => {
    const result = replacePreparedText(prepared.value, {
      id: 'p0',
      from: 8,
      to: 8,
      text: '!',
    });
    if (!result.ok) throw new Error(result.error.message);
  }, 11);

  rows.push({
    size,
    prepareMs,
    naiveMs,
    preparedSingleMs,
  });
}

const repeatedRows = [];
for (const size of [10_000, 50_000]) {
  const document = createDocument(size);

  for (const count of [1, 5, 10, 20, 100]) {
    const preparedMs = medianWithSetup(
      () => prepareOrThrow(document),
      (initial) => {
        let current = initial;
        for (let index = 0; index < count; index += 1) {
          const node = current.index.getNode('p0');
          if (node?.type !== 'paragraph') throw new Error('missing p0');
          const text = node.children[0];
          if (text?.type !== 'text') throw new Error('missing p0 text');

          const result = replacePreparedText(current, {
            id: 'p0',
            from: text.text.length,
            to: text.text.length,
            text: '!',
          });
          if (!result.ok) throw new Error(result.error.message);
          current = result.value.state;
        }
      },
      7,
    );

    repeatedRows.push({
      size,
      count,
      preparedMs,
      perEditMs: preparedMs / count,
    });
  }
}

const distinctRows = [];
for (const size of [10_000, 50_000]) {
  const document = createDocument(size);

  for (const count of [10, 100, 1_000]) {
    if (count > size) continue;
    const distinctMs = medianWithSetup(
      () => prepareOrThrow(document),
      (initial) => {
        let current = initial;
        for (let index = 0; index < count; index += 1) {
          const id = `p${index}`;
          const node = current.index.getNode(id);
          if (node?.type !== 'paragraph') throw new Error(`missing ${id}`);
          const text = node.children[0];
          if (text?.type !== 'text') throw new Error(`missing ${id} text`);

          const result = replacePreparedText(current, {
            id,
            from: text.text.length,
            to: text.text.length,
            text: '!',
          });
          if (!result.ok) throw new Error(result.error.message);
          current = result.value.state;
        }
      },
      5,
    );

    distinctRows.push({
      size,
      count,
      distinctMs,
      perEditMs: distinctMs / count,
    });
  }
}

console.log(JSON.stringify({
  node: process.version,
  rows,
  repeatedRows,
  distinctRows,
  notes: {
    preparedState:
      'retained base DocumentIndex + node overrides + ancestor-path structural sharing',
    knownBound:
      'editing a root child still copies the root children array, so cost includes O(root width) copying even though no full scan/index rebuild occurs',
  },
}, null, 2));

function createDocument(size) {
  return {
    formatVersion: 1,
    schema: {
      id: 'proof/prepared-benchmark',
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

function prepareOrThrow(document) {
  const prepared = prepareContent(document, compiled.value);
  if (!prepared.ok) throw new Error(prepared.error.message);
  return prepared.value;
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
