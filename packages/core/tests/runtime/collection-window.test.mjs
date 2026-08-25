import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCollectionWindowEvent,
  canRequestCollectionWindow,
  createCollectionWindowState,
  synchronizeCollectionWindow,
  tryCreateCollectionWindowState,
} from '../../.verification-dist/collection-window.js';

test('WIN-01: collection window emits one generation-bound request at a time', () => {
  const state = createCollectionWindowState({ revision: 3, start: 20, size: 10, total: 100 });
  const requested = applyCollectionWindowEvent(state, {
    type: 'request-window', direction: 'after', anchor: 'item-29',
  }).value;
  assert.deepEqual(requested.commands, [{
    type: 'request-window',
    request: { generation: 1, direction: 'after', anchor: 'item-29', revision: 3 },
  }]);
  assert.equal(applyCollectionWindowEvent(requested.state, {
    type: 'request-window', direction: 'before', anchor: 'item-20',
  }).value.state, requested.state);
});

test('WIN-02, WIN-03: collection window accepts only newer matching replacements', () => {
  const requested = applyCollectionWindowEvent(
    createCollectionWindowState({ revision: 3, start: 20, size: 10, total: 100 }),
    { type: 'request-window', direction: 'after', anchor: 'item-29' },
  ).value.state;
  assert.equal(synchronizeCollectionWindow(requested, {
    revision: 4, requestGeneration: 2, start: 30, size: 10, total: 100,
  }).ok, false);
  const accepted = synchronizeCollectionWindow(requested, {
    revision: 4, requestGeneration: 1, start: 30, size: 10, total: 100,
  }).value;
  assert.equal(accepted.pending, null);
  assert.equal(accepted.requestGeneration, 1);
  assert.equal(synchronizeCollectionWindow(accepted, {
    revision: 4, start: 40, size: 10, total: 100,
  }).ok, false);
});

test('WIN-04: known collection bounds suppress impossible requests', () => {
  const first = createCollectionWindowState({ start: 0, size: 10, total: 10 });
  assert.equal(canRequestCollectionWindow(first, 'before'), false);
  assert.equal(canRequestCollectionWindow(first, 'after'), false);
  assert.equal(applyCollectionWindowEvent(first, {
    type: 'request-window', direction: 'after', anchor: 'last',
  }).value.state, first);
  assert.equal(tryCreateCollectionWindowState({ start: 5, size: 6, total: 10 }).ok, false);
  assert.equal(tryCreateCollectionWindowState({
    start: Number.MAX_SAFE_INTEGER, size: 1,
  }).ok, false);
  assert.equal(applyCollectionWindowEvent(createCollectionWindowState(), {
    type: 'request-window', direction: 'after', anchor: '',
  }).ok, false);
});
