import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSyncPortable } from '../tools/tooling/portable-process.mjs';
import {
  formatReleaseTitle,
  formatReleasePackageSummary,
  isReleaseSetTag,
  releaseManifestFile,
} from './lib/release-set.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [command, tag, directory, generatedNotes, ...extra] = process.argv.slice(2);
assert.equal(command, 'prepare', 'release metadata command must be prepare');
assert.deepEqual(extra, [], 'unexpected release metadata arguments');
assert.equal(typeof tag === 'string' && tag.length > 0, true, 'release tag is required');

assert.equal(isReleaseSetTag(tag), true, `invalid release tag: ${tag}`);
const manifest = JSON.parse(readFileSync(join(root, releaseManifestFile), 'utf8'));
assert.equal(manifest.releaseTag, tag, `release manifest tag does not match ${tag}`);
const title = formatReleaseTitle(manifest);
assert.equal(typeof directory === 'string' && directory.length > 0, true, 'release output directory is required');
assert.equal(typeof generatedNotes === 'string' && generatedNotes.length > 0, true, 'Releaseway preview notes are required');
assert.equal(typeof process.env.GITHUB_OUTPUT === 'string' && process.env.GITHUB_OUTPUT.length > 0, true, 'GITHUB_OUTPUT is required');
const commit = execFileSyncPortable('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(process.env.GITHUB_SHA, commit, 'dispatch the workflow on the release tag ref');
const changes = readFileSync(generatedNotes, 'utf8');
assert.notEqual(changes.trim(), '', 'Releaseway preview notes cannot be empty');
const summary = formatReleasePackageSummary(manifest, process.env.GITHUB_REPOSITORY, commit);
const body = `${summary}\n${changes}`;
// Check the complete body, including a maintenance reason and Markdown-escaped
// commit text, before any artifact is sealed or npm publication can begin.
const plainBody = body.replaceAll('\\', '');
assert.doesNotMatch(plainBody, /-----BEGIN PGP /iu, 'release notes must not contain PGP armor');
assert.doesNotMatch(plainBody, /Pre-publication qualification/iu, 'release notes must not contain qualification logs');
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'notes.md'), body, { flag: 'wx' });
appendFileSync(process.env.GITHUB_OUTPUT, `commit=${commit}\ntitle=${title}\n`);
