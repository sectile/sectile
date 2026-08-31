import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const publicAPI = JSON.parse(await readFile('testing/public-api.json', 'utf8'));

export const publicDeclarationFiles = [
  'dist/index.d.ts',
  ...Object.values(publicAPI.runtimeTargets).map((target) => `dist/${target}.d.ts`),
];

export async function collectPublicSignatures() {
  const paths = await collectDeclarationClosure(publicDeclarationFiles);
  const files = [];
  for (const path of paths) {
    const content = (await readFile(path, 'utf8'))
      .replaceAll('\r\n', '\n')
      .replace(/^\/\/# sourceMappingURL=.*$/gmu, '')
      .trim();
    files.push({ path, sha256: hash(content), content });
  }
  const fingerprint = hash(files.map(({ path, content }) => `${path}\n${content}\n`).join('\n'));
  return { fingerprint, files: files.map(({ path, sha256 }) => ({ path, sha256 })) };
}

async function collectDeclarationClosure(entries) {
  const pending = [...entries];
  const visited = new Set();
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path)) continue;
    visited.add(path);
    const content = await readFile(path, 'utf8');
    for (const match of content.matchAll(/(?:from\s+|import\s*\()\s*['"](\.[^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      const dependency = declarationPath(path, specifier);
      if (!visited.has(dependency)) pending.push(dependency);
    }
  }
  return [...visited].sort();
}

function declarationPath(importer, specifier) {
  const target = specifier.endsWith('.js')
    ? `${specifier.slice(0, -3)}.d.ts`
    : specifier;
  const path = relative(process.cwd(), resolve(dirname(importer), target))
    .split(sep)
    .join('/');
  if (!path.startsWith('dist/')) {
    throw new Error(`Public declaration escapes dist: ${importer} -> ${specifier}`);
  }
  return path;
}

export function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}
