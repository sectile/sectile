import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import {
  createClientTabularSource,
  resolveClientTabularRequest,
} from '../dist/source.js';
import {
  createDataTableVirtualAdapter,
  reconcileDataTableVirtualAdapter,
} from '../dist/virtual.js';

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
  const baseRequest = {
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
  };
  const cold = resolveClientTabularRequest(source, baseRequest);
  const coldCompleted = performance.now();
  assert.equal(cold.ok, true);
  assert.equal(cold.value.rows.length, 100);
  assert.equal(cold.value.matchingLeafCount.kind, 'known');
  assert.equal(cold.value.matchingLeafCount.value, recordCount - Math.ceil(recordCount / 3));
  const coldOperations = { ...counters };

  const warm = resolveClientTabularRequest(source, {
    ...baseRequest,
    requestID: 2,
    query: structuredClone(baseRequest.query),
    access: { kind: 'window', start: 1, count: 100 },
  });
  const warmCompleted = performance.now();
  assert.equal(warm.ok, true);
  const warmOperations = counterDelta(counters, coldOperations);
  assert.deepEqual(warmOperations, { getRowID: 0, getValue: 0, predicate: 0, comparator: 0 });

  const beforeInvalidation = { ...counters };
  const invalidated = resolveClientTabularRequest(source, {
    ...baseRequest,
    requestID: 3,
    queryRevision: 2,
    query: {
      ...baseRequest.query,
      sort: [{ ...baseRequest.query.sort[0], direction: 'ascending' }],
    },
  });
  const invalidatedCompleted = performance.now();
  assert.equal(invalidated.ok, true);
  const invalidationOperations = counterDelta(counters, beforeInvalidation);
  assert.equal(invalidationOperations.getRowID, 0);
  assert.ok(invalidationOperations.getValue > 0 && invalidationOperations.predicate > 0 && invalidationOperations.comparator > 0);
  scales.push({
    recordCount,
    completed: true,
    matchingLeafCount: cold.value.matchingLeafCount.value,
    returnedRows: cold.value.rows.length,
    operationCount: Object.values(coldOperations).reduce((total, count) => total + count, 0),
    operations: coldOperations,
    stages: {
      warm: { operationCount: 0, operations: warmOperations },
      queryInvalidation: {
        operationCount: Object.values(invalidationOperations).reduce((total, count) => total + count, 0),
        operations: invalidationOperations,
      },
    },
    timingsMs: {
      construct: round(constructed - started),
      resolve: round(coldCompleted - constructed),
      warm: round(warmCompleted - coldCompleted),
      queryInvalidation: round(invalidatedCompleted - warmCompleted),
      total: round(invalidatedCompleted - started),
    },
  });
}

const generationChurn = measureGenerationChurn();
const virtualReconciliation = measureVirtualReconciliation();

const evidence = {
  schemaVersion: 1,
  package: '@sectile/tabular',
  status: 'passed',
  seed,
  environment: { node: process.version, platform: process.platform, architecture: process.arch },
  timingPolicy: 'informational-no-threshold',
  scales,
  generationChurn,
  virtualReconciliation,
};
await writeFile('verification/benchmark.json', `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}

function counterDelta(current, previous) {
  return Object.fromEntries(Object.keys(current).map((key) => [key, current[key] - previous[key]]));
}

function measureGenerationChurn() {
  assert.equal(typeof globalThis.gc, 'function', 'Generation churn evidence requires --expose-gc.');
  const records = Array.from({ length: 64 }, (_, index) => ({ id: `churn-${index}`, value: index }));
  const source = createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns: [{ id: 'value' }], headers: [] },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
  });
  const resolveGeneration = (sourceGeneration) => {
    const result = resolveClientTabularRequest(source, {
      protocolVersion: 1,
      requestID: sourceGeneration,
      sourceGeneration,
      queryRevision: 0,
      expansionRevision: 0,
      query: { filters: [], sort: [], groups: [], aggregates: [], pivots: [] },
      expansion: [],
      access: { kind: 'window', start: 0, count: 1 },
      columnSchemaRevision: 0,
    });
    assert.equal(result.ok, true);
  };
  for (let generation = 0; generation < 2_000; generation += 1) resolveGeneration(generation);
  globalThis.gc();
  const before = process.memoryUsage().heapUsed;
  for (let generation = 2_000; generation < 6_000; generation += 1) resolveGeneration(generation);
  globalThis.gc();
  const middle = process.memoryUsage().heapUsed;
  for (let generation = 6_000; generation < 10_000; generation += 1) resolveGeneration(generation);
  globalThis.gc();
  const after = process.memoryUsage().heapUsed;
  const tailGrowthBytes = Math.max(0, after - middle);
  assert.ok(tailGrowthBytes <= 8 * 1024 * 1024, `Retained heap grew ${tailGrowthBytes} bytes during the final 4k generations.`);
  return {
    generations: 10_000,
    recordsPerGeneration: records.length,
    retainedStages: 1,
    heapUsedBytes: { before, middle, after },
    tailGrowthBytes,
    ceilingBytes: 8 * 1024 * 1024,
    status: 'passed',
  };
}

function measureVirtualReconciliation() {
  const evidence = [];
  for (const rowCount of [1_000, 10_000, 100_000]) {
    const ids = Array.from({ length: rowCount }, (_, index) => `virtual-${index}`);
    const scenarios = [
      { name: 'reverse', target: [...ids].reverse() },
      { name: 'rotation', target: [...ids.slice(Math.floor(rowCount / 3)), ...ids.slice(0, Math.floor(rowCount / 3))] },
      { name: 'large-filter', target: ids.filter((_id, index) => index % 3 === 0) },
      { name: 'mixed', target: ['virtual-new-a', ...ids.slice(8).reverse(), 'virtual-new-b'] },
    ];
    const scenarioEvidence = [];
    for (const scenario of scenarios) {
      let extentCalls = 0;
      const adapter = createDataTableVirtualAdapter({
        projection: virtualTableProjection(ids),
        rowExtents: { kind: 'by-id', getExtent: () => { extentCalls += 1; return { kind: 'estimated', value: 24 }; } },
      });
      const beforeCalls = extentCalls;
      globalThis.gc();
      const beforeHeap = process.memoryUsage().heapUsed;
      const started = performance.now();
      const reconciled = reconcileDataTableVirtualAdapter(adapter, adapter.state, virtualTableProjection(scenario.target, 2));
      const completed = performance.now();
      assert.equal(reconciled.ok, true);
      globalThis.gc();
      const afterHeap = process.memoryUsage().heapUsed;
      scenarioEvidence.push({
        name: scenario.name,
        durationMs: round(completed - started),
        mutationCount: reconciled.value.mutations.length,
        extentCallbackCount: extentCalls - beforeCalls,
        retainedHeapDeltaBytes: Math.max(0, afterHeap - beforeHeap),
      });
    }
    evidence.push({ rowCount, scenarios: scenarioEvidence });
  }
  return evidence;
}

function virtualTableProjection(ids, generation = 1) {
  return {
    generation,
    rows: ids.map((id) => ({ kind: 'leaf', id, cells: { value: id } })),
    columns: { start: [], center: ['value'], end: [] },
    rowSelection: { kind: 'explicit-rows', rowIDs: [] },
    expansion: [],
  };
}
