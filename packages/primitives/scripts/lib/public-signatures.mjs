import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const publicAPI = JSON.parse(await readFile('testing/public-api.json', 'utf8'));

export const publicDeclarationFiles = [
  'dist/index.d.ts',
  ...Object.values(publicAPI.runtimeTargets).map((target) => `dist/${target}.d.ts`),
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
