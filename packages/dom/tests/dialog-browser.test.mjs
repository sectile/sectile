import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createDialog } from '../dist/dialog.js';

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
