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

for (const [label, firstError] of [
  ['Error', new Error('deepest close failed')],
  ['undefined', undefined],
  ['null', null],
]) {
  test(`terminal layer cascade drains cleanup and preserves the first ${label} through ownership churn`, () => {
    const scope = createLayerStack();
    for (let cycle = 0; cycle < 16; cycle += 1) {
      const closed = [];
      const reentrant = [];
      const snapshots = [];
      for (const [id, parentID] of [
        ['root', null], ['child', 'root'], ['grandchild', 'child'], ['leaf', 'grandchild'],
      ]) {
        assert.equal(scope.open({
          layer: { id, parentID },
          close: (reason) => {
            closed.push([id, reason]);
            snapshots.push(scope.state.layers.map((layer) => layer.id));
            reentrant.push([id, scope.close(id), scope.close('root')]);
            if (id === 'leaf') throw firstError;
            if (id === 'grandchild') throw new Error('later close failed');
          },
        }), true);
      }
      assert.equal(scope.open({
        layer: { id: 'independent' },
        close: (reason) => closed.push(['independent', reason]),
      }), true);

      assert.throws(() => scope.close('root'), (error) => Object.is(error, firstError));
      assert.deepEqual(closed, [
        ['leaf', 'ancestor-closed'],
        ['grandchild', 'ancestor-closed'],
        ['child', 'ancestor-closed'],
      ]);
      assert.deepEqual(snapshots, [['independent'], ['independent'], ['independent']]);
      assert.deepEqual(reentrant, [
        ['leaf', false, false], ['grandchild', false, false], ['child', false, false],
      ]);
      for (const id of ['root', 'child', 'grandchild', 'leaf']) {
        assert.equal(scope.close(id), false);
      }
      assert.equal(scope.dismissTop('escape'), true);
      assert.deepEqual(closed.at(-1), ['independent', 'escape']);
      assert.equal(closed.length, 4);
      assert.deepEqual(scope.state.layers, []);
    }
  });
}

test('terminal cascade snapshots preserve same-ID replacement ownership during reentrant churn', () => {
  const scope = createLayerStack();
  let registry;
  const set = Map.prototype.set;
  Map.prototype.set = function (key, value) {
    if (typeof value === 'function' && key === 'root') registry = this;
    return Reflect.apply(set, this, [key, value]);
  };
  try {
    for (const throwing of [false, true]) {
      for (let cycle = 0; cycle < 32; cycle += 1) {
        const trace = [];
        const firstError = cycle % 2 === 0 ? new Error('first close failure') : undefined;
        assert.equal(scope.open({ layer: { id: 'root' }, close: () => trace.push('root-old') }), true);
        assert.equal(scope.open({ layer: { id: 'child', parentID: 'root' }, close: () => {
          trace.push('child-old');
          assert.equal(scope.isTop('child'), true);
          if (throwing) throw new Error('later close failure');
        } }), true);
        assert.equal(scope.open({ layer: { id: 'leaf', parentID: 'child' }, close: () => {
          trace.push('leaf-old');
          assert.equal(scope.close('child'), false);
          assert.equal(registry.size, 0, 'all old ownership is detached before callbacks');
          assert.equal(scope.open({ layer: { id: 'root' }, close: () => trace.push('root-new') }), true);
          assert.equal(scope.open({ layer: { id: 'child', parentID: 'root' }, close: () => trace.push('child-new') }), true);
          if (throwing) throw firstError;
        } }), true);
        if (throwing) assert.throws(() => scope.close('root'), (error) => Object.is(error, firstError));
        else assert.equal(scope.close('root'), true);
        assert.deepEqual(trace, ['leaf-old', 'child-old']);
        assert.deepEqual(scope.state.layers.map((layer) => layer.id), ['root', 'child']);
        assert.equal(registry.size, 2);
        assert.equal(scope.dismissTop('escape'), true);
        assert.equal(scope.dismissTop('escape'), true);
        assert.deepEqual(trace, ['leaf-old', 'child-old', 'child-new', 'root-new']);
        assert.equal(scope.close('root'), false);
        assert.equal(scope.dismissTop('escape'), false);
        assert.deepEqual(scope.state.layers, []);
        assert.equal(registry.size, 0);
      }
    }
  } finally { Map.prototype.set = set; }
});

for (const reason of ['escape', 'interact-outside']) {
  test(`terminal ${reason} dismissal releases a throwing callback and accepts a fresh registration`, () => {
    const scope = createLayerStack();
    const failure = new Error('dismiss close failed');
    const closed = [];
    let reentrant;
    assert.equal(scope.open({ layer: { id: 'root' }, close: () => closed.push('root') }), true);
    assert.equal(scope.open({
      layer: { id: 'child', parentID: 'root' },
      close: (actualReason) => {
        closed.push(['child', actualReason]);
        reentrant = scope.close('child');
        throw failure;
      },
    }), true);

    assert.throws(() => scope.dismissTop(reason), (error) => error === failure);
    assert.equal(reentrant, false);
    assert.equal(scope.close('child'), false);
    assert.equal(scope.isTop('root'), true);
    assert.equal(scope.open({
      layer: { id: 'child', parentID: 'root' },
      close: (actualReason) => closed.push(['replacement', actualReason]),
    }), true);
    assert.equal(scope.dismissTop(reason), true);
    assert.equal(scope.close('root'), true);
    assert.deepEqual(closed, [['child', reason], ['replacement', reason]]);
    assert.deepEqual(scope.state.layers, []);
  });
}
