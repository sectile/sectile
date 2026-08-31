import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const verificationRoot = new URL('../verification/', import.meta.url);

test('Chart browser interaction fixture preserves the labeled release matrix', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('chart-interaction-browser.html', verificationRoot), 'utf8'),
    readFile(new URL('chart-interaction-browser.mjs', verificationRoot), 'utf8'),
  ]);

  assert.match(html, /Run synthetic interaction matrix/u);
  for (const id of ['native', 'x', 'y', 'xy']) assert.match(html, new RegExp(`id="${id}"`, 'u'));
  for (const scenario of [
    'ordinaryWheel', 'browserZoomModifier', 'enabledWheel', 'trackpadShapedWheel',
    'mouseDrag', 'pinchX', 'pinchY', 'pinchXY', 'activeModeConflict', 'semanticLimit',
  ]) assert.match(script, new RegExp(scenario, 'u'));
  assert.match(script, /pan-y/u);
  assert.match(script, /pan-x/u);
  assert.match(script, /not physical trackpad certification/u);
  assert.match(script, /not touchscreen or firmware certification/u);
});
