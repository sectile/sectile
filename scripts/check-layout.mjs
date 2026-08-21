import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

await assertEntries('packages/primitives/src', {
  directories: ['internal', 'structures'],
  files: ['index.ts', 'shared.ts'],
});
await assertEntries('packages/primitives/src/internal', {
  directories: ['composites', 'editing', 'kernel', 'reference', 'state'],
  files: [],
});
await assertEntries('packages/primitives/src/internal/reference', {
  directories: ['composites', 'editing', 'state', 'structures'],
  files: [],
});
await assertEntries('packages/primitives/tests', {
  directories: ['composites', 'differential', 'editing', 'state', 'structures'],
  files: ['support.mjs'],
});

console.log(JSON.stringify({
  status: 'passed',
  sourceLayers: 5,
  referenceLayers: 4,
  testLayers: 5,
}, null, 2));

async function assertEntries(directory, expected) {
  const entries = await readdir(directory, { withFileTypes: true });
  const actual = {
    directories: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(),
  };
  assert.deepEqual(actual, expected, `${directory} violates the declared semantic layout`);
}
