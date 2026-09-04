import assert from 'node:assert/strict';
import test from 'node:test';
import { createCascadeSelect, toCascadeSelectEvent } from '../.verification-dist/cascade-select.js';

const nodes = [
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' },
  { id: 'seoul', parentID: 'kr' }, { id: 'tokyo', parentID: 'jp' },
];

test('DOM cascade select projects columns and commits a leaf', () => {
  const root = new FakeElement(); const trigger = new FakeElement(); const popup = new FakeElement();
  const values = []; const select = createCascadeSelect({ root, trigger, popup, nodes, defaultOpen: true, defaultHighlightedValue: 'asia', onValueChange: (value) => values.push(value) });
  assert.deepEqual(select.getColumns(), [['asia', 'europe']]);
  select.handleEvent({ type: 'select', id: 'asia' });
  assert.deepEqual(select.getColumns(), [['asia', 'europe'], ['kr', 'jp']]);
  select.handleEvent({ type: 'select', id: 'kr' }); select.handleEvent({ type: 'select', id: 'seoul' });
  assert.deepEqual(select.getValuePath(), ['asia', 'kr', 'seoul']); assert.deepEqual(values, ['seoul']); assert.equal(popup.hidden, true);
  select.disconnect();
});

test('DOM cascade select restores exact popup hidden ownership on disconnect', () => {
  const root = new FakeElement(); const trigger = new FakeElement(); const popup = new FakeElement();
  popup.setAttribute('hidden', 'until-found'); popup.hidden = true;
  const select = createCascadeSelect({ root, trigger, popup, nodes });
  assert.equal(popup.getAttribute('hidden'), '');
  select.handleEvent('open');
  assert.equal(popup.getAttribute('hidden'), null);
  select.disconnect();
  assert.equal(popup.getAttribute('hidden'), 'until-found');
});

test('DOM cascade select exposes native keyboard mapping and disabled semantics', () => {
  assert.equal(toCascadeSelectEvent({ key: 'ArrowRight', altKey: false, ctrlKey: false, metaKey: false }), 'right');
  const root = new FakeElement(); const trigger = new FakeElement(); const popup = new FakeElement(); const option = new FakeElement();
  const select = createCascadeSelect({ root, trigger, popup, nodes, disabledItems: ['europe'] });
  select.setItemAttributes(option, 'europe'); assert.equal(option.attributes.get('aria-disabled'), 'true'); assert.equal(option.tabIndex, -1); select.disconnect();
});

class FakeElement {
  attributes = new Map(); dataset = {}; listeners = new Map(); tabIndex = -1; hidden = false; disabled = false;
  setAttribute(name, value) { this.attributes.set(name, String(value)); } getAttribute(name) { return this.attributes.get(name) ?? null; } removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } querySelectorAll() { return []; } focus() {}
}
