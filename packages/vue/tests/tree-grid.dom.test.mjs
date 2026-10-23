import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref, shallowRef } = await import('vue');
const {
  TreeGridCell,
  TreeGridEditor,
  TreeGridGroup,
  TreeGridHeader,
  TreeGridDisclosure,
  TreeGridRoot,
  TreeGridRow,
} = await import('../.verification-dist/tree-grid.js');

test('Vue tree-grid preserves the active native editor across reactive reconfiguration', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const readonly = ref(false);
  let cellValue = 'Alpha';
  const rows = [{ id: 'root', parentID: null, cells: ['root-name'] }];
  const app = createApp({
    render: () => h(TreeGridRoot, {
      rows,
      getCellValue: () => cellValue,
      setCellValue: (_id, value) => { cellValue = value; },
      defaultHighlightedValue: 'root-name',
      defaultEditMode: 'editing',
      readonly: readonly.value,
    }, {
      default: () => h(TreeGridRow, {
        value: 'root',
        rowIndex: 1,
      }, {
        default: () => h(TreeGridCell, {
          value: 'root-name',
          columnIndex: 1,
        }, {
          default: () => h(TreeGridEditor, {
            for: 'root-name',
            forcePresent: true,
          }),
        }),
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('[data-part="editor"]');
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.value, 'Alpha');

  input.focus();
  input.dispatchEvent(new Event('compositionstart'));
  input.value = '한';
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertCompositionText',
    data: '한',
  }));

  readonly.value = true;
  await nextTick();
  assert.equal(input.value, '한');
  assert.equal(cellValue, '한');

  input.dispatchEvent(new Event('compositionend'));
  readonly.value = false;
  await nextTick();
  assert.equal(input.value, '한');

  input.blur();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();

  assert.equal(input.value, '한');
  assert.equal(cellValue, '한');

  app.unmount();
  host.remove();
});

test('Vue tree-grid lazy editors release removed inputs and pending reconfiguration', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const shown = shallowRef(true), readonly = shallowRef(false), errors = [];
  let value = 'Alpha';
  const rows = [{ id: 'root', parentID: null, cells: ['name'] }];
  const getCellValue = () => value, setCellValue = (_id, next) => { value = next; };
  const app = createApp({ render: () => h(TreeGridRoot, {
    rows, getCellValue, setCellValue, defaultHighlightedValue: 'name', readonly: readonly.value,
  }, { default: () => h(TreeGridRow, { value: 'root', rowIndex: 1 }, {
    default: () => h(TreeGridCell, { value: 'name', columnIndex: 1 }, {
      default: state => shown.value && state.editing ? h(TreeGridEditor, { for: 'name' }) : value,
    }),
  }) }) }); app.config.errorHandler = error => errors.push(error);
  app.mount(host); await nextTick();
  const cell = host.querySelector('[data-part=cell]');
  for (let cycle = 0; cycle < 8; cycle += 1) {
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
    const input = host.querySelector('input'); assert.ok(input instanceof HTMLInputElement);
    input.value = `Edit ${cycle}`; input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    assert.equal(value, `Edit ${cycle}`);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
    assert.equal(host.querySelector('input'), null);
    input.value = 'Detached'; input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    assert.equal(value, `Edit ${cycle}`, 'unmounted native editor cannot keep writing through DOM bindings');
  }
  cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
  const input = host.querySelector('input'); input.focus(); input.dispatchEvent(new Event('compositionstart'));
  readonly.value = true; await nextTick();
  shown.value = false; await nextTick();
  await new Promise(resolve => setTimeout(resolve, 5));
  shown.value = true; await nextTick();
  assert.equal(host.querySelector('input')?.readOnly, true, 'removing the active editor releases deferred reconfiguration');
  app.unmount(); input.value = 'After unmount'; input.dispatchEvent(new InputEvent('input'));
  assert.equal(value, 'Edit 7'); assert.deepEqual(errors, []); host.remove();
});

test('Vue tree-grid headers update counts without replacing an active editor', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const headers = shallowRef(['이름']), errors = [];
  let value = 'Alpha';
  const rows = [{ id: 'root', parentID: null, cells: ['name'] }];
  const app = createApp({ render: () => h(TreeGridRoot, {
    rows, headers: headers.value, getCellValue: () => value, setCellValue: (_id, next) => { value = next; },
    defaultHighlightedValue: 'name', defaultEditMode: 'editing',
  }, { default: () => [h(TreeGridHeader), h(TreeGridRow, { value: 'root', rowIndex: 1 }, {
    default: () => h(TreeGridCell, { value: 'name', columnIndex: 1 }, { default: () => h(TreeGridEditor, { for: 'name' }) }),
  })] }) }); app.config.errorHandler = error => errors.push(error);
  app.mount(host); await nextTick();
  const root = host.querySelector('[role=treegrid]'), row = host.querySelector('[data-part=row]'), input = host.querySelector('input');
  assert.equal(root.getAttribute('aria-rowcount'), '2'); assert.equal(row.getAttribute('aria-rowindex'), '2');
  input.focus(); input.dispatchEvent(new Event('compositionstart'));
  input.value = '한'; input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  headers.value = ['고객 이름', '상태']; await nextTick(); await nextTick();
  assert.equal(host.querySelector('input'), input); assert.equal(input.value, '한'); assert.equal(value, '한');
  assert.deepEqual([...host.querySelectorAll('[role=columnheader]')].map(node => node.textContent), ['고객 이름', '상태']);
  assert.equal(root.getAttribute('aria-colcount'), '2');
  headers.value = []; await nextTick(); await nextTick();
  assert.equal(root.getAttribute('aria-rowcount'), '1'); assert.equal(row.getAttribute('aria-rowindex'), '1');
  assert.equal(root.getAttribute('aria-colcount'), '1'); assert.equal(host.querySelector('[data-part=header]').hidden, true);
  input.dispatchEvent(new Event('compositionend')); app.unmount(); assert.deepEqual(errors, []); host.remove();
});

test('Vue tree-grid group borrows controlled expansion and updates native column metadata', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const rows = shallowRef([{ id: 'root', parentID: null, cells: ['r-name', 'r-state'] }, { id: 'child', parentID: 'root', cells: ['c-name'] }]);
  const expanded = shallowRef(['root']), proposals = [], errors = [];
  const getCellValue = () => '', setCellValue = () => {};
  const app = createApp({ render: () => h(TreeGridRoot, { rows: rows.value, expandedValue: expanded.value, getCellValue, setCellValue,
    'onUpdate:expandedValue': next => proposals.push(next),
  }, { default: () => [h(TreeGridRow, { value: 'root', rowIndex: 1, expandable: true }, {
    default: () => h(TreeGridCell, { value: 'r-name', columnIndex: 1 }, { default: () => h(TreeGridDisclosure, { for: 'root', as: 'button', 'aria-label': '배송 펼치기' }) }),
  }), h(TreeGridGroup, { for: 'root' }, { default: () => h(TreeGridRow, { value: 'child', rowIndex: 2, level: 2 }, {
    default: () => h(TreeGridCell, { value: 'c-name', columnIndex: 1 }),
  }) })] }) }); app.config.errorHandler = error => errors.push(error);
  app.mount(host); await nextTick(); await nextTick();
  const root = host.querySelector('[role=treegrid]'), group = host.querySelector('[role=rowgroup]'), button = host.querySelector('button');
  assert.equal(root.getAttribute('data-column-count'), '2'); assert.equal(group.hidden, false);
  assert.equal(button.getAttribute('aria-hidden'), null); assert.equal(button.getAttribute('aria-expanded'), 'true');
  button.click(); await nextTick(); await nextTick();
  assert.deepEqual(proposals.at(-1), []); assert.equal(group.hidden, false, 'refused controlled collapse preserves the group');
  expanded.value = []; await nextTick(); await nextTick();
  assert.equal(group.hidden, true); assert.equal(button.getAttribute('aria-expanded'), 'false');
  rows.value = [{ id: 'root', parentID: null, cells: ['r-name', 'r-state', 'r-date'] }, { id: 'child', parentID: 'root', cells: ['c-name'] }];
  await nextTick(); await nextTick(); assert.equal(root.getAttribute('data-column-count'), '3'); assert.equal(root.getAttribute('aria-colcount'), '3');
  expanded.value = ['root']; await nextTick(); await nextTick(); assert.equal(group.hidden, false);
  app.unmount(); const count = proposals.length; button.click(); await nextTick(); assert.equal(proposals.length, count);
  assert.deepEqual(errors, []); host.remove();
});
