import assert from 'node:assert/strict';
import test from 'node:test';
import {
  benchmarkTargetStorageKey,
  persistBenchmarkTargets,
  restoreBenchmarkTargets,
} from '../.vitepress/theme/virtual-benchmark-target-storage.ts';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function normalizeTarget(value) {
  return typeof value === 'object' && value !== null
    && Number.isSafeInteger(value.id) && value.id > 0
    && typeof value.name === 'string'
    ? Object.freeze({ id: value.id, name: value.name })
    : null;
}

test('benchmark targets survive a storage round trip and retain their next id', () => {
  const storage = new MemoryStorage();
  persistBenchmarkTargets(storage, [{ id: 2, name: 'standard' }, { id: 7, name: 'custom' }]);

  assert.deepEqual(restoreBenchmarkTargets(storage, normalizeTarget), {
    targets: [{ id: 2, name: 'standard' }, { id: 7, name: 'custom' }],
    nextID: 8,
  });
});

test('restore drops invalid and duplicate targets without discarding valid targets', () => {
  const storage = new MemoryStorage();
  storage.setItem(benchmarkTargetStorageKey, JSON.stringify({
    schemaVersion: 1,
    targets: [{ id: 3, name: 'first' }, { id: 3, name: 'duplicate' }, { id: 4 }],
  }));

  assert.deepEqual(restoreBenchmarkTargets(storage, normalizeTarget), {
    targets: [{ id: 3, name: 'first' }],
    nextID: 4,
  });
});

test('empty targets clear storage and malformed storage is self-healed', () => {
  const storage = new MemoryStorage();
  storage.setItem(benchmarkTargetStorageKey, '{');
  assert.deepEqual(restoreBenchmarkTargets(storage, normalizeTarget), { targets: [], nextID: 1 });
  assert.equal(storage.getItem(benchmarkTargetStorageKey), null);

  persistBenchmarkTargets(storage, [{ id: 1, name: 'saved' }]);
  persistBenchmarkTargets(storage, []);
  assert.equal(storage.getItem(benchmarkTargetStorageKey), null);
});
