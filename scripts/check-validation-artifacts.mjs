#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export async function validateValidationArtifacts(manifest, read = readFile) {
  assert.equal(manifest.schemaVersion, 1, 'unsupported validation-artifact schema');
  assert.ok(typeof manifest.scope === 'string' && manifest.scope.length > 0, 'validation-artifact scope is required');
  const workItems = Object.entries(manifest.workItems ?? {});
  assert.ok(workItems.length > 0, 'at least one work item must declare validation artifacts');
  for (const [workItem, artifacts] of workItems) {
    assert.match(workItem, /^WI-[0-9]{3}$/u, `invalid work-item identifier: ${workItem}`);
    assert.ok(Array.isArray(artifacts) && artifacts.length > 0, `${workItem} has no validation artifact`);
    const seen = new Set();
    for (const artifact of artifacts) {
      assert.ok(typeof artifact.path === 'string' && artifact.path.length > 0, `${workItem} artifact path is required`);
      assert.ok(typeof artifact.contains === 'string' && artifact.contains.length > 0, `${workItem} artifact marker is required`);
      const key = `${artifact.path}\0${artifact.contains}`;
      assert.equal(seen.has(key), false, `${workItem} duplicates ${artifact.path}`);
      seen.add(key);
      const source = await read(artifact.path, 'utf8');
      assert.ok(source.includes(artifact.contains), `${workItem} artifact marker missing from ${artifact.path}`);
    }
  }
  return Object.freeze({ workItems: workItems.length, artifacts: workItems.reduce((total, [, entries]) => total + entries.length, 0) });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = JSON.parse(await readFile('verification/validation-artifacts.json', 'utf8'));
  const result = await validateValidationArtifacts(manifest);
  console.log(JSON.stringify({ status: 'passed', ...result }));
}
