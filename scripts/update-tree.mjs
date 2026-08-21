import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderTree } from './lib/tree.mjs';
import { root } from './lib/repository.mjs';

const target = join(root, 'TREE.txt');
await writeFile(target, await renderTree(root), 'utf8');
console.log('Updated TREE.txt');
