import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createCascadeSelect } from '../.verification-dist/cascade-select.js';
import { createCombobox } from '../.verification-dist/combobox.js';
import { createMenuButton } from '../.verification-dist/menu-button.js';
import { readPositionSourceRegistryDiagnostics } from '../.verification-dist/internal/positioning/engine.js';

const cascadeNodes = [
  { id: 'asia', parentID: null },
  { id: 'seoul', parentID: 'asia' },
];

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
