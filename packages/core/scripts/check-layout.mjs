import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

await assertEntries('src', {
  directories: ['internal', 'structures'],
  files: ['accordion.ts', 'alert-dialog.ts', 'calendar.ts', 'carousel.ts', 'checkbox-group.ts', 'checkbox.ts', 'combobox.ts', 'date-field.ts', 'date-picker.ts', 'date-range-field.ts', 'date-range-picker.ts', 'date-time-field.ts', 'date-time-picker.ts', 'date-time-range-picker.ts', 'dialog.ts', 'disclosure.ts', 'editable.ts', 'feed.ts', 'index.ts', 'interaction.ts', 'listbox.ts', 'menu-button.ts', 'menu.ts', 'menubar.ts', 'multi-thumb-slider.ts', 'navigation-menu.ts', 'number-field.ts', 'pagination.ts', 'pin-input.ts', 'popover.ts', 'quantity-field.ts', 'radio-group.ts', 'rating.ts', 'result.ts', 'revision.ts', 'select.ts', 'shared.ts', 'slider.ts', 'spin-button.ts', 'stepper.ts', 'switch.ts', 'tabs.ts', 'tags-input.ts', 'text.ts', 'time-field.ts', 'time-range-field.ts', 'toggle-button.ts', 'toggle-group.ts', 'toolbar.ts', 'tooltip.ts', 'tree-grid.ts', 'tree-view.ts', 'units.ts', 'window-splitter.ts'],
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
