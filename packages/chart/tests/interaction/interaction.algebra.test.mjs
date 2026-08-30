import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartState, reduceChartEvent } from '../../.verification-dist/interaction.js';
import { createChartModel } from '../../.verification-dist/model.js';

const model = createChartModel({ layers: [{ id: 'series', profile: 'ordered-series', data: [
  { id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 },
] }] });

test('identity events preserve object identity and emit no commands', () => {
  const state = createChartState(model);
  for (const event of [
    { type: 'set-active', id: null },
    { type: 'set-cursor', id: null },
    { type: 'set-selection', selection: { type: 'points', ids: [] } },
  ]) {
    const update = reduceChartEvent(model, state, event).value;
    assert.equal(update.state, state);
    assert.equal(update.changed, false);
    assert.deepEqual(update.commands, []);
  }
});
