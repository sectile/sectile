import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeterGroupState } from '@sectile/core/meter-group';
import {
  createMeterGroup,
  getMeterGroupRootAttributes,
  getMeterGroupSegmentAttributes,
  getMeterGroupTrackAttributes,
  tryCreateMeterGroup,
} from '../.verification-dist/meter-group.js';

test('DOM MeterGroup projects one named group and individually named meter segments', () => {
  const state = createMeterGroupState({
    max: '100',
    items: [{ id: 'storage', value: '25' }, { id: 'logs', value: '10' }],
  });
  const root = getMeterGroupRootAttributes(state, { label: 'Capacity' });
  assert.equal(root.role, 'group');
  assert.equal(root['aria-label'], 'Capacity');
  assert.equal(root['aria-valuenow'], undefined);
  assert.equal(root['data-percentage'], '35');
  assert.equal(getMeterGroupTrackAttributes(state).role, 'presentation');

  const storage = getMeterGroupSegmentAttributes(state, 'storage', {
    label: 'Storage',
    formatValue: (value, id) => `${id}: ${value} GB`,
  });
  assert.equal(storage.ok, true);
  if (storage.ok) {
    assert.equal(storage.value.role, 'meter');
    assert.equal(storage.value['aria-label'], 'Storage');
    assert.equal(storage.value['aria-valuemin'], '0');
    assert.equal(storage.value['aria-valuemax'], '100');
    assert.equal(storage.value['aria-valuenow'], '25');
    assert.equal(storage.value['aria-valuetext'], 'storage: 25 GB');
    assert.equal(storage.value['data-start-percentage'], '0');
    assert.equal(storage.value['data-end-percentage'], '25');
    assert.match(storage.value.style, /--sectile-meter-group-start-percentage: 0%/u);
    assert.equal(storage.value['aria-low'], undefined);
  }
  const unknown = getMeterGroupSegmentAttributes(state, 'missing', { label: 'Missing' });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.error.code, 'selected-id-outside-domain');
});

test('DOM MeterGroup connection refreshes registered keyed segments atomically', () => {
  const root = new FakeElement();
  const track = new FakeElement();
  const storage = new FakeElement();
  const logs = new FakeElement();
  let updates = 0;
  const connection = createMeterGroup({
    max: '100',
    items: [{ id: 'storage', value: '25' }, { id: 'logs', value: '10' }],
    root,
    track,
    label: 'Capacity',
    onUpdate: () => { updates += 1; },
  });
  const unregisterStorage = connection.registerSegment('storage', storage, { label: 'Storage' });
  const unregisterLogs = connection.registerSegment('logs', logs, { label: 'Logs' });
  assert.equal(unregisterStorage.ok, true);
  assert.equal(unregisterLogs.ok, true);
  assert.equal(root.attributes.get('role'), 'group');
  assert.equal(track.attributes.get('role'), 'presentation');
  assert.equal(storage.attributes.get('aria-valuenow'), '25');
  assert.equal(logs.style.values.get('--sectile-meter-group-start-percentage'), '25%');

  const synchronized = connection.syncControlledValues({
    max: '100',
    items: [{ id: 'logs', value: '30' }, { id: 'storage', value: '20' }],
  });
  assert.equal(synchronized.ok, true);
  assert.equal(connection.getSnapshot().revision, 1);
  assert.equal(storage.attributes.get('aria-valuenow'), '20');
  assert.equal(storage.style.values.get('--sectile-meter-group-start-percentage'), '30%');
  assert.equal(logs.style.values.get('--sectile-meter-group-start-percentage'), '0%');
  assert.equal(updates, 1);

  const invalid = connection.syncControlledValues({ max: '10', items: [{ id: 'logs', value: '11' }] });
  assert.equal(invalid.ok, false);
  assert.equal(connection.getSnapshot().revision, 1);
  assert.equal(logs.attributes.get('aria-valuenow'), '30');

  const removed = connection.syncControlledValues({ max: '100', items: [{ id: 'storage', value: '20' }] });
  assert.equal(removed.ok, true);
  assert.equal(logs.attributes.has('role'), false);
  if (unregisterStorage.ok) unregisterStorage.value();
  if (unregisterLogs.ok) unregisterLogs.value();
  connection.disconnect();
});

test('DOM MeterGroup fallible factory rejects invalid shared capacity', () => {
  const result = tryCreateMeterGroup({ max: '1', items: [{ id: 'a', value: '2' }], root: new FakeElement() });
  assert.equal(result.ok, false);
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
