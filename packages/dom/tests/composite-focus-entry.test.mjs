import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createGridControl } from '../.verification-dist/grid.js';
import { createTreeView } from '../.verification-dist/tree-view.js';
import { createTreeGrid } from '../.verification-dist/tree-grid.js';
import { createTabs } from '../.verification-dist/tabs.js';
import { createRadioGroup } from '../.verification-dist/radio-group.js';
import { createRating } from '../.verification-dist/rating.js';
import { createToolbar } from '../.verification-dist/toolbar.js';
import { createMenu } from '../.verification-dist/menu.js';
import { createMenuButton } from '../.verification-dist/menu-button.js';
import { createMenubar } from '../.verification-dist/menubar.js';
import { createNavigationMenu } from '../.verification-dist/navigation-menu.js';
import { createListbox } from '../.verification-dist/listbox.js';
import { DOMCompositeFocusEntry } from '../.verification-dist/composite/focus-entry.js';

function installDOM() {
  const window = new Window({ url: 'https://sectile.dev/focus-entry' });
  const previous = {
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
  };
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  return {
    window,
    restore() {
      globalThis.HTMLElement = previous.HTMLElement;
      globalThis.Node = previous.Node;
      window.close();
    },
  };
}

function entryCount(...elements) {
  return elements.filter((element) => element.tabIndex === 0).length;
}

function buttons(document, count) {
  return Array.from({ length: count }, () => document.createElement('button'));
}

test('ISSUE-127: null-current composites expose exactly one pattern-appropriate page entry', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;

    const gridRoot = document.createElement('div');
    const [gridA, gridB] = buttons(document, 2);
    gridRoot.append(gridA, gridB);
    const grid = createGridControl({ root: gridRoot, rows: [['a', 'b']] });
    grid.setCellAttributes(gridA, 'a');
    grid.setCellAttributes(gridB, 'b');
    assert.equal(grid.getSnapshot().state.cursor.current, null);
    assert.deepEqual([gridRoot.tabIndex, gridA.tabIndex, gridB.tabIndex], [0, -1, -1]);

    const treeRoot = document.createElement('div');
    const [treeA, treeB] = buttons(document, 2);
    treeRoot.append(treeA, treeB);
    const tree = createTreeView({
      root: treeRoot,
      nodes: [{ id: 'root', parentID: null }, { id: 'child', parentID: 'root' }],
    });
    tree.setTreeAttributes('Tree');
    tree.setItemAttributes(treeA, { id: 'root' });
    tree.setItemAttributes(treeB, { id: 'child' });
    assert.equal(tree.getSnapshot().state.cursor.current, null);
    assert.deepEqual([treeRoot.tabIndex, treeA.tabIndex, treeB.tabIndex], [0, -1, -1]);

    const treeGridRoot = document.createElement('div');
    const treeGridCell = document.createElement('div');
    treeGridRoot.append(treeGridCell);
    const treeGrid = createTreeGrid({
      root: treeGridRoot,
      rows: [{ id: 'row', parentID: null, cells: ['row-name'] }],
      getCellValue: () => '',
      setCellValue: () => {},
    });
    treeGrid.setGridAttributes(1, 1);
    treeGrid.setCellAttributes(treeGridCell, { id: 'row-name', columnIndex: 1 });
    assert.equal(treeGrid.getSnapshot().state.cursor.current, null);
    assert.deepEqual([treeGridRoot.tabIndex, treeGridCell.tabIndex], [0, -1]);

    const itemCases = [
      ['tabs', (root) => createTabs({ root, items: ['a', 'b'] }), (connection, element, id) => connection.setItemAttributes(element, { id })],
      ['radio', (root) => createRadioGroup({ root, items: ['a', 'b'] }), (connection, element, id) => connection.setItemAttributes(element, id)],
      ['rating', (root) => createRating({ root, items: ['a', 'b'] }), (connection, element, id) => connection.setItemAttributes(element, id)],
      ['toolbar', (root) => createToolbar({ root, items: ['a', 'b'] }), (connection, element, id) => connection.setItemAttributes(element, id)],
      ['menu', (root) => createMenu({ root, items: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }], position: false }), (connection, element, id) => connection.setItemAttributes(element, id)],
      ['menubar', (root) => createMenubar({ root, items: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }], position: false }), (connection, element, id) => connection.setItemAttributes(element, id)],
      ['navigation-menu', (root) => createNavigationMenu({ root, items: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }], position: false }), (connection, element, id) => connection.setItemAttributes(element, id)],
    ];
    for (const [name, create, register] of itemCases) {
      const root = document.createElement('div');
      const [first, second] = buttons(document, 2);
      root.append(first, second);
      const connection = create(root);
      register(connection, first, 'a');
      register(connection, second, 'b');
      assert.equal(connection.getSnapshot().state.cursor.current, null, `${name} semantic current stays null`);
      assert.deepEqual([first.tabIndex, second.tabIndex], [0, -1], `${name} owns one fallback item`);
      assert.equal(entryCount(first, second), 1, `${name} has exactly one item entry`);
      connection.disconnect();
    }

    grid.disconnect();
    tree.disconnect();
    treeGrid.disconnect();
  } finally {
    dom.restore();
  }
});

test('ISSUE-127: nullable root-focus composites focus the ordinary root without changing semantic current', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const focused = [];
    const root = (name) => {
      const element = document.createElement('div');
      Object.defineProperty(element, 'focus', {
        configurable: true,
        value: () => { focused.push(name); },
      });
      return element;
    };

    const grid = createGridControl({ root: root('grid'), rows: [['cell']] });
    const tree = createTreeView({
      root: root('tree'),
      nodes: [{ id: 'root', parentID: null }],
    });
    const treeGrid = createTreeGrid({
      root: root('tree-grid'),
      rows: [{ id: 'row', parentID: null, cells: ['cell'] }],
      getCellValue: () => '',
      setCellValue: () => {},
    });

    grid.focusCurrent();
    tree.focusCurrent();
    treeGrid.focusCurrent();
    await Promise.resolve();

    assert.deepEqual(focused, ['grid', 'tree', 'tree-grid']);
    assert.equal(grid.getSnapshot().state.cursor.current, null);
    assert.equal(tree.getSnapshot().state.cursor.current, null);
    assert.equal(treeGrid.getSnapshot().state.cursor.current, null);

    grid.disconnect();
    tree.disconnect();
    treeGrid.disconnect();
  } finally {
    dom.restore();
  }
});

test('ISSUE-127: controlled null and unavailable fallback keep host entry separate from semantic current', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const root = document.createElement('div');
    const [first, second] = buttons(document, 2);
    root.append(first, second);
    const changes = [];
    const toolbar = createToolbar({
      root,
      items: ['first', 'second'],
      highlightedValue: null,
      onHighlightedValueChange: (value) => changes.push(value),
    });
    toolbar.setItemAttributes(first, 'first', true);
    toolbar.setItemAttributes(second, 'second');

    assert.equal(toolbar.getSnapshot().state.cursor.current, null);
    assert.deepEqual([first.tabIndex, second.tabIndex], [-1, 0]);
    assert.deepEqual(changes, []);

    assert.equal(toolbar.syncControlledValue('second').ok, true);
    assert.deepEqual([first.tabIndex, second.tabIndex], [-1, 0]);
    assert.equal(toolbar.syncControlledValue(null).ok, true);
    assert.deepEqual([first.tabIndex, second.tabIndex], [-1, 0]);
    assert.equal(toolbar.getSnapshot().state.cursor.current, null);
    assert.deepEqual(changes, []);
    toolbar.disconnect();
  } finally {
    dom.restore();
  }
});

test('ISSUE-127: current transitions stay O(1) while fallback invalidation owns repair scanning', () => {
  const root = { tabIndex: -1 };
  let writes = 0;
  let rankCalls = 0;
  const elements = Array.from({ length: 4096 }, () => {
    let tabIndex = -1;
    return Object.defineProperty({}, 'tabIndex', {
      configurable: true,
      get: () => tabIndex,
      set: (value) => { tabIndex = value; writes += 1; },
    });
  });
  const entry = new DOMCompositeFocusEntry({
    mode: 'item',
    root,
    current: null,
    rank: (id) => { rankCalls += 1; return Number(id); },
  });
  for (let index = 0; index < elements.length; index += 1) {
    entry.bind(elements[index], String(index));
  }
  assert.equal(rankCalls, 4096);
  writes = 0;
  rankCalls = 0;

  const originalIterator = Map.prototype[Symbol.iterator];
  let registryIterations = 0;
  Map.prototype[Symbol.iterator] = function iterator(...args) {
    registryIterations += 1;
    return originalIterator.apply(this, args);
  };
  try {
    entry.setCurrent('4095');
    entry.setCurrent(null);
    assert.equal(rankCalls, 0);
    assert.equal(registryIterations, 0);
    assert.equal(writes, 4);

    entry.release('0', elements[0]);
    assert.equal(registryIterations, 1);
    assert.equal(elements[1].tabIndex, 0);
  } finally {
    Map.prototype[Symbol.iterator] = originalIterator;
    entry.disconnect();
  }
});

test('ISSUE-127: Listbox root entry and MenuButton trigger entry remain unchanged', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const listboxRoot = document.createElement('div');
    const listboxItem = document.createElement('div');
    listboxRoot.append(listboxItem);
    const listbox = createListbox({ root: listboxRoot, items: ['a'] });
    listbox.setItemAttributes(listboxItem, { id: 'a' });
    assert.equal(listbox.getSnapshot().state.cursor.current, null);
    assert.deepEqual([listboxRoot.tabIndex, listboxItem.tabIndex], [0, -1]);

    const menuRoot = document.createElement('div');
    const trigger = document.createElement('button');
    const item = document.createElement('div');
    menuRoot.append(item);
    const menuButton = createMenuButton({
      root: menuRoot,
      trigger,
      items: [{ id: 'a', parentID: null }],
      position: false,
    });
    menuButton.setItemAttributes(item, 'a');
    assert.equal(trigger.tabIndex, 0);
    assert.equal(item.tabIndex, -1);
    menuButton.disconnect();
    listbox.disconnect();
  } finally {
    dom.restore();
  }
});
