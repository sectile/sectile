import { readFile } from 'node:fs/promises';
import { collectPublicSignatures } from './public-signatures.mjs';

export async function collectSemanticAPISnapshot() {
  const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));
  const errorCodeSource = await readFile('src/error-code.ts', 'utf8');
  const signatures = await collectPublicSignatures();
  return Object.freeze({
    publicSignatureFingerprint: signatures.fingerprint,
    subpaths: Object.freeze(Object.keys(packageJSON.exports).sort()),
    errorCodes: Object.freeze([...errorCodeSource.matchAll(/^\s*\|\s*'([^']+)'/gmu)]
      .map((match) => match[1])
      .sort()),
  });
}

export function classifySemanticAPIChanges(previous, current) {
  const addedSubpaths = difference(current.subpaths, previous.subpaths);
  const removedSubpaths = difference(previous.subpaths, current.subpaths);
  const addedErrorCodes = difference(current.errorCodes, previous.errorCodes);
  const removedErrorCodes = difference(previous.errorCodes, current.errorCodes);
  return Object.freeze({
    addedSubpaths,
    removedSubpaths,
    addedErrorCodes,
    removedErrorCodes,
    declarationsChanged: current.publicSignatureFingerprint !== previous.publicSignatureFingerprint,
  });
}

export function describeSemanticAPIChanges(changes) {
  const descriptions = [];
  for (const value of changes.addedSubpaths) descriptions.push(`API added: ${value} => minor`);
  for (const value of changes.removedSubpaths) descriptions.push(`export removed: ${value} => breaking`);
  for (const value of changes.addedErrorCodes) descriptions.push(`error added: ${value} => contract-impact review`);
  for (const value of changes.removedErrorCodes) descriptions.push(`error removed: ${value} => breaking`);
  if (changes.declarationsChanged) {
    descriptions.push('public declarations changed => classify widening/addition or narrowing/removal');
  }
  return descriptions;
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}
