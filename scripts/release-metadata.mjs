import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSyncPortable } from '../tools/tooling/portable-process.mjs';
import {
  formatReleaseTitle,
  isLegacyReleaseTag,
  isReleaseSetTag,
  releaseManifestFile,
} from './lib/release-set.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [command, tag, directory] = process.argv.slice(2);
assert.ok(command === 'title' || command === 'prepare', 'release metadata command must be title or prepare');
assert.equal(typeof tag === 'string' && tag.length > 0, true, 'release tag is required');

let title;
if (isLegacyReleaseTag(tag)) {
  title = tag;
} else {
  assert.equal(isReleaseSetTag(tag), true, `invalid release tag: ${tag}`);
  const manifest = JSON.parse(readFileSync(join(root, releaseManifestFile), 'utf8'));
  assert.equal(manifest.releaseTag, tag, `release manifest tag does not match ${tag}`);
  title = formatReleaseTitle(manifest);
}

if (command === 'title') {
  assert.equal(directory, undefined, 'title does not accept an output directory');
  console.log(title);
} else {
  assert.equal(typeof directory === 'string' && directory.length > 0, true, 'release output directory is required');
  const git = (...args) => execFileSyncPortable('git', args, { cwd: root, encoding: 'utf8' });
  const commit = git('rev-parse', 'HEAD').trim();
  assert.equal(git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`).trim(), commit,
    'release tag must point to the checked-out source');
  assert.equal(process.env.GITHUB_SHA, commit, 'dispatch the workflow on the release tag ref');
  // Keep the caller-authored annotated tag message, including trailing newlines.
  const annotation = git('cat-file', 'tag', `refs/tags/${tag}`);
  const message = annotation.slice(annotation.indexOf('\n\n') + 2);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'notes.md'), message, { flag: 'wx' });
  appendFileSync(process.env.GITHUB_OUTPUT, `commit=${commit}\ntitle=${title}\n`);
}
