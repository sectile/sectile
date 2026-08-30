import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, effectScope, h, nextTick, ref, shallowRef } from 'vue';
import { ChartRoot, useChart } from '../.verification-dist/chart.js';

const model = { layers: [{ id: 'points', profile: 'point', data: [
  { id: 1, x: 0, y: 0 }, { id: '1', x: 1, y: 1 },
] }] };

test('useChart synchronizes controlled refs and publishes semantic snapshots', async () => {
  const scope = effectScope();
  const cursor = ref(1);
  const modelSource = shallowRef(model);
  const cursorChanges = [];
  const chart = scope.run(() => useChart({
    model: modelSource,
    cursor,
    onCursorChange: (value) => cursorChanges.push(value),
  }));
  chart.dispatch({ type: 'set-cursor', id: '1' });
  assert.equal(cursor.value, '1');
  assert.deepEqual(cursorChanges, ['1']);
  await nextTick();
  assert.equal(chart.snapshot.value.state.cursor, '1');

  modelSource.value = { layers: [{ id: 'points', profile: 'point', data: [{ id: '1', x: 2, y: 2 }] }] };
  await nextTick();
  assert.equal(chart.snapshot.value.state.generation, 1);
  assert.equal(chart.controller.getModel().size, 1);
  scope.stop();
});

test('useChart keeps default values uncontrolled and reports direct interaction', () => {
  const selections = [];
  const chart = useChart({
    model,
    defaultSelection: { type: 'points', ids: [1] },
    onSelectionChange: (value) => selections.push(value),
  });
  chart.dispatch({ type: 'set-selection', selection: { type: 'points', ids: ['1'] } });
  assert.deepEqual(chart.snapshot.value.state.selection, { type: 'points', ids: ['1'] });
  assert.deepEqual(selections, [{ type: 'points', ids: ['1'] }]);
  chart.dispose(); chart.dispose();
});

test('ChartRoot SSR output is deterministic and defers host resources until mount', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(ChartRoot, { options: { model } }),
  }));
  assert.match(html, /data-scope="chart"/);
  assert.match(html, /data-part="root"/);
  assert.match(html, /data-part="canvas"/);
  assert.doesNotMatch(html, /role="listbox"/);
});
