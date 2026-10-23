import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createDrawer, tryCreateDrawer } from '../.verification-dist/drawer.js';

function setup(side = 'right', options = {}, observeHandle) {
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
  observeHandle?.(handle, surface);
  const drawer = createDrawer({ root: surface, trigger, overlay, handle, side, swipeVelocityThreshold: 99, ...options });
  return { window, document, background, trigger, overlay, surface, handle, close, drawer };
}

function pointer(window, type, init) {
  return new window.PointerEvent(type, { bubbles: true, composed: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', ...init });
}

test('live drawer gesture configuration preserves paint and cancels obsolete captures with bounded listeners', () => {
  const listeners = new Map(), captures = new Set(), closeReasons = []; let destroyDuringUpdate = false, reentrant;
  const f = setup('right', { retainExit: true, onOpenChange: (open, method, reason) => { if (!open) closeReasons.push(reason); }, onUpdate: () => {
    if (destroyDuringUpdate) {
      reentrant = f.drawer.syncGesture({ side: 'bottom', swipeToDismiss: true }); f.drawer.destroy();
    }
  } }, (handle, root) => {
    const add = root.addEventListener.bind(root), remove = root.removeEventListener.bind(root);
    root.addEventListener = (type, listener, options) => {
      if (type.startsWith('pointer')) { const owned = listeners.get(type) ?? new Set(); owned.add(listener); listeners.set(type, owned); }
      add(type, listener, options);
    };
    root.removeEventListener = (type, listener, options) => { listeners.get(type)?.delete(listener); remove(type, listener, options); };
    handle.setPointerCapture = id => { captures.add(id); };
    handle.releasePointerCapture = id => { captures.delete(id); };
  });
  const send = (type, x, y = 0) => f.handle.dispatchEvent(pointer(f.window, type, { clientX: x, clientY: y }));
  const count = () => [...listeners.values()].reduce((sum, value) => sum + value.size, 0);
  const configure = { side: 'right', swipeToDismiss: true, swipeThreshold: 80, swipeVelocityThreshold: 99 };
  f.drawer.handleEvent('open'); let paint; f.drawer.subscribeLayerPresentation(value => { paint = value; });
  let active = paint; f.close.focus(); send('pointerdown', 0); send('pointermove', 30);
  assert.equal(captures.size, 1); assert.equal(count(), 4);
  assert.equal(f.drawer.syncGesture(configure).ok, true); assert.equal(captures.size, 1);
  assert.equal(f.drawer.syncGesture({ ...configure, swipeThreshold: -1 }).error.code, 'invalid-drawer-swipe-threshold');
  assert.equal(f.drawer.syncGesture({ ...configure, side: 'invalid' }).error.code, 'invalid-drawer-side');
  assert.equal(f.drawer.syncGesture({ ...configure, swipeToDismiss: 'invalid' }).error.code, 'dom.drawer-options-invalid');
  assert.equal(captures.size, 1); assert.equal(f.surface.getAttribute('data-swipe'), 'move');
  f.drawer.suspend(); assert.equal(count(), 0); assert.equal(captures.size, 0);
  assert.equal(f.surface.hasAttribute('data-swipe'), false); assert.equal(f.drawer.getSnapshot().state.open, true);
  assert.deepEqual(closeReasons, []);
  assert.equal(f.drawer.syncGesture({ ...configure, swipeThreshold: 81 }).ok, true); assert.equal(count(), 0);
  f.drawer.resume(); f.drawer.subscribeLayerPresentation(value => { paint = value; });
  assert.ok(paint.generation > active.generation); active = paint;
  assert.equal(count(), 4); f.close.focus(); send('pointerdown', 0); send('pointermove', 30);
  assert.equal(captures.size, 1, 'resumed gesture uses the retained model and current configuration');
  f.drawer.syncGesture({ ...configure, side: 'left' });
  assert.equal(captures.size, 0); assert.equal(f.surface.hasAttribute('data-swipe'), false);
  assert.equal(f.surface.getAttribute('data-side'), 'left'); assert.equal(f.document.activeElement, f.close); assert.equal(paint, active);
  send('pointerup', 100); assert.equal(f.drawer.getSnapshot().state.open, true);
  for (let index = 0; index < 32; index++) {
    f.drawer.syncGesture({ ...configure, side: 'left', swipeToDismiss: false }); assert.equal(count(), 0);
    send('pointerdown', 100); send('pointermove', 0); assert.equal(captures.size, 0);
    f.drawer.syncGesture({ ...configure, side: 'left' }); assert.equal(count(), 4);
  }
  f.drawer.syncDisabled(true); f.drawer.syncGesture({ ...configure, side: 'bottom', swipeThreshold: 40 });
  assert.equal(f.surface.getAttribute('data-side'), 'bottom'); assert.equal(paint, active);
  send('pointerdown', 0, 0); send('pointermove', 0, 80); assert.equal(captures.size, 0); assert.equal(f.drawer.handleEvent('close'), false);
  f.drawer.syncDisabled(false); send('pointerdown', 0, 0); send('pointermove', 0, 50); assert.equal(captures.size, 1);
  send('pointerup', 0, 50); assert.equal(captures.size, 0); const exit = paint;
  assert.deepEqual(closeReasons, ['swipe']);
  assert.equal(exit.phase, 'exiting'); assert.equal(exit.generation, active.generation);
  f.drawer.syncGesture({ ...configure, side: 'top', swipeToDismiss: false }); assert.equal(paint, exit); assert.equal(count(), 0);
  f.drawer.handleEvent('open'); destroyDuringUpdate = true;
  f.drawer.syncGesture({ ...configure, side: 'right' });
  assert.equal(reentrant.error.code, 'dom.drawer-options-invalid');
  assert.equal(count(), 0); assert.equal(captures.size, 0); assert.equal(f.document.body.style.overflow, ''); f.window.close();
});

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

test('content and handle share one cancellable gesture and retain native controls', () => {
  const f = setup('bottom');
  const content = f.document.createElement('div');
  f.surface.append(content); f.drawer.handleEvent('open');
  const send = (target, type, y, id = 1) => target.dispatchEvent(pointer(f.window, type, { clientY: y, pointerId: id }));
  for (const tag of ['input', 'textarea', 'select', 'button', 'a', 'summary']) {
    const control = f.document.createElement(tag);
    if (tag === 'a') control.href = '#test';
    content.append(control);
    send(control, 'pointerdown', 0); send(control, 'pointermove', 120); send(control, 'pointerup', 120);
    assert.equal(f.drawer.getSnapshot().state.open, true);
    assert.equal(f.surface.hasAttribute('data-swiping'), false);
  }
  const text = f.document.createElement('span'); text.textContent = 'Selectable content'; content.append(text);
  const range = f.document.createRange(); range.selectNodeContents(text);
  f.document.getSelection().addRange(range);
  send(text, 'pointerdown', 0); send(text, 'pointermove', 120); send(text, 'pointerup', 120);
  assert.equal(f.drawer.getSnapshot().state.open, true); f.document.getSelection().removeAllRanges();
  send(text, 'pointerdown', 0); f.document.getSelection().addRange(range);
  send(text, 'pointermove', 120); send(text, 'pointerup', 120);
  assert.equal(f.drawer.getSnapshot().state.open, true); f.document.getSelection().removeAllRanges();
  const cancelled = pointer(f.window, 'pointerdown', { clientY: 0 }); cancelled.preventDefault();
  content.dispatchEvent(cancelled); send(content, 'pointermove', 120); send(content, 'pointerup', 120);
  assert.equal(f.drawer.getSnapshot().state.open, true);
  const shadowHost = f.document.createElement('div'); content.append(shadowHost);
  const shadowButton = f.document.createElement('button'); shadowHost.attachShadow({ mode: 'open' }).append(shadowButton);
  send(shadowButton, 'pointerdown', 0); send(shadowButton, 'pointermove', 120); send(shadowButton, 'pointerup', 120);
  assert.equal(f.drawer.getSnapshot().state.open, true);
  send(content, 'pointerdown', 0); send(content, 'pointermove', 40);
  assert.equal(f.surface.getAttribute('data-swipe'), 'move');
  send(f.handle, 'pointerdown', 0, 2); send(f.handle, 'pointermove', 120, 2); send(f.handle, 'pointerup', 120, 2);
  assert.equal(f.surface.style.getPropertyValue('--sectile-drawer-swipe-movement-y'), '40px');
  send(content, 'pointercancel', 40);
  assert.equal(f.surface.getAttribute('data-swipe'), 'cancel');
  assert.equal(f.drawer.getSnapshot().state.open, true);
  send(content, 'pointerdown', 0); send(content, 'pointermove', 120); send(content, 'pointermove', 20); send(content, 'pointerup', 20);
  assert.equal(f.drawer.getSnapshot().state.open, true);
  send(content, 'pointerdown', 0); send(content, 'pointermove', 120); send(content, 'pointerup', 120);
  assert.equal(f.drawer.getSnapshot().state.open, false);
  f.drawer.destroy(); f.window.close();
});

test('native caret facts protect actual selectable text without claiming blank content or handle input', () => {
  for (const scenario of ['text', 'blank', 'none', 'touch', 'handle', 'legacy', 'foreign']) {
    const f = setup('bottom'), paragraph = f.document.createElement('p'), text = f.document.createTextNode('Selectable delivery instructions');
    paragraph.append(text); f.surface.append(paragraph); f.drawer.handleEvent('open');
    paragraph.style.userSelect = scenario === 'none' ? 'none' : scenario === 'text' ? 'auto' : 'text';
    let hits = 0, rects = 0;
    const createRange = f.document.createRange.bind(f.document);
    f.document.createRange = () => { const range = createRange(); range.getClientRects = () => { rects++; return [{ x: 10, y: 0, width: 20, height: 20 }]; }; return range; };
    const foreign = f.document.createElement('p'); foreign.textContent = 'Other owner'; f.document.body.append(foreign);
    f.document.caretPositionFromPoint = () => { hits++; return { offsetNode: scenario === 'foreign' ? foreign.firstChild : text, offset: 2 }; };
    if (scenario === 'legacy') {
      f.document.caretPositionFromPoint = undefined;
      f.document.caretRangeFromPoint = () => { hits++; const range = f.document.createRange(); range.setStart(text, 2); range.collapse(true); return range; };
    }
    const target = scenario === 'handle' ? f.handle : paragraph, x = scenario === 'blank' ? 80 : 15;
    try {
      for (const [type, y] of [['pointerdown', 10], ['pointermove', 130], ['pointerup', 130]]) {
        target.dispatchEvent(pointer(f.window, type, { clientX: x, clientY: y, pointerType: scenario === 'touch' ? 'touch' : 'mouse' }));
      }
      assert.equal(f.drawer.getSnapshot().state.open, scenario === 'text' || scenario === 'legacy', scenario);
      assert.equal(hits, scenario === 'touch' || scenario === 'handle' ? 0 : 1);
      assert.ok(rects <= 2, 'only caret-adjacent character fragments are measured');
    } finally { f.drawer.destroy(); f.window.close(); }
  }
});

test('text admission follows visible shadow ancestry and the nearest explicit user-select owner', () => {
  for (const setting of ['none', 'text']) {
    const f = setup('bottom'), host = f.document.createElement('div'); f.surface.append(host);
    const shadow = host.attachShadow({ mode: 'open' }), outer = f.document.createElement('div'), paragraph = f.document.createElement('p');
    outer.style.userSelect = 'none'; paragraph.style.userSelect = setting; paragraph.textContent = 'Delivery notes'; outer.append(paragraph); shadow.append(outer);
    let roots;
    f.document.caretPositionFromPoint = (x, y, options) => { roots = options.shadowRoots; return { offsetNode: paragraph.firstChild, offset: 2 }; };
    const createRange = f.document.createRange.bind(f.document);
    f.document.createRange = () => { const range = createRange(); range.getClientRects = () => [{ x: 0, y: 0, width: 20, height: 20 }]; return range; };
    f.drawer.handleEvent('open');
    try {
      for (const [type, y] of [['pointerdown', 10], ['pointermove', 130], ['pointerup', 130]]) paragraph.dispatchEvent(pointer(f.window, type, { clientX: 10, clientY: y }));
      assert.deepEqual(roots, [shadow]); assert.equal(f.drawer.getSnapshot().state.open, setting === 'text');
    } finally { f.drawer.destroy(); f.window.close(); }
  }
});

test('dom:drawer:text-admission-work is independent of text length and adds no active-motion reads', () => {
  for (const length of [32, 65536]) {
    const f = setup('bottom'), paragraph = f.document.createElement('p'); paragraph.textContent = 'a'.repeat(length); paragraph.style.userSelect = 'text'; f.surface.append(paragraph);
    let hits = 0, rects = 0;
    f.document.caretPositionFromPoint = () => { hits++; return { offsetNode: paragraph.firstChild, offset: length - 1 }; };
    const createRange = f.document.createRange.bind(f.document);
    f.document.createRange = () => { const range = createRange(); range.getClientRects = () => { rects++; return [{ x: 0, y: 0, width: 10, height: 20 }]; }; return range; };
    f.drawer.handleEvent('open');
    try {
      paragraph.dispatchEvent(pointer(f.window, 'pointerdown', { clientX: 50, clientY: 10 }));
      assert.equal(hits, 1); assert.equal(rects, 2, 'nearest text outside the hit point remains draggable');
      for (let index = 0; index < 50; index++) paragraph.dispatchEvent(pointer(f.window, 'pointermove', { clientX: 50, clientY: 20 + index }));
      assert.equal(hits, 1); assert.equal(rects, 2, 'active movement never reruns text hit testing');
      paragraph.dispatchEvent(pointer(f.window, 'pointercancel', { clientX: 50, clientY: 70 }));
      assert.equal(f.drawer.getSnapshot().state.open, true);
    } finally { f.drawer.destroy(); f.window.close(); }
  }
});

test('content admission yields to every nested scroll port before claiming at its outward boundary', () => {
  for (const [side, direction, start, boundary] of [
    ['bottom', 'ltr', 30, 0], ['top', 'ltr', 30, 100],
    ['right', 'ltr', 30, 0], ['left', 'ltr', 30, 100],
    ['right', 'rtl', -30, -100], ['left', 'rtl', -30, 0],
  ]) {
    const f = setup(side);
    const outer = f.document.createElement('div'), inner = f.document.createElement('div'), text = f.document.createElement('span');
    f.surface.append(outer); outer.append(inner); inner.append(text);
    const vertical = side === 'top' || side === 'bottom';
    for (const port of [outer, inner]) {
      // The DOM model does not expand overflow shorthand into computed axes.
      port.style.overflowX = 'auto'; port.style.overflowY = 'auto'; port.style.direction = direction;
      Object.defineProperties(port, {
        [vertical ? 'clientHeight' : 'clientWidth']: { value: 100 },
        [vertical ? 'scrollHeight' : 'scrollWidth']: { value: 200 },
      });
      port[vertical ? 'scrollTop' : 'scrollLeft'] = boundary;
    }
    outer[vertical ? 'scrollTop' : 'scrollLeft'] = start;
    f.drawer.handleEvent('open');
    const sign = side === 'top' || side === 'left' ? -1 : 1;
    const send = (type, movement) => {
      const event = pointer(f.window, type, { [vertical ? 'clientY' : 'clientX']: sign * movement });
      text.dispatchEvent(event); return event;
    };
    send('pointerdown', 0);
    assert.equal(send('pointermove', 120).defaultPrevented, false);
    send('pointerup', 120);
    assert.equal(f.drawer.getSnapshot().state.open, true, `${side}/${direction} preserves ancestor scrolling`);
    outer[vertical ? 'scrollTop' : 'scrollLeft'] = boundary;
    const nativeStyle = f.window.getComputedStyle.bind(f.window); let reads = 0;
    f.window.getComputedStyle = (...args) => { reads++; return nativeStyle(...args); };
    send('pointerdown', 0); send('pointermove', 20);
    assert.equal(f.surface.getAttribute('data-swipe'), 'move');
    assert.equal(reads <= 4, true, 'admission is bounded by the origin-to-root chain');
    const admissionReads = reads;
    for (let i = 0; i < 50; i++) send('pointermove', 30 + i);
    assert.equal(reads, admissionReads, 'active motion does not rescan scroll ancestors');
    send('pointercancel', 79); f.drawer.destroy(); f.window.close();
  }
});

test('content-only drawers clean their fixed listener set after reconfiguration and disconnect', () => {
  const resources = new Map();
  const f = setup('bottom', { handle: undefined }, (_handle, root) => {
    const add = root.addEventListener.bind(root), remove = root.removeEventListener.bind(root);
    root.addEventListener = (type, listener, options) => {
      if (type.startsWith('pointer')) { const owned = resources.get(type) ?? new Set(); owned.add(listener); resources.set(type, owned); }
      add(type, listener, options);
    };
    root.removeEventListener = (type, listener, options) => { resources.get(type)?.delete(listener); remove(type, listener, options); };
  });
  const count = () => [...resources.values()].reduce((sum, value) => sum + value.size, 0);
  f.drawer.handleEvent('open');
  for (let i = 0; i < 12; i++) {
    assert.equal(count(), 4);
    f.surface.dispatchEvent(pointer(f.window, 'pointerdown', { clientY: 0 }));
    f.surface.dispatchEvent(pointer(f.window, 'pointermove', { clientY: 30 }));
    assert.equal(f.surface.getAttribute('data-swipe'), 'move');
    f.drawer.syncGesture({ side: 'bottom', swipeToDismiss: false });
    assert.equal(count(), 0); assert.equal(f.surface.hasAttribute('data-swiping'), false);
    f.drawer.syncGesture({ side: 'bottom', swipeToDismiss: true });
  }
  f.drawer.destroy(); assert.equal(count(), 0);
  f.surface.dispatchEvent(pointer(f.window, 'pointerup', { clientY: 120 }));
  assert.equal(f.surface.hasAttribute('data-swipe'), false); f.window.close();
});

test('drawer release uses the final pointer sample without starting a new drag on release', () => {
  for (const [lastMove, release, remainsOpen] of [[120, 20, true], [20, 120, false], [120, 0, true], [undefined, 120, true]]) {
    const f = setup('bottom'); f.drawer.handleEvent('open');
    f.handle.dispatchEvent(pointer(f.window, 'pointerdown', { clientY: 0 }));
    if (lastMove !== undefined) f.handle.dispatchEvent(pointer(f.window, 'pointermove', { clientY: lastMove }));
    f.handle.dispatchEvent(pointer(f.window, 'pointerup', { clientY: release }));
    assert.equal(f.drawer.getSnapshot().state.open, remainsOpen, `move ${lastMove}, release ${release}`);
    f.drawer.destroy(); f.window.close();
  }
});
