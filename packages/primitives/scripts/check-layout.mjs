import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

await assertEntries('src', {
  directories: ['internal', 'structures'],
  files: ['accordion.ts', 'calendar.ts', 'combobox.ts', 'disclosure.ts', 'index.ts', 'listbox.ts', 'radio-group.ts', 'result.ts', 'revision.ts', 'shared.ts', 'slider.ts', 'tabs.ts', 'text.ts', 'toolbar.ts', 'tree-grid.ts', 'tree-view.ts'],
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
