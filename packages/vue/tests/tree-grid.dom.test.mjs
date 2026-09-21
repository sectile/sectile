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

const { createApp, h, nextTick, ref } = await import('vue');
const {
  TreeGridCell,
  TreeGridEditor,
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
