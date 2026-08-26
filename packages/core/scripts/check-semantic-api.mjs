import { readFile } from 'node:fs/promises';
import { collectSemanticAPISnapshot, classifySemanticAPIChanges, describeSemanticAPIChanges } from './lib/semantic-api.mjs';

const contract = JSON.parse(await readFile('testing/semantic-api.json', 'utf8'));
if (contract.schemaVersion !== 1) throw new Error('Unsupported semantic API contract.');
const expectedPolicy = {
  apiAdded: 'minor',
  typeWidened: 'analysis-required',
  typeNarrowed: 'breaking',
  exportRemoved: 'breaking',
  defaultChanged: 'semantic-breaking',
  errorAdded: 'contract-impact-review',
  errorRemoved: 'breaking',
};
if (JSON.stringify(contract.policy) !== JSON.stringify(expectedPolicy)) {
  throw new Error('Semantic API classification policy changed without updating its checker.');
}

const current = await collectSemanticAPISnapshot();
const changes = classifySemanticAPIChanges(contract.baseline, current);
const failures = describeSemanticAPIChanges(changes);

for (const entry of contract.defaults) {
  const source = await readFile(entry.source, 'utf8');
  const occurrences = source.split(entry.evidence).length - 1;
  if (occurrences !== entry.occurrences) {
    failures.push(`default changed: ${entry.id} => semantic breaking (${occurrences}/${entry.occurrences} evidence matches)`);
  }
}

if (failures.length > 0) {
  throw new Error(`Semantic API classification required:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
}

console.log(`semantic API contract: ${current.subpaths.length} subpaths, ${current.errorCodes.length} error codes, ${contract.defaults.length} defaults`);
