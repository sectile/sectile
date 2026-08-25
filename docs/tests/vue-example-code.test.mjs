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

test('Calendar month and week examples expose their actual paging projections', () => {
  const month = specializedVueCodeFor('calendar', 'month');
  const week = specializedVueCodeFor('calendar', 'week');
  assert.match(month, /monthRows\(anchor\.value\)/);
  assert.match(month, /shiftDate\(anchor\.value, 'month'/);
  assert.match(week, /weekDates\(anchor\.value\)/);
  assert.match(week, /shiftDate\(anchor\.value, 'week'/);
  assert.notEqual(month, week);
});

test('Calendar unavailable-date example exposes and applies its weekend policy', () => {
  const disabled = specializedVueCodeFor('calendar', 'disabled-weekends');
  assert.match(disabled, /const disabledDates = computed/u);
  assert.match(disabled, /day === 0 \|\| day === 6/u);
  assert.match(disabled, /:disabled-values="disabledDates"/u);
});

test('Temporal field examples use canonical text formats and distinct policies', () => {
  assert.doesNotMatch(specializedVueCodeFor('date-time-field', 'local-schedule'), / native \/>/);
  assert.match(specializedVueCodeFor('date-time-field', 'cross-midnight'), /hour: 23, minute: 45/);
  assert.match(specializedVueCodeFor('date-range-field', 'bounded'), /min: \{ year: 2026, month: 9, day: 1 \}/);
  assert.match(specializedVueCodeFor('time-range-field', 'stepped'), /step: \{ minute: 15 \}/);
});

test('Multi-thumb slider examples use scenario-specific values and policies', () => {
  const range = specializedVueCodeFor('multi-thumb-slider', 'two-thumb-range');
  const thresholds = specializedVueCodeFor('multi-thumb-slider', 'three-thumb-thresholds');
  const constrained = specializedVueCodeFor('multi-thumb-slider', 'crossing-thumbs');
  assert.match(range, /\['120', '340'\]/);
  assert.match(thresholds, /\['warning', 'review', 'block'\]/);
  assert.match(constrained, /minGap: 2/);
  assert.notEqual(range, thresholds);
});

test('Spin button recovery example documents blur restoration separately', () => {
  const integer = specializedVueCodeFor('spin-button', 'integer');
  const recovery = specializedVueCodeFor('spin-button', 'invalid-draft');
  assert.match(recovery, /update:draft/);
  assert.match(recovery, /restores/);
  assert.notEqual(integer, recovery);
});

test('Tree view code teaches distinct exploration and review workflows', () => {
  const explorer = specializedVueCodeFor('tree-view', 'expanded');
  const review = specializedVueCodeFor('tree-view', 'multiple');
  assert.match(explorer, /:default-value="\['settings'\]"/);
  assert.match(explorer, /v-model:expanded-values="expandedValues"/);
  assert.match(explorer, /TreeViewGroup for="dashboard"/);
  assert.doesNotMatch(explorer, /TreeViewGroup v-if|expandedValues?\.includes/u);
  assert.match(review, /\['overview', 'settings', 'tokens'\]/);
  assert.match(review, /value\.length.*files selected/);
  assert.notEqual(explorer, review);
});
