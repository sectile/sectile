import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const ignoredDirectoryNames = new Set([
  '.git',
  '.pnpm-store',
  '.stryker-tmp',
  '.turbo',
  '.vitest',
  '.verification-dist',
  'cache',
  'coverage',
  'dist',
  'node_modules',
]);

const ignoredFileNames = new Set(['.DS_Store']);

function asciiFold(value) {
  return value.replace(/[A-Z]/gu, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 32),
  );
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareEntries(left, right) {
  if (left.isDirectory() !== right.isDirectory()) {
    return left.isDirectory() ? -1 : 1;
  }

  const folded = compareText(asciiFold(left.name), asciiFold(right.name));
  return folded === 0 ? compareText(left.name, right.name) : folded;
}

function shouldInclude(entry) {
  if (entry.isDirectory()) return !ignoredDirectoryNames.has(entry.name);
  if (entry.isFile() || entry.isSymbolicLink()) {
    return !ignoredFileNames.has(entry.name) && !entry.name.endsWith('.tsbuildinfo');
  }
  return false;
}

async function readNodes(directory) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter(shouldInclude)
    .sort(compareEntries);

  const nodes = await Promise.all(
    entries.map(async (entry) => ({
      children: entry.isDirectory()
        ? await readNodes(join(directory, entry.name))
        : null,
      name: entry.name,
    })),
  );

  return nodes.filter((node) => node.children === null || node.children.length > 0);
}

function appendNodes(lines, nodes, prefix) {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (node === undefined) continue;

    const last = index === nodes.length - 1;
    const branch = last ? '└── ' : '├── ';
    const directory = node.children !== null;

    lines.push(`${prefix}${branch}${node.name}${directory ? '/' : ''}`);

    if (directory) {
      appendNodes(lines, node.children, `${prefix}${last ? '    ' : '│   '}`);
    }
  }
}

export async function renderTree(directory) {
  const absolute = resolve(directory);
  const lines = [`${basename(absolute)}/`];
  appendNodes(lines, await readNodes(absolute), '');
  return `${lines.join('\n')}\n`;
}
