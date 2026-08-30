import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const publishedPackageDirectories = Object.freeze([
  'core',
  'chart',
  'form',
  'tabular',
  'temporal',
  'virtual',
  'dom',
  'terminal',
  'vue',
]);

export function discoverPublishedPackageDirectories(packagesRoot) {
  return Object.freeze(readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((directory) => {
      const manifest = JSON.parse(readFileSync(join(packagesRoot, directory, 'package.json'), 'utf8'));
      return manifest.private !== true;
    })
    .sort());
}
