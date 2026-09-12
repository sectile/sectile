import { createApp, h, nextTick, ref } from 'vue';
import { TreeGridCell, TreeGridEditor, TreeGridRoot, TreeGridRow } from '../../.verification-dist/tree-grid.js';

const transition = Object.freeze({ transitionProperty: 'opacity', transitionDuration: '20ms' });

export async function runTreeGridEditorPresenceScenario() {
  const host = document.createElement('div');
  document.body.append(host);
  const editMode = ref('navigation');
  const values = new Map([['root-name', 'Root']]);
  const rows = [{ id: 'root', parentID: null, cells: ['root-name'] }];
  const app = createApp({
    render: () => h(TreeGridRoot, {
      rows,
      getCellValue: (id) => values.get(id) ?? '',
      setCellValue: (id, value) => { values.set(id, value); },
      defaultHighlightedValue: 'root-name',
      editMode: editMode.value,
      'onUpdate:editMode': (value) => { editMode.value = value; },
    }, {
      default: () => h(TreeGridRow, { value: 'root', rowIndex: 1 }, {
        default: () => h(TreeGridCell, { value: 'root-name', columnIndex: 1 }, {
          default: () => h(TreeGridEditor, {
            for: 'root-name',
            label: 'Root name',
            style: { ...transition, opacity: editMode.value === 'editing' ? '1' : '0' },
          }),
        }),
      }),
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    await frame();
    const root = host.querySelector('[data-scope="tree-grid"][data-part="root"]');
    const cell = host.querySelector('[data-scope="tree-grid"][data-part="cell"]');
    const editor = host.querySelector('[data-scope="tree-grid"][data-part="editor"]');
    if (!(root instanceof HTMLElement) || !(cell instanceof HTMLElement) || !(editor instanceof HTMLInputElement)) {
      return Object.freeze({ ok: false, reason: 'missing tree-grid editor parts' });
    }
    const initiallyHidden = editor.hidden === true;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
    await nextTick();
    await frame();
    const sameEditorAfterEnter = host.querySelector('[data-scope="tree-grid"][data-part="editor"]') === editor;
    const entered = editMode.value === 'editing'
      && sameEditorAfterEnter
      && editor.hidden === false
      && editor.dataset.state === 'editing'
      && editor.inert === false
      && editor.getAttribute('aria-hidden') === null
      && document.activeElement === editor;
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await nextTick();
    await Promise.resolve();
    const retained = editMode.value === 'navigation'
      && editor.dataset.state === 'idle'
      && editor.hidden === false
      && editor.inert === true
      && editor.getAttribute('aria-hidden') === 'true'
      && editor.tabIndex === -1
      && document.activeElement === cell;
    await wait(100);
    await nextTick();
    const exited = editor.hidden === true
      && editor.inert === false
      && editor.getAttribute('aria-hidden') === null
      && document.activeElement === cell;
    return Object.freeze({ ok: initiallyHidden && entered && retained && exited, initiallyHidden, entered, retained, exited });
  } finally {
    app.unmount();
    host.remove();
  }
}

function frame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
