#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = JSON.parse(await readFile('verification/workstream-ownership.json', 'utf8'));
  validateOwnership(manifest);
  console.log(JSON.stringify({ status: 'passed', stages: manifest.parallelStages.length }));
}

export function validateOwnership(document) {
  assert.equal(document.schemaVersion, 1, 'unsupported ownership schema');
  for (const stage of document.parallelStages) {
    assert.ok(Array.isArray(stage.workItems) && stage.workItems.length > 1, `${stage.stage}: parallel work items required`);
    for (const workItem of stage.workItems) {
      assert.ok(Array.isArray(document.workItems[workItem]) && document.workItems[workItem].length > 0, `${workItem}: concrete ownership paths required`);
    }
    for (let left = 0; left < stage.workItems.length; left += 1) {
      for (let right = left + 1; right < stage.workItems.length; right += 1) {
        const leftID = stage.workItems[left];
        const rightID = stage.workItems[right];
        for (const leftPath of document.workItems[leftID]) {
          for (const rightPath of document.workItems[rightID]) {
            assert.ok(!pathsOverlap(leftPath, rightPath), `${stage.stage}: ${leftID} and ${rightID} overlap at ${leftPath} / ${rightPath}`);
          }
        }
      }
    }
  }
}

function pathsOverlap(left, right) {
  const normalize = (value) => value.replace(/^\.\//u, '').replace(/\/+$/u, '');
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}
