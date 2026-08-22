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
  const pagination = createPagination({ root: paginationRoot, total: 30, defaultPage: 1, defaultItemsPerPage: 10 });
  const page = new FakeElement();
  pagination.setItemAttributes(page, pagination.getItems().find((item) => item.type === 'page' && item.page === 1));
  assert.equal(paginationRoot.attributes.get('role'), 'navigation');
  assert.equal(page.attributes.get('aria-current'), 'page');
  pagination.handleEvent({ type: 'go-to-page', page: 3 });
  assert.equal(pagination.getSnapshot().state.page, 3);

  const stepperRoot = new FakeElement();
  const stepper = createStepper({ root: stepperRoot, items: ['account', 'profile'], defaultValue: 'account', defaultHighlightedValue: 'account' });
  stepper.handleEvent('next-step');
  assert.equal(stepper.getSnapshot().state.cursor.current, 'profile');
  assert.deepEqual(stepper.getSnapshot().state.selection.selected, ['account']);
  stepper.handleEvent('activate-step');
  assert.deepEqual(stepper.getSnapshot().state.selection.selected, ['profile']);
  assert.equal(stepperRoot.attributes.get('aria-roledescription'), 'stepper');
});

test('DOM pagination owns item projection, delegated clicks, and boundary availability', () => {
  const root = new FakeElement();
  const pagination = createPagination({
    root,
    total: 250,
    defaultItemsPerPage: 10,
    defaultPage: 1,
    siblingCount: 1,
    showEdges: true,
  });
  assert.equal(pagination.getPageCount(), 25);
  assert.deepEqual(pagination.getItemRange(), { start: 1, end: 10, total: 250 });

  const firstControl = pagination.getItems().find((item) => item.type === 'control' && item.control === 'first-page');
  const firstButton = new FakeElement();
  pagination.setItemAttributes(firstButton, firstControl);
  assert.equal(firstButton.disabled, true);
  assert.equal(firstButton.tabIndex, -1);
  assert.equal(firstButton.attributes.get('aria-disabled'), 'true');

  const pageFive = { type: 'page', page: 5, selected: false };
  const pageButton = new FakeElement();
  pagination.setItemAttributes(pageButton, pageFive);
  assert.equal(pageButton.attributes.get('role'), undefined);
  assert.equal(pageButton.attributes.get('aria-label'), 'Page 5');
  assert.equal(pageButton.tabIndex, 0);
  root.emit('click', { target: pageButton });
  assert.equal(pagination.getSnapshot().state.page, 5);
  assert.deepEqual(pagination.getItemRange(), { start: 41, end: 50, total: 250 });

  const projected = pagination.getItems();
  assert.ok(projected.some((item) => item.type === 'ellipsis' && item.side === 'start'));
  assert.ok(projected.some((item) => item.type === 'ellipsis' && item.side === 'end'));

  pagination.handleEvent({ type: 'set-items-per-page', itemsPerPage: 25 });
  assert.deepEqual(pagination.getSnapshot().state, { page: 2, itemsPerPage: 25 });
  assert.equal(pagination.getPageCount(), 10);
  assert.deepEqual(pagination.getItemRange(), { start: 26, end: 50, total: 250 });

  pagination.disconnect();
  assert.equal(root.listeners.get('click')?.size ?? 0, 0);
});

test('DOM pagination proposes and synchronizes controlled page-size changes atomically', () => {
  const root = new FakeElement();
  const proposals = [];
  const pagination = createPagination({
    root,
    total: 100,
    page: 4,
    itemsPerPage: 10,
    onPageChange: (page) => proposals.push(['page', page]),
    onItemsPerPageChange: (size) => proposals.push(['size', size]),
  });
  pagination.handleEvent({ type: 'set-items-per-page', itemsPerPage: 25 });
  assert.deepEqual(pagination.getSnapshot().state, { page: 4, itemsPerPage: 10 });
  assert.deepEqual(proposals, [['page', 2], ['size', 25]]);
  assert.equal(pagination.syncControlledValues({ page: 2, itemsPerPage: 25 }).ok, true);
  assert.deepEqual(pagination.getSnapshot().state, { page: 2, itemsPerPage: 25 });
});

test('DOM pagination removes globally disabled items from pointer and tab interaction', () => {
  const root = new FakeElement();
  const pagination = createPagination({ root, total: 30, defaultPage: 2, disabled: true });
  const page = new FakeElement();
  pagination.setItemAttributes(page, { type: 'page', page: 3, selected: false });
  assert.equal(page.disabled, true);
  assert.equal(page.tabIndex, -1);
  root.emit('click', { target: page });
  assert.equal(pagination.getSnapshot().state.page, 2);
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

test('DOM tags input leaves live native IME text under browser ownership', () => {
  const root = new FakeElement();
  const input = new FakeElement();
  const tags = createTagsInput({ root, input });

  input.emit('compositionstart', { data: '' });
  input.value = 'ㅎ';
  input.emit('input', { inputType: 'insertCompositionText', isComposing: true });
  assert.equal(tags.getSnapshot().state.draft, '');
  assert.equal(input.value, 'ㅎ');

  input.value = '한';
  input.emit('compositionend', { data: '한' });
  assert.equal(tags.getSnapshot().state.draft, '한');
  assert.equal(input.value, '한');

  input.value = '한한';
  input.emit('input', { inputType: 'insertCompositionText', isComposing: false });
  assert.equal(tags.getSnapshot().state.draft, '한');
  assert.equal(input.value, '한');

  input.emit('compositionstart', { data: '' });
  input.value = '한ㄱ';
  input.emit('input', { inputType: 'insertCompositionText', isComposing: true });
  assert.equal(tags.getSnapshot().state.draft, '한');
  assert.equal(input.value, '한ㄱ');

  input.value = '한글';
  input.emit('compositionend', { data: '글' });
  assert.equal(tags.getSnapshot().state.draft, '한글');
  assert.equal(input.value, '한글');

  tags.disconnect();
  assert.equal(input.listeners.get('compositionstart')?.size ?? 0, 0);
  assert.equal(input.listeners.get('compositionend')?.size ?? 0, 0);
});

test('DOM tags input adds a completed IME draft with one Enter press', async () => {
  const root = new FakeElement();
  const input = new FakeElement();
  const tags = createTagsInput({ root, input });

  input.emit('compositionstart', { data: '' });
  input.value = '한글';
  let prevented = false;
  root.emit('keydown', {
    key: 'Enter',
    target: input,
    isComposing: true,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, false);
  assert.deepEqual(tags.getSnapshot().state.tags, []);

  input.emit('compositionend', { data: '한글' });
  await Promise.resolve();
  assert.deepEqual(tags.getSnapshot().state.tags, ['한글']);
  assert.equal(tags.getSnapshot().state.draft, '');
  assert.equal(input.value, '');

  tags.disconnect();

  const controlledRoot = new FakeElement();
  const controlledInput = new FakeElement();
  let value = [];
  let inputValue = '';
  let controlled;
  const sync = () => controlled.syncControlledValues({ value, inputValue });
  controlled = createTagsInput({
    root: controlledRoot,
    input: controlledInput,
    value,
    inputValue,
    onValueChange: (next) => { value = [...next]; queueMicrotask(sync); },
    onInputValueChange: (next) => { inputValue = next; queueMicrotask(sync); },
  });

  controlledInput.emit('compositionstart', { data: '' });
  controlledInput.value = '제어';
  controlledRoot.emit('keydown', {
    key: 'Enter',
    target: controlledInput,
    isComposing: true,
    preventDefault() {},
  });
  controlledInput.emit('compositionend', { data: '제어' });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(controlled.getSnapshot().state.tags, ['제어']);
  assert.equal(controlled.getSnapshot().state.draft, '');
  assert.equal(controlledInput.value, '');

  controlled.disconnect();
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
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  contains(target) { return target === this; }
  focus() { this.focused = true; }
}
