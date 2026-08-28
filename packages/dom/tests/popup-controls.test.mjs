import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlertDialog } from '../.verification-dist/alert-dialog.js';
import { createDialog } from '../.verification-dist/dialog.js';
import { createPopover } from '../.verification-dist/popover.js';
import { createSelect } from '../.verification-dist/select.js';
import { createTooltip } from '../.verification-dist/tooltip.js';

test('DOM popup facades preserve focus, announce, and visibility obligations', () => {
  const trigger = new Fake();
  const root = new Fake();
  let focus = 0;
  const dialog = createDialog({ trigger, root, onInitialFocus: () => focus++ });
  trigger.emit('click');
  assert.equal(dialog.getSnapshot().state.open, true);
  assert.equal(focus, 1);
  assert.equal(root.focused, true);
  assert.equal(root.attributes.get('role'), 'dialog');

  const popoverRoot = new Fake();
  const popoverTrigger = new Fake();
  const popover = createPopover({ root: popoverRoot, trigger: popoverTrigger });
  popoverTrigger.emit('click');
  assert.equal(popover.getSnapshot().state.open, true);
  assert.equal(popoverRoot.attributes.get('aria-modal'), 'false');
  popoverTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(popover.getSnapshot().state.open, false);

  let announced = 0;
  const alert = createAlertDialog({ root: new Fake(), onAnnounce: () => announced++ });
  alert.handleEvent('open');
  assert.equal(announced, 1);
  const tipRoot = new Fake();
  const tip = createTooltip({ root: tipRoot });
  tip.handleEvent('open');
  assert.equal(tipRoot.hidden, false);
});

test('DOM tooltip owns focus, hover, description linkage, and Escape', () => {
  const root = new Fake();
  const trigger = new Fake();
  const tip = createTooltip({ root, trigger, id: 'help-tip' });
  assert.equal(trigger.attributes.get('aria-describedby'), 'help-tip');
  trigger.emit('focus');
  assert.equal(tip.getSnapshot().state.open, true);
  trigger.emit('mouseenter');
  trigger.emit('blur');
  assert.equal(tip.getSnapshot().state.open, true);
  trigger.emit('mouseleave');
  assert.equal(tip.getSnapshot().state.open, false);
  trigger.emit('focus');
  trigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(tip.getSnapshot().state.open, false);
});

test('DOM layer manager routes Escape only to the topmost popup', () => {
  const ownerDocument = {};
  const lowerRoot = new Fake(ownerDocument);
  const lowerTrigger = new Fake(ownerDocument);
  const upperRoot = new Fake(ownerDocument);
  const upperTrigger = new Fake(ownerDocument);
  const lower = createDialog({ root: lowerRoot, trigger: lowerTrigger });
  const upper = createDialog({ root: upperRoot, trigger: upperTrigger });
  lower.handleEvent('open');
  upper.handleEvent('open');
  lowerTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(lower.getSnapshot().state.open, true);
  assert.equal(upper.getSnapshot().state.open, true);
  upperTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(upper.getSnapshot().state.open, false);
  lowerTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(lower.getSnapshot().state.open, false);
});

test('DOM layer manager closes nested descendants but preserves independent layers', () => {
  const ownerDocument = {};
  const outerRoot = new Fake(ownerDocument);
  const outerTrigger = new Fake(ownerDocument);
  const nestedRoot = new Fake(ownerDocument);
  const nestedTrigger = new Fake(ownerDocument);
  const independentRoot = new Fake(ownerDocument);
  const independentTrigger = new Fake(ownerDocument);
  outerRoot.children.add(nestedTrigger);
  const outer = createDialog({ root: outerRoot, trigger: outerTrigger });
  const nested = createPopover({ root: nestedRoot, trigger: nestedTrigger });
  const independent = createDialog({ root: independentRoot, trigger: independentTrigger });
  outer.handleEvent('open');
  nested.handleEvent('open');
  outer.handleEvent('close');
  assert.equal(outer.getSnapshot().state.open, false);
  assert.equal(nested.getSnapshot().state.open, false);
  outer.handleEvent('open');
  independent.handleEvent('open');
  outer.handleEvent('close');
  assert.equal(outer.getSnapshot().state.open, false);
  assert.equal(independent.getSnapshot().state.open, true);
});

test('DOM layer manager closes a nested select with its owning dialog', () => {
  const ownerDocument = {};
  const outerRoot = new Fake(ownerDocument);
  const outerTrigger = new Fake(ownerDocument);
  const selectRoot = new Fake(ownerDocument);
  const selectTrigger = new Fake(ownerDocument);
  const selectPopup = new Fake(ownerDocument);
  outerRoot.children.add(selectTrigger);
  const outer = createDialog({ root: outerRoot, trigger: outerTrigger });
  const select = createSelect({
    root: selectRoot,
    trigger: selectTrigger,
    popup: selectPopup,
    items: ['a'],
  });
  outer.handleEvent('open');
  select.handleEvent('open');
  outer.handleEvent('close');
  assert.equal(outer.getSnapshot().state.open, false);
  assert.equal(select.getSnapshot().state.open, false);
});

class Fake {
  attributes = new Map();
  listeners = new Map();
  children = new Set();
  hidden = false;
  focused = false;
  id = '';
  tabIndex = -1;
  style = {};
  dataset = {};
  disabled = false;

  constructor(ownerDocument) { this.ownerDocument = ownerDocument; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  contains(target) { return target === this || this.children.has(target); }
  querySelectorAll() { return []; }
  focus() { this.focused = true; }
}
