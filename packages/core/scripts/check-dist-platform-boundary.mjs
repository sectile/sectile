import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile() && entry.name.endsWith('.js')) result.push(path);
  }
  return result;
}
const javascriptFiles = await files('dist');
const forbidden = [
  /\bwindow\b/u,
  /\bdocument\b/u,
  /\bHTMLElement\b/u,
  /\bprocess\b/u,
  /from ['"]node:/u,
  /from ['"]react/u,
];
for (const path of javascriptFiles) {
  const source = (await readFile(path, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/.*$/gmu, '')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/gu, '');
  for (const pattern of forbidden) assert.equal(pattern.test(source), false, `${path} violates platform boundary: ${pattern}`);
  assert.equal(source.includes('/reference/'), false, `${path} contains reference implementation`);
}
console.log(JSON.stringify({ status: 'passed', javascriptFiles: javascriptFiles.length }, null, 2));
