import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createCascadeSelect } from '../.verification-dist/cascade-select.js';
import { createCombobox } from '../.verification-dist/combobox.js';
import { createMenuButton } from '../.verification-dist/menu-button.js';
import { createPopover } from '../.verification-dist/popover.js';
import { createTooltip } from '../.verification-dist/tooltip.js';
import { createSelect } from '../.verification-dist/select.js';
import { createDatePicker } from '../.verification-dist/temporal/date-picker.js';
import { createMonthPicker } from '../.verification-dist/temporal/month-picker.js';
import { createYearPicker } from '../.verification-dist/temporal/year-picker.js';
import { createDateRangePicker } from '../.verification-dist/temporal/date-range-picker.js';
import { createMonthRangePicker } from '../.verification-dist/temporal/month-range-picker.js';
import { createYearRangePicker } from '../.verification-dist/temporal/year-range-picker.js';
import { createDateTimePicker } from '../.verification-dist/temporal/date-time-picker.js';
import { createDateTimeRangePicker } from '../.verification-dist/temporal/date-time-range-picker.js';
import { readPositionSourceRegistryDiagnostics } from '../.verification-dist/overlay/position/engine.js';

const cascadeNodes = [
  { id: 'asia', parentID: null },
  { id: 'seoul', parentID: 'asia' },
];

test('inline Combobox owns neither popup layer nor floating resources and preserves popup position opt-out', () => {
  const fixture = createPopupFixture('input'), before = readPositionSourceRegistryDiagnostics();
  try {
    const inline = createCombobox({ input: fixture.target, popup: fixture.popup, items: [{ id: 'a', label: 'Alpha' }], presentation: 'inline', defaultOpen: true });
    try {
      assert.equal(inline.getLayerOrder(), null); assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
      assert.equal(fixture.popup.style.position, ''); inline.render(); assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
    } finally { inline.disconnect(); }
    const popup = createCombobox({ input: fixture.target, popup: fixture.popup, items: [{ id: 'a', label: 'Alpha' }], position: false, defaultOpen: true });
    try { assert.notEqual(popup.getLayerOrder(), null); assert.deepEqual(readPositionSourceRegistryDiagnostics(), before); }
    finally { popup.disconnect(); }
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
  } finally { fixture.close(); }
});

test('native choice popups release actual position sources when their popup ancestor suspends', async () => {
  for (const create of [createSelect, createCascadeSelect, createCombobox, createMenuButton, createDatePicker, createMonthPicker, createYearPicker, createDateRangePicker, createMonthRangePicker, createYearRangePicker, createDateTimePicker, createDateTimeRangePicker]) {
    const temporal = create !== createSelect && create !== createCascadeSelect && create !== createCombobox && create !== createMenuButton;
    const before = readPositionSourceRegistryDiagnostics(), fixture = createPopupFixture(create === createCombobox ? 'input' : 'button');
    const parentSurface = document.createElement('section'); parentSurface.append(fixture.root); document.body.append(parentSurface);
    fixture.popup.style.left = '3px';
    const parent = createPopover({ root: parentSurface, defaultOpen: true, position: false, autoFocus: false });
    const requests = [];
    let refreshOnDispose = false;
    const select = create({ root: create === createMenuButton || temporal ? fixture.popup : fixture.root, trigger: fixture.target, popup: fixture.popup,
      ...(create === createSelect ? { items: ['seoul'] } : create === createCombobox ? { input: fixture.target, items: [{ id: 'seoul', label: 'Seoul' }] } : create === createMenuButton ? { items: [{ id: 'seoul', parentID: null }] } : temporal ? { grid: fixture.popup, referenceDate: { year: 2026, month: 1, day: 1 } } : { nodes: cascadeNodes }),
      open: true, ...(temporal ? {} : { defaultValue: 'seoul' }), align: 'start', sideOffset: 8,
      onOpenChange: change => requests.push(typeof change === 'boolean' ? change : change.value),
      onUpdate: () => { if (refreshOnDispose) { if (create === createCombobox) select.render(); else select.refresh(); } } });
    try {
      await settlePosition(); const snapshot = select.getSnapshot(); assert.notDeepEqual(readPositionSourceRegistryDiagnostics(), before);
      for (let turn = 0; turn < 3; turn++) {
        parent.suspend(); assert.equal(select.getSnapshot(), snapshot); assert.equal(select.getActive(), false);
        assert.deepEqual(readPositionSourceRegistryDiagnostics(), before); assert.equal(fixture.popup.style.left, '3px');
        if (create === createCombobox) select.render(); else select.refresh();
        await settlePosition(); assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
        parent.resume(); select.resume(); await settlePosition(); assert.equal(fixture.popup.style.top, '108px');
        assert.equal(select.getLayerOrder(), 1); assert.notDeepEqual(readPositionSourceRegistryDiagnostics(), before);
      }
      assert.deepEqual(requests, []);
      document.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'Escape' }));
      assert.deepEqual(requests, [false]); assert.equal(select.getLayerOrder(), 1);
      parent.handleEvent('close'); assert.deepEqual(requests, [false, false]);
      assert.equal(select.getActive(), false); assert.equal(fixture.popup.hidden, true);
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
      parent.handleEvent('open'); select.resume(); await settlePosition(); assert.equal(select.getLayerOrder(), 1);
      fixture.popup.setAttribute('hidden', 'until-found');
      refreshOnDispose = true;
      select.disconnect(); select.resume();
      if (create === createCombobox) select.render(); else select.refresh();
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
      assert.equal(fixture.popup.getAttribute('hidden'), 'until-found', 'terminal cleanup preserves later consumer visibility');
    } finally { select.destroy(); parent.destroy(); fixture.close(); }
  }
});

test('suspended positioned popups release source observers and resume from current configuration', async () => {
  for (const create of [createPopover, createTooltip]) {
    const before = readPositionSourceRegistryDiagnostics(), fixture = createPopupFixture('button');
    fixture.popup.style.left = '3px';
    const popup = create({ root: fixture.popup, trigger: fixture.target, defaultOpen: true, autoFocus: false, sideOffset: 8 });
    try {
      await settlePosition(); assert.notDeepEqual(readPositionSourceRegistryDiagnostics(), before);
      for (let turn = 0; turn < 3; turn++) {
        popup.suspend(); assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
        assert.equal(fixture.popup.style.left, '3px'); assert.equal(popup.getSnapshot().state.open, true);
        popup.syncPosition({ side: 'bottom', align: 'start', sideOffset: 12 }); popup.refresh();
        await settlePosition(); assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
        popup.resume(); await settlePosition(); assert.equal(fixture.popup.style.top, '112px');
        assert.notDeepEqual(readPositionSourceRegistryDiagnostics(), before);
      }
      popup.suspend(); popup.disconnect(); popup.resume();
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
    } finally { popup.destroy(); fixture.close(); }
  }
});

test('DOM choice popups position from their interactive target and release resources when closed', async () => {
  for (const kind of ['combobox', 'cascade-select', 'menu-button']) {
    const before = readPositionSourceRegistryDiagnostics();
    const fixture = createPopupFixture(kind === 'combobox' ? 'input' : 'button');
    fixture.popup.style.left = '3px';
    fixture.popup.dataset.side = 'before';
    const connection = kind === 'combobox'
      ? createCombobox({
          input: fixture.target,
          popup: fixture.popup,
          items: [{ id: 'seoul', label: 'Seoul' }],
          defaultOpen: true,
          align: 'start',
          sideOffset: 8,
        })
      : kind === 'cascade-select' ? createCascadeSelect({
          root: fixture.root,
          trigger: fixture.target,
          popup: fixture.popup,
          nodes: cascadeNodes,
          defaultOpen: true,
          align: 'start',
          sideOffset: 8,
        })
        : createMenuButton({
          root: fixture.popup,
          trigger: fixture.target,
          items: [{ id: 'seoul', parentID: null }],
          defaultOpen: true,
          align: 'start',
          sideOffset: 8,
        });

    await settlePosition();
    assert.equal(fixture.popup.style.position, 'absolute', kind);
    assert.equal(fixture.popup.style.left, '100px', kind);
    assert.equal(fixture.popup.style.top, '108px', kind);
    assert.equal(fixture.popup.dataset.side, 'bottom', kind);
    assert.notDeepEqual(readPositionSourceRegistryDiagnostics(), before, kind);

    connection.handleEvent(kind === 'menu-button' ? 'close-popup' : 'close');
    assert.equal(fixture.popup.hidden, true, kind);
    assert.equal(fixture.popup.style.left, '3px', kind);
    assert.equal(fixture.popup.dataset.side, 'before', kind);
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before, kind);

    connection.handleEvent(kind === 'menu-button' ? 'open-popup' : 'open');
    await settlePosition();
    connection.disconnect();
    assert.equal(fixture.popup.style.left, '3px', kind);
    assert.equal(fixture.popup.dataset.side, 'before', kind);
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before, kind);
    fixture.close();
  }
});

test('DOM choice popup manual positioning stays resource-free through connection churn', () => {
  for (const kind of ['combobox', 'cascade-select', 'menu-button']) {
    const before = readPositionSourceRegistryDiagnostics();
    const fixture = createPopupFixture(kind === 'combobox' ? 'input' : 'button');
    for (let index = 0; index < 5; index += 1) {
      const connection = kind === 'combobox'
        ? createCombobox({
            input: fixture.target,
            popup: fixture.popup,
            items: [{ id: 'seoul', label: 'Seoul' }],
            defaultOpen: true,
            position: false,
          })
        : kind === 'cascade-select' ? createCascadeSelect({
            root: fixture.root,
            trigger: fixture.target,
            popup: fixture.popup,
            nodes: cascadeNodes,
            defaultOpen: true,
            position: false,
          })
          : createMenuButton({
            root: fixture.popup,
            trigger: fixture.target,
            items: [{ id: 'seoul', parentID: null }],
            defaultOpen: true,
            position: false,
          });
      assert.equal(fixture.popup.style.position, '', kind);
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), before, kind);
      connection.disconnect();
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), before, kind);
    }
    fixture.close();
  }
});

function createPopupFixture(targetName) {
  const window = new Window({ url: 'https://sectile.dev/' });
  window.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  window.cancelAnimationFrame = (handle) => clearTimeout(handle);
  window.innerWidth = 500;
  window.innerHeight = 300;
  Object.defineProperties(window.document.documentElement, {
    clientWidth: { configurable: true, get: () => window.innerWidth },
    clientHeight: { configurable: true, get: () => window.innerHeight },
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    ResizeObserver: window.ResizeObserver,
    IntersectionObserver: window.IntersectionObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
  });
  const root = window.document.createElement('div');
  const target = window.document.createElement(targetName);
  const popup = window.document.createElement('div');
  setRect(target, { x: 100, y: 60, width: 80, height: 40 });
  setRect(popup, { x: 0, y: 0, width: 180, height: 120 });
  root.append(target, popup);
  window.document.body.append(root);
  return { root, target, popup, close: () => window.close() };
}

function setRect(element, rect) {
  const value = {
    left: rect.x,
    right: rect.x + rect.width,
    top: rect.y,
    bottom: rect.y + rect.height,
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y,
    toJSON() {},
  };
  element.getBoundingClientRect = () => value;
  Object.defineProperties(element, {
    offsetWidth: { configurable: true, value: rect.width },
    offsetHeight: { configurable: true, value: rect.height },
  });
}

async function settlePosition() {
  await new Promise((resolve) => setTimeout(resolve, 10));
}
