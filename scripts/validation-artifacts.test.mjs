import assert from 'node:assert/strict';
import test from 'node:test';
import { validateValidationArtifacts } from './check-validation-artifacts.mjs';

test('validation artifact coverage rejects missing work-item evidence', async () => {
  await assert.rejects(() => validateValidationArtifacts({
    schemaVersion: 1,
    scope: 'fixture',
    workItems: { 'WI-001': [] },
  }, async () => ''), /has no validation artifact/);
});

test('validation artifact coverage rejects stale markers', async () => {
  await assert.rejects(() => validateValidationArtifacts({
    schemaVersion: 1,
    scope: 'fixture',
    workItems: { 'WI-001': [{ path: 'fixture.mjs', contains: 'required marker' }] },
  }, async () => 'different content'), /artifact marker missing/);
});

test('validation artifact coverage accepts concrete runnable evidence', async () => {
  assert.deepEqual(await validateValidationArtifacts({
    schemaVersion: 1,
    scope: 'fixture',
    workItems: { 'WI-001': [{ path: 'fixture.mjs', contains: 'test(' }] },
  }, async () => "test('contract', () => {});"), { workItems: 1, artifacts: 1 });
});
