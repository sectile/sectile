import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

await assertEntries('src', {
  directories: ['internal', 'structures'],
  files: ['accordion.ts', 'adapter-runtime.ts', 'alert-dialog.ts', 'carousel.ts', 'cascade-select.ts', 'checkbox-group.ts', 'checkbox.ts', 'collection-window.ts', 'color-picker.ts', 'combobox.ts', 'dialog.ts', 'disclosure.ts', 'drawer.ts', 'editable.ts', 'error-code.ts', 'feed.ts', 'form.ts', 'index.ts', 'interaction.ts', 'layer-stack.ts', 'listbox.ts', 'menu-button.ts', 'menu.ts', 'menubar.ts', 'multi-thumb-slider.ts', 'navigation-menu.ts', 'number-field.ts', 'pagination.ts', 'pin-input.ts', 'popover.ts', 'quantity-field.ts', 'radio-group.ts', 'rating.ts', 'reorder.ts', 'result.ts', 'revision.ts', 'select.ts', 'shared.ts', 'slider.ts', 'spin-button.ts', 'stepper.ts', 'switch.ts', 'tabs.ts', 'tags-input.ts', 'text.ts', 'timer.ts', 'toast.ts', 'toggle-button.ts', 'toggle-group.ts', 'toolbar.ts', 'tooltip.ts', 'tree-grid.ts', 'tree-view.ts', 'units.ts', 'window-splitter.ts'],
});
await assertEntries('src/internal', {
  directories: ['composites', 'editing', 'kernel', 'reference', 'runtime', 'state'],
  files: [],
});
await assertEntries('src/internal/reference', {
  directories: ['composites', 'editing', 'state', 'structures'],
  files: [],
});
await assertEntries('tests', {
  directories: ['composites', 'differential', 'editing', 'runtime', 'state', 'structures'],
  files: ['support.mjs'],
});

console.log(JSON.stringify({
  status: 'passed',
  sourceLayers: 6,
  referenceLayers: 4,
  testLayers: 6,
}, null, 2));

async function assertEntries(directory, expected) {
  const entries = await readdir(directory, { withFileTypes: true });
  const actual = {
    directories: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(),
  };
  assert.deepEqual(actual, expected, `${directory} violates the declared semantic layout`);
}
