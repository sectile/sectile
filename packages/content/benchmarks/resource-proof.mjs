import { performance } from 'node:perf_hooks';
import {
  baseRef,
  compileContentSchema,
  createDocumentIndex,
  transformDocument,
  validateDocument,
} from '../dist/index.js';

const compiled = compileContentSchema({
  id: 'proof/resource',
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

const sizes = [1_000, 5_000, 10_000, 25_000, 50_000];
const rows = [];

for (const size of sizes) {
  const document = createDocument(size);
  const validateMs = median(() => {
    const result = validateDocument(document, compiled.value);
    if (!result.ok) throw new Error(result.error.message);
  });
  const indexMs = median(() => {
    const result = createDocumentIndex(document);
    if (!result.ok) throw new Error(result.error.message);
  });
  const singleTransformMs = median(() => {
    const result = transformDocument(document, {
      schema: compiled.value,
      operations: [
        {
          type: 'set-mark',
          surface: { type: 'node', id: 'p0' },
          from: 0,
          to: 4,
          mark: { type: 'strong' },
          enabled: true,
        },
      ],
    });
    if (!result.ok) throw new Error(result.error.message);
  }, 3);

  globalThis.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const index = createDocumentIndex(document);
  if (!index.ok) throw new Error(index.error.message);
  globalThis.__proofIndex = index.value;
  globalThis.gc?.();
  const heapWithIndex = process.memoryUsage().heapUsed;
  globalThis.__proofIndex = null;
  globalThis.gc?.();

  rows.push({
    size,
    validateMs,
    indexMs,
    singleTransformMs,
    retainedIndexMiB: Math.max(0, heapWithIndex - heapBefore) / 1024 / 1024,
  });
}

const batchDocument = createDocument(10_000);
const batchRows = [];
for (const operationCount of [1, 5, 10, 20]) {
  const operations = [];
  for (let index = 0; index < operationCount; index += 1) {
    operations.push({
      type: 'set-mark',
      surface: { type: 'node', id: 'p0' },
      from: 0,
      to: 4,
      mark: { type: 'strong' },
      enabled: index % 2 === 0,
    });
  }
  const batchMs = median(() => {
    const result = transformDocument(batchDocument, {
      schema: compiled.value,
      operations,
    });
    if (!result.ok) throw new Error(result.error.message);
  }, 3);
  batchRows.push({ operationCount, batchMs });
}

console.log(JSON.stringify({
  node: process.version,
  rows,
  batchRows,
  observations: {
    proofTransformImplementation:
      'whole JSON clone + fresh index per operation + final validation; semantic proof only',
    productionQuestion:
      'whether validated runtime state should retain reusable indexes and update them incrementally',
  },
}, null, 2));

function createDocument(size) {
  return {
    formatVersion: 1,
    schema: {
      id: 'proof/resource',
      version: 1,
    },
    root: {
      type: 'document',
      children: Array.from({ length: size }, (_, index) => ({
        id: `p${index}`,
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'abcdefgh',
            marks: [],
          },
        ],
      })),
    },
  };
}

function median(run, samples = 5) {
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
