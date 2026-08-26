import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const contract = JSON.parse(await readFile('testing/hydration-contract.json', 'utf8'));
assert.equal(contract.schemaVersion, 1, 'Unsupported hydration contract.');
assert.ok(Array.isArray(contract.verified) && contract.verified.length > 0, 'Verified hydration contracts are required.');
assert.ok(Array.isArray(contract.unverified), 'Unverified hydration areas must be explicit.');

const ids = contract.verified.map((entry) => entry.id);
assert.equal(new Set(ids).size, ids.length, 'Hydration contract IDs must be unique.');

for (const entry of contract.verified) {
  assert.match(entry.id, /^HYD-\d{2}$/, `${entry.id}: invalid hydration contract ID.`);
  assert.ok(entry.contract.length > 0, `${entry.id}: contract is required.`);
  assert.equal((await stat(entry.evidence)).isFile(), true, `${entry.id}: evidence file is missing.`);
  const source = await readFile(entry.evidence, 'utf8');
  assert.equal(source.includes(`[${entry.id}]`), true, `${entry.id}: evidence marker is missing.`);
  assert.equal(source.includes('createSSRApp'), true, `${entry.id}: evidence must render and hydrate an SSR app.`);
  assert.equal(source.includes('renderToString'), true, `${entry.id}: evidence must include server rendering.`);
}

for (const entry of contract.unverified) {
  assert.ok(entry.area.length > 0, 'Unverified hydration area is required.');
  assert.ok(entry.reason.length > 0, `${entry.area}: unverified reason is required.`);
}

console.log(`hydration contract: ${contract.verified.length} verified, ${contract.unverified.length} explicitly unverified`);
