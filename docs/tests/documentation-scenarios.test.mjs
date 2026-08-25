import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import {
  documentedScenarios,
  documentedSections,
  isStandaloneDocumentationScenario,
} from '../data/component-documentation.mjs';

test('every declared DOM scenario becomes a standalone documentation example', () => {
  assert.equal(isStandaloneDocumentationScenario('readonly'), true);
  assert.equal(isStandaloneDocumentationScenario('disabled'), true);
  assert.equal(isStandaloneDocumentationScenario('disabled-option'), true);
  assert.equal(isStandaloneDocumentationScenario('horizontal-disabled'), true);

  for (const component of catalog.components) {
    assert.deepEqual(documentedScenarios(component), component.scenarios.dom, component.id);
  }
});

test('generated English and Korean pages include every declared DOM scenario exactly once', async () => {
  for (const component of catalog.components) {
    for (const locale of ['', 'ko/']) {
      const source = await readFile(new URL(`../${locale}components/${component.id}.md`, import.meta.url), 'utf8');
      for (const scenario of component.scenarios.dom) {
        const marker = `scenario="${scenario}"`;
        assert.equal(source.split(marker).length - 1, 1, `${locale}${component.id}/${scenario}`);
      }
    }
  }
});

test('every documented scenario belongs to exactly one learning section', () => {
  for (const component of catalog.components) {
    const scenarios = documentedScenarios(component);
    const { usage, examples } = documentedSections(component);

    assert.ok(usage.length > 0, `${component.id}: Usage must teach at least one scenario`);
    assert.deepEqual(new Set([...usage, ...examples]), new Set(scenarios), `${component.id}: section coverage`);
    assert.equal(new Set([...usage, ...examples]).size, scenarios.length, `${component.id}: duplicate scenario`);
  }
});

test('ordinary props and states stay in Usage while Examples remain exceptional', () => {
  const pinInput = catalog.components.find(({ id }) => id === 'pin-input');
  assert.ok(pinInput);
  assert.deepEqual(documentedSections(pinInput), {
    usage: ['verification-code', 'custom-length', 'masked', 'placeholders', 'otp', 'readonly', 'disabled', 'controlled'],
    examples: [],
  });

  const ordinaryScenarios = /^(?:controlled|disabled|readonly|masked|otp|placeholders|custom-length)$/u;
  for (const component of catalog.components) {
    const { examples } = documentedSections(component);
    for (const scenario of examples) {
      assert.doesNotMatch(scenario, ordinaryScenarios, `${component.id}/${scenario} belongs in Usage`);
    }
  }
});

test('generated pages order Usage, optional Examples, and API', async () => {
  for (const component of catalog.components) {
    const sections = documentedSections(component);
    for (const locale of ['', 'ko/']) {
      const source = await readFile(new URL(`../${locale}components/${component.id}.md`, import.meta.url), 'utf8');
      const usageHeading = locale === 'ko/' ? '## 용법' : '## Usage';
      const examplesHeading = locale === 'ko/' ? '## 예시' : '## Examples';
      const usageIndex = source.indexOf(usageHeading);
      const examplesIndex = source.indexOf(examplesHeading);
      const apiIndex = source.indexOf('## API');

      assert.ok(usageIndex >= 0, `${locale}${component.id}: missing Usage`);
      assert.ok(apiIndex > usageIndex, `${locale}${component.id}: API must follow Usage`);
      if (sections.examples.length === 0) {
        assert.equal(examplesIndex, -1, `${locale}${component.id}: empty Examples section`);
      } else {
        assert.ok(examplesIndex > usageIndex, `${locale}${component.id}: Examples must follow Usage`);
        assert.ok(apiIndex > examplesIndex, `${locale}${component.id}: API must follow Examples`);
      }
    }
  }
});
