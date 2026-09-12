import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes } from '../src/routes.ts';

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(docsRoot, 'dist');
const shell = readFileSync(resolve(distRoot, 'index.html'), 'utf8');

for (const route of routes) {
  if (route.path === '/') continue;

  const targetDirectory = resolve(distRoot, route.path.slice(1));
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(resolve(targetDirectory, 'index.html'), shell);
}

writeFileSync(resolve(distRoot, '404.html'), shell);
