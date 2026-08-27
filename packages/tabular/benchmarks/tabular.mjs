import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import {
  createClientTabularSource,
  resolveClientTabularRequest,
} from '../dist/source.js';

const seed = 'sectile-tabular-benchmark-v1';
const scales = [];

for (const recordCount of [1_000, 10_000, 100_000]) {
  const counters = { getRowID: 0, getValue: 0, predicate: 0, comparator: 0 };
  const records = Array.from({ length: recordCount }, (_, index) => Object.freeze({
    id: `row-${index}`,
    name: `Record ${String(recordCount - index).padStart(6, '0')}`,
    score: (index * 48_271) % 100_003,
    active: index % 3 !== 0,
  }));
  const started = performance.now();
  const source = createClientTabularSource({
    records,
    columnSchema: {
      revision: 0,
      columns: [{ id: 'name' }, { id: 'score' }, { id: 'active' }],
      headers: [],
    },
    getRowID: (record) => { counters.getRowID += 1; return record.id; },
    getValue: (record, columnID) => { counters.getValue += 1; return record[columnID]; },
    policies: {
      predicates: {
        equals: (record, descriptor, getValue) => {
          counters.predicate += 1;
          return getValue(record, descriptor.columnID) === descriptor.value;
        },
      },
      comparators: {
        value: (left, right, descriptor, getValue) => {
          counters.comparator += 1;
          const a = getValue(left, descriptor.columnID);
          const b = getValue(right, descriptor.columnID);
          return a < b ? -1 : a > b ? 1 : 0;
        },
      },
    },
  });
  const constructed = performance.now();
  const result = resolveClientTabularRequest(source, {
    protocolVersion: 1,
    requestID: 1,
    sourceGeneration: 0,
    queryRevision: 1,
    expansionRevision: 0,
    query: {
      filters: [{ id: 'active', scope: 'column', columnID: 'active', predicate: 'equals', value: true }],
      sort: [{ id: 'score', columnID: 'score', direction: 'descending', comparator: 'value' }],
      groups: [],
      aggregates: [],
      pivots: [],
    },
    expansion: [],
    access: { kind: 'window', start: 0, count: 100 },
    columnSchemaRevision: 0,
  });
  const completed = performance.now();
  assert.equal(result.ok, true);
  assert.equal(result.value.rows.length, 100);
  assert.equal(result.value.matchingLeafCount.kind, 'known');
  assert.equal(result.value.matchingLeafCount.value, recordCount - Math.ceil(recordCount / 3));
  scales.push({
    recordCount,
    completed: true,
    matchingLeafCount: result.value.matchingLeafCount.value,
    returnedRows: result.value.rows.length,
    operationCount: Object.values(counters).reduce((total, count) => total + count, 0),
    operations: counters,
    timingsMs: {
      construct: round(constructed - started),
      resolve: round(completed - constructed),
      total: round(completed - started),
    },
  });
}

const evidence = {
  schemaVersion: 1,
  package: '@sectile/tabular',
  status: 'passed',
  seed,
  environment: { node: process.version, platform: process.platform, architecture: process.arch },
  timingPolicy: 'informational-no-threshold',
  scales,
};
await writeFile('verification/benchmark.json', `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}
