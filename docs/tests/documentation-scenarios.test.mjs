import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { documentedScenarios, isStandaloneDocumentationScenario } from '../data/component-documentation.mjs';

test('readonly and disabled states do not become standalone visual examples', () => {
  assert.equal(isStandaloneDocumentationScenario('readonly'), false);
  assert.equal(isStandaloneDocumentationScenario('disabled'), false);
  assert.equal(isStandaloneDocumentationScenario('disabled-option'), false);
  assert.equal(isStandaloneDocumentationScenario('horizontal-disabled'), false);

  for (const component of catalog.components) {
    for (const scenario of documentedScenarios(component)) {
      assert.doesNotMatch(scenario, /(?:^|-)disabled(?:-|$)|^readonly$/u, `${component.id}/${scenario}`);
    }
  }
});

test('generated English and Korean pages omit readonly and disabled example sections', async () => {
  for (const component of catalog.components) {
    for (const locale of ['', 'ko/']) {
      const source = await readFile(new URL(`../${locale}components/${component.id}.md`, import.meta.url), 'utf8');
      assert.doesNotMatch(source, /<ComponentExample[^>]+scenario="[^"]*(?:readonly|disabled)[^"]*"/u, `${locale}${component.id}`);
    }
  }
});
