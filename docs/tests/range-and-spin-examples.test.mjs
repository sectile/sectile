import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../.vitepress/theme/', import.meta.url);

test('slider fills cannot enter a hover state that clears their color', async () => {
  const css = await readFile(new URL('component-examples.css', root), 'utf8');
  for (const selector of ['.slider-range', '.multi-slider-range', '.catalog-slider-range']) {
    assert.match(css, new RegExp(`\\${selector} \\{[^}]*background-color: var\\(--demo-brand-hover\\);[^}]*pointer-events: none;`));
  }
});

test('multi-thumb slider preview uses product scenarios and valid range lattices', async () => {
  const source = await readFile(new URL('components/MultiThumbSliderCase.vue', root), 'utf8');
  assert.match(source, /Campaign budget/);
  assert.match(source, /Search price range/);
  assert.match(source, /Release quality gates/);
  assert.match(source, /constrained \? \{ policies: \{ minGap: 2 \} \}/);
  assert.match(source, /const min = thresholds \|\| constrained \? 0 : 50/);
});

test('spin button preview explains invalid input recovery', async () => {
  const source = await readFile(new URL('components/SpinButtonCase.vue', root), 'utf8');
  assert.match(source, /Leaving an invalid edit restores the saved quantity/);
  assert.match(source, /draftInvalid/);
  assert.match(source, /@update:draft="updateDraft"/);
});
