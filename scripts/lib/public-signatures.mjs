import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

export async function collectPublicSignatures(packageRoot = process.cwd()) {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const exports = publicDeclarationExports(manifest.exports);
  const entries = exports.map(({ types }) => types);
  const paths = await collectDeclarationClosure(packageRoot, entries);
  const files = [];
  for (const path of paths) {
    const content = (await readFile(resolve(packageRoot, path), 'utf8'))
      .replaceAll('\r\n', '\n')
      .replace(/^\/\/# sourceMappingURL=.*$/gmu, '')
      .trim();
    files.push({ path, sha256: hash(content), content });
  }
  const fingerprint = hash([
    JSON.stringify(exports),
    ...files.map(({ path, content }) => `${path}\n${content}\n`),
  ].join('\n'));
  return Object.freeze({
    package: manifest.name,
    exports: Object.freeze(exports),
    fingerprint,
    files: Object.freeze(files.map(({ path, sha256 }) => Object.freeze({ path, sha256 }))),
  });
}

export async function collectPublicSignatureSurfaces(packageRoot = process.cwd()) {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const exports = publicDeclarationExports(manifest.exports);
  const surfaces = [];
  for (const entry of exports) {
    const paths = await collectDeclarationClosure(packageRoot, [entry.types]);
    const files = [];
    for (const path of paths) {
      const content = (await readFile(resolve(packageRoot, path), 'utf8'))
        .replaceAll('\r\n', '\n')
        .replace(/^\/\/# sourceMappingURL=.*$/gmu, '')
        .trim();
      files.push(Object.freeze({ path, sha256: hash(content) }));
    }
    surfaces.push(Object.freeze({ ...entry, files: Object.freeze(files) }));
  }
  return Object.freeze({ package: manifest.name, surfaces: Object.freeze(surfaces) });
}

function publicDeclarationExports(exportsMap) {
  if (exportsMap === null || typeof exportsMap !== 'object') throw new Error('Package exports map is required.');
  const entries = [];
  for (const [subpath, target] of Object.entries(exportsMap)) {
    if (subpath === './package.json') continue;
    if (target === null || typeof target !== 'object' || typeof target.types !== 'string') {
      throw new Error(`Public export ${subpath} requires an explicit types target.`);
    }
    const types = normalizeDeclarationTarget(target.types);
    entries.push(Object.freeze({ subpath, types }));
  }
  return entries.sort((left, right) => left.subpath.localeCompare(right.subpath));
}

async function collectDeclarationClosure(packageRoot, entries) {
  const pending = [...entries];
  const visited = new Set();
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path)) continue;
    visited.add(path);
    const content = await readFile(resolve(packageRoot, path), 'utf8');
    for (const match of content.matchAll(/(?:from\s+|import\s*\()\s*['"](\.[^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      const dependency = declarationPath(packageRoot, path, specifier);
      if (!visited.has(dependency)) pending.push(dependency);
    }
  }
  return [...visited].sort();
}

function normalizeDeclarationTarget(target) {
  const normalized = target.startsWith('./') ? target.slice(2) : target;
  if (!normalized.startsWith('dist/') || !normalized.endsWith('.d.ts')) {
    throw new Error(`Public declaration target must be a dist .d.ts file: ${target}`);
  }
  return normalized;
}

function declarationPath(packageRoot, importer, specifier) {
  const target = specifier.endsWith('.js')
    ? `${specifier.slice(0, -3)}.d.ts`
    : specifier.endsWith('.d.ts')
      ? specifier
      : `${specifier}.d.ts`;
  const path = relative(packageRoot, resolve(packageRoot, dirname(importer), target))
    .split(sep)
    .join('/');
  if (!path.startsWith('dist/')) throw new Error(`Public declaration escapes dist: ${importer} -> ${specifier}`);
  return path;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}
