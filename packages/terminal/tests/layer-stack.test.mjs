import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayerStack } from '../.verification-dist/layer-stack.js';

test('terminal layer scope owns topmost dismissal and descendant close order', () => {
  const closed = [];
  const scope = createLayerStack();
  assert.equal(scope.open({
    layer: { id: 'dialog', mode: 'modal' },
    close: (reason) => closed.push(['dialog', reason]),
  }), true);
  assert.equal(scope.open({
    layer: { id: 'select', parentID: 'dialog', mode: 'non-modal' },
    close: (reason) => closed.push(['select', reason]),
  }), true);
  assert.equal(scope.isTop('select'), true);
  assert.equal(scope.dismissTop('escape'), true);
  assert.deepEqual(closed, [['select', 'escape']]);

  assert.equal(scope.open({
    layer: { id: 'popover', parentID: 'dialog', mode: 'non-modal' },
    close: (reason) => closed.push(['popover', reason]),
  }), true);
  assert.equal(scope.close('dialog'), true);
  assert.deepEqual(closed, [
    ['select', 'escape'],
    ['popover', 'ancestor-closed'],
  ]);
  assert.equal(scope.state.layers.length, 0);
});
