import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createSpinButton } from '../dist/spin-button.js';

test('terminal spin button separates drafts from committed decimal values', () => {
  const spin = unwrap(createSpinButton({ min: '0', max: '3', step: '0.5', defaultValue: '0.5' }));
  spin.handleTextInput('bad');
  spin.handleKeyboardInput({ key: 'enter' });
  assert.equal(spin.getSnapshot().state.draft, 'bad');
  spin.handleKeyboardInput({ key: 'escape' });
  spin.handleKeyboardInput({ key: 'up' });
  assert.equal(spin.getSnapshot().state.value, '1');
});

test('terminal spin button synchronizes controlled decimal value and draft', () => {
  const spin = unwrap(createSpinButton({ min: '0', max: '3', step: '0.5', value: '0.5', draft: null }));
  spin.handleKeyboardInput({ key: 'up' });
  assert.equal(spin.getSnapshot().state.value, '0.5');
  const synced = unwrap(spin.syncControlledValues({ value: '1', draft: '1.5' }));
  assert.equal(synced.state.value, '1');
  assert.equal(spin.getText(), '1.5');
});
