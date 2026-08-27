import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgressState } from '@sectile/core/progress';
import {
  createProgress,
  getProgressIndicatorAttributes,
  getProgressNativeAttributes,
  getProgressRootAttributes,
  tryCreateProgress,
} from '../dist/progress.js';

test('DOM Progress projects determinate custom-role and native attributes', () => {
  const state = createProgressState({ value: '1', max: '3' });
  const root = getProgressRootAttributes(state, { label: 'Upload', formatValue: (value) => `${value} files` });
  assert.equal(root.role, 'progressbar');
  assert.equal(root['aria-valuemin'], '0');
  assert.equal(root['aria-valuemax'], '3');
  assert.equal(root['aria-valuenow'], '1');
  assert.equal(root['aria-valuetext'], '1 files');
  assert.equal(root['data-status'], 'progressing');
  assert.equal(root['data-percentage'], '33.333333333333');
  assert.deepEqual(getProgressNativeAttributes(state), { max: '3', value: '1' });
  assert.equal(getProgressIndicatorAttributes(state)['aria-hidden'], 'true');
});

test('DOM Progress omits value-derived attributes while indeterminate', () => {
  const state = createProgressState({ max: '10' });
  const root = getProgressRootAttributes(state, { formatValue: () => 'must not run' });
  assert.equal(root['aria-valuenow'], undefined);
  assert.equal(root['aria-valuetext'], undefined);
  assert.equal(root['data-percentage'], undefined);
  assert.equal(root.style, undefined);
  assert.deepEqual(getProgressNativeAttributes(state), { max: '10', value: undefined });
});

test('DOM Progress connection clears stale determinate projection', () => {
  const root = new FakeElement();
  const indicator = new FakeElement();
  let updates = 0;
  const connection = createProgress({ value: '25', root, indicator, onUpdate: () => { updates += 1; } });
  assert.equal(root.attributes.get('aria-valuenow'), '25');
  assert.equal(root.style.values.get('--sectile-progress-percentage'), '25%');
  const synchronized = connection.syncControlledValues({ value: null });
  assert.equal(synchronized.ok, true);
  assert.equal(root.attributes.has('aria-valuenow'), false);
  assert.equal(root.attributes.get('data-status'), 'indeterminate');
  assert.equal(root.style.values.has('--sectile-progress-percentage'), false);
  assert.equal(indicator.style.values.has('--sectile-progress-percentage'), false);
  assert.equal(updates, 1);
  connection.disconnect();
});

test('DOM Progress supports an unattached default connection and rejects invalid input', () => {
  assert.equal(createProgress().getSnapshot().state.status, 'indeterminate');
  assert.equal(tryCreateProgress({ max: '0', root: new FakeElement() }).ok, false);
});

class FakeElement {
  attributes = new Map();
  style = {
    values: new Map(),
    setProperty: (name, value) => { this.style.values.set(name, value); },
    removeProperty: (name) => { this.style.values.delete(name); },
  };
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
}
