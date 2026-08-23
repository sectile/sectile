import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';
import { renderTree } from './lib/tree.mjs';

test('renders files while omitting empty directories', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-tree-'));
  context.after(() => rm(root, { force: true, recursive: true }));

  await mkdir(join(root, 'empty'));
  await mkdir(join(root, 'cache'));
  await mkdir(join(root, 'populated', 'empty'), { recursive: true });
  await writeFile(join(root, 'cache', 'generated.js'), 'generated\n');
  await writeFile(join(root, 'populated', 'file.txt'), 'fixture\n');

  assert.equal(
    await renderTree(root),
    `${basename(root)}/\n└── populated/\n    └── file.txt\n`,
  );
});
