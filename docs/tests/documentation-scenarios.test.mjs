import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { documentedScenarios, isStandaloneDocumentationScenario } from '../data/component-documentation.mjs';

test('readonly and disabled states only become visual examples when explicitly curated', () => {
  assert.equal(isStandaloneDocumentationScenario('readonly'), false);
  assert.equal(isStandaloneDocumentationScenario('disabled'), false);
  assert.equal(isStandaloneDocumentationScenario('disabled-option'), false);
  assert.equal(isStandaloneDocumentationScenario('horizontal-disabled'), false);

  for (const component of catalog.components.filter(({ id }) => id !== 'calendar')) {
    for (const scenario of documentedScenarios(component)) {
      assert.doesNotMatch(scenario, /(?:^|-)disabled(?:-|$)|^readonly$/u, `${component.id}/${scenario}`);
    }
  }

  const calendar = catalog.components.find(({ id }) => id === 'calendar');
  assert.deepEqual(documentedScenarios(calendar), ['month', 'week', 'disabled-weekends']);
});

test('generated English and Korean pages omit uncurated readonly and disabled example sections', async () => {
  for (const component of catalog.components) {
    for (const locale of ['', 'ko/']) {
      const source = await readFile(new URL(`../${locale}components/${component.id}.md`, import.meta.url), 'utf8');
      if (component.id === 'calendar') {
        assert.match(source, /<ComponentExample[^>]+scenario="disabled-weekends"/u, `${locale}${component.id}`);
      } else {
        assert.doesNotMatch(source, /<ComponentExample[^>]+scenario="[^"]*(?:readonly|disabled)[^"]*"/u, `${locale}${component.id}`);
      }
    }
  }
});
