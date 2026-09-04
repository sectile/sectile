import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createToast } from '../.verification-dist/toast.js';

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

test('toast visibility ownership restores exact item baseline and opt-out leaves consumer state alone', () => {
  const window = new Window();
  const document = window.document;
  const viewport = document.createElement('ol');
  const item = document.createElement('li');
  item.setAttribute('hidden', 'until-found');
  viewport.append(item); document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false });
  toast.push({ id: 'saved', title: 'Saved' });
  toast.setToastAttributes(item, 'saved');
  assert.equal(item.getAttribute('hidden'), null);
  toast.disconnect();
  assert.equal(item.getAttribute('hidden'), 'until-found');

  const unmanaged = document.createElement('li');
  unmanaged.setAttribute('hidden', 'until-found');
  viewport.append(unmanaged);
  const unmanagedToast = createToast({ root: viewport, autoDismiss: false, manageVisibility: false });
  unmanagedToast.push({ id: 'manual', title: 'Manual' });
  unmanagedToast.setToastAttributes(unmanaged, 'manual');
  unmanaged.removeAttribute('hidden');
  unmanagedToast.disconnect();
  assert.equal(unmanaged.getAttribute('hidden'), null);
});

test('controlled toast emits proposals and changes only when synchronized', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const item = window.document.createElement('li');
  viewport.append(item); window.document.body.append(viewport);
  const proposals = [];
  const toast = createToast({ root: viewport, items: [{ id: 'saved', title: 'Saved', kind: 'product-pending' }], autoDismiss: false, manageVisibility: false, onItemsChange: (items) => proposals.push(items) });
  toast.setToastAttributes(item, 'saved');
  toast.updateToast('saved', { kind: 'product-complete' });
  assert.equal(toast.getSnapshot().state.items[0].kind, 'product-pending');
  assert.equal(proposals.at(-1)[0].kind, 'product-complete');
  toast.syncItems([{ id: 'saved', title: 'Saved', kind: 'product-complete' }]);
  assert.equal(toast.getSnapshot().state.items[0].kind, 'product-complete');
  assert.equal(item.dataset.kind, 'product-complete');
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

test('toast projects user-defined kinds while preserving error alert semantics', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const item = window.document.createElement('li');
  viewport.append(item); window.document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false });

  toast.push({ id: 'deployment', title: 'Deploying', kind: 'deployment-pending' });
  toast.setToastAttributes(item, 'deployment');
  assert.equal(item.dataset.kind, 'deployment-pending');
  assert.equal(item.getAttribute('role'), 'status');

  toast.updateToast('deployment', { kind: 'error' });
  assert.equal(item.dataset.kind, 'error');
  assert.equal(item.getAttribute('role'), 'alert');
  toast.disconnect();
});

test('controlled toast commits countdown progress and preserves it across external synchronization', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const proposals = [];
  const dismissals = [];
  const toast = createToast({
    root: viewport,
    items: [{ id: 'saved', title: 'Saved', durationMs: 1_000 }],
    autoDismiss: false,
    onItemsChange: (items) => proposals.push(items),
    onDismiss: (id, reason) => dismissals.push({ id, reason }),
  });

  toast.handleEvent({ type: 'tick', elapsedMs: 100 });
  assert.equal(toast.getSnapshot().state.items[0].remainingMs, 900);
  assert.equal(proposals.length, 0);

  toast.syncItems([{ id: 'saved', title: 'Saved externally', durationMs: 1_000 }]);
  assert.equal(toast.getSnapshot().state.items[0].title, 'Saved externally');
  assert.equal(toast.getSnapshot().state.items[0].remainingMs, 900);

  toast.syncItems([{ id: 'saved', title: 'Saved externally', durationMs: 2_000 }]);
  assert.equal(toast.getSnapshot().state.items[0].remainingMs, 2_000);
  toast.handleEvent({ type: 'tick', elapsedMs: 2_000 });
  assert.equal(toast.getSnapshot().state.items[0].remainingMs, 0);
  assert.deepEqual(proposals.at(-1), []);
  assert.deepEqual(dismissals, [{ id: 'saved', reason: 'timeout' }]);

  toast.handleEvent({ type: 'tick', elapsedMs: 100 });
  assert.equal(proposals.length, 1);
  assert.equal(dismissals.length, 1);
  toast.syncItems([]);
  assert.equal(toast.getSnapshot().state.items.length, 0);
  toast.disconnect();
});

test('toast registration replacement and unregister release owned DOM state immediately', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const first = window.document.createElement('li');
  const second = window.document.createElement('li');
  const oldClose = window.document.createElement('button');
  const newClose = window.document.createElement('button');
  first.setAttribute('hidden', 'until-found');
  viewport.append(first, second); window.document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, swipeDirection: 'right' });
  toast.push({ id: 'saved', title: 'Saved' });
  toast.setToastAttributes(first, 'saved');
  toast.setCloseButtonAttributes(oldClose, 'saved');
  assert.equal(first.getAttribute('hidden'), null);
  assert.equal(first.style.touchAction, 'pan-y');

  toast.setToastAttributes(second, 'saved');
  toast.setCloseButtonAttributes(newClose, 'saved');
  assert.equal(first.getAttribute('hidden'), 'until-found');
  assert.equal(first.style.touchAction, '');
  oldClose.click();
  assert.equal(toast.getSnapshot().state.items.length, 1);

  second.style.touchAction = 'consumer';
  toast.setToastAttributes(undefined, 'saved');
  toast.setCloseButtonAttributes(undefined, 'saved');
  assert.equal(second.style.touchAction, 'consumer');
  newClose.click();
  assert.equal(toast.getSnapshot().state.items.length, 1);
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
