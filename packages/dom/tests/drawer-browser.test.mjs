import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createDrawer, tryCreateDrawer } from '../.verification-dist/drawer.js';

function setup(side = 'right') {
  const window = new Window();
  const document = window.document;
  const background = document.createElement('main');
  const trigger = document.createElement('button');
  const overlay = document.createElement('div');
  const surface = document.createElement('section');
  const handle = document.createElement('button');
  const close = document.createElement('button');
  surface.append(handle, close);
  document.body.append(background, trigger, overlay, surface);
  surface.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 400, width: 320, height: 400,
    toJSON() { return this; },
  });
  const drawer = createDrawer({ root: surface, trigger, overlay, handle, side, swipeVelocityThreshold: 99 });
  return { window, document, background, trigger, overlay, surface, handle, close, drawer };
}

function pointer(window, type, init) {
  return new window.PointerEvent(type, { bubbles: true, composed: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', ...init });
}

test('modal drawer projects its side and reuses the dialog accessibility contract', () => {
  const fixture = setup('right');
  fixture.drawer.handleEvent('open');

  assert.equal(fixture.surface.getAttribute('role'), 'dialog');
  assert.equal(fixture.surface.getAttribute('aria-modal'), 'true');
  assert.equal(fixture.surface.getAttribute('data-side'), 'right');
  assert.equal(fixture.surface.getAttribute('data-swipe-direction'), 'right');
  assert.equal(fixture.overlay.getAttribute('data-side'), 'right');
  assert.equal(fixture.background.inert, true);
  assert.equal(fixture.overlay.inert, false);
  assert.equal(fixture.document.body.style.overflow, 'hidden');
  assert.equal(fixture.document.activeElement, fixture.handle);

  fixture.drawer.handleEvent({ type: 'set-side', side: 'top' });
  assert.equal(fixture.drawer.getSnapshot().state.open, true);
  assert.equal(fixture.surface.getAttribute('data-side'), 'top');
  assert.equal(fixture.surface.getAttribute('data-swipe-direction'), 'up');
  fixture.drawer.disconnect();
});

test('handle swipe cancels below the threshold and dismisses beyond it', () => {
  const fixture = setup('right');
  fixture.drawer.handleEvent('open');

  fixture.handle.dispatchEvent(pointer(fixture.window, 'pointerdown', { clientX: 0, clientY: 10 }));
  fixture.handle.dispatchEvent(pointer(fixture.window, 'pointermove', { clientX: 40, clientY: 10 }));
  assert.equal(fixture.surface.getAttribute('data-swipe'), 'move');
  assert.equal(fixture.surface.style.getPropertyValue('--sectile-drawer-swipe-movement-x'), '40px');
  fixture.handle.dispatchEvent(pointer(fixture.window, 'pointerup', { clientX: 40, clientY: 10 }));
  assert.equal(fixture.drawer.getSnapshot().state.open, true);
  assert.equal(fixture.surface.getAttribute('data-swipe'), 'cancel');
  assert.equal(fixture.surface.style.getPropertyValue('--sectile-drawer-swipe-movement-x'), '0px');

  fixture.handle.dispatchEvent(pointer(fixture.window, 'pointerdown', { clientX: 0, clientY: 10 }));
  fixture.handle.dispatchEvent(pointer(fixture.window, 'pointermove', { clientX: 100, clientY: 10 }));
  fixture.handle.dispatchEvent(pointer(fixture.window, 'pointerup', { clientX: 100, clientY: 10 }));
  assert.equal(fixture.drawer.getSnapshot().state.open, false);
  assert.equal(fixture.surface.getAttribute('data-swipe'), 'end');

  fixture.drawer.handleEvent('open');
  assert.equal(fixture.surface.hasAttribute('data-swipe'), false);
  assert.equal(fixture.surface.style.getPropertyValue('--sectile-drawer-swipe-movement-x'), '');
  fixture.drawer.disconnect();
});

test('drawer swipe ignore marker protects interactive descendants', () => {
  const fixture = setup('bottom');
  const ignored = fixture.document.createElement('span');
  ignored.setAttribute('data-sectile-drawer-swipe-ignore', '');
  fixture.handle.append(ignored);
  fixture.drawer.handleEvent('open');

  ignored.dispatchEvent(pointer(fixture.window, 'pointerdown', { clientX: 10, clientY: 0 }));
  ignored.dispatchEvent(pointer(fixture.window, 'pointermove', { clientX: 10, clientY: 120 }));
  ignored.dispatchEvent(pointer(fixture.window, 'pointerup', { clientX: 10, clientY: 120 }));
  assert.equal(fixture.drawer.getSnapshot().state.open, true);
  assert.equal(fixture.surface.hasAttribute('data-swipe'), false);
  fixture.drawer.disconnect();
});

test('drawer overlay uses the common cancellable outside interaction path', () => {
  const fixture = setup();
  let outsideEvent;
  fixture.drawer.disconnect();
  const drawer = createDrawer({
    root: fixture.surface,
    trigger: fixture.trigger,
    overlay: fixture.overlay,
    onInteractOutside: (event) => { outsideEvent = event; event.preventDefault(); },
  });
  drawer.handleEvent('open');
  fixture.overlay.dispatchEvent(pointer(fixture.window, 'pointerdown', {}));
  assert.equal(outsideEvent?.target, fixture.overlay);
  assert.equal(drawer.getSnapshot().state.open, true);
  drawer.disconnect();
});

test('drawer rejects invalid swipe thresholds without leaving managed effects behind', () => {
  const window = new Window();
  const root = window.document.createElement('section');
  window.document.body.append(root);
  const result = tryCreateDrawer({ root, defaultOpen: true, swipeThreshold: Number.NaN });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-drawer-swipe-threshold');
  assert.equal(window.document.body.style.overflow, '');
  assert.equal(root.hasAttribute('role'), false);
});
