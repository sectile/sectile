import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createToast } from '../dist/toast.js';

test('toast supports localized controls, viewport hotkey, window pause, and Escape dismissal', () => {
  const window = new Window();
  const document = window.document;
  const viewport = document.createElement('ol');
  const item = document.createElement('li');
  const close = document.createElement('button');
  item.append(close); viewport.append(item); document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, closeLabel: '알림 닫기' });
  toast.push({ id: 'saved', title: '저장됨' });
  toast.setToastAttributes(item, 'saved'); toast.setCloseButtonAttributes(close, 'saved');
  assert.equal(close.getAttribute('aria-label'), '알림 닫기');

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, viewport);
  viewport.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(toast.getSnapshot().state.items.length, 0);
  toast.push({ id: 'saved-again', title: '다시 저장됨' });
  toast.setToastAttributes(item, 'saved-again'); toast.setCloseButtonAttributes(close, 'saved-again');
  window.dispatchEvent(new window.Event('blur'));
  assert.equal(toast.getSnapshot().state.paused, true);
  viewport.dispatchEvent(new window.MouseEvent('mouseenter'));
  window.dispatchEvent(new window.Event('focus'));
  assert.equal(toast.getSnapshot().state.paused, true);
  viewport.dispatchEvent(new window.MouseEvent('mouseleave'));
  assert.equal(toast.getSnapshot().state.paused, true);
  viewport.blur();
  assert.equal(toast.getSnapshot().state.paused, false);

  close.focus();
  close.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(toast.getSnapshot().state.items.length, 0);
  toast.disconnect();
});

test('controlled toast emits proposals and changes only when synchronized', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const item = window.document.createElement('li');
  viewport.append(item); window.document.body.append(viewport);
  const proposals = [];
  const toast = createToast({ root: viewport, items: [{ id: 'saved', title: 'Saved' }], autoDismiss: false, manageVisibility: false, onItemsChange: (items) => proposals.push(items) });
  toast.setToastAttributes(item, 'saved');
  toast.dismiss('saved');
  assert.equal(toast.getSnapshot().state.items.length, 1);
  assert.equal(proposals.at(-1).length, 0);
  const synchronized = toast.syncItems([]);
  assert.equal(synchronized.ok, true);
  assert.equal(toast.getSnapshot().state.items.length, 0);
  assert.equal(item.hidden, false);
  assert.equal(item.dataset.state, 'closed');
  toast.disconnect();
});

test('toast dismisses with a directional swipe and exposes motion data', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const item = window.document.createElement('li');
  viewport.append(item); window.document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, swipeDirection: 'right', swipeThreshold: 40 });
  toast.push({ id: 'saved', title: 'Saved' }); toast.setToastAttributes(item, 'saved');
  assert.equal(item.style.touchAction, 'pan-y');
  item.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, clientX: 10, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointerup', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  assert.equal(item.dataset.swipe, 'end');
  assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-end-x'), '60px');
  assert.equal(toast.getSnapshot().state.items.length, 0);
  toast.disconnect();
  assert.equal(item.style.touchAction, '');
});

test('toast cancels a cancelled swipe without dismissing the item', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const item = window.document.createElement('li');
  viewport.append(item); window.document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, swipeDirection: 'right', swipeThreshold: 40 });
  toast.push({ id: 'saved', title: 'Saved' }); toast.setToastAttributes(item, 'saved');
  item.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, clientX: 10, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointercancel', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  assert.equal(item.dataset.swipe, 'cancel');
  assert.equal(toast.getSnapshot().state.items.length, 1);
  toast.disconnect();
});
