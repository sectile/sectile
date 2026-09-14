import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlertDialog } from '../.verification-dist/alert-dialog.js';
import { createDialog } from '../.verification-dist/dialog.js';
import { createPopover } from '../.verification-dist/popover.js';
import { createSelect } from '../.verification-dist/select.js';
import { createTooltip } from '../.verification-dist/tooltip.js';
import { getDOMLayerManager } from '../.verification-dist/internal/layer-manager.js';

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

test('Dialog owner closure closes concurrent sibling and nested Popovers while preserving an independent layer', () => {
  const ownerDocument = {};
  const dialogRoot = new Fake(ownerDocument);
  const dialogTrigger = new Fake(ownerDocument);
  const firstRoot = new Fake(ownerDocument);
  const firstTrigger = new Fake(ownerDocument);
  const secondRoot = new Fake(ownerDocument);
  const secondTrigger = new Fake(ownerDocument);
  const nestedRoot = new Fake(ownerDocument);
  const nestedTrigger = new Fake(ownerDocument);
  const independentRoot = new Fake(ownerDocument);
  const independentTrigger = new Fake(ownerDocument);
  dialogRoot.children.add(firstTrigger);
  dialogRoot.children.add(secondTrigger);
  secondRoot.children.add(nestedTrigger);

  const dialog = createDialog({ root: dialogRoot, trigger: dialogTrigger });
  const first = createPopover({ root: firstRoot, trigger: firstTrigger });
  const second = createPopover({ root: secondRoot, trigger: secondTrigger });
  const nested = createPopover({ root: nestedRoot, trigger: nestedTrigger });
  const independent = createDialog({ root: independentRoot, trigger: independentTrigger });

  dialog.handleEvent('open');
  first.handleEvent('open');
  second.handleEvent('open');
  nested.handleEvent('open');
  independent.handleEvent('open');
  assert.equal(firstTrigger.attributes.get('aria-expanded'), 'true');
  assert.equal(secondTrigger.attributes.get('aria-expanded'), 'true');
  assert.equal(nestedTrigger.attributes.get('aria-expanded'), 'true');

  dialog.handleEvent('close');
  for (const [connection, root, trigger] of [
    [first, firstRoot, firstTrigger], [second, secondRoot, secondTrigger], [nested, nestedRoot, nestedTrigger],
  ]) {
    assert.equal(connection.getSnapshot().state.open, false);
    assert.equal(root.hidden, true);
    assert.equal(trigger.attributes.get('aria-expanded'), 'false');
  }
  assert.equal(dialog.getSnapshot().state.open, false);
  assert.equal(independent.getSnapshot().state.open, true);
});

test('DOM layer manager infers the highest containing owner across sibling branches', () => {
  const ownerDocument = {};
  const manager = getDOMLayerManager(new Fake(ownerDocument));
  const rootSurface = new Fake(ownerDocument);
  const firstSurface = new Fake(ownerDocument);
  const secondSurface = new Fake(ownerDocument);
  const nestedSurface = new Fake(ownerDocument);
  const independentSurface = new Fake(ownerDocument);
  const firstOwner = new Fake(ownerDocument);
  const secondOwner = new Fake(ownerDocument);
  const nestedOwner = new Fake(ownerDocument);
  rootSurface.children.add(firstOwner);
  rootSurface.children.add(secondOwner);
  secondSurface.children.add(nestedOwner);
  const closed = [];

  assert.equal(manager.register({ id: 'root', layer: { id: 'root' }, surface: rootSurface, owner: rootSurface, close: () => closed.push('root') }), true);
  assert.equal(manager.register({ id: 'first', layer: { id: 'first' }, surface: firstSurface, owner: firstOwner, close: () => closed.push('first') }), true);
  assert.equal(manager.register({ id: 'second', layer: { id: 'second' }, surface: secondSurface, owner: secondOwner, close: () => closed.push('second') }), true);
  assert.equal(manager.register({ id: 'nested', layer: { id: 'nested' }, surface: nestedSurface, owner: nestedOwner, close: () => closed.push('nested') }), true);
  assert.equal(manager.register({ id: 'independent', layer: { id: 'independent' }, surface: independentSurface, owner: independentSurface, close: () => closed.push('independent') }), true);

  assert.equal(manager.close('root'), true);
  assert.deepEqual(closed, ['nested', 'second', 'first']);
  assert.equal(manager.isTop('independent'), true);
  assert.equal(manager.close('independent'), true);
  assert.deepEqual(closed, ['nested', 'second', 'first']);
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

for (const [label, firstError] of [
  ['Error', new Error('deepest close failed')],
  ['undefined', undefined],
  ['null', null],
]) {
  test(`DOM layer cascade drains cleanup and preserves the first ${label} through ownership churn`, () => {
    const ownerDocument = {};
    const manager = getDOMLayerManager(new Fake(ownerDocument));
    for (let cycle = 0; cycle < 16; cycle += 1) {
      const closed = [];
      const reentrant = [];
      const topmost = [];
      for (const [id, parentID] of [
        ['root', null], ['child', 'root'], ['grandchild', 'child'], ['leaf', 'grandchild'],
      ]) {
        const surface = new Fake(ownerDocument);
        assert.equal(manager.register({
          id, layer: { id, parentID }, surface, owner: surface,
          close: () => {
            closed.push(id);
            topmost.push(manager.isTop('independent'));
            reentrant.push([id, manager.close(id), manager.close('root')]);
            if (id === 'leaf') throw firstError;
            if (id === 'grandchild') throw new Error('later close failed');
          },
        }), true);
      }
      const surface = new Fake(ownerDocument);
      assert.equal(manager.register({
        id: 'independent', layer: { id: 'independent' }, surface, owner: surface,
        close: () => closed.push('independent'),
      }), true);

      assert.throws(() => manager.close('root'), (error) => Object.is(error, firstError));
      assert.deepEqual(closed, ['leaf', 'grandchild', 'child']);
      assert.deepEqual(topmost, [true, true, true]);
      assert.deepEqual(reentrant, [
        ['leaf', true, false], ['grandchild', true, false], ['child', true, false],
      ]);
      for (const id of ['root', 'child', 'grandchild', 'leaf']) {
        assert.equal(manager.close(id), false);
      }
      assert.equal(manager.dismiss('independent', 'escape'), true);
      assert.deepEqual(closed, ['leaf', 'grandchild', 'child', 'independent']);
      assert.equal(manager.isTop('independent'), false);
    }
  });
}

for (const reason of ['escape', 'interact-outside']) {
  test(`DOM ${reason} dismissal unwinds its close guard and accepts a fresh registration`, () => {
    const surface = new Fake({});
    const manager = getDOMLayerManager(surface);
    const failure = new Error('dismiss close failed');
    const closed = [];
    let reentrant;
    assert.equal(manager.register({
      id: 'root', layer: { id: 'root' }, surface, owner: surface,
      close: () => closed.push('root'),
    }), true);
    assert.equal(manager.register({
      id: 'child', layer: { id: 'child', parentID: 'root' }, surface, owner: surface,
      close: () => {
        closed.push('child');
        reentrant = manager.close('child');
        throw failure;
      },
    }), true);

    assert.throws(() => manager.dismiss('child', reason), (error) => error === failure);
    assert.equal(reentrant, true);
    assert.equal(manager.close('child'), false);
    assert.equal(manager.isTop('root'), true);
    assert.equal(manager.register({
      id: 'child', layer: { id: 'child', parentID: 'root' }, surface, owner: surface,
      close: () => closed.push('replacement'),
    }), true);
    assert.equal(manager.dismiss('child', reason), true);
    assert.equal(manager.close('root'), true);
    assert.deepEqual(closed, ['child', 'replacement']);
    assert.equal(manager.isTop('root'), false);
  });
}

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
