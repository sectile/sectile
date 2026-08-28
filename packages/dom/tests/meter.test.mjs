import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeterState } from '@sectile/core/meter';
import {
  createMeter,
  getMeterIndicatorAttributes,
  getMeterNativeAttributes,
  getMeterRootAttributes,
  tryCreateMeter,
} from '../.verification-dist/meter.js';

test('DOM Meter projects custom-role and native attributes without threshold ARIA', () => {
  const state = createMeterState({ value: '25', low: '20', high: '80', optimum: '50' });
  const root = getMeterRootAttributes(state, { label: 'Storage', formatValue: (value) => `${value} GB` });
  assert.equal(root.role, 'meter');
  assert.equal(root['aria-valuemin'], '0');
  assert.equal(root['aria-valuemax'], '100');
  assert.equal(root['aria-valuenow'], '25');
  assert.equal(root['aria-valuetext'], '25 GB');
  assert.equal(root['aria-label'], 'Storage');
  assert.equal(root['aria-low'], undefined);
  assert.equal(root['aria-high'], undefined);
  assert.equal(root['data-percentage'], '25');

  assert.deepEqual(getMeterNativeAttributes(state), {
    min: '0', max: '100', value: '25', low: '20', high: '80', optimum: '50',
  });
  assert.equal(getMeterIndicatorAttributes(state)['data-zone'], 'optimum');

  const third = getMeterRootAttributes(createMeterState({ value: '1', min: '0', max: '3' }));
  assert.equal(third['data-percentage'], '33.333333333333');
});

test('DOM Meter connection synchronizes revisions and attributes', () => {
  const root = new FakeElement();
  const indicator = new FakeElement();
  let updates = 0;
  const connection = createMeter({ value: '25', root, indicator, label: 'Storage', onUpdate: () => { updates += 1; } });
  assert.equal(connection.getSnapshot().revision, 0);
  assert.equal(root.attributes.get('role'), 'meter');
  assert.equal(root.attributes.get('aria-valuenow'), '25');
  assert.equal(root.style.values.get('--sectile-meter-percentage'), '25%');
  assert.equal(indicator.attributes.get('aria-hidden'), 'true');

  const synchronized = connection.syncControlledValues({ value: '75' });
  assert.equal(synchronized.ok, true);
  assert.equal(connection.getSnapshot().revision, 1);
  assert.equal(root.attributes.get('aria-valuenow'), '75');
  assert.equal(indicator.style.values.get('--sectile-meter-percentage'), '75%');
  assert.equal(updates, 1);

  const invalid = connection.syncControlledValues({ value: '101' });
  assert.equal(invalid.ok, false);
  assert.equal(connection.getSnapshot().revision, 1);
  assert.equal(root.attributes.get('aria-valuenow'), '75');
  connection.disconnect();
});

test('DOM Meter fallible factory rejects invalid state', () => {
  const result = tryCreateMeter({ value: '101', root: new FakeElement() });
  assert.equal(result.ok, false);
});

class FakeElement {
  attributes = new Map();
  style = { values: new Map(), setProperty: (name, value) => { this.style.values.set(name, value); } };
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
}
