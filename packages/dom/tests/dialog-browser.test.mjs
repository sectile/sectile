import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createDialog } from '../.verification-dist/dialog.js';

test('modal dialog isolates background, locks scroll, handles document Escape, and restores state', () => {
  const window = new Window();
  const document = window.document;
  const background = document.createElement('main');
  const trigger = document.createElement('button');
  const surface = document.createElement('section');
  const close = document.createElement('button');
  surface.append(close);
  document.body.append(background, trigger, surface);
  document.body.style.overflow = 'auto';

  const dialog = createDialog({ root: surface, trigger });
  dialog.handleEvent('open');

  assert.equal(background.inert, true);
  assert.equal(background.getAttribute('aria-hidden'), 'true');
  assert.equal(trigger.inert, true);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(document.activeElement, close);

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(dialog.getSnapshot().state.open, false);
  assert.equal(background.inert, false);
  assert.equal(background.hasAttribute('aria-hidden'), false);
  assert.equal(trigger.inert, false);
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.activeElement, trigger);
  dialog.disconnect();
});

test('dialog preserves native Tab during composition and wraps through focus guards', () => {
  const window = new Window();
  const document = window.document;
  const surface = document.createElement('section');
  const first = document.createElement('input');
  const second = document.createElement('input');
  surface.append(first, second);
  document.body.append(surface);
  const dialog = createDialog({ root: surface });
  dialog.handleEvent('open');
  const startGuard = document.querySelector('[data-sectile-focus-guard="start"]');
  const endGuard = document.querySelector('[data-sectile-focus-guard="end"]');
  assert.ok(startGuard);
  assert.ok(endGuard);

  first.focus();
  const tab = new window.KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  });
  first.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, false);
  assert.equal(document.activeElement, first);

  second.focus();
  const composingTab = new window.KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
    isComposing: true,
  });
  second.dispatchEvent(composingTab);
  assert.equal(composingTab.defaultPrevented, false);
  assert.equal(document.activeElement, second);

  second.dispatchEvent(new window.CompositionEvent('compositionend', {
    bubbles: true,
    data: '글',
  }));
  assert.equal(document.activeElement, second);
  endGuard.focus();
  assert.equal(document.activeElement, first);

  const shiftTab = new window.KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  first.dispatchEvent(shiftTab);
  assert.equal(shiftTab.defaultPrevented, false);
  startGuard.focus();
  assert.equal(document.activeElement, second);

  const composingEscape = new window.KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
    isComposing: true,
  });
  first.dispatchEvent(composingEscape);
  assert.equal(composingEscape.defaultPrevented, false);
  assert.equal(dialog.getSnapshot().state.open, true);
  dialog.handleEvent('close');
  assert.equal(document.querySelector('[data-sectile-focus-guard]'), null);
  dialog.handleEvent('open');
  assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 2);
  dialog.disconnect();
  assert.equal(document.querySelector('[data-sectile-focus-guard]'), null);
});

test('nested modal effects restore the parent isolation before the page', () => {
  const window = new Window();
  const document = window.document;
  const background = document.createElement('main');
  const outer = document.createElement('section');
  const inner = document.createElement('section');
  document.body.append(background, outer, inner);
  const first = createDialog({ root: outer });
  const second = createDialog({ root: inner });

  first.handleEvent('open');
  second.handleEvent('open');
  assert.equal(outer.inert, true);
  assert.equal(inner.inert, false);
  second.handleEvent('close');
  assert.equal(background.inert, true);
  assert.equal(outer.inert, false);
  assert.equal(document.body.style.overflow, 'hidden');
  first.handleEvent('close');
  assert.equal(background.inert, false);
  assert.equal(document.body.style.overflow, '');
  first.disconnect();
  second.disconnect();
});

test('nested modal effects remain isolated when the parent closes first', () => {
  const window = new Window();
  const document = window.document;
  const background = document.createElement('main');
  const outer = document.createElement('section');
  const inner = document.createElement('section');
  document.body.append(background, outer, inner);
  const first = createDialog({ root: outer });
  const second = createDialog({ root: inner });

  first.handleEvent('open');
  second.handleEvent('open');
  first.handleEvent('close');
  assert.equal(background.inert, true);
  assert.equal(outer.inert, true);
  assert.equal(inner.inert, false);
  assert.equal(document.body.style.overflow, 'hidden');
  second.handleEvent('close');
  assert.equal(background.inert, false);
  assert.equal(outer.inert, false);
  assert.equal(document.body.style.overflow, '');
  first.disconnect();
  second.disconnect();
});

test('modal isolation covers background nodes added while open', async () => {
  const window = new Window();
  const document = window.document;
  const surface = document.createElement('section');
  document.body.append(surface);
  const dialog = createDialog({ root: surface });
  dialog.handleEvent('open');
  const lateBackground = document.createElement('aside');
  document.body.append(lateBackground);
  await window.happyDOM.waitUntilComplete();
  assert.equal(lateBackground.inert, true);
  assert.equal(lateBackground.getAttribute('aria-hidden'), 'true');
  dialog.handleEvent('close');
  assert.equal(lateBackground.inert, false);
  assert.equal(lateBackground.hasAttribute('aria-hidden'), false);
  dialog.disconnect();
});

test('dialog visibility ownership restores exact baseline and preserves consumer changes', () => {
  const window = new Window();
  const document = window.document;
  const root = document.createElement('section');
  root.setAttribute('hidden', 'until-found');
  document.body.append(root);
  const dialog = createDialog({ root });

  assert.equal(root.getAttribute('hidden'), '');
  dialog.handleEvent('open');
  assert.equal(root.getAttribute('hidden'), null);
  dialog.disconnect();
  assert.equal(root.getAttribute('hidden'), 'until-found');

  const consumerRoot = document.createElement('section');
  document.body.append(consumerRoot);
  const consumerDialog = createDialog({ root: consumerRoot });
  assert.equal(consumerRoot.getAttribute('hidden'), '');
  consumerRoot.setAttribute('hidden', 'until-found');
  consumerDialog.disconnect();
  assert.equal(consumerRoot.getAttribute('hidden'), 'until-found');
});

test('initial focus retries after a framework makes managed content visible', () => {
  const window = new Window();
  const document = window.document;
  const trigger = document.createElement('button');
  const surface = document.createElement('section');
  const close = document.createElement('button');
  surface.append(close);
  document.body.append(trigger, surface);
  surface.hidden = true;
  trigger.focus();

  const dialog = createDialog({ root: surface, trigger, manageVisibility: false });
  dialog.handleEvent('open');
  assert.notEqual(document.activeElement, close);
  surface.hidden = false;
  dialog.refresh();
  assert.equal(document.activeElement, close);
  dialog.disconnect();
});

test('dialog overlay uses the common interact-outside dismissal path', () => {
  const window = new Window();
  const document = window.document;
  const background = document.createElement('main');
  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  const surface = document.createElement('section');
  document.body.append(background, overlay, surface);
  let outsideEvent;
  const dialog = createDialog({ root: surface, overlay, onInteractOutside: (event) => { outsideEvent = event; } });

  dialog.handleEvent('open');
  assert.equal(background.inert, true);
  assert.equal(overlay.inert, false);
  assert.equal(overlay.getAttribute('aria-hidden'), 'true');
  overlay.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, composed: true }));

  assert.equal(outsideEvent?.target, overlay);
  assert.equal(outsideEvent?.surface, surface);
  assert.equal(dialog.getSnapshot().state.open, false);
  dialog.disconnect();
});

test('interact-outside can be cancelled or excluded for specific elements', () => {
  const window = new Window();
  const document = window.document;
  const ignored = document.createElement('aside');
  const ignoredChild = document.createElement('button');
  const overlay = document.createElement('div');
  const surface = document.createElement('section');
  ignored.append(ignoredChild);
  document.body.append(ignored, overlay, surface);
  let outsideCalls = 0;
  const dialog = createDialog({
    root: surface,
    overlay,
    interactOutsideExclusions: [ignored],
    onInteractOutside: (event) => {
      outsideCalls += 1;
      if (event.isInside(overlay)) event.preventDefault();
    },
  });

  dialog.handleEvent('open');
  assert.equal(ignored.inert, false);
  ignoredChild.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, composed: true }));
  assert.equal(outsideCalls, 0);
  assert.equal(dialog.getSnapshot().state.open, true);

  overlay.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, composed: true }));
  assert.equal(outsideCalls, 1);
  assert.equal(dialog.getSnapshot().state.open, true);
  dialog.disconnect();
});
