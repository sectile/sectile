import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const publicDeclarationFiles = [
  'packages/primitives/dist/index.d.ts',
  'packages/primitives/dist/structures/sequence.d.ts',
  'packages/primitives/dist/structures/range.d.ts',
  'packages/primitives/dist/structures/grid.d.ts',
  'packages/primitives/dist/structures/tree.d.ts',
];

export async function collectPublicSignatures() {
  const files = [];
  for (const path of publicDeclarationFiles) {
    const content = (await readFile(path, 'utf8')).replace(/^\/\/# sourceMappingURL=.*$/gmu, '').trim();
    files.push({ path, sha256: hash(content), content });
  }
  const fingerprint = hash(files.map(({ path, content }) => `${path}\n${content}\n`).join('\n'));
  return { fingerprint, files: files.map(({ path, sha256 }) => ({ path, sha256 })) };
}

export function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}
