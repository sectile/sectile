import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatReleaseTitle,
  isLegacyReleaseTag,
  isReleaseSetTag,
  releaseManifestFile,
} from './lib/release-set.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [command, tag] = process.argv.slice(2);
assert.equal(command, 'title', 'release metadata command must be title');
assert.equal(typeof tag === 'string' && tag.length > 0, true, 'release tag is required');

if (isLegacyReleaseTag(tag)) {
  console.log(tag);
} else {
  assert.equal(isReleaseSetTag(tag), true, `invalid release tag: ${tag}`);
  const manifest = JSON.parse(readFileSync(join(root, releaseManifestFile), 'utf8'));
  assert.equal(manifest.releaseTag, tag, `release manifest tag does not match ${tag}`);
  console.log(formatReleaseTitle(manifest));
}
