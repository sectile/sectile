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

test('toast ignores non-string keys outside its viewport and accepts the next shortcut', () => {
  for (const initialToasts of [[], [{ id: 'saved', title: 'Saved', durationMs: null }]]) {
    const window = new Window(), document = window.document;
    const input = document.createElement('input'), viewport = document.createElement('ol');
    document.body.append(input, viewport);
    const errors = [];
    window.addEventListener('error', event => { errors.push(event.message); event.preventDefault(); });
    const toast = createToast({ root: viewport, initialToasts, autoDismiss: false });
    try {
      input.focus();
      const before = toast.getSnapshot();
      const ignored = event => {
        input.dispatchEvent(event);
        assert.deepEqual(errors, []);
        assert.equal(event.defaultPrevented, false);
        assert.equal(document.activeElement, input);
        assert.equal(toast.getSnapshot(), before);
      };
      for (const key of [undefined, null, 42]) {
        const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'key', { value: key });
        ignored(event);
      }
      ignored(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
      const shortcut = new window.KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true });
      input.dispatchEvent(shortcut);
      assert.equal(shortcut.defaultPrevented, true);
      assert.equal(document.activeElement, viewport);
    } finally { toast.disconnect(); }
  }
});

test('toast preserves exact shortcut modifiers and independent Escape configuration', () => {
  const window = new Window(), document = window.document;
  const input = document.createElement('input'), viewport = document.createElement('ol');
  document.body.append(input, viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, hotkey: ['Control', 'Shift', 'K'],
    dismissOnEscape: false, initialToasts: [{ id: 'saved', title: 'Saved', durationMs: null }] });
  const send = (target, key, modifiers = {}) => {
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
    target.dispatchEvent(event); return event;
  };
  try {
    input.focus();
    assert.equal(send(input, 'k', { ctrlKey: true }).defaultPrevented, false);
    assert.equal(send(input, 'k', { ctrlKey: true, shiftKey: true, altKey: true }).defaultPrevented, false);
    assert.equal(document.activeElement, input);
    assert.equal(send(input, 'k', { ctrlKey: true, shiftKey: true }).defaultPrevented, true);
    assert.equal(document.activeElement, viewport);
    assert.equal(send(viewport, 'Escape').defaultPrevented, false);
    assert.equal(toast.getSnapshot().state.items.length, 1);
    for (const hotkey of [false, []]) {
      assert.equal(toast.syncConfiguration({ hotkey }).ok, true);
      input.focus();
      assert.equal(send(input, 'F8').defaultPrevented, false);
      assert.equal(document.activeElement, input);
    }
    assert.equal(toast.syncConfiguration({ hotkey: false, dismissOnEscape: true }).ok, true);
    viewport.focus();
    assert.equal(send(viewport, 'Escape').defaultPrevented, true);
    assert.equal(toast.getSnapshot().state.items.length, 0);
  } finally { toast.disconnect(); }
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
  const captured = capture(item);
  item.setAttribute('data-swipe', 'original');
  item.style.setProperty('--sectile-toast-swipe-move-x', '2px', 'important');
  viewport.append(item); window.document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, swipeDirection: 'right', swipeThreshold: 40 });
  toast.push({ id: 'saved', title: 'Saved' }); toast.setToastAttributes(item, 'saved');
  assert.equal(item.style.touchAction, 'pan-y');
  item.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 10, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointerup', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  assert.equal(item.dataset.swipe, 'end');
  assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-end-x'), '60px');
  assert.equal(toast.getSnapshot().state.items.length, 0);
  assert.equal(captured.size, 0);
  item.style.setProperty('--sectile-toast-swipe-end-y', '99px', 'important');
  toast.disconnect();
  assert.equal(item.style.touchAction, '');
  assert.equal(item.getAttribute('data-swipe'), 'original');
  assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-move-x'), '2px');
  assert.equal(item.style.getPropertyPriority('--sectile-toast-swipe-move-x'), 'important');
  assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-end-x'), '');
  assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-end-y'), '99px');
});

test('toast cancels a cancelled swipe without dismissing the item', () => {
  const window = new Window();
  const viewport = window.document.createElement('ol');
  const item = window.document.createElement('li');
  const captured = capture(item);
  viewport.append(item); window.document.body.append(viewport);
  const toast = createToast({ root: viewport, autoDismiss: false, swipeDirection: 'right', swipeThreshold: 40 });
  toast.push({ id: 'saved', title: 'Saved' }); toast.setToastAttributes(item, 'saved');
  item.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 10, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  item.dispatchEvent(new window.PointerEvent('pointercancel', { pointerId: 1, clientX: 70, clientY: 0, bubbles: true }));
  assert.equal(item.dataset.swipe, 'cancel');
  assert.equal(toast.getSnapshot().state.items.length, 1);
  assert.equal(captured.size, 0); assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-move-x'), '');
  toast.disconnect();
});

test('Toast retires lost capture, item unregister and disconnected gesture paint without reviving saved input', () => {
  const window = new Window(), root = window.document.createElement('ol'), item = window.document.createElement('li');
  root.append(item); window.document.body.append(root); const captured = capture(item);
  const toast = createToast({ root, autoDismiss: false, initialToasts: [{ id: 'a', title: 'A' }] });
  toast.setToastAttributes(item, 'a');
  const down = () => item.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 0, clientY: 0, bubbles: true }));
  const move = () => item.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 20, clientY: 0, bubbles: true }));
  down(); move(); captured.clear();
  item.dispatchEvent(new window.PointerEvent('lostpointercapture', { pointerId: 1, bubbles: true }));
  assert.equal(item.dataset.swipe, 'cancel'); assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-move-x'), '');
  down(); move(); toast.setToastAttributes(undefined, 'a');
  assert.equal(captured.size, 0); assert.equal(item.getAttribute('data-swipe'), null); assert.equal(item.style.getPropertyValue('--sectile-toast-swipe-move-x'), '');
  toast.setToastAttributes(item, 'a'); down(); move(); toast.disconnect();
  assert.equal(captured.size, 0); assert.equal(item.getAttribute('data-swipe'), null); assert.equal(item.style.touchAction, '');
  down(); move(); assert.equal(captured.size, 0); assert.equal(item.getAttribute('data-swipe'), null);
});

test('Toast preserves independent controls and cancelled or auxiliary pointer input', () => {
  const window = new Window(), document = window.document;
  const root = document.createElement('ol'), item = document.createElement('li');
  root.append(item); document.body.append(root); const captured = capture(item);
  const toast = createToast({ root, autoDismiss: false, initialToasts: [{ id: 'a', title: 'A' }] });
  toast.setToastAttributes(item, 'a');
  const pointer = (type, init = {}) => new window.PointerEvent(type, { pointerId: 1, isPrimary: true, button: 0, bubbles: true, composed: true, cancelable: true, ...init });
  const rejected = (target, init = {}, prevent = false) => {
    const down = pointer('pointerdown', init); if (prevent) down.preventDefault();
    target.dispatchEvent(down);
    assert.equal(captured.size, 0); assert.equal(item.hasAttribute('data-swipe'), false);
    assert.equal(down.defaultPrevented, prevent);
    target.dispatchEvent(pointer('pointermove', { clientX: 80 })); target.dispatchEvent(pointer('pointerup', { clientX: 80 }));
    assert.equal(toast.getSnapshot().state.items.length, 1);
  };
  try {
    rejected(item, {}, true); rejected(item, { button: 2 }); rejected(item, { button: 1 }); rejected(item, { isPrimary: false });
    for (const tag of ['button', 'input', 'select', 'textarea', 'a', 'summary']) {
      const control = document.createElement(tag); if (tag === 'a') control.href = '#action';
      item.append(control); rejected(control);
      if (tag === 'button' || tag === 'a') {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); control.append(icon); rejected(icon);
      }
    }
    const editable = document.createElement('div'); editable.setAttribute('contenteditable', 'true');
    const text = document.createElement('span'); editable.append(text); item.append(editable); rejected(text);
    const control = document.createElement('div'); control.setAttribute('role', 'slider'); item.append(control); rejected(control);
    const host = document.createElement('div'); item.append(host);
    const shadow = host.attachShadow({ mode: 'open' }), button = document.createElement('button'); shadow.append(button); rejected(button);
    const close = document.createElement('button'); item.append(close); toast.setCloseButtonAttributes(close, 'a');
    rejected(close); close.click(); assert.equal(toast.getSnapshot().state.items.length, 0);
  } finally { toast.destroy(); }
});

test('Toast accepts primary mouse, touch and pen swipe on ordinary content', () => {
  const window = new Window(), document = window.document;
  const root = document.createElement('ol'), item = document.createElement('li'), text = document.createElement('span');
  item.append(text); root.append(item); document.body.append(root); const captured = capture(item);
  const toast = createToast({ root, autoDismiss: false });
  try {
    for (const pointerType of ['mouse', 'touch', 'pen']) {
      toast.push({ id: pointerType, title: pointerType }); toast.setToastAttributes(item, pointerType);
      const pointer = (type, x) => new window.PointerEvent(type, { pointerId: 1, pointerType, isPrimary: true, button: 0, clientX: x, bubbles: true, composed: true });
      text.dispatchEvent(pointer('pointerdown', 0)); assert.equal(captured.size, 1);
      text.dispatchEvent(pointer('pointermove', 80)); text.dispatchEvent(pointer('pointerup', 80));
      assert.equal(toast.getSnapshot().state.items.length, 0); assert.equal(captured.size, 0);
    }
  } finally { toast.destroy(); }
});

function capture(item) {
  const captured = new Set(); item.setPointerCapture = id => captured.add(id);
  item.hasPointerCapture = id => captured.has(id); item.releasePointerCapture = id => captured.delete(id);
  return captured;
}
