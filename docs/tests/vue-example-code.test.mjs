import assert from 'node:assert/strict';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { documentedScenarios } from '../data/component-documentation.mjs';
import { catalogCodeFor } from '../.vitepress/theme/catalog-code.ts';
import {
  hasSpecializedVueCode,
  specializedVueCodeFor,
} from '../.vitepress/theme/specialized-example-code.ts';

test('every documented Vue example resolves runnable source', () => {
  for (const component of catalog.components) {
    if (component.id === 'number-field') continue;
    for (const scenario of documentedScenarios(component)) {
      const source = specializedVueCodeFor(component.id, scenario) || catalogCodeFor(component.id, scenario);
      assert.notEqual(source.trim(), '', `${component.id}/${scenario}`);
      assert.match(source, new RegExp(`@sectile/vue/${component.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${component.id}/${scenario}`);
      assert.match(source, /<template>/, `${component.id}/${scenario}`);
    }
  }
});

test('specialized preview components do not depend on catalog fallback code', () => {
  for (const component of catalog.components.filter(({ id }) => hasSpecializedVueCode(id))) {
    for (const scenario of documentedScenarios(component)) {
      assert.notEqual(specializedVueCodeFor(component.id, scenario).trim(), '', `${component.id}/${scenario}`);
    }
  }
});

test('Switch Code shows the public Vue switch API', () => {
  const source = specializedVueCodeFor('switch', 'off');
  assert.match(source, /SwitchRoot/);
  assert.match(source, /SwitchThumb/);
  assert.match(source, /@sectile\/vue\/switch/);
  assert.doesNotMatch(source, /No example is available/);
});
