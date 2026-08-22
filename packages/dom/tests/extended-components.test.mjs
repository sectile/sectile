import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckboxGroup } from '../dist/checkbox-group.js';
import { createSelect } from '../dist/select.js';
import { createPagination } from '../dist/pagination.js';
import { createStepper } from '../dist/stepper.js';
import { createRating } from '../dist/rating.js';
import { createPinInput } from '../dist/pin-input.js';
import { createTagsInput } from '../dist/tags-input.js';

test('DOM selection facades project checkbox, select, pagination, and step semantics', () => {
  const groupRoot = new FakeElement();
  const group = createCheckboxGroup({ root: groupRoot, items: ['alpha', 'beta'], defaultValue: ['alpha'] });
  const alpha = new FakeElement();
  group.setItemAttributes(alpha, { id: 'alpha' });
  assert.equal(groupRoot.attributes.get('role'), 'group');
  assert.equal(alpha.attributes.get('role'), 'checkbox');
  assert.equal(alpha.attributes.get('aria-checked'), 'true');
  group.handleEvent({ type: 'toggle', id: 'beta' });
  assert.deepEqual(group.getSnapshot().state.selection.selected, ['alpha', 'beta']);

  const selectRoot = new FakeElement();
  const trigger = new FakeElement();
  const popup = new FakeElement();
  const select = createSelect({ root: selectRoot, trigger, popup, items: ['alpha', 'beta'], defaultValue: 'alpha' });
  select.handleEvent('next');
  assert.equal(select.getSnapshot().state.open, true);
  select.handleEvent('select');
  assert.deepEqual(select.getSnapshot().state.choice.selection.selected, ['beta']);
  assert.equal(popup.hidden, true);

  const paginationRoot = new FakeElement();
  const pagination = createPagination({ root: paginationRoot, items: ['1', '2', '3'], defaultValue: '1' });
  const page = new FakeElement();
  pagination.setPageAttributes(page, '1');
  assert.equal(paginationRoot.attributes.get('role'), 'navigation');
  assert.equal(page.attributes.get('aria-current'), 'page');
  pagination.handleEvent({ type: 'go-to-page', id: '3' });
  assert.deepEqual(pagination.getSnapshot().state.selection.selected, ['3']);

  const stepperRoot = new FakeElement();
  const stepper = createStepper({ root: stepperRoot, items: ['account', 'profile'], defaultValue: 'account', defaultHighlightedValue: 'account' });
  stepper.handleEvent('next-step');
  assert.equal(stepper.getSnapshot().state.cursor.current, 'profile');
  assert.deepEqual(stepper.getSnapshot().state.selection.selected, ['account']);
  stepper.handleEvent('activate-step');
  assert.deepEqual(stepper.getSnapshot().state.selection.selected, ['profile']);
  assert.equal(stepperRoot.attributes.get('aria-roledescription'), 'stepper');
});

test('DOM rating and structured input facades expose complete state transitions', async () => {
  const ratingRoot = new FakeElement();
  const rating = createRating({ root: ratingRoot, items: ['1', '2', '3'], defaultValue: '1', defaultHighlightedValue: '1', clearable: true });
  rating.handleEvent('increase');
  await Promise.resolve();
  assert.deepEqual(rating.getSnapshot().state.selection.selected, ['2']);
  rating.handleEvent('clear');
  assert.deepEqual(rating.getSnapshot().state.selection.selected, []);

  const inputs = [new FakeElement(), new FakeElement(), new FakeElement(), new FakeElement()];
  const completed = [];
  const pin = createPinInput({ root: new FakeElement(), inputs, onComplete: (value) => completed.push(value) });
  for (const value of ['1', '2', '3', '4']) pin.handleEvent({ type: 'input', value });
  assert.deepEqual(pin.getSnapshot().state.values, ['1', '2', '3', '4']);
  assert.deepEqual(completed, ['1234']);

  const tagsInput = new FakeElement();
  const tags = createTagsInput({ root: new FakeElement(), input: tagsInput, defaultValue: ['dom'], defaultInputValue: 'terminal' });
  tags.handleEvent({ type: 'add' });
  assert.deepEqual(tags.getSnapshot().state.tags, ['dom', 'terminal']);
  tags.handleEvent({ type: 'focus-tag', index: 0 });
  tags.handleEvent('remove-current');
  assert.deepEqual(tags.getSnapshot().state.tags, ['terminal']);
});

test('DOM extended facades reject mutations while read-only', () => {
  const select = createSelect({ root: new FakeElement(), trigger: new FakeElement(), popup: new FakeElement(), items: ['a', 'b'], defaultValue: 'a', readOnly: true });
  assert.equal(select.handleEvent({ type: 'select', id: 'b' }), false);
  assert.deepEqual(select.getSnapshot().state.choice.selection.selected, ['a']);

  const pin = createPinInput({ root: new FakeElement(), inputs: [new FakeElement(), new FakeElement()], defaultValue: '1', readOnly: true });
  assert.equal(pin.handleEvent({ type: 'input', value: '2' }), false);
  assert.deepEqual(pin.getSnapshot().state.values, ['1', '']);
});

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  hidden = false;
  disabled = false;
  readOnly = false;
  focused = false;
  tabIndex = -1;
  value = '';
  maxLength = -1;
  inputMode = '';

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  contains(target) { return target === this; }
  focus() { this.focused = true; }
}
