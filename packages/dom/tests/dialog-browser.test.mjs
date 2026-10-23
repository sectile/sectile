import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createDialog } from '../.verification-dist/dialog.js';
import { createAlertDialog } from '../.verification-dist/alert-dialog.js';
import { createDrawer } from '../.verification-dist/drawer.js';
import { createPopover } from '../.verification-dist/popover.js';
import { acquireModalEffects } from '../.verification-dist/overlay/modal/effects.js';

test('retained popup moves preserve only existing focus and retire cancelled or stale captures', () => {
  for (const create of [createDialog, createDrawer, createPopover]) {
    const window = new Window(), document = window.document;
    const first = document.createElement('section'), second = document.createElement('section'), outside = document.createElement('button');
    const root = document.createElement('section'), input = document.createElement('input');
    root.append(input); first.append(root); document.body.append(first, second, outside);
    const popup = create({ root, defaultOpen: true, modal: false, autoFocus: false, trapFocus: false });
    const move = () => { const destination = root.parentNode === first ? second : first; root.remove(); destination.append(root); input.blur(); };
    try {
      input.value = 'Retained draft'; input.focus(); input.setSelectionRange(2, 6);
      const state = popup.getSnapshot(); popup.prepareMove(); move(); popup.completeMove();
      assert.ok(document.activeElement === input); assert.ok(popup.getSnapshot() === state);
      assert.equal(input.value, 'Retained draft'); assert.equal(input.selectionStart, 2); assert.equal(input.selectionEnd, 6);
      popup.prepareMove(); move(); outside.focus(); popup.completeMove();
      assert.ok(document.activeElement === outside, 'an intentional external focus change wins');
      const foreign = new Window();
      try {
        input.focus(); popup.prepareMove(); foreign.document.body.append(root);
        foreign.document.body.tabIndex = -1; foreign.document.body.focus(); popup.completeMove();
        assert.ok(foreign.document.activeElement !== input, 'adoption into another native root does not consume the capture');
      } finally { first.append(root); foreign.close(); }
      input.focus(); popup.prepareMove(); move(); popup.completeMove(false); popup.completeMove();
      assert.ok(document.activeElement !== input, 'cancellation clears the capture and does not replay initial focus');
      for (const attribute of ['disabled', 'hidden', 'inert', 'aria-hidden']) {
        input.focus(); popup.prepareMove(); move(); input.setAttribute(attribute, attribute === 'aria-hidden' ? 'true' : '');
        popup.completeMove(); assert.ok(document.activeElement !== input); input.removeAttribute(attribute);
      }
      input.focus(); popup.prepareMove(); move(); popup.handleEvent('close'); popup.handleEvent('open'); popup.completeMove();
      assert.ok(document.activeElement !== input, 'a new opening does not consume an older move capture');
      input.focus(); popup.prepareMove(); move(); popup.suspend(); popup.completeMove();
      assert.ok(document.activeElement !== input); popup.resume();
      input.focus(); popup.prepareMove(); move(); popup.disconnect(); popup.completeMove();
      assert.ok(document.activeElement !== input); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
    } finally { popup.destroy(); window.close(); }
  }
});

test('a retained move never retries previously unavailable initial focus over an external owner', () => {
  const window = new Window(), document = window.document;
  const root = document.createElement('section'), destination = document.createElement('div'), outside = document.createElement('button');
  document.body.append(root, destination, outside);
  const popup = createDialog({ root, defaultOpen: true, modal: false, autoFocus: true, trapFocus: false });
  try {
    const input = document.createElement('input'); root.append(input); outside.focus();
    popup.prepareMove(); root.remove(); destination.append(root); popup.completeMove();
    assert.ok(document.activeElement === outside, 'moving the same open surface is not a new initial-focus attempt');
  } finally { popup.destroy(); window.close(); }
});

test('accepted ancestor closure quarantines a controlled child that refuses model closure', () => {
  const window = new Window(), document = window.document;
  const background = document.createElement('main'), parentRoot = document.createElement('section'), trigger = document.createElement('button'), root = document.createElement('section');
  parentRoot.append(trigger); document.body.append(background, parentRoot, root); document.body.style.overflow = 'auto';
  const reasons = [], parent = createDialog({ root: parentRoot, defaultOpen: true, autoFocus: false });
  const child = createDialog({ root, trigger, open: true, retainExit: true, autoFocus: false,
    onOpenChange: (open, method, reason) => reasons.push([open, reason]) });
  try {
    parent.handleEvent('close');
    assert.equal(child.getSnapshot().state.open, true, 'controlled refusal preserves accepted model');
    assert.deepEqual(reasons, [[false, 'ancestor-closed']]); assert.equal(child.getLayerOrder(), null);
    assert.equal(child.getActive(), false); assert.equal(root.hidden, true);
    assert.equal(background.inert, false); assert.equal(document.body.style.overflow, 'auto');
    assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
    child.refresh(); assert.equal(child.getLayerOrder(), null); assert.equal(root.hidden, true);
  } finally { child.destroy(); parent.destroy(); window.close(); }
});

test('native modal suspension releases isolation and guards without a close or focus-return effect', () => {
  const window = new Window(), document = window.document;
  const background = document.createElement('main'), trigger = document.createElement('button'), root = document.createElement('section');
  root.tabIndex = -1; document.body.append(background, trigger, root); document.body.style.overflow = 'auto';
  let restores = 0, requests = 0;
  const popup = createDialog({ root, trigger, open: true, onFocusRestore: () => { restores++; }, onOpenChange: () => { requests++; } });
  try {
    assert.equal(background.inert, true); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 2);
    for (let turn = 0; turn < 3; turn++) {
      popup.suspend(); assert.equal(background.inert, false); assert.equal(document.body.style.overflow, 'auto');
      assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0); assert.equal(root.hidden, true);
      assert.equal(restores, 0); assert.equal(requests, 0); assert.equal(popup.getSnapshot().state.open, true);
      trigger.focus(); popup.resume(); assert.ok(document.activeElement === trigger, 'reactivation does not replay initial focus');
      assert.equal(document.body.style.overflow, 'hidden'); assert.equal(background.inert, true);
    }
    popup.suspend(); popup.disconnect(); popup.resume(); assert.equal(document.body.style.overflow, 'auto');
    assert.equal(background.inert, false); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
  } finally { popup.destroy(); window.close(); }
});

test('invocation focus targets restore only on accepted close while still usable', () => {
  for (const create of [createDialog, createDrawer, createPopover]) {
    const window = new Window(), document = window.document;
    const target = document.createElement('button'), trigger = document.createElement('button'), root = document.createElement('section');
    root.tabIndex = -1; document.body.append(target, trigger, root);
    const calls = [], focus = target.focus.bind(target);
    target.focus = options => { calls.push(options); focus(options); };
    const popup = create({ root, trigger, open: true, modal: false, autoFocus: true, restoreFocusTarget: target });
    try {
      assert.ok(document.activeElement === root);
      popup.handleEvent('close'); assert.equal(calls.length, 0, 'a refused controlled request does not restore focus');
      assert.ok(popup.syncBehavior({ modal: false, autoFocus: true, restoreFocus: true, trapFocus: false }).ok);
      popup.syncControlledValue(false); assert.ok(document.activeElement === target); assert.deepEqual(calls, [{ preventScroll: true }]);
      for (const unavailable of ['disabled', 'hidden', 'inert', 'detached']) {
        popup.syncControlledValue(true); const count = calls.length;
        if (unavailable === 'detached') target.remove(); else target.setAttribute(unavailable, '');
        popup.syncControlledValue(false); assert.equal(calls.length, count, 'an unavailable initiating target is not focused');
        target.removeAttribute(unavailable); document.body.append(target);
      }
      popup.syncControlledValue(true); const count = calls.length; popup.disconnect();
      assert.equal(calls.length, count, 'disposal does not synthesize accepted closure');
    } finally { popup.destroy(); window.close(); }
  }
});

test('live focus-return targets replace only future close effects and reject invalid references atomically', () => {
  for (const create of [createDialog, createDrawer, createPopover]) {
    const window = new Window(), document = window.document;
    const first = document.createElement('button'), replacement = document.createElement('button'), trigger = document.createElement('button');
    const root = document.createElement('section'), input = document.createElement('input'); root.append(input);
    document.body.append(first, replacement, trigger, root);
    const behavior = { modal: false, autoFocus: true, restoreFocus: true, trapFocus: false };
    assert.throws(() => create({ root, trigger, defaultOpen: true, restoreFocusTarget: '#not-an-element', ...behavior }), /focus return.*element/i);
    const popup = create({ root, trigger, defaultOpen: true, restoreFocusTarget: first, ...behavior });
    try {
      const snapshot = popup.getSnapshot();
      assert.ok(document.activeElement === input);
      assert.ok(popup.syncBehavior({ ...behavior, restoreFocusTarget: replacement }).ok);
      assert.ok(document.activeElement === input, 'target configuration does not replay opening focus');
      assert.ok(popup.getSnapshot() === snapshot, 'configuration is not a state transition');
      const rejected = popup.syncBehavior({ ...behavior, modal: true, restoreFocusTarget: '#not-an-element' });
      assert.equal(rejected.ok, false); assert.equal(root.getAttribute('aria-modal'), 'false');
      popup.handleEvent('close'); assert.ok(document.activeElement === replacement, 'rejection preserves the admitted target');
      popup.handleEvent('open'); assert.ok(popup.syncBehavior({ ...behavior, restoreFocusTarget: null }).ok);
      assert.ok(document.activeElement === input);
      popup.handleEvent('close'); assert.ok(document.activeElement === trigger, 'explicit clear restores Trigger fallback');
    } finally { popup.destroy(); window.close(); }
  }
});

test('dialog-family behavior updates preserve focus and paint while reconciling native effects and future openings', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover]) {
    const window = new Window(), document = window.document;
    const background = document.createElement('main'), trigger = document.createElement('button');
    const root = document.createElement('section'), first = document.createElement('input'), second = document.createElement('input');
    root.append(first, second); document.body.append(background, trigger, root); document.body.style.overflow = 'auto';
    let observers = 0, released = 0;
    const Observer = window.MutationObserver;
    window.MutationObserver = class extends Observer {
      constructor(callback) { super(callback); observers++; }
      disconnect() { super.disconnect(); released++; }
    };
    const popup = create({ root, trigger, modal: false, autoFocus: false, trapFocus: false,
      defaultOpen: true, retainExit: true, manageVisibility: false, position: false, closeOnInteractOutside: true });
    let paint; popup.subscribeLayerPresentation(value => { paint = value; });
    const active = paint, state = popup.getSnapshot(); second.focus();
    const behavior = { modal: true, autoFocus: true, restoreFocus: false, trapFocus: true,
      label: 'Updated', initialFocus: first, interactOutsideExclusions: [background] };
    if (create !== createAlertDialog) {
      const nativeFailure = new Error('native projection failure'), setAttribute = trigger.setAttribute.bind(trigger);
      let rejectProjection = true;
      trigger.setAttribute = (name, value) => {
        if (name === 'aria-hidden' && value === 'true' && rejectProjection) { rejectProjection = false; throw nativeFailure; }
        setAttribute(name, value);
      };
      assert.throws(() => popup.syncBehavior(behavior), error => error === nativeFailure);
      assert.equal(document.body.style.overflow, 'auto'); assert.equal(released, observers);
      popup.refresh();
    } else assert.equal(popup.syncBehavior(behavior).ok, true);
    assert.equal(paint, active); assert.equal(popup.getSnapshot(), state); assert.equal(document.activeElement, second);
    assert.equal(root.getAttribute('aria-label'), 'Updated'); assert.equal(root.getAttribute('aria-modal'), 'true');
    assert.equal(background.inert, false); assert.equal(trigger.inert, true);
    assert.equal(document.body.style.overflow, 'hidden'); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 2);
    assert.equal(popup.syncBehavior({ ...behavior, trapFocus: 'invalid' }).error.code, 'dom.popup-options-invalid');
    if (create === createAlertDialog) assert.equal(popup.syncBehavior({ ...behavior, modal: false }).error.code, 'dom.popup-options-invalid');
    assert.equal(paint, active); assert.equal(root.getAttribute('aria-label'), 'Updated');
    for (let index = 0; index < 32; index++) {
      const guard = document.querySelector('[data-sectile-focus-guard]');
      popup.syncBehavior({ ...behavior, trapFocus: false, interactOutsideExclusions: [] });
      assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
      guard?.dispatchEvent(new window.Event('focus')); assert.equal(document.activeElement, second);
      assert.equal(background.inert, true);
      popup.syncBehavior(behavior); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 2);
    }
    assert.equal(observers, create === createAlertDialog ? 1 : 2);
    assert.equal(released, create === createAlertDialog ? 0 : 1);
    document.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, composed: true }));
    const exiting = paint; assert.equal(exiting.phase, 'exiting'); assert.equal(exiting.generation, active.generation);
    assert.equal(document.activeElement, second); assert.equal(document.body.style.overflow, 'auto');
    popup.syncBehavior({ ...behavior, modal: create === createAlertDialog, restoreFocus: true, label: undefined });
    assert.equal(paint, exiting); assert.equal(root.hasAttribute('aria-label'), false);
    assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
    popup.handleEvent('open'); assert.equal(document.activeElement, first);
    popup.handleEvent('close'); assert.equal(document.activeElement, trigger);
    popup.destroy(); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
    assert.equal(released, observers); assert.equal(document.body.style.overflow, 'auto');
    window.close();
  }
});

test('enabling or updating a lower modal respects the higher canonical modal owner', () => {
  const window = new Window(), document = window.document;
  const lower = document.createElement('section'), upper = document.createElement('section'), background = document.createElement('main');
  document.body.append(background, lower, upper);
  const first = createDialog({ root: lower, modal: false, trapFocus: false, autoFocus: false, defaultOpen: true });
  const second = createDialog({ root: upper, trapFocus: false, autoFocus: false, defaultOpen: true });
  const behavior = { modal: true, trapFocus: false, autoFocus: false, restoreFocus: false };
  first.syncBehavior(behavior); assert.equal(lower.inert, true); assert.equal(upper.inert, false);
  first.syncBehavior({ ...behavior, trapFocus: true }); assert.equal(lower.inert, true); assert.equal(upper.inert, false);
  second.syncBehavior({ ...behavior, modal: false }); assert.equal(lower.inert, false); assert.equal(upper.inert, true);
  first.destroy(); second.destroy(); assert.equal(background.inert, false); assert.equal(upper.inert, false); window.close();
});

test('dom:modal-isolation:canonical-order-work reads each owned canonical rank once per refresh', () => {
  for (const size of [32, 256]) {
    const window = new Window(), document = window.document, effects = [], surfaces = [];
    let reads = 0;
    for (let index = 0; index < size; index++) {
      const surface = document.createElement('section'); surfaces.push(surface); document.body.append(surface);
      effects.push(acquireModalEffects(surface, [], () => { reads++; return size - index; }));
    }
    let branchReads = 0;
    const branches = Array.from({ length: size * 2 }, () => {
      const branch = document.createElement('div');
      Object.defineProperty(branch, 'isConnected', { get() { branchReads++; return false; } });
      return branch;
    });
    reads = 0; effects[0].update(branches); assert.equal(reads, size); assert.equal(branchReads, branches.length);
    assert.equal(surfaces[0].inert, false); assert.equal(surfaces.at(-1).inert, true);
    for (const effect of effects) effect.release();
    assert.ok(surfaces.every(surface => !surface.inert)); assert.equal(document.body.style.overflow, ''); window.close();
  }
});

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

test('modal isolation releases detached background history after one observer refresh', async () => {
  for (const size of [16, 256, 2_048]) {
    const window = new Window();
    const document = window.document;
    const surface = document.createElement('section');
    document.body.append(surface);
    const dialog = createDialog({ root: surface });
    dialog.handleEvent('open');
    const backgrounds = Array.from({ length: size }, () => document.createElement('aside'));
    document.body.append(...backgrounds);
    await window.happyDOM.waitUntilComplete();
    assert.equal(backgrounds.every((element) => element.inert && element.getAttribute('aria-hidden') === 'true'), true);

    let detachedRestores = 0;
    for (const element of backgrounds) {
      const removeAttribute = element.removeAttribute.bind(element);
      element.removeAttribute = (name) => {
        if (name === 'aria-hidden' && !element.isConnected) detachedRestores += 1;
        removeAttribute(name);
      };
      element.remove();
    }
    await window.happyDOM.waitUntilComplete();
    assert.equal(detachedRestores, size, `${size} removed backgrounds restore exactly once`);

    detachedRestores = 0;
    const marker = document.createElement('aside');
    document.body.append(marker);
    await window.happyDOM.waitUntilComplete();
    assert.equal(detachedRestores, 0, `${size} removed backgrounds are absent from later isolation work`);
    assert.equal(marker.inert, true);

    dialog.handleEvent('close');
    assert.equal(detachedRestores, 0, `${size} removed backgrounds are absent from final cleanup`);
    assert.equal(marker.inert, false);
    assert.equal(marker.hasAttribute('aria-hidden'), false);

    const afterRelease = document.createElement('aside');
    document.body.append(afterRelease);
    await window.happyDOM.waitUntilComplete();
    assert.equal(afterRelease.inert, false);
    assert.equal(afterRelease.hasAttribute('aria-hidden'), false);
    dialog.disconnect();
  }
});

test('modal isolation keeps the original live baseline across repeated refreshes', async () => {
  const window = new Window();
  const document = window.document;
  const background = document.createElement('main');
  background.inert = true;
  background.setAttribute('aria-hidden', 'false');
  const surface = document.createElement('section');
  document.body.append(background, surface);
  const dialog = createDialog({ root: surface });
  dialog.handleEvent('open');

  for (let cycle = 0; cycle < 3; cycle += 1) {
    const marker = document.createElement('aside');
    document.body.append(marker);
    await window.happyDOM.waitUntilComplete();
    assert.equal(background.inert, true);
    assert.equal(background.getAttribute('aria-hidden'), 'true');
    marker.remove();
    await window.happyDOM.waitUntilComplete();
  }

  dialog.handleEvent('close');
  assert.equal(background.inert, true);
  assert.equal(background.getAttribute('aria-hidden'), 'false');
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
  assert.equal(dialog.syncBehavior({
    modal: true, autoFocus: true, restoreFocus: true, trapFocus: true, label: 'Updated while hidden',
  }).ok, true);
  surface.hidden = false;
  dialog.refresh();
  assert.equal(document.activeElement === close, true);
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
  const pointer = () => new window.PointerEvent('pointerdown', { button: 0, bubbles: true, composed: true, cancelable: true });
  const excluded = pointer(); ignoredChild.dispatchEvent(excluded);
  assert.equal(excluded.defaultPrevented, false, 'author-owned input exclusions preserve native focus');
  assert.equal(outsideCalls, 0);
  assert.equal(dialog.getSnapshot().state.open, true);

  const outside = pointer(); overlay.dispatchEvent(outside);
  assert.equal(outside.defaultPrevented, true, 'modal focus protection cancels the original pointer default');
  assert.equal(outsideCalls, 1);
  assert.equal(dialog.getSnapshot().state.open, true);
  dialog.disconnect();
});

test('modal pointer focus respects admitted portalled surfaces and the highest modal boundary', () => {
  const window = new Window(), document = window.document;
  const parentRoot = document.createElement('section'), childRoot = document.createElement('section'), nestedRoot = document.createElement('section');
  const trigger = document.createElement('button'), childButton = document.createElement('button'), outside = document.createElement('div');
  parentRoot.append(trigger); childRoot.append(childButton); document.body.append(parentRoot, childRoot, nestedRoot, outside);
  const parent = createDialog({ root: parentRoot, defaultOpen: true, autoFocus: false, closeOnInteractOutside: false });
  const child = createPopover({ root: childRoot, trigger, defaultOpen: true, autoFocus: false, closeOnInteractOutside: false, position: false });
  let nested;
  const down = (target, button = 0) => {
    const event = new window.PointerEvent('pointerdown', { button, bubbles: true, composed: true, cancelable: true });
    target.dispatchEvent(event); return event.defaultPrevented;
  };
  try {
    assert.equal(down(childButton), false, 'a higher portalled child retains normal input focus');
    assert.equal(down(parentRoot), false); assert.equal(down(outside), true);
    assert.equal(down(outside, 2), false, 'secondary pointer behavior is unchanged');
    nested = createDialog({ root: nestedRoot, defaultOpen: true, autoFocus: false, closeOnInteractOutside: false });
    assert.equal(down(childButton), true, 'a higher modal excludes lower input surfaces');
    assert.equal(down(nestedRoot), false);
    nested.destroy(); nested = undefined;
    assert.equal(down(childButton), false, 'closing the higher modal restores its parent input branch');
    parent.syncBehavior({ modal: false, trapFocus: false, autoFocus: false, restoreFocus: true });
    assert.equal(down(outside), false, 'nonmodal outside input passes through');
  } finally { nested?.destroy(); child.destroy(); parent.destroy(); window.close(); }
});

test('modal outside guard precedes reentrant close or disposal in the outside callback', () => {
  for (const action of ['close', 'disconnect']) {
    const window = new Window(), document = window.document;
    const root = document.createElement('section'), outside = document.createElement('div'); document.body.append(root, outside);
    let observed = false, popup;
    popup = createDialog({ root, defaultOpen: true, autoFocus: false, onInteractOutside: event => {
      observed = event.originalEvent.defaultPrevented;
      if (action === 'close') popup.handleEvent('close'); else popup.disconnect();
    } });
    try {
      const event = new window.PointerEvent('pointerdown', { button: 0, bubbles: true, composed: true, cancelable: true });
      outside.dispatchEvent(event); assert.equal(observed, true); assert.equal(event.defaultPrevented, true);
      assert.equal(popup.getLayerOrder(), null);
    } finally { popup.destroy(); window.close(); }
  }
});
