import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createWindowSplitter } from '../dist/window-splitter.js';

test('terminal window splitter owns normalized range keys', () => {
  const splitter = unwrap(createWindowSplitter({
    min: '0', max: '10', step: '1', defaultValue: 5,
  }));
  splitter.handleKeyboardInput({ key: 'right' });
  assert.equal(splitter.getSnapshot().state.tick, 6);
});

test('terminal vertical window splitter follows its visual arrow direction', () => {
  const splitter = unwrap(createWindowSplitter({
    min: '0', max: '10', step: '1', defaultValue: 5, orientation: 'vertical',
  }));
  splitter.handleKeyboardInput({ key: 'up' });
  assert.equal(splitter.getSnapshot().state.tick, 4);
  splitter.handleKeyboardInput({ key: 'down' });
  assert.equal(splitter.getSnapshot().state.tick, 5);
});
