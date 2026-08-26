import { readFile, writeFile } from 'node:fs/promises';
import { collectSemanticAPISnapshot, classifySemanticAPIChanges, describeSemanticAPIChanges } from './lib/semantic-api.mjs';

const contract = JSON.parse(await readFile('testing/semantic-api.json', 'utf8'));
const classification = argument('classification');
const reason = argument('reason');
const allowed = new Set(['baseline', 'minor', 'breaking', 'contract-impact-reviewed', 'type-change-reviewed']);
if (!allowed.has(classification)) throw new Error(`Invalid --classification: ${classification}`);
if (reason.length === 0) throw new Error('--reason must not be empty.');
if (classification === 'baseline' && contract.baseline.publicSignatureFingerprint !== '') {
  throw new Error('The baseline classification is only valid when initializing the contract.');
}

const baseline = await collectSemanticAPISnapshot();
const changes = classifySemanticAPIChanges(contract.baseline, baseline);
const descriptions = describeSemanticAPIChanges(changes);
if (descriptions.length === 0) throw new Error('No semantic API change to accept.');
if ((changes.removedSubpaths.length > 0 || changes.removedErrorCodes.length > 0) && classification !== 'breaking') {
  throw new Error('Removed exports or error codes require --classification=breaking.');
}
if (changes.addedErrorCodes.length > 0 && !['baseline', 'breaking', 'contract-impact-reviewed'].includes(classification)) {
  throw new Error('Added error codes require contract-impact review.');
}

const updated = {
  ...contract,
  baseline,
  acceptance: { classification, reason },
};
await writeFile('testing/semantic-api.json', `${JSON.stringify(updated, null, 2)}\n`);
console.log(`semantic API baseline updated: ${classification}`);

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? '';
}
