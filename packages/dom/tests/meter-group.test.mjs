import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeterGroupState } from '@sectile/core/meter-group';
import {
  createMeterGroup,
  getMeterGroupAttributes,
  getMeterGroupRootAttributes,
  getMeterGroupSegmentAttributes,
  getMeterGroupTrackAttributes,
  tryCreateMeterGroup,
} from '../.verification-dist/meter-group.js';

test('DOM MeterGroup bulk attributes preserve scalar results and independent immutable state views', () => {
  const state = createMeterGroupState({ max: '0.6', items: [{ id: 'a', value: '0.1' }, { id: 'b', value: '0' }, { id: 'c', value: '0.2' }] });
  const options = { label: 'Capacity', labelledBy: 'capacity-label', describedBy: 'capacity-help', scope: 'quota' };
  const view = getMeterGroupAttributes(state, options);
  assert.deepEqual(view.root, getMeterGroupRootAttributes(state, options)); assert.deepEqual(view.track, getMeterGroupTrackAttributes(state));
  for (const segment of state.segments) {
    const local = { label: segment.id, formatValue: (value, id) => `${id}:${value}`, part: 'amount', labelledBy: 'label-' + segment.id };
    assert.deepEqual(view.segment(segment.id, local), getMeterGroupSegmentAttributes(state, segment.id, local));
    assert.deepEqual(view.segment(segment.id), getMeterGroupSegmentAttributes(state, segment.id, {}));
  }
  assert.deepEqual(view.segment('missing'), getMeterGroupSegmentAttributes(state, 'missing', {}));
  assert.equal(Object.isFrozen(view), true); assert.equal(Object.isFrozen(view.root), true); assert.equal(Object.isFrozen(view.segment('a').value), true);
  const next = getMeterGroupAttributes(createMeterGroupState({ max: '0.6', items: [{ id: 'c', value: '0.3' }] }));
  assert.equal(view.segment('c').value['aria-valuenow'], '0.2'); assert.equal(next.segment('c').value['aria-valuenow'], '0.3');
  assert.equal(next.segment('a').ok, false);
});

test('DOM MeterGroup bulk construction reads linear input once and repeated access stays output-bounded', () => {
  const count = 1000, state = createMeterGroupState({ max: String(count), items: Array.from({ length: count }, (_, index) => ({ id: 'id-' + index, value: '1' })) });
  let arrayReads = 0, idReads = 0;
  const segments = [];
  for (let index = 0; index < count; index++) {
    const original = state.segments[index], segment = Object.freeze({ ...original, get id() { idReads++; return original.id; } });
    Object.defineProperty(segments, index, { enumerable: true, get() { arrayReads++; return segment; } });
  }
  const view = getMeterGroupAttributes({ ...state, segments: Object.freeze(segments) });
  assert.ok(arrayReads <= count * 2); assert.ok(idReads <= count * 3);
  const initialArrayReads = arrayReads, initialIDReads = idReads;
  for (let repeat = 0; repeat < 3; repeat++) for (const segment of state.segments) {
    const projected = view.segment(segment.id, { formatValue: (value, id) => id + ':' + value });
    assert.equal(projected.ok, true); assert.equal(projected.value['aria-valuenow'], '1');
  }
  assert.equal(arrayReads, initialArrayReads);
  assert.ok(idReads - initialIDReads <= count * 3 * 2);
});

test('DOM MeterGroup connection reuses one indexed state for registrations and refresh and releases registrations', () => {
  const count = 128, connection = createMeterGroup({ max: String(count), items: Array.from({ length: count }, (_, index) => ({ id: 'id-' + index, value: '1' })), root: new FakeElement() });
  const state = connection.getSnapshot().state, original = Array.prototype.find, elements = [];
  let visits = 0;
  try {
    Array.prototype.find = function (predicate, thisArg) {
      if (this !== state.segments) return original.call(this, predicate, thisArg);
      return original.call(this, (value, index, array) => { visits++; return predicate.call(thisArg, value, index, array); });
    };
    for (const segment of state.segments) { const element = new FakeElement(); elements.push(element); assert.equal(connection.registerSegment(segment.id, element, { label: segment.id }).ok, true); }
    connection.refreshAttributes(); assert.ok(visits <= count * 4, 'mounted fanout must not multiply full-domain scans');
  } finally { Array.prototype.find = original; }
  connection.disconnect(); connection.disconnect();
  connection.syncControlledValues({ max: String(count * 2), items: state.items.map(item => ({ ...item, value: '2' })) });
  assert.ok(elements.every(element => element.attributes.get('aria-valuenow') === '1'));
  connection.disconnect();
});

test('DOM MeterGroup released attribute views are not retained by a live canonical state', { skip: typeof global.gc !== 'function' }, async () => {
  const state = createMeterGroupState({ max: '100', items: [{ id: 'a', value: '25' }] });
  let weak;
  await new Promise(resolve => setImmediate(() => { weak = Array.from({ length: 32 }, () => new WeakRef(getMeterGroupAttributes(state))); resolve(); }));
  for (let i = 0; i < 24; i++) {
    await new Promise(resolve => setImmediate(resolve)); global.gc();
    if (weak.every(reference => reference.deref() === undefined)) { assert.equal(state.total, '25'); return; }
  }
  assert.fail('Released attribute views retained their indexes through the live state or a module owner');
});

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
